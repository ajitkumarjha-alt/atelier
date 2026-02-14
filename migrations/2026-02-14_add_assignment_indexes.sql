-- Performance indexes for my-assignments and dashboard loading
-- These indexes speed up the 5 parallel queries in /api/my-assignments

-- Tasks: lookup by assigned user + status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_id 
ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_status 
ON tasks(assigned_to_id, status);

-- DDS items: lookup by assigned user
CREATE INDEX IF NOT EXISTS idx_dds_items_assigned_to_id 
ON dds_items(assigned_to_id);

-- Change requests: lookup by assigned user
CREATE INDEX IF NOT EXISTS idx_rfc_assigned_to_id 
ON requests_for_change(assigned_to_id);

-- RFI: lookup by assigned user
CREATE INDEX IF NOT EXISTS idx_rfi_assigned_to_id 
ON requests_for_information(assigned_to_id);

-- MAS: lookup by assigned user
CREATE INDEX IF NOT EXISTS idx_mas_assigned_to_id 
ON material_approval_sheets(assigned_to_id);

-- Notifications: lookup by user + read status (for NotificationBell polling)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) WHERE is_read = false;

-- Projects: archive filter + sort (used on every dashboard load)
CREATE INDEX IF NOT EXISTS idx_projects_active 
ON projects(is_archived, updated_at DESC);
