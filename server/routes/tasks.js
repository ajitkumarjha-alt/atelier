import express from 'express';

const createTasksRouter = ({ query, verifyToken, logger }) => {
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

  // POST /api/tasks - Create task (L2 assigns to L3/L4)
  router.post('/tasks', verifyToken, async (req, res) => {
    try {
      const { project_id, dds_item_id, title, description, task_type, assigned_to_id, due_date, priority } = req.body;
      const userId = req.user?.userId;

      if (!title || !assigned_to_id || !project_id) {
        return res.status(400).json({ error: 'Title, assigned_to_id, and project_id are required' });
      }

      const result = await query(
        `INSERT INTO tasks (project_id, dds_item_id, title, description, task_type, assigned_by_id,
         assigned_to_id, due_date, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [project_id, dds_item_id, title, description, task_type || 'drawing',
         userId, assigned_to_id, due_date, priority || 'normal']
      );

      // Create notification for assigned user
      await query(
        `INSERT INTO notifications (user_id, project_id, title, message, notification_type, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, 'todo', 'task', $5)`,
        [assigned_to_id, project_id, 'New Task Assigned', `New task: ${title}`, result.rows[0].id]
      );

      await logActivity(project_id, userId, req.user?.email, 'task', result.rows[0].id, 'assign',
        { assigned_to_id, title }, `Assigned task: ${title}`);

      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('Error creating task:', err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // GET /api/tasks - List tasks (filtered by user, project, status)
  router.get('/tasks', verifyToken, async (req, res) => {
    try {
      const { project_id, assigned_to_id, assigned_by_id, status, sort_by } = req.query;
      let sql = `SELECT t.*, 
                   p.name as project_name,
                   ab.full_name as assigned_by_name,
                   at2.full_name as assigned_to_name,
                   di.item_name as dds_item_name,
                   di.expected_completion_date as dds_due_date
                 FROM tasks t
                 JOIN projects p ON p.id = t.project_id
                 LEFT JOIN users ab ON ab.id = t.assigned_by_id
                 LEFT JOIN users at2 ON at2.id = t.assigned_to_id
                 LEFT JOIN dds_items di ON di.id = t.dds_item_id
                 WHERE 1=1`;
      const params = [];
      let paramCount = 0;

      if (project_id) { paramCount++; sql += ` AND t.project_id = $${paramCount}`; params.push(project_id); }
      if (assigned_to_id) { paramCount++; sql += ` AND t.assigned_to_id = $${paramCount}`; params.push(assigned_to_id); }
      if (assigned_by_id) { paramCount++; sql += ` AND t.assigned_by_id = $${paramCount}`; params.push(assigned_by_id); }
      if (status) { paramCount++; sql += ` AND t.status = $${paramCount}`; params.push(status); }

      // Sort overdue on top, then by due date
      switch (sort_by) {
        case 'project':
          sql += ' ORDER BY p.name, t.due_date ASC NULLS LAST';
          break;
        case 'completion_date':
          sql += ' ORDER BY t.completed_at DESC NULLS LAST';
          break;
        case 'overdue':
          sql += ` ORDER BY CASE WHEN t.status != 'completed' AND t.due_date < CURRENT_DATE THEN 0 ELSE 1 END, t.due_date ASC NULLS LAST`;
          break;
        default:
          sql += ` ORDER BY CASE WHEN t.status != 'completed' AND t.due_date < CURRENT_DATE THEN 0 
                   WHEN t.status != 'completed' AND t.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 1
                   ELSE 2 END, t.due_date ASC NULLS LAST`;
      }

      const result = await query(sql, params);

      // Add color flags
      const today = new Date();
      const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const tasks = result.rows.map(task => {
        let flag = 'normal';
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        if (task.status === 'completed') flag = 'completed';
        else if (dueDate && dueDate < today) flag = 'overdue';
        else if (dueDate && dueDate <= oneWeek) flag = 'due_soon';
        return { ...task, flag };
      });

      res.json(tasks);
    } catch (err) {
      logger.error('Error fetching tasks:', err);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // GET /api/tasks/my - Get tasks for current user
  router.get('/tasks/my', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { week } = req.query;

      let dateFilter = '';
      if (week === 'current') {
        dateFilter = `AND (t.due_date BETWEEN date_trunc('week', CURRENT_DATE) AND date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')`;
      }

      const result = await query(
        `SELECT t.*, p.name as project_name, ab.full_name as assigned_by_name,
                di.item_name as dds_item_name
         FROM tasks t
         JOIN projects p ON p.id = t.project_id
         LEFT JOIN users ab ON ab.id = t.assigned_by_id
         LEFT JOIN dds_items di ON di.id = t.dds_item_id
         WHERE t.assigned_to_id = $1 ${dateFilter}
         ORDER BY CASE WHEN t.status != 'completed' AND t.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
                  t.due_date ASC NULLS LAST`, [userId]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching my tasks:', err);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // PATCH /api/tasks/:id/complete - Mark task completed
  router.patch('/tasks/:id/complete', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const result = await query(
        `UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`, [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

      const task = result.rows[0];

      // Notify the assigner (L2)
      await query(
        `INSERT INTO notifications (user_id, project_id, title, message, notification_type, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, 'info', 'task', $5)`,
        [task.assigned_by_id, task.project_id, 'Task Completed',
         `Task "${task.title}" has been completed`, task.id]
      );

      // Update DDS item if linked
      if (task.dds_item_id) {
        await query(
          `UPDATE dds_items SET status = 'completed', actual_completion_date = CURRENT_DATE,
           completed_by_id = $1 WHERE id = $2`,
          [userId, task.dds_item_id]
        );
      }

      await logActivity(task.project_id, userId, req.user?.email, 'task', task.id, 'complete',
        { title: task.title }, `Completed task: ${task.title}`);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error completing task:', err);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  // PATCH /api/tasks/:id - Update task
  router.patch('/tasks/:id', verifyToken, async (req, res) => {
    try {
      const { title, description, due_date, priority, status } = req.body;
      const result = await query(
        `UPDATE tasks SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          due_date = COALESCE($3, due_date),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status)
         WHERE id = $6 RETURNING *`,
        [title, description, due_date, priority, status, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error updating task:', err);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // GET /api/tasks/history - Task history for user
  router.get('/tasks/history', verifyToken, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const { from_date, to_date, project_id, status } = req.query;
      
      let sql = `SELECT t.*, p.name as project_name, ab.full_name as assigned_by_name
                 FROM tasks t
                 JOIN projects p ON p.id = t.project_id
                 LEFT JOIN users ab ON ab.id = t.assigned_by_id
                 WHERE t.assigned_to_id = $1`;
      const params = [userId];
      let paramCount = 1;

      if (from_date) { paramCount++; sql += ` AND t.created_at >= $${paramCount}`; params.push(from_date); }
      if (to_date) { paramCount++; sql += ` AND t.created_at <= $${paramCount}`; params.push(to_date); }
      if (project_id) { paramCount++; sql += ` AND t.project_id = $${paramCount}`; params.push(project_id); }
      if (status) { paramCount++; sql += ` AND t.status = $${paramCount}`; params.push(status); }

      sql += ' ORDER BY t.created_at DESC';
      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      logger.error('Error fetching task history:', err);
      res.status(500).json({ error: 'Failed to fetch task history' });
    }
  });

  // GET /api/tasks/stats - Task statistics for dashboard
  router.get('/tasks/stats', verifyToken, async (req, res) => {
    try {
      const { project_id, user_id } = req.query;
      const userId = user_id || req.user?.userId;

      const result = await query(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status != 'completed' AND due_date < CURRENT_DATE THEN 1 END) as overdue,
          COUNT(CASE WHEN status != 'completed' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 1 END) as due_this_week
         FROM tasks
         WHERE assigned_to_id = $1 ${project_id ? 'AND project_id = $2' : ''}`,
        project_id ? [userId, project_id] : [userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('Error fetching task stats:', err);
      res.status(500).json({ error: 'Failed to fetch task stats' });
    }
  });

  return router;
};

export default createTasksRouter;
