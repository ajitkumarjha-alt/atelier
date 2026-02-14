import express from 'express';

const createProjectsRouter = ({
  query,
  verifyToken,
  logger,
  projectCreateValidators,
  projectUpdateValidators,
  handleValidationErrors,
  superAdminEmails
}) => {
  const router = express.Router();

  const getUserLevel = async (email) => {
    try {
      if (superAdminEmails.includes(email)) {
        return 'SUPER_ADMIN';
      }

      const result = await query('SELECT user_level FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        return result.rows[0].user_level;
      }
      return 'L4';
    } catch (error) {
      console.error('Error fetching user level:', error);
      return 'L4';
    }
  };

  router.get('/projects', verifyToken, async (req, res) => {
    try {
      const userEmail = req.user.email;
      // userLevel is already set by verifyToken middleware — no extra DB call needed
      const userLevel = req.user.userLevel || 'L4';

      let queryText;
      let params = [];

      if (userLevel === 'L2') {
        queryText = `
          SELECT p.*, u.full_name as assigned_lead_name
          FROM projects p
          LEFT JOIN users u ON p.assigned_lead_id = u.id
          WHERE p.assigned_lead_id = $1
          AND p.is_archived = FALSE
          ORDER BY p.updated_at DESC
        `;
        params = [req.user.userId];
      } else if (userLevel === 'L3' || userLevel === 'L4') {
        queryText = `
          SELECT p.*, u.full_name as assigned_lead_name
          FROM projects p
          LEFT JOIN users u ON p.assigned_lead_id = u.id
          WHERE p.is_archived = FALSE
          ORDER BY p.updated_at DESC
          LIMIT 10
        `;
      } else {
        // SUPER_ADMIN and L1 see all projects
        queryText = `
          SELECT p.*, u.full_name as assigned_lead_name
          FROM projects p
          LEFT JOIN users u ON p.assigned_lead_id = u.id
          WHERE p.is_archived = FALSE
          ORDER BY p.updated_at DESC
        `;
      }

      const result = await query(queryText, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  router.get('/projects-public', async (req, res) => {
    try {
      const result = await query(
        `SELECT p.*, 
                u.full_name as assigned_lead_name,
                (SELECT COUNT(*) FROM buildings WHERE project_id = p.id) as building_count
         FROM projects p
         LEFT JOIN users u ON p.assigned_lead_id = u.id
         WHERE p.is_archived = FALSE
         ORDER BY p.updated_at DESC`
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects', message: error.message });
    }
  });

  router.get('/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const text = `
        SELECT p.*, u.full_name as assigned_lead_name
        FROM projects p
        LEFT JOIN users u ON p.assigned_lead_id = u.id
        WHERE p.id = $1
      `;
      const result = await query(text, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  router.get('/projects/:id/team', async (req, res) => {
    try {
      const { id } = req.params;

      const text = `
        SELECT 
          pt.id,
          pt.user_id,
          pt.role,
          pt.assigned_at,
          u.email,
          u.full_name,
          u.user_level,
          assigned_by_user.full_name as assigned_by_name
        FROM project_team pt
        JOIN users u ON pt.user_id = u.id
        LEFT JOIN users assigned_by_user ON pt.assigned_by = assigned_by_user.id
        WHERE pt.project_id = $1
        ORDER BY u.user_level, u.full_name
      `;

      const result = await query(text, [id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching project team:', error);
      res.status(500).json({ error: 'Failed to fetch project team' });
    }
  });

  router.post('/projects/:id/team', verifyToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, role, assignedBy } = req.body;
      const currentUserLevel = req.user.userLevel;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const userToAdd = await query('SELECT user_level FROM users WHERE id = $1', [userId]);
      if (userToAdd.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      const targetUserLevel = userToAdd.rows[0].user_level;

      if (currentUserLevel === 'L2') {
        if (!['L3', 'L4'].includes(targetUserLevel)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'L2 users can only add L3 and L4 team members'
          });
        }
      } else if (currentUserLevel === 'L1') {
        if (!['L2', 'L3', 'L4'].includes(targetUserLevel)) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'L1 users can add L2, L3, and L4 team members'
          });
        }
      } else if (currentUserLevel !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to add team members'
        });
      }

      const text = `
        INSERT INTO project_team (project_id, user_id, role, assigned_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (project_id, user_id)
        DO UPDATE SET role = $3, assigned_by = $4, assigned_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await query(text, [id, userId, role || targetUserLevel, assignedBy || req.user.id]);
      logger.info(`Team member added to project ${id} by ${currentUserLevel}`);
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error adding team member:', error);
      res.status(500).json({ error: 'Failed to add team member' });
    }
  });

  router.delete('/projects/:id/team/:userId', async (req, res) => {
    try {
      const { id, userId } = req.params;

      const text = 'DELETE FROM project_team WHERE project_id = $1 AND user_id = $2 RETURNING *';
      const result = await query(text, [id, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Team member not found' });
      }

      res.json({ success: true, message: 'Team member removed' });
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  });

  router.post('/projects/:id/assign-lead', async (req, res) => {
    try {
      const { id } = req.params;
      const { leadId, userEmail } = req.body;

      const userLevel = await getUserLevel(userEmail);
      if (userLevel !== 'L1' && userLevel !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Unauthorized: L1 access required' });
      }

      const text = 'UPDATE projects SET assigned_lead_id = $1 WHERE id = $2 RETURNING *';
      const result = await query(text, [leadId, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error assigning lead:', error);
      res.status(500).json({ error: 'Failed to assign lead' });
    }
  });

  router.patch('/projects/:id/stage', async (req, res) => {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      const validStages = ['Concept', 'DD', 'Tender', 'VFC'];
      if (!validStages.includes(stage)) {
        return res.status(400).json({ error: 'Invalid stage' });
      }

      const text = 'UPDATE projects SET lifecycle_stage = $1 WHERE id = $2 RETURNING *';
      const result = await query(text, [stage, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating project stage:', error);
      res.status(500).json({ error: 'Failed to update project stage' });
    }
  });

  router.post('/projects/:id/archive', async (req, res) => {
    try {
      const { id } = req.params;

      const text = `
        UPDATE projects
        SET is_archived = TRUE, archived_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await query(text, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error archiving project:', error);
      res.status(500).json({ error: 'Failed to archive project' });
    }
  });

  router.get('/projects/archive/list', async (req, res) => {
    try {
      const text = `
        SELECT p.*, u.full_name as assigned_lead_name
        FROM projects p
        LEFT JOIN users u ON p.assigned_lead_id = u.id
        WHERE p.is_archived = TRUE
        ORDER BY p.archived_at DESC
      `;
      const result = await query(text);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching archived projects:', error);
      res.status(500).json({ error: 'Failed to fetch archived projects' });
    }
  });

  router.post('/projects', projectCreateValidators, handleValidationErrors, async (req, res) => {
    const { name, location, latitude, longitude, buildings, assignedLeadId } = req.body;

    try {
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      console.log('📝 Creating project:', { name, location, buildingCount: buildings?.length, assignedLeadId });

      const projectResult = await query(
        `INSERT INTO projects (name, description, lifecycle_stage, start_date, target_completion_date, assigned_lead_id)
         VALUES ($1, $2, 'Concept', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', $3)
         RETURNING id`,
        [name, location, assignedLeadId || null]
      );

      const projectId = projectResult.rows[0].id;

      const buildingIdMap = {};
      for (const building of buildings) {
        const buildingResult = await query(
          `INSERT INTO buildings (
            project_id, name, application_type, location_latitude, location_longitude,
            residential_type, villa_type, villa_count, building_type,
            gf_entrance_lobby,
            pool_volume, has_lift, lift_name, lift_passenger_capacity,
            car_parking_count_per_floor, car_parking_area, two_wheeler_parking_count,
            two_wheeler_parking_area, ev_parking_percentage, shop_count, shop_area,
            office_count, office_area, common_area, twin_of_building_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           RETURNING id`,
          [
            projectId,
            building.name,
            building.applicationType,
            latitude && latitude !== '' ? latitude : null,
            longitude && longitude !== '' ? longitude : null,
            building.residentialType || null,
            building.villaType || null,
            building.villaCount && building.villaCount !== '' ? building.villaCount : null,
            building.buildingType || null,
            building.gfEntranceLobby && building.gfEntranceLobby !== '' ? building.gfEntranceLobby : null,
            building.poolVolume && building.poolVolume !== '' ? building.poolVolume : null,
            building.hasLift || false,
            building.liftName || null,
            building.liftPassengerCapacity && building.liftPassengerCapacity !== '' ? building.liftPassengerCapacity : null,
            building.carParkingCountPerFloor && building.carParkingCountPerFloor !== '' ? building.carParkingCountPerFloor : null,
            building.carParkingArea && building.carParkingArea !== '' ? building.carParkingArea : null,
            building.twoWheelerParkingCount && building.twoWheelerParkingCount !== '' ? building.twoWheelerParkingCount : null,
            building.twoWheelerParkingArea && building.twoWheelerParkingArea !== '' ? building.twoWheelerParkingArea : null,
            building.evParkingPercentage && building.evParkingPercentage !== '' ? building.evParkingPercentage : null,
            building.shopCount && building.shopCount !== '' ? building.shopCount : null,
            building.shopArea && building.shopArea !== '' ? building.shopArea : null,
            building.officeCount && building.officeCount !== '' ? building.officeCount : null,
            building.officeArea && building.officeArea !== '' ? building.officeArea : null,
            building.commonArea && building.commonArea !== '' ? building.commonArea : null,
            null
          ]
        );

        const buildingId = buildingResult.rows[0].id;
        buildingIdMap[building.name] = buildingId;

        const floorIdMap = {};
        for (const floor of building.floors) {
          const floorHeightValue = floor.floorHeight === '' || floor.floorHeight === undefined
            ? null
            : floor.floorHeight ?? floor.floor_height ?? null;
          const floorResult = await query(
            `INSERT INTO floors (building_id, floor_number, floor_name, floor_height, twin_of_floor_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              buildingId,
              floor.floorNumber,
              floor.floorName,
              floorHeightValue,
              null
            ]
          );

          const floorId = floorResult.rows[0].id;
          floorIdMap[floor.floorName] = floorId;

          for (const flat of floor.flats) {
            await query(
              `INSERT INTO flats (floor_id, flat_type, area_sqft, number_of_flats)
               VALUES ($1, $2, $3, $4)`,
              [
                floorId,
                flat.type || null,
                flat.area && flat.area !== '' ? parseFloat(flat.area) : null,
                flat.count && flat.count !== '' ? parseInt(flat.count) : null
              ]
            );
          }
        }

        for (const floor of building.floors) {
          if (floor.twinOfFloorName && floorIdMap[floor.twinOfFloorName]) {
            await query(
              `UPDATE floors SET twin_of_floor_id = $1 WHERE id = $2`,
              [floorIdMap[floor.twinOfFloorName], floorIdMap[floor.floorName]]
            );
          }
        }
      }

      for (const building of buildings) {
        if (building.twinOfBuildingName && buildingIdMap[building.twinOfBuildingName]) {
          await query(
            `UPDATE buildings SET twin_of_building_id = $1 WHERE id = $2`,
            [buildingIdMap[building.twinOfBuildingName], buildingIdMap[building.name]]
          );
        }
      }

      res.json({ id: projectId, message: 'Project created successfully' });
    } catch (error) {
      console.error('Error creating project:', error.message);
      console.error('Full error:', error);
      res.status(500).json({ error: 'Failed to create project', details: error.message });
    }
  });

  router.patch('/projects/:id', projectUpdateValidators, handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    const { name, location, latitude, longitude, buildings, assignedLeadId } = req.body;

    console.log('🔄 PATCH /api/projects/:id called', { id, name, buildingCount: buildings?.length, assignedLeadId });

    try {
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      console.log('📝 Updating project:', { id, name, location, buildingCount: buildings?.length, assignedLeadId });

      await query(
        `UPDATE projects 
         SET name = $1, description = $2, assigned_lead_id = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [name, location, assignedLeadId || null, id]
      );

      await query('DELETE FROM buildings WHERE project_id = $1', [id]);

      const buildingIdMap = {};
      for (const building of buildings || []) {
        const buildingResult = await query(
          `INSERT INTO buildings (
            project_id, name, application_type, location_latitude, location_longitude,
            residential_type, villa_type, villa_count, building_type,
            gf_entrance_lobby,
            pool_volume, has_lift, lift_name, lift_passenger_capacity,
            car_parking_count_per_floor, car_parking_area, two_wheeler_parking_count,
            two_wheeler_parking_area, ev_parking_percentage, shop_count, shop_area,
            office_count, office_area, common_area, twin_of_building_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           RETURNING id`,
          [
            id,
            building.name,
            building.applicationType,
            building.latitude && building.latitude !== '' ? parseFloat(building.latitude) : null,
            building.longitude && building.longitude !== '' ? parseFloat(building.longitude) : null,
            building.residentialType || null,
            building.villaType || null,
            building.villaCount && building.villaCount !== '' ? parseInt(building.villaCount) : null,
            building.buildingType || null,
            building.gfEntranceLobby && building.gfEntranceLobby !== '' ? building.gfEntranceLobby : null,
            building.poolVolume && building.poolVolume !== '' ? parseFloat(building.poolVolume) : null,
            building.hasLift || false,
            building.liftName || null,
            building.liftPassengerCapacity && building.liftPassengerCapacity !== '' ? parseInt(building.liftPassengerCapacity) : null,
            building.carParkingCountPerFloor && building.carParkingCountPerFloor !== '' ? parseInt(building.carParkingCountPerFloor) : null,
            building.carParkingArea && building.carParkingArea !== '' ? parseFloat(building.carParkingArea) : null,
            building.twoWheelerParkingCount && building.twoWheelerParkingCount !== '' ? parseInt(building.twoWheelerParkingCount) : null,
            building.twoWheelerParkingArea && building.twoWheelerParkingArea !== '' ? parseFloat(building.twoWheelerParkingArea) : null,
            building.evParkingPercentage && building.evParkingPercentage !== '' ? parseFloat(building.evParkingPercentage) : null,
            building.shopCount && building.shopCount !== '' ? parseInt(building.shopCount) : null,
            building.shopArea && building.shopArea !== '' ? parseFloat(building.shopArea) : null,
            building.officeCount && building.officeCount !== '' ? parseInt(building.officeCount) : null,
            building.officeArea && building.officeArea !== '' ? parseFloat(building.officeArea) : null,
            building.commonArea && building.commonArea !== '' ? parseFloat(building.commonArea) : null,
            null
          ]
        );

        const buildingId = buildingResult.rows[0].id;
        buildingIdMap[building.name] = buildingId;

        const floorIdMap = {};
        for (const floor of building.floors || []) {
          const floorHeightValue = floor.floorHeight === '' || floor.floorHeight === undefined
            ? null
            : floor.floorHeight ?? floor.floor_height ?? null;
          const floorResult = await query(
            `INSERT INTO floors (building_id, floor_number, floor_name, floor_height, twin_of_floor_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              buildingId,
              floor.floorNumber,
              floor.floorName,
              floorHeightValue,
              null
            ]
          );

          const floorId = floorResult.rows[0].id;
          floorIdMap[floor.floorName] = floorId;

          for (const flat of floor.flats || []) {
            await query(
              `INSERT INTO flats (floor_id, flat_type, area_sqft, number_of_flats)
               VALUES ($1, $2, $3, $4)`,
              [
                floorId,
                flat.type || null,
                flat.area && flat.area !== '' ? parseFloat(flat.area) : null,
                flat.count && flat.count !== '' ? parseInt(flat.count) : null
              ]
            );
          }
        }

        for (const floor of building.floors || []) {
          if (floor.twinOfFloorName && floorIdMap[floor.twinOfFloorName]) {
            await query(
              `UPDATE floors SET twin_of_floor_id = $1 WHERE id = $2`,
              [floorIdMap[floor.twinOfFloorName], floorIdMap[floor.floorName]]
            );
          }
        }
      }

      for (const building of buildings || []) {
        if (building.twinOfBuildingName && buildingIdMap[building.twinOfBuildingName]) {
          await query(
            `UPDATE buildings SET twin_of_building_id = $1 WHERE id = $2`,
            [buildingIdMap[building.twinOfBuildingName], buildingIdMap[building.name]]
          );
        }
      }

      res.json({ id, message: 'Project updated successfully' });
    } catch (error) {
      console.error('Error updating project:', error.message);
      console.error('Full error:', error);
      res.status(500).json({ error: 'Failed to update project', details: error.message });
    }
  });

  router.get('/projects/:id/full', async (req, res) => {
    const { id } = req.params;

    try {
      // Run all 5 queries in parallel — no N+1 problem
      const [projectResult, societiesResult, buildingsResult, floorsResult, flatsResult] = await Promise.all([
        query('SELECT * FROM projects WHERE id = $1', [id]),
        query('SELECT * FROM societies WHERE project_id = $1 ORDER BY name', [id]),
        query(
          `SELECT buildings.*, societies.name AS society_name
           FROM buildings
           LEFT JOIN societies ON societies.id = buildings.society_id
           WHERE buildings.project_id = $1
           ORDER BY buildings.id`,
          [id]
        ),
        query(
          `SELECT floors.* FROM floors
           INNER JOIN buildings ON floors.building_id = buildings.id
           WHERE buildings.project_id = $1
           ORDER BY floors.building_id, floors.floor_number`,
          [id]
        ),
        query(
          `SELECT flats.* FROM flats
           INNER JOIN floors ON flats.floor_id = floors.id
           INNER JOIN buildings ON floors.building_id = buildings.id
           WHERE buildings.project_id = $1
           ORDER BY flats.floor_id`,
          [id]
        ),
      ]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectResult.rows[0];

      // Build lookup maps
      const buildingIdToNameMap = {};
      buildingsResult.rows.forEach(b => { buildingIdToNameMap[b.id] = b.name; });

      const floorIdToNameMap = {};
      floorsResult.rows.forEach(f => { floorIdToNameMap[f.id] = f.floor_name; });

      // Group flats by floor_id
      const flatsByFloorId = {};
      flatsResult.rows.forEach(flat => {
        if (!flatsByFloorId[flat.floor_id]) flatsByFloorId[flat.floor_id] = [];
        flatsByFloorId[flat.floor_id].push({
          id: flat.id,
          type: flat.flat_type,
          area: flat.area_sqft,
          count: flat.number_of_flats,
          flat_type: flat.flat_type,
          area_sqft: flat.area_sqft,
          number_of_flats: flat.number_of_flats,
        });
      });

      // Group floors by building_id
      const floorsByBuildingId = {};
      floorsResult.rows.forEach(floor => {
        if (!floorsByBuildingId[floor.building_id]) floorsByBuildingId[floor.building_id] = [];
        floorsByBuildingId[floor.building_id].push({
          id: floor.id,
          floorNumber: floor.floor_number,
          floorName: floor.floor_name,
          floorHeight: floor.floor_height,
          typicalLobbyArea: floor.typical_lobby_area,
          twinOfFloorId: floor.twin_of_floor_id,
          twinOfFloorName: floor.twin_of_floor_id ? floorIdToNameMap[floor.twin_of_floor_id] : null,
          floor_number: floor.floor_number,
          floor_name: floor.floor_name,
          floor_height: floor.floor_height,
          typical_lobby_area: floor.typical_lobby_area,
          twin_of_floor_id: floor.twin_of_floor_id,
          flats: flatsByFloorId[floor.id] || [],
        });
      });

      // Build societies array
      const societies = societiesResult.rows.map(society => ({
        id: society.id,
        name: society.name,
        description: society.description,
        project_id: society.project_id,
      }));

      // Build buildings array
      const buildings = buildingsResult.rows.map(building => ({
        id: building.id,
        name: building.name,
        applicationType: building.application_type,
        application_type: building.application_type,
        residentialType: building.residential_type,
        villaType: building.villa_type,
        villaCount: building.villa_count,
        isTwin: building.is_twin,
        twinOfBuildingId: building.twin_of_building_id,
        twinOfBuildingName: building.twin_of_building_id ? buildingIdToNameMap[building.twin_of_building_id] : null,
        twin_of_building_id: building.twin_of_building_id,
        societyId: building.society_id,
        society_id: building.society_id,
        societyName: building.society_name,
        gfEntranceLobby: building.gf_entrance_lobby,
        gf_entrance_lobby: building.gf_entrance_lobby,
        floors: floorsByBuildingId[building.id] || [],
      }));

      res.json({
        id: project.id,
        name: project.name,
        location: project.description,
        description: project.description,
        completion_percentage: project.completion_percentage,
        floors_completed: project.floors_completed,
        total_floors: project.total_floors,
        material_stock_percentage: project.material_stock_percentage,
        mep_status: project.mep_status,
        lifecycle_stage: project.lifecycle_stage,
        assigned_lead_name: project.lead_name,
        start_date: project.created_at,
        target_completion_date: project.created_at,
        status: project.project_status,
        latitude: buildingsResult.rows[0]?.location_latitude || '',
        longitude: buildingsResult.rows[0]?.location_longitude || '',
        buildings,
        societies,
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  return router;
};

export default createProjectsRouter;
