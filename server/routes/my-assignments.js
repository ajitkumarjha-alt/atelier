import express from 'express';

const createMyAssignmentsRouter = ({ query, verifyToken, logger }) => {
  const router = express.Router();

  // GET /api/my-assignments - Unified view of all items assigned to current user
  router.get('/my-assignments', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { project_id, type, status } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const assignments = [];

      // Helper to safely run each query - skip if table doesn't exist
      const safeQuery = async (sql, params) => {
        try {
          return await query(sql, params);
        } catch (err) {
          if (err.message && err.message.includes('does not exist')) {
            return { rows: [] };
          }
          throw err;
        }
      };

      // Build all 5 queries with their params, then run in parallel
      const buildTaskQuery = () => {
        let sql = `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
                     t.created_at, t.assigned_at, t.completed_at,
                     p.name as project_name, p.id as project_id,
                     ab.full_name as assigned_by_name,
                     'task' as item_type,
                     t.task_type as sub_type
                   FROM tasks t
                   JOIN projects p ON p.id = t.project_id
                   LEFT JOIN users ab ON ab.id = t.assigned_by_id
                   WHERE t.assigned_to_id = $1`;
        const params = [userId];
        let paramCount = 1;
        if (project_id) { paramCount++; sql += ` AND t.project_id = $${paramCount}`; params.push(project_id); }
        if (status === 'active') sql += ` AND t.status != 'completed'`;
        else if (status === 'completed') sql += ` AND t.status = 'completed'`;
        sql += ' ORDER BY t.created_at DESC';
        return { sql, params };
      };

      const buildDdsQuery = () => {
        let sql = `SELECT di.id, di.item_name as title, di.item_category as description,
                     di.status, 'normal' as priority, di.expected_completion_date as due_date,
                     di.created_at, NULL as assigned_at, di.actual_completion_date as completed_at,
                     p.name as project_name, d.project_id,
                     NULL as assigned_by_name,
                     'dds' as item_type,
                     di.discipline as sub_type
                   FROM dds_items di
                   JOIN dds d ON d.id = di.dds_id
                   JOIN projects p ON p.id = d.project_id
                   WHERE di.assigned_to_id = $1`;
        const params = [userId];
        let paramCount = 1;
        if (project_id) { paramCount++; sql += ` AND d.project_id = $${paramCount}`; params.push(project_id); }
        if (status === 'active') sql += ` AND di.status != 'completed'`;
        else if (status === 'completed') sql += ` AND di.status = 'completed'`;
        sql += ' ORDER BY di.created_at DESC';
        return { sql, params };
      };

      const buildRfcQuery = () => {
        let sql = `SELECT r.id, r.title, r.description, r.status, r.priority, r.due_date,
                     r.created_at, r.assigned_at, NULL as completed_at,
                     p.name as project_name, r.project_id,
                     abu.full_name as assigned_by_name,
                     'rfc' as item_type,
                     'change_request' as sub_type
                   FROM requests_for_change r
                   JOIN projects p ON p.id = r.project_id
                   LEFT JOIN users abu ON abu.id = r.assigned_by_id
                   WHERE r.assigned_to_id = $1`;
        const params = [userId];
        let paramCount = 1;
        if (project_id) { paramCount++; sql += ` AND r.project_id = $${paramCount}`; params.push(project_id); }
        if (status === 'active') sql += ` AND r.status NOT IN ('approved', 'rejected', 'implemented')`;
        else if (status === 'completed') sql += ` AND r.status IN ('approved', 'rejected', 'implemented')`;
        sql += ' ORDER BY r.created_at DESC';
        return { sql, params };
      };

      const buildRfiQuery = () => {
        let sql = `SELECT r.id, COALESCE(r.rfi_subject, r.rfi_ref_no) as title,
                     r.rfi_description as description, r.status, r.priority, r.due_date,
                     r.created_at, r.assigned_at, NULL as completed_at,
                     p.name as project_name, r.project_id,
                     abu.full_name as assigned_by_name,
                     'rfi' as item_type,
                     'information_request' as sub_type
                   FROM requests_for_information r
                   JOIN projects p ON p.id = r.project_id
                   LEFT JOIN users abu ON abu.id = r.assigned_by_id
                   WHERE r.assigned_to_id = $1`;
        const params = [userId];
        let paramCount = 1;
        if (project_id) { paramCount++; sql += ` AND r.project_id = $${paramCount}`; params.push(project_id); }
        if (status === 'active') sql += ` AND r.status NOT IN ('Closed', 'Resolved', 'Approved')`;
        else if (status === 'completed') sql += ` AND r.status IN ('Closed', 'Resolved', 'Approved')`;
        sql += ' ORDER BY r.created_at DESC';
        return { sql, params };
      };

      const buildMasQuery = () => {
        let sql = `SELECT m.id, m.material_name as title,
                     COALESCE(m.material_category, '') as description,
                     m.status, 'normal' as priority, m.due_date,
                     m.created_at, m.assigned_at, NULL as completed_at,
                     p.name as project_name, m.project_id,
                     abu.full_name as assigned_by_name,
                     'mas' as item_type,
                     'material_approval' as sub_type
                   FROM material_approval_sheets m
                   JOIN projects p ON p.id = m.project_id
                   LEFT JOIN users abu ON abu.id = m.assigned_by_id
                   WHERE m.assigned_to_id = $1`;
        const params = [userId];
        let paramCount = 1;
        if (project_id) { paramCount++; sql += ` AND m.project_id = $${paramCount}`; params.push(project_id); }
        if (status === 'active') sql += ` AND m.final_status = 'Pending'`;
        else if (status === 'completed') sql += ` AND m.final_status != 'Pending'`;
        sql += ' ORDER BY m.created_at DESC';
        return { sql, params };
      };

      const taskQ = buildTaskQuery();
      const ddsQ = buildDdsQuery();
      const rfcQ = buildRfcQuery();
      const rfiQ = buildRfiQuery();
      const masQ = buildMasQuery();

      // Run all 5 queries in parallel instead of sequentially
      const [taskResult, ddsResult, rfcResult, rfiResult, masResult] = await Promise.all([
        safeQuery(taskQ.sql, taskQ.params),
        safeQuery(ddsQ.sql, ddsQ.params),
        safeQuery(rfcQ.sql, rfcQ.params),
        safeQuery(rfiQ.sql, rfiQ.params),
        safeQuery(masQ.sql, masQ.params),
      ]);

      const now = new Date();

      taskResult.rows.forEach(row => {
        row.is_overdue = row.status !== 'completed' && row.due_date && new Date(row.due_date) < now;
        assignments.push(row);
      });
      ddsResult.rows.forEach(row => {
        row.is_overdue = row.status !== 'completed' && row.due_date && new Date(row.due_date) < now;
        assignments.push(row);
      });
      rfcResult.rows.forEach(row => {
        row.is_overdue = !['approved','rejected','implemented'].includes(row.status) && row.due_date && new Date(row.due_date) < now;
        assignments.push(row);
      });
      rfiResult.rows.forEach(row => {
        row.is_overdue = !['Closed','Resolved','Approved'].includes(row.status) && row.due_date && new Date(row.due_date) < now;
        assignments.push(row);
      });
      masResult.rows.forEach(row => {
        row.is_overdue = row.final_status === 'Pending' && row.due_date && new Date(row.due_date) < now;
        assignments.push(row);
      });

      // Filter by type if requested
      let filtered = assignments;
      if (type) {
        filtered = assignments.filter(a => a.item_type === type);
      }

      // Sort: overdue first, then by due_date (soonest first), then by created_at
      filtered.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      // Summary counts
      const summary = {
        total: filtered.length,
        overdue: filtered.filter(a => a.is_overdue).length,
        active: filtered.filter(a => !['completed', 'Closed', 'Resolved', 'Approved', 'approved', 'rejected', 'implemented'].includes(a.status)).length,
        by_type: {
          task: filtered.filter(a => a.item_type === 'task').length,
          dds: filtered.filter(a => a.item_type === 'dds').length,
          rfc: filtered.filter(a => a.item_type === 'rfc').length,
          rfi: filtered.filter(a => a.item_type === 'rfi').length,
          mas: filtered.filter(a => a.item_type === 'mas').length,
        }
      };

      res.json({ assignments: filtered, summary });
    } catch (err) {
      logger.error('Error fetching my assignments:', err);
      res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  });

  // GET /api/my-assignments/summary - Quick counts only (for nav badges)
  router.get('/my-assignments/summary', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'User not authenticated' });

      const safeCount = async (sql, params) => {
        try {
          return await query(sql, params);
        } catch (err) {
          if (err.message && err.message.includes('does not exist')) {
            return { rows: [{ count: '0' }] };
          }
          throw err;
        }
      };

      const [tasks, dds, rfc, rfi, mas] = await Promise.all([
        safeCount(`SELECT COUNT(*) as count FROM tasks WHERE assigned_to_id = $1 AND status != 'completed'`, [userId]),
        safeCount(`SELECT COUNT(*) as count FROM dds_items WHERE assigned_to_id = $1 AND status != 'completed'`, [userId]),
        safeCount(`SELECT COUNT(*) as count FROM requests_for_change WHERE assigned_to_id = $1 AND status NOT IN ('approved', 'rejected', 'implemented')`, [userId]),
        safeCount(`SELECT COUNT(*) as count FROM requests_for_information WHERE assigned_to_id = $1 AND status NOT IN ('Closed', 'Resolved', 'Approved')`, [userId]),
        safeCount(`SELECT COUNT(*) as count FROM material_approval_sheets WHERE assigned_to_id = $1 AND final_status = 'Pending'`, [userId]),
      ]);

      const total = [tasks, dds, rfc, rfi, mas].reduce((sum, r) => sum + parseInt(r.rows[0].count), 0);

      res.json({
        total,
        task: parseInt(tasks.rows[0].count),
        dds: parseInt(dds.rows[0].count),
        rfc: parseInt(rfc.rows[0].count),
        rfi: parseInt(rfi.rows[0].count),
        mas: parseInt(mas.rows[0].count),
      });
    } catch (err) {
      logger.error('Error fetching assignment summary:', err);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  return router;
};

export default createMyAssignmentsRouter;
