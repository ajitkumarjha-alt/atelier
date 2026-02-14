import express from 'express';
import { generateDDSPolicy, generateDrawingLists, getDefaultPolicy, getHeightTier, DDS_PHASES } from '../lib/ddsPolicy.js';

const createDDSRouter = ({ query, verifyToken, logger, transaction }) => {
  const router = express.Router();

  // Helper: log activity
  const logActivity = async (projectId, userId, email, entityType, entityId, action, changes, description) => {
    try {
      await query(
        `INSERT INTO activity_log (project_id, user_id, user_email, entity_type, entity_id, action, changes, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [projectId, userId, email, entityType, entityId, action, JSON.stringify(changes), description]
      );
    } catch (err) {
      logger.error('Error logging activity:', err);
    }
  };

  // ========== POLICY-BASED DDS GENERATION ==========

  // POST /api/dds/generate/:projectId - Generate DDS using Policy 130 engine
  router.post('/dds/generate/:projectId', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const {
        dds_type = 'internal',
        tower_stagger_weeks = 4,
        has_swimming_pool = false,
        has_fitout = false,
      } = req.body;
      const userId = req.user?.userId;

      // Get project details
      const projectResult = await query(
        'SELECT * FROM projects WHERE id = $1', [projectId]
      );
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      const project = projectResult.rows[0];
      const projectStartDate = project.start_date || new Date().toISOString().split('T')[0];

      // Get buildings with floors
      const buildings = await query(
        `SELECT b.id, b.name, b.application_type, b.building_type, b.building_height,
                b.tower_index, b.podium_count, b.basement_count,
                COALESCE(b.building_height, 30) as height,
                json_agg(json_build_object(
                  'id', f.id, 'name', f.floor_name, 'number', f.floor_number, 'height', f.floor_height
                ) ORDER BY f.floor_number) FILTER (WHERE f.id IS NOT NULL) AS floors
         FROM buildings b
         LEFT JOIN floors f ON f.building_id = b.id
         WHERE b.project_id = $1
         GROUP BY b.id ORDER BY COALESCE(b.tower_index, 0), b.name`, [projectId]
      );

      if (buildings.rows.length === 0) {
        return res.status(400).json({ error: 'No buildings found. Add buildings to the project first.' });
      }

      // Calculate total floors and estimate height if not set
      const buildingConfigs = buildings.rows.map((b, index) => {
        let height = parseFloat(b.building_height || b.height || 0);
        if (height === 0 && b.floors) {
          height = b.floors.length * 3;
        }
        if (height === 0) height = 30;

        const floorTypes = inferFloorTypes(b.floors || []);

        return {
          id: b.id,
          name: b.name,
          height,
          towerIndex: b.tower_index != null ? b.tower_index : index,
          hasPodium: (b.podium_count || 0) > 0,
          podiumCount: b.podium_count || 0,
          basementCount: b.basement_count || 0,
          totalFloors: b.floors ? b.floors.length : 0,
          floors: b.floors || [],
          floorTypes: floorTypes.length > 0 ? floorTypes : undefined,
          hasLift: b.has_lift !== false,
          poolVolume: b.pool_volume || 0,
          applicationType: b.application_type,
        };
      });

      const maxBasements = Math.max(...buildings.rows.map(b => b.basement_count || 0), 0);

      // Generate DDS via policy engine
      const policyResult = generateDDSPolicy({
        projectStartDate,
        buildings: buildingConfigs,
        towerStaggerWeeks: tower_stagger_weeks,
        isNewLand: true,
        basementCount: maxBasements,
        hasSwimmingPool: has_swimming_pool,
        hasFitout: has_fitout,
        hasParking: true,
        ddsType: dds_type,
      });

      // Get or increment version
      const versionResult = await query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM dds WHERE project_id = $1 AND dds_type = $2',
        [projectId, dds_type]
      );
      const nextVersion = versionResult.rows[0].next_version;

      // Create DDS record
      const ddsResult = await query(
        `INSERT INTO dds (project_id, version, dds_type, status, created_by_id,
         policy_name, tower_stagger_weeks, generation_metadata)
         VALUES ($1, $2, $3, 'active', $4, $5, $6, $7) RETURNING *`,
        [projectId, nextVersion, dds_type, userId,
         'Policy 130 - 3 Yr 10 Month Completion',
         tower_stagger_weeks,
         JSON.stringify(policyResult.metadata)]
      );
      const dds = ddsResult.rows[0];

      // Insert all generated items
      for (const item of policyResult.items) {
        await query(
          `INSERT INTO dds_items (
            dds_id, building_id, item_category, item_name, discipline,
            expected_start_date, expected_completion_date,
            architect_input_date, structure_input_date,
            sort_order, phase, section, trade, level_type, doc_type, policy_week_offset
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            dds.id, item.buildingId, item.discipline, item.itemName, item.discipline,
            item.expectedStartDate, item.expectedCompletionDate,
            item.architectInputDate, item.structureInputDate,
            item.sortOrder, item.phase, item.section, item.trade,
            item.levelType, item.docType, item.policyWeekOffset,
          ]
        );
      }

      // Also generate external area items
      const siteAreas = await query(
        'SELECT id, name, area_type FROM site_areas WHERE project_id = $1', [projectId]
      );
      let extSortOrder = policyResult.items.length;
      for (const area of siteAreas.rows) {
        const extTrades = ['Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security'];
        for (const trade of extTrades) {
          extSortOrder++;
          await query(
            `INSERT INTO dds_items (dds_id, item_category, item_name, discipline,
             expected_start_date, expected_completion_date, sort_order,
             is_external_area, external_area_type, phase, section, trade, doc_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12)`,
            [dds.id, trade,
             `${area.name} (${area.area_type}) - ${trade}`, trade,
             policyResult.items.length > 0 ? policyResult.items[policyResult.items.length - 1].expectedStartDate : projectStartDate,
             policyResult.items.length > 0 ? policyResult.items[policyResult.items.length - 1].expectedCompletionDate : projectStartDate,
             extSortOrder, area.area_type,
             DDS_PHASES.VFC, 'External Areas', trade, 'Drawing']
          );
        }
      }

      // Generate floor-wise VFC + DD Drawing Lists
      const drawingLists = generateDrawingLists({
        buildings: buildingConfigs,
        projectStartDate,
        towerStaggerWeeks: tower_stagger_weeks,
        hasBasement: maxBasements > 0,
        hasParking: true,
        ddsType: dds_type,
      });

      // Insert VFC drawings
      for (const d of drawingLists.vfcDrawings) {
        await query(
          `INSERT INTO dds_drawings (dds_id, building_id, list_type, sr_no, trade, doc_type,
           tower, level, description, category, dds_date, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [dds.id, d.buildingId, d.listType, d.srNo, d.trade, d.docType,
           d.tower, d.level, d.description, d.category, d.ddsDate, d.sortOrder]
        );
      }

      // Insert DD drawings
      for (const d of drawingLists.ddDrawings) {
        await query(
          `INSERT INTO dds_drawings (dds_id, building_id, list_type, sr_no, trade, doc_type,
           tower, level, description, category, dds_date, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [dds.id, d.buildingId, d.listType, d.srNo, d.trade, d.docType,
           d.tower, d.level, d.description, d.category, d.ddsDate, d.sortOrder]
        );
      }

      // BOQ generation placeholder — will be implemented with a better approach later

      await logActivity(projectId, userId, req.user?.email, 'dds', dds.id, 'generate',
        {
          version: nextVersion, type: dds_type, policy: 'Policy 130',
          totalItems: policyResult.metadata.totalItems,
          phases: policyResult.metadata.phases,
          vfcDrawings: drawingLists.vfcDrawings.length,
          ddDrawings: drawingLists.ddDrawings.length,
        },
        `Generated DDS v${nextVersion} (${dds_type}) using Policy 130 — ${policyResult.metadata.totalItems} items, ${drawingLists.vfcDrawings.length} VFC drawings, ${drawingLists.ddDrawings.length} DD drawings across ${buildingConfigs.length} towers`
      );

      await query(
        `INSERT INTO dds_history (dds_id, action, changed_by_id, changes)
         VALUES ($1, 'generate', $2, $3)`,
        [dds.id, userId, JSON.stringify({ policy: 'Policy 130', metadata: policyResult.metadata })]
      );

      const fullDDS = await getDDSWithItems(dds.id);
      res.status(201).json(fullDDS);
    } catch (err) {
      logger.error('Error generating DDS:', err);
      res.status(500).json({ error: 'Failed to generate DDS: ' + err.message });
    }
  });

  // Infer floor types from actual floor data
  const inferFloorTypes = (floors) => {
    if (!floors || floors.length === 0) return [];
    const types = new Set();
    for (const floor of floors) {
      const name = (floor.name || '').toLowerCase();
      if (name.includes('podium') || name.includes('plinth')) types.add('Podium');
      else if (name.includes('garden')) types.add('Garden Unit');
      else if (name.includes('refuge')) types.add('Refuge Floor');
      else if (name.includes('penthouse') || name.includes('pent house')) types.add('Penthouse Level');
      else if (name.includes('terrace') || name.includes('roof')) types.add('Terrace');
      else if (name.includes('oht') || name.includes('overhead')) types.add('OHT Top');
      else if (name.includes('stilt') || name.includes('ground') || name.includes('gf')) types.add('Stilt/Ground Floor');
      else if (name.includes('basement')) { /* skip basements for VFC */ }
      else types.add('Typical Floor');
    }
    types.add('Typical Floor');
    types.add('Terrace');
    return Array.from(types);
  };

  // ========== GET DDS ==========

  // GET /api/dds/project/:projectId - Get latest DDS for project
  router.get('/dds/project/:projectId', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { type } = req.query;

      let sql = `SELECT d.*, u.full_name as created_by_name
                 FROM dds d
                 LEFT JOIN users u ON u.id = d.created_by_id
                 WHERE d.project_id = $1`;
      const params = [projectId];

      if (type) {
        sql += ' AND d.dds_type = $2';
        params.push(type);
      }
      sql += ' ORDER BY d.version DESC LIMIT 1';

      const ddsResult = await query(sql, params);
      if (ddsResult.rows.length === 0) {
        return res.json({ dds: null, items: [], phases: {} });
      }
      const dds = ddsResult.rows[0];

      const itemsResult = await query(
        `SELECT di.*,
                b.name as building_name,
                f.floor_name,
                u.full_name as assigned_to_name,
                cu.full_name as completed_by_name
         FROM dds_items di
         LEFT JOIN buildings b ON b.id = di.building_id
         LEFT JOIN floors f ON f.id = di.floor_id
         LEFT JOIN users u ON u.id = di.assigned_to_id
         LEFT JOIN users cu ON cu.id = di.completed_by_id
         WHERE di.dds_id = $1
         ORDER BY di.sort_order`, [dds.id]
      );

      const phases = {};
      for (const item of itemsResult.rows) {
        const phase = item.phase || 'General';
        if (!phases[phase]) phases[phase] = { items: [], completed: 0, total: 0 };
        phases[phase].items.push(item);
        phases[phase].total++;
        if (item.status === 'completed') phases[phase].completed++;
      }

      res.json({
        dds,
        items: itemsResult.rows,
        phases,
        metadata: dds.generation_metadata,
      });
    } catch (err) {
      logger.error('Error fetching DDS:', err);
      res.status(500).json({ error: 'Failed to fetch DDS' });
    }
  });

  // Helper: Get DDS with all items
  const getDDSWithItems = async (ddsId) => {
    const ddsResult = await query(
      `SELECT d.*, u.full_name as created_by_name,
              p.name as project_name
       FROM dds d
       LEFT JOIN users u ON u.id = d.created_by_id
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`, [ddsId]
    );
    if (ddsResult.rows.length === 0) return null;

    const items = await query(
      `SELECT di.*,
              b.name as building_name,
              f.floor_name,
              u.full_name as assigned_to_name,
              cu.full_name as completed_by_name
       FROM dds_items di
       LEFT JOIN buildings b ON b.id = di.building_id
       LEFT JOIN floors f ON f.id = di.floor_id
       LEFT JOIN users u ON u.id = di.assigned_to_id
       LEFT JOIN users cu ON cu.id = di.completed_by_id
       WHERE di.dds_id = $1
       ORDER BY di.sort_order`, [ddsId]
    );

    const phases = {};
    for (const item of items.rows) {
      const phase = item.phase || 'General';
      if (!phases[phase]) phases[phase] = { items: [], completed: 0, total: 0 };
      phases[phase].items.push(item);
      phases[phase].total++;
      if (item.status === 'completed') phases[phase].completed++;
    }

    return { dds: ddsResult.rows[0], items: items.rows, phases };
  };

  // ========== LEGACY + STANDARD ENDPOINTS ==========

  // POST /api/projects/:projectId/dds - Create DDS (legacy)
  router.post('/projects/:projectId/dds', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { dds_type = 'internal' } = req.body;
      const userId = req.user?.userId;

      const versionResult = await query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM dds WHERE project_id = $1 AND dds_type = $2',
        [projectId, dds_type]
      );
      const nextVersion = versionResult.rows[0].next_version;

      const result = await query(
        `INSERT INTO dds (project_id, version, dds_type, status, created_by_id)
         VALUES ($1, $2, $3, 'active', $4) RETURNING *`,
        [projectId, nextVersion, dds_type, userId]
      );
      const dds = result.rows[0];

      await generateDDSItemsLegacy(dds.id, projectId, dds_type);

      await logActivity(projectId, userId, req.user?.email, 'dds', dds.id, 'create',
        { version: nextVersion, type: dds_type }, `Created DDS v${nextVersion} (${dds_type})`);

      const fullDDS = await getDDSWithItems(dds.id);
      res.status(201).json(fullDDS);
    } catch (err) {
      logger.error('Error creating DDS:', err);
      res.status(500).json({ error: 'Failed to create DDS' });
    }
  });

  // Legacy auto-generate (kept for backward compatibility)
  const generateDDSItemsLegacy = async (ddsId, projectId, ddsType) => {
    const buildings = await query(
      `SELECT b.id, b.name, b.application_type, b.status,
              json_agg(json_build_object('id', f.id, 'name', f.floor_name, 'number', f.floor_number) ORDER BY f.floor_number)
              FILTER (WHERE f.id IS NOT NULL) AS floors
       FROM buildings b
       LEFT JOIN floors f ON f.building_id = b.id
       WHERE b.project_id = $1
       GROUP BY b.id ORDER BY b.name`, [projectId]
    );

    const disciplines = ['Electrical', 'PHE', 'Fire Fighting', 'HVAC', 'Security'];
    const drawingTypes = ['Layout Drawing', 'Schematic', 'SLD', 'BOQ'];
    let sortOrder = 0;

    const dateOffset = ddsType === 'consultant' ? -7 : 0;
    const getDate = (daysFromNow) => {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow + dateOffset);
      return d.toISOString().split('T')[0];
    };

    for (const building of buildings.rows) {
      for (const discipline of disciplines) {
        for (const drawType of drawingTypes) {
          sortOrder++;
          await query(
            `INSERT INTO dds_items (dds_id, building_id, item_category, item_name, discipline,
             expected_start_date, expected_completion_date, sort_order, phase, section, trade, doc_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [ddsId, building.id, discipline,
             `${building.name} - ${discipline} ${drawType}`, discipline,
             getDate(sortOrder * 3), getDate(sortOrder * 3 + 14), sortOrder,
             DDS_PHASES.DESIGN, 'General', discipline, drawType]
          );
        }

        if (building.floors) {
          for (const floor of building.floors) {
            sortOrder++;
            await query(
              `INSERT INTO dds_items (dds_id, building_id, floor_id, item_category, item_name,
               discipline, expected_start_date, expected_completion_date, sort_order, phase, section, trade, doc_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
              [ddsId, building.id, floor.id, discipline,
               `${building.name} - ${floor.name || 'Floor ' + floor.number} - ${discipline} Layout`,
               discipline, getDate(sortOrder * 2), getDate(sortOrder * 2 + 10), sortOrder,
               DDS_PHASES.VFC, 'Floor Layouts', discipline, 'Drawing']
            );
          }
        }
      }
    }

    const siteAreas = await query(
      'SELECT id, name, area_type FROM site_areas WHERE project_id = $1', [projectId]
    );
    for (const area of siteAreas.rows) {
      for (const discipline of disciplines) {
        sortOrder++;
        await query(
          `INSERT INTO dds_items (dds_id, item_category, item_name, discipline,
           expected_start_date, expected_completion_date, sort_order, is_external_area, external_area_type,
           phase, section, trade, doc_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12)`,
          [ddsId, discipline,
           `${area.name} (${area.area_type}) - ${discipline}`, discipline,
           getDate(sortOrder * 2), getDate(sortOrder * 2 + 14), sortOrder, area.area_type,
           DDS_PHASES.VFC, 'External Areas', discipline, 'Drawing']
        );
      }
    }
  };

  // GET /api/projects/:projectId/dds - List DDS for project
  router.get('/projects/:projectId/dds', verifyToken, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { type } = req.query;
      let sql = `SELECT d.*, u.full_name as created_by_name,
                   (SELECT COUNT(*) FROM dds_items WHERE dds_id = d.id) as total_items,
                   (SELECT COUNT(*) FROM dds_items WHERE dds_id = d.id AND status = 'completed') as completed_items
                  FROM dds d
                  LEFT JOIN users u ON u.id = d.created_by_id
                  WHERE d.project_id = $1`;
      const params = [projectId];

      if (type) {
        sql += ' AND d.dds_type = $2';
        params.push(type);
      }
      sql += ' ORDER BY d.version DESC';

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching DDS list:', err);
      res.status(500).json({ error: 'Failed to fetch DDS' });
    }
  });

  // ========== DDS POLICY PREVIEW & INFO (before parametric :id routes) ==========

  // POST /api/dds/preview-policy - Preview DDS without creating
  router.post('/dds/preview-policy', verifyToken, async (req, res) => {
    try {
      const {
        projectStartDate = new Date().toISOString().split('T')[0],
        buildings = [],
        towerStaggerWeeks = 4,
        basementCount = 0,
        hasSwimmingPool = false,
        hasFitout = false,
      } = req.body;

      const policyResult = generateDDSPolicy({
        projectStartDate,
        buildings,
        towerStaggerWeeks,
        basementCount,
        hasSwimmingPool,
        hasFitout,
      });

      res.json({
        metadata: policyResult.metadata,
        itemCount: policyResult.items.length,
        phases: policyResult.metadata.phases,
        sampleItems: policyResult.items.slice(0, 20),
        heightTier: policyResult.metadata.tier,
      });
    } catch (err) {
      logger.error('Error previewing policy:', err);
      res.status(500).json({ error: 'Failed to preview policy' });
    }
  });

  // GET /api/dds/policy-info - Get Policy 130 info
  router.get('/dds/policy-info', verifyToken, async (req, res) => {
    try {
      const policy = getDefaultPolicy();
      res.json(policy);
    } catch (err) {
      logger.error('Error fetching policy info:', err);
      res.status(500).json({ error: 'Failed to fetch policy info' });
    }
  });

  // GET /api/dds/:id - Get single DDS with items
  router.get('/dds/:id', verifyToken, async (req, res) => {
    try {
      const result = await getDDSWithItems(req.params.id);
      if (!result) return res.status(404).json({ error: 'DDS not found' });
      res.json(result);
    } catch (err) {
      logger.error('Error fetching DDS:', err);
      res.status(500).json({ error: 'Failed to fetch DDS' });
    }
  });

  // PUT /api/dds/:id - Update DDS items
  router.put('/dds/:id', verifyToken, async (req, res) => {
    try {
      const { items } = req.body;
      const userId = req.user?.userId;

      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.id) {
            await query(
              `UPDATE dds_items SET
                item_name = COALESCE($1, item_name),
                expected_start_date = COALESCE($2, expected_start_date),
                expected_completion_date = COALESCE($3, expected_completion_date),
                architect_input_date = COALESCE($4, architect_input_date),
                structure_input_date = COALESCE($5, structure_input_date),
                assigned_to_id = COALESCE($6, assigned_to_id),
                sort_order = COALESCE($7, sort_order)
               WHERE id = $8`,
              [item.item_name, item.expected_start_date, item.expected_completion_date,
               item.architect_input_date, item.structure_input_date,
               item.assigned_to_id, item.sort_order, item.id]
            );
          }
        }
      }

      const ddsData = await getDDSWithItems(req.params.id);
      if (ddsData?.dds) {
        await logActivity(ddsData.dds.project_id, userId, req.user?.email, 'dds', ddsData.dds.id, 'update',
          { items_updated: items?.length }, 'Updated DDS items');
        await query(
          `INSERT INTO dds_history (dds_id, action, changed_by_id, changes)
           VALUES ($1, 'update', $2, $3)`,
          [req.params.id, userId, JSON.stringify({ items_updated: items?.length })]
        );
      }

      const fullDDS = await getDDSWithItems(req.params.id);
      res.json(fullDDS);
    } catch (err) {
      logger.error('Error updating DDS:', err);
      res.status(500).json({ error: 'Failed to update DDS' });
    }
  });

  // POST /api/dds/:id/regenerate - Regenerate DDS items, drawings, and BOQ
  router.post('/dds/:id/regenerate', verifyToken, async (req, res) => {
    try {
      const ddsResult = await query('SELECT * FROM dds WHERE id = $1', [req.params.id]);
      if (ddsResult.rows.length === 0) return res.status(404).json({ error: 'DDS not found' });
      const dds = ddsResult.rows[0];

      if (dds.policy_name) {
        const project = await query('SELECT * FROM projects WHERE id = $1', [dds.project_id]);
        const buildings = await query(
          `SELECT b.*, COALESCE(b.building_height, 30) as height,
                  json_agg(json_build_object('id', f.id, 'name', f.floor_name, 'number', f.floor_number) ORDER BY f.floor_number)
                  FILTER (WHERE f.id IS NOT NULL) AS floors
           FROM buildings b
           LEFT JOIN floors f ON f.building_id = b.id
           WHERE b.project_id = $1
           GROUP BY b.id ORDER BY COALESCE(b.tower_index, 0), b.name`, [dds.project_id]
        );

        const projectStartDate = project.rows[0]?.start_date || new Date().toISOString().split('T')[0];
        const towerStaggerWeeks = dds.tower_stagger_weeks || 4;
        const maxBasements = Math.max(...buildings.rows.map(b => b.basement_count || 0), 0);

        const buildingConfigs = buildings.rows.map((b, index) => ({
          id: b.id,
          name: b.name,
          height: parseFloat(b.building_height || b.height || 30),
          towerIndex: b.tower_index != null ? b.tower_index : index,
          hasPodium: (b.podium_count || 0) > 0,
          podiumCount: b.podium_count || 0,
          basementCount: b.basement_count || 0,
          totalFloors: b.floors ? b.floors.length : 0,
          floors: b.floors || [],
          floorTypes: inferFloorTypes(b.floors || []),
          hasLift: b.has_lift !== false,
          poolVolume: b.pool_volume || 0,
          applicationType: b.application_type,
        }));

        const policyResult = generateDDSPolicy({
          projectStartDate,
          buildings: buildingConfigs,
          towerStaggerWeeks,
          ddsType: dds.dds_type,
        });

        // Generate Drawing Lists (VFC + DD)
        const drawingLists = generateDrawingLists({
          buildings: buildingConfigs,
          projectStartDate,
          towerStaggerWeeks,
          hasBasement: maxBasements > 0,
          hasParking: true,
          ddsType: dds.dds_type,
        });

        // BOQ generation placeholder — will be implemented with a better approach later
        const boqRows = [];

        // Use transaction for all inserts (single connection = much faster)
        await transaction(async (client) => {
          // Delete existing data
          await client.query("DELETE FROM dds_items WHERE dds_id = $1 AND status != 'completed'", [dds.id]);
          await client.query('DELETE FROM dds_drawings WHERE dds_id = $1', [dds.id]);
          await client.query('DELETE FROM dds_boq_items WHERE dds_id = $1', [dds.id]);

          // Batch insert DDS items (chunks of 50)
          const BATCH = 50;
          for (let i = 0; i < policyResult.items.length; i += BATCH) {
            const batch = policyResult.items.slice(i, i + BATCH);
            const values = [];
            const params = [];
            batch.forEach((item, j) => {
              const off = j * 16;
              values.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8},$${off+9},$${off+10},$${off+11},$${off+12},$${off+13},$${off+14},$${off+15},$${off+16})`);
              params.push(dds.id, item.buildingId, item.discipline, item.itemName, item.discipline,
                item.expectedStartDate, item.expectedCompletionDate,
                item.architectInputDate, item.structureInputDate,
                item.sortOrder, item.phase, item.section, item.trade,
                item.levelType, item.docType, item.policyWeekOffset);
            });
            await client.query(
              `INSERT INTO dds_items (dds_id, building_id, item_category, item_name, discipline,
               expected_start_date, expected_completion_date, architect_input_date, structure_input_date,
               sort_order, phase, section, trade, level_type, doc_type, policy_week_offset)
               VALUES ${values.join(',')}`, params);
          }

          // Batch insert drawings
          const allDrawings = [...drawingLists.vfcDrawings, ...drawingLists.ddDrawings];
          for (let i = 0; i < allDrawings.length; i += BATCH) {
            const batch = allDrawings.slice(i, i + BATCH);
            const values = [];
            const params = [];
            batch.forEach((d, j) => {
              const off = j * 12;
              values.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8},$${off+9},$${off+10},$${off+11},$${off+12})`);
              params.push(dds.id, d.buildingId, d.listType, d.srNo, d.trade, d.docType,
                d.tower, d.level, d.description, d.category, d.ddsDate, d.sortOrder);
            });
            await client.query(
              `INSERT INTO dds_drawings (dds_id, building_id, list_type, sr_no, trade, doc_type,
               tower, level, description, category, dds_date, sort_order)
               VALUES ${values.join(',')}`, params);
          }

          // Batch insert BOQ
          for (let i = 0; i < boqRows.length; i += BATCH) {
            const batch = boqRows.slice(i, i + BATCH);
            const values = [];
            const params = [];
            batch.forEach((row, j) => {
              const off = j * 9;
              values.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8},$${off+9})`);
              params.push(...row);
            });
            await client.query(
              `INSERT INTO dds_boq_items (dds_id, building_id, sr_no, trade, category, description, unit, tender_item_ref, sort_order)
               VALUES ${values.join(',')}`, params);
          }
        });

        logger.info(`Regenerated DDS ${dds.id}: ${policyResult.items.length} items, ${drawingLists.vfcDrawings.length + drawingLists.ddDrawings.length} drawings, ${boqRows.length} BOQ items`);
      } else {
        await query("DELETE FROM dds_items WHERE dds_id = $1 AND status != 'completed'", [dds.id]);
        await generateDDSItemsLegacy(req.params.id, dds.project_id, dds.dds_type);
      }

      const fullDDS = await getDDSWithItems(req.params.id);
      res.json(fullDDS);
    } catch (err) {
      logger.error('Error regenerating DDS:', err);
      res.status(500).json({ error: 'Failed to regenerate DDS' });
    }
  });

  // ========== DDS Item Operations ==========

  // PUT /api/dds/items/:id/complete - Mark item complete
  router.put('/dds/items/:id/complete', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { remarks } = req.body || {};
      const result = await query(
        `UPDATE dds_items SET status = 'completed', actual_completion_date = CURRENT_DATE,
         completed_by_id = $1, description = COALESCE($2, description) WHERE id = $3 RETURNING *`,
        [userId, remarks, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'DDS item not found' });

      const item = result.rows[0];
      const ddsRes = await query('SELECT project_id FROM dds WHERE id = $1', [item.dds_id]);
      await logActivity(ddsRes.rows[0]?.project_id, userId, req.user?.email, 'dds_item',
        item.id, 'complete', { item_name: item.item_name }, `Completed DDS item: ${item.item_name}`);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error completing DDS item:', err);
      res.status(500).json({ error: 'Failed to complete DDS item' });
    }
  });

  // PATCH /api/dds-items/:id/complete - Legacy complete endpoint
  router.patch('/dds-items/:id/complete', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const result = await query(
        `UPDATE dds_items SET status = 'completed', actual_completion_date = CURRENT_DATE,
         completed_by_id = $1 WHERE id = $2 RETURNING *`,
        [userId, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'DDS item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error completing DDS item:', err);
      res.status(500).json({ error: 'Failed to complete DDS item' });
    }
  });

  // PUT /api/dds/items/:id/revise - Submit revision
  router.put('/dds/items/:id/revise', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { remarks, new_completion_date } = req.body || {};

      const currentItem = await query('SELECT * FROM dds_items WHERE id = $1', [req.params.id]);
      if (currentItem.rows.length === 0) return res.status(404).json({ error: 'DDS item not found' });
      const item = currentItem.rows[0];

      const newRevisionCount = (item.revision_count || 0) + 1;
      const newRevision = `R${newRevisionCount}`;

      await query(
        `INSERT INTO dds_item_revisions (dds_item_id, revision, revised_by_id, reason,
         previous_completion_date, new_completion_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.id, newRevision, userId, remarks, item.actual_completion_date, new_completion_date]
      );

      const result = await query(
        `UPDATE dds_items SET status = 'revised', revision = $1, revision_count = $2,
         actual_completion_date = NULL, expected_completion_date = COALESCE($3, expected_completion_date),
         description = COALESCE($4, description)
         WHERE id = $5 RETURNING *`,
        [newRevision, newRevisionCount, new_completion_date, remarks, req.params.id]
      );

      const ddsRes = await query('SELECT project_id FROM dds WHERE id = $1', [item.dds_id]);
      await logActivity(ddsRes.rows[0]?.project_id, userId, req.user?.email, 'dds_item',
        item.id, 'revise', { revision: newRevision, reason: remarks },
        `Revised DDS item to ${newRevision}: ${item.item_name}`);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error revising DDS item:', err);
      res.status(500).json({ error: 'Failed to revise DDS item' });
    }
  });

  // PATCH /api/dds-items/:id/revise - Legacy revise
  router.patch('/dds-items/:id/revise', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { reason, new_completion_date } = req.body;

      const currentItem = await query('SELECT * FROM dds_items WHERE id = $1', [req.params.id]);
      if (currentItem.rows.length === 0) return res.status(404).json({ error: 'DDS item not found' });
      const item = currentItem.rows[0];

      const newRevisionCount = (item.revision_count || 0) + 1;
      const newRevision = `R${newRevisionCount}`;

      await query(
        `INSERT INTO dds_item_revisions (dds_item_id, revision, revised_by_id, reason,
         previous_completion_date, new_completion_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.id, newRevision, userId, reason, item.actual_completion_date, new_completion_date]
      );

      const result = await query(
        `UPDATE dds_items SET status = 'revised', revision = $1, revision_count = $2,
         actual_completion_date = NULL, expected_completion_date = COALESCE($3, expected_completion_date)
         WHERE id = $4 RETURNING *`,
        [newRevision, newRevisionCount, new_completion_date, req.params.id]
      );

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error revising DDS item:', err);
      res.status(500).json({ error: 'Failed to revise DDS item' });
    }
  });

  // PUT /api/dds/items/:id/mark-input - Mark architect/structure input
  router.put('/dds/items/:id/mark-input', verifyToken, async (req, res) => {
    try {
      const { input_type } = req.body;
      const field = input_type === 'architect' ? 'architect_input_received' : 'structure_input_received';
      const dateField = input_type === 'architect' ? 'architect_input_received_date' : 'structure_input_received_date';

      const result = await query(
        `UPDATE dds_items SET ${field} = true, ${dateField} = CURRENT_DATE WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error marking input:', err);
      res.status(500).json({ error: 'Failed to mark input received' });
    }
  });

  // PATCH /api/dds-items/:id/mark-input - Legacy
  router.patch('/dds-items/:id/mark-input', verifyToken, async (req, res) => {
    try {
      const { input_type } = req.body;
      const field = input_type === 'architect' ? 'architect_input_received' : 'structure_input_received';
      const dateField = input_type === 'architect' ? 'architect_input_received_date' : 'structure_input_received_date';

      const result = await query(
        `UPDATE dds_items SET ${field} = true, ${dateField} = CURRENT_DATE WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error marking input:', err);
      res.status(500).json({ error: 'Failed to mark input received' });
    }
  });

  // PATCH /api/dds-items/:id/update-date
  router.patch('/dds-items/:id/update-date', verifyToken, async (req, res) => {
    try {
      const { expected_completion_date, keep_same } = req.body;
      if (keep_same) return res.json({ message: 'Date kept same' });

      const result = await query(
        'UPDATE dds_items SET expected_completion_date = $1 WHERE id = $2 RETURNING *',
        [expected_completion_date, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating date:', err);
      res.status(500).json({ error: 'Failed to update date' });
    }
  });

  // GET /api/dds-items/:id/revisions
  router.get('/dds-items/:id/revisions', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT r.*, u.full_name as revised_by_name
         FROM dds_item_revisions r
         LEFT JOIN users u ON u.id = r.revised_by_id
         WHERE r.dds_item_id = $1
         ORDER BY r.created_at DESC`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching revisions:', err);
      res.status(500).json({ error: 'Failed to fetch revisions' });
    }
  });

  // ========== DDS Analytics ==========

  // GET /api/dds/:id/progress
  router.get('/dds/:id/progress', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT
          discipline,
          phase,
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'revised' THEN 1 END) as revised_count,
          COUNT(CASE WHEN expected_completion_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue_count
         FROM dds_items WHERE dds_id = $1
         GROUP BY discipline, phase
         ORDER BY phase, discipline`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching DDS progress:', err);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  });

  // GET /api/dds/:id/overdue
  router.get('/dds/:id/overdue', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT di.*, b.name as building_name, f.floor_name, u.full_name as assigned_to_name
         FROM dds_items di
         LEFT JOIN buildings b ON b.id = di.building_id
         LEFT JOIN floors f ON f.id = di.floor_id
         LEFT JOIN users u ON u.id = di.assigned_to_id
         WHERE di.dds_id = $1 AND di.status != 'completed'
         AND di.expected_completion_date < CURRENT_DATE
         ORDER BY di.expected_completion_date`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching overdue items:', err);
      res.status(500).json({ error: 'Failed to fetch overdue items' });
    }
  });

  // GET /api/dds/:id/pending-inputs
  router.get('/dds/:id/pending-inputs', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT di.*, b.name as building_name
         FROM dds_items di
         LEFT JOIN buildings b ON b.id = di.building_id
         WHERE di.dds_id = $1
         AND (
           (di.architect_input_date IS NOT NULL AND NOT di.architect_input_received
            AND di.architect_input_date <= CURRENT_DATE + INTERVAL '3 days')
           OR
           (di.structure_input_date IS NOT NULL AND NOT di.structure_input_received
            AND di.structure_input_date <= CURRENT_DATE + INTERVAL '3 days')
         )
         ORDER BY LEAST(
           CASE WHEN NOT di.architect_input_received THEN di.architect_input_date END,
           CASE WHEN NOT di.structure_input_received THEN di.structure_input_date END
         )`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching pending inputs:', err);
      res.status(500).json({ error: 'Failed to fetch pending inputs' });
    }
  });

  // GET /api/dds/:id/export
  router.get('/dds/:id/export', verifyToken, async (req, res) => {
    try {
      const result = await getDDSWithItems(req.params.id);
      if (!result) return res.status(404).json({ error: 'DDS not found' });

      const today = new Date();
      const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      result.items = result.items.map(item => {
        let color = 'default';
        const dueDate = item.expected_completion_date ? new Date(item.expected_completion_date) : null;
        if (item.status === 'completed') color = 'green';
        else if (dueDate && dueDate < today) color = 'red';
        else if (dueDate && dueDate <= oneWeek) color = 'amber';
        else if (item.status === 'revised') color = 'blue';
        return { ...item, color };
      });

      res.json(result);
    } catch (err) {
      logger.error('Error exporting DDS:', err);
      res.status(500).json({ error: 'Failed to export DDS' });
    }
  });

  // ========== DDS Drawing Lists ==========

  // GET /api/dds/:id/drawings - Get VFC + DD drawing lists for a DDS
  router.get('/dds/:id/drawings', verifyToken, async (req, res) => {
    try {
      const { list_type, trade, tower, category } = req.query;
      let sql = `SELECT d.*, b.name as building_name
                 FROM dds_drawings d
                 LEFT JOIN buildings b ON b.id = d.building_id
                 WHERE d.dds_id = $1`;
      const params = [req.params.id];
      let paramIdx = 1;

      if (list_type) {
        paramIdx++;
        sql += ` AND d.list_type = $${paramIdx}`;
        params.push(list_type);
      }
      if (trade) {
        paramIdx++;
        sql += ` AND d.trade = $${paramIdx}`;
        params.push(trade);
      }
      if (tower) {
        paramIdx++;
        sql += ` AND d.tower = $${paramIdx}`;
        params.push(tower);
      }
      if (category) {
        paramIdx++;
        sql += ` AND d.category = $${paramIdx}`;
        params.push(category);
      }

      sql += ' ORDER BY d.list_type, d.sort_order';
      const result = await query(sql, params);

      // Group by list_type then category
      const grouped = { VFC: {}, DD: {} };
      for (const row of result.rows) {
        const lt = row.list_type || 'VFC';
        const cat = row.category || 'General';
        if (!grouped[lt]) grouped[lt] = {};
        if (!grouped[lt][cat]) grouped[lt][cat] = [];
        grouped[lt][cat].push(row);
      }

      // Summary
      const summary = {
        total: result.rows.length,
        vfc: result.rows.filter(r => r.list_type === 'VFC').length,
        dd: result.rows.filter(r => r.list_type === 'DD').length,
        completed: result.rows.filter(r => r.status === 'completed').length,
        trades: [...new Set(result.rows.map(r => r.trade))].sort(),
        towers: [...new Set(result.rows.map(r => r.tower).filter(Boolean))].sort(),
      };

      res.json({ drawings: result.rows, grouped, summary });
    } catch (err) {
      logger.error('Error fetching DDS drawings:', err);
      res.status(500).json({ error: 'Failed to fetch drawing list' });
    }
  });

  // PUT /api/dds/drawings/:id - Update a drawing entry (doc number, status, remarks)
  router.put('/dds/drawings/:id', verifyToken, async (req, res) => {
    try {
      const { document_number, revision, paper_size, drawing_scale, status, remarks } = req.body;
      const result = await query(
        `UPDATE dds_drawings SET
          document_number = COALESCE($1, document_number),
          revision = COALESCE($2, revision),
          paper_size = COALESCE($3, paper_size),
          drawing_scale = COALESCE($4, drawing_scale),
          status = COALESCE($5, status),
          remarks = COALESCE($6, remarks),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 RETURNING *`,
        [document_number, revision, paper_size, drawing_scale, status, remarks, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Drawing not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating drawing:', err);
      res.status(500).json({ error: 'Failed to update drawing' });
    }
  });

  // PUT /api/dds/drawings/:id/complete - Mark drawing as completed
  router.put('/dds/drawings/:id/complete', verifyToken, async (req, res) => {
    try {
      const { remarks } = req.body || {};
      const result = await query(
        `UPDATE dds_drawings SET status = 'completed', remarks = COALESCE($1, remarks),
         updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [remarks, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Drawing not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error completing drawing:', err);
      res.status(500).json({ error: 'Failed to complete drawing' });
    }
  });

  // GET /api/dds/:id/drawings/summary - Drawing list completion summary
  router.get('/dds/:id/drawings/summary', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT list_type, trade, tower, category,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM dds_drawings WHERE dds_id = $1
         GROUP BY list_type, trade, tower, category
         ORDER BY list_type, tower, category, trade`, [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching drawings summary:', err);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // ========== BOQ (Bill of Quantities) ==========

  // POST /api/dds/:id/boq/generate - Generate BOQ items dynamically from building data
  router.post('/dds/:id/boq/generate', verifyToken, async (req, res) => {
    try {
      const ddsId = req.params.id;
      const ddsResult = await query('SELECT * FROM dds WHERE id = $1', [ddsId]);
      if (ddsResult.rows.length === 0) return res.status(404).json({ error: 'DDS not found' });
      const dds = ddsResult.rows[0];

      // Get buildings with details for this project
      const buildings = await query(
        `SELECT b.id, b.name, b.application_type, b.has_lift, b.pool_volume,
                b.basement_count, b.podium_count, b.tower_index,
                (SELECT COUNT(*) FROM floors WHERE building_id = b.id) as floor_count
         FROM buildings b WHERE b.project_id = $1
         ORDER BY COALESCE(b.tower_index, 0), b.name`,
        [dds.project_id]
      );

      // Check if BOQ already exists
      const existing = await query('SELECT COUNT(*) as count FROM dds_boq_items WHERE dds_id = $1', [ddsId]);
      if (parseInt(existing.rows[0].count) > 0) {
        return res.status(400).json({ error: 'BOQ already generated. Delete existing items first or use regenerate.' });
      }

      // BOQ generation placeholder — will be implemented with a better approach later
      res.status(501).json({ message: 'BOQ generation not yet implemented. Coming soon.' });
    } catch (err) {
      logger.error('Error generating BOQ:', err);
      res.status(500).json({ error: 'Failed to generate BOQ: ' + err.message });
    }
  });

  // GET /api/dds/:id/boq - Get BOQ items for a DDS
  router.get('/dds/:id/boq', verifyToken, async (req, res) => {
    try {
      const { trade, status, building_id } = req.query;
      let sql = `SELECT b.*, bldg.name as building_name
                 FROM dds_boq_items b
                 LEFT JOIN buildings bldg ON bldg.id = b.building_id
                 WHERE b.dds_id = $1`;
      const params = [req.params.id];
      let paramIdx = 1;

      if (trade) { paramIdx++; sql += ` AND b.trade = $${paramIdx}`; params.push(trade); }
      if (status) { paramIdx++; sql += ` AND b.status = $${paramIdx}`; params.push(status); }
      if (building_id) { paramIdx++; sql += ` AND b.building_id = $${paramIdx}`; params.push(building_id); }

      sql += ' ORDER BY b.sort_order';
      const result = await query(sql, params);

      // Group by trade
      const grouped = {};
      for (const row of result.rows) {
        const t = row.trade || 'General';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(row);
      }

      // Summary
      const totalAmount = result.rows.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      const summary = {
        total: result.rows.length,
        draft: result.rows.filter(r => r.status === 'draft').length,
        submitted: result.rows.filter(r => r.status === 'submitted').length,
        approved: result.rows.filter(r => r.status === 'approved').length,
        totalAmount,
        trades: [...new Set(result.rows.map(r => r.trade))].sort(),
        buildings: [...new Set(result.rows.map(r => r.building_name).filter(Boolean))].sort(),
      };

      res.json({ items: result.rows, grouped, summary });
    } catch (err) {
      logger.error('Error fetching BOQ:', err);
      res.status(500).json({ error: 'Failed to fetch BOQ' });
    }
  });

  // PUT /api/dds/boq/:id - Update a BOQ item
  router.put('/dds/boq/:id', verifyToken, async (req, res) => {
    try {
      const { quantity, rate, unit, specification, status, remarks } = req.body;
      const amount = (quantity && rate) ? (parseFloat(quantity) * parseFloat(rate)) : null;

      const result = await query(
        `UPDATE dds_boq_items SET
          quantity = COALESCE($1, quantity),
          rate = COALESCE($2, rate),
          amount = COALESCE($3, amount),
          unit = COALESCE($4, unit),
          specification = COALESCE($5, specification),
          status = COALESCE($6, status),
          remarks = COALESCE($7, remarks),
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 RETURNING *`,
        [quantity, rate, amount, unit, specification, status, remarks, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'BOQ item not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating BOQ item:', err);
      res.status(500).json({ error: 'Failed to update BOQ item' });
    }
  });

  // DELETE /api/dds/:id/boq - Delete all BOQ for a DDS (for regeneration)
  router.delete('/dds/:id/boq', verifyToken, async (req, res) => {
    try {
      await query('DELETE FROM dds_boq_items WHERE dds_id = $1', [req.params.id]);
      res.json({ message: 'BOQ items deleted' });
    } catch (err) {
      logger.error('Error deleting BOQ:', err);
      res.status(500).json({ error: 'Failed to delete BOQ' });
    }
  });

  // GET /api/dds/:id/boq/export - Export BOQ as CSV-ready JSON
  router.get('/dds/:id/boq/export', verifyToken, async (req, res) => {
    try {
      const result = await query(
        `SELECT b.*, bldg.name as building_name
         FROM dds_boq_items b
         LEFT JOIN buildings bldg ON bldg.id = b.building_id
         WHERE b.dds_id = $1
         ORDER BY b.trade, b.sort_order`, [req.params.id]
      );
      res.json({ items: result.rows });
    } catch (err) {
      logger.error('Error exporting BOQ:', err);
      res.status(500).json({ error: 'Failed to export BOQ' });
    }
  });

  // ========== Progress Chart (monthly progress by building) ==========

  // GET /api/dds/:id/progress-chart - Monthly planned vs actual
  router.get('/dds/:id/progress-chart', verifyToken, async (req, res) => {
    try {
      const items = await query(
        `SELECT di.*, b.name as building_name
         FROM dds_items di
         LEFT JOIN buildings b ON b.id = di.building_id
         WHERE di.dds_id = $1
         ORDER BY di.expected_completion_date`, [req.params.id]
      );

      if (items.rows.length === 0) return res.json({ months: [], buildings: [] });

      // Find date range
      const dates = items.rows
        .map(i => i.expected_completion_date ? new Date(i.expected_completion_date) : null)
        .filter(Boolean);
      if (dates.length === 0) return res.json({ months: [], buildings: [] });

      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      // Generate monthly buckets
      const months = [];
      const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

      while (current < end) {
        months.push({
          label: current.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          year: current.getFullYear(),
          month: current.getMonth(),
        });
        current.setMonth(current.getMonth() + 1);
      }

      // Get building names
      const buildingNames = [...new Set(items.rows.map(i => i.building_name || 'All').filter(Boolean))].sort();

      // Calculate planned and actual per building per month
      const chartData = months.map(m => {
        const monthEnd = new Date(m.year, m.month + 1, 0);
        const entry = { label: m.label };

        for (const bName of buildingNames) {
          const buildingItems = items.rows.filter(i => (i.building_name || 'All') === bName);
          const totalForBuilding = buildingItems.length;
          const plannedByMonth = buildingItems.filter(i =>
            i.expected_completion_date && new Date(i.expected_completion_date) <= monthEnd
          ).length;
          const actualByMonth = buildingItems.filter(i =>
            i.actual_completion_date && new Date(i.actual_completion_date) <= monthEnd
          ).length;

          entry[`${bName}_planned`] = totalForBuilding > 0 ? Math.round((plannedByMonth / totalForBuilding) * 100) : 0;
          entry[`${bName}_actual`] = totalForBuilding > 0 ? Math.round((actualByMonth / totalForBuilding) * 100) : 0;
        }

        return entry;
      });

      // Overall summary per building
      const buildingSummary = buildingNames.map(bName => {
        const buildingItems = items.rows.filter(i => (i.building_name || 'All') === bName);
        return {
          name: bName,
          total: buildingItems.length,
          completed: buildingItems.filter(i => i.status === 'completed').length,
          overdue: buildingItems.filter(i =>
            i.expected_completion_date && new Date(i.expected_completion_date) < new Date() && i.status !== 'completed'
          ).length,
        };
      });

      res.json({ months: chartData, buildings: buildingSummary, buildingNames });
    } catch (err) {
      logger.error('Error fetching progress chart:', err);
      res.status(500).json({ error: 'Failed to fetch progress chart' });
    }
  });

  return router;
};

export default createDDSRouter;
