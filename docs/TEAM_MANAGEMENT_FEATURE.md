# Team Management Feature - L3/L4 Access Control

## Overview
Implemented comprehensive team management allowing L2 users to add L3 and L4 team members to projects, with appropriate view access for team members.

## Features Implemented

### 1. Team Member Addition by L2 Users
L2 (Lead) users can now add L3 and L4 team members to their assigned projects.

**Endpoint:** `POST /api/projects/:id/team`

**Permissions:**
- **SUPER_ADMIN**: Can add any user level
- **L1**: Can add L2, L3, L4 users
- **L2**: Can add L3, L4 users only ✅ NEW
- **L3/L4**: Cannot add users

**Request Body:**
```json
{
  "userId": 123,
  "role": "Junior Engineer",
  "assignedBy": 456
}
```

**Response:**
```json
{
  "id": 789,
  "project_id": 1,
  "user_id": 123,
  "role": "L3",
  "assigned_by": 456,
  "assigned_at": "2026-02-03T12:00:00Z"
}
```

**Error Handling:**
- Returns `403 Forbidden` if L2 tries to add L1 or L2 users
- Returns `404 Not Found` if user doesn't exist
- Returns `400 Bad Request` if userId is missing

### 2. L3/L4 View Access

Once added to a project team, L3 and L4 users can view:

#### ✅ Project Details
- Endpoint: `GET /api/projects/:id`
- Access: All team members can view project information

#### ✅ Design Calculations
- Endpoint: `GET /api/design-calculations?projectId=X`
- Endpoint: `GET /api/design-calculations/:id`
- Access: All team members can view calculations for their projects

#### ✅ Drawing Schedules
- Endpoint: `GET /api/drawing-schedules?projectId=X`
- Endpoint: `GET /api/drawing-schedules/:id`
- Access: All team members can view drawings for their projects

#### ✅ Project Schedule
- Implicit access through project details
- Team members can see timeline and status

### 3. Team Access Control Middleware

**New Middleware:** `checkProjectAccess`

Verifies that a user has access to a project through one of:
1. Being SUPER_ADMIN or L1 (full access)
2. Being L2 assigned lead for the project
3. Being a member of the project team (L3/L4 users)

**Usage:**
```javascript
app.get('/api/projects/:projectId/data', verifyToken, checkProjectAccess, handler);
```

### 4. New API Endpoint for User Discovery

**Endpoint:** `GET /api/users/addable`

Returns list of users that the authenticated user can add to a project team.

**Authorization:** Requires `verifyToken`

**Response Example:**
```json
[
  {
    "id": 3,
    "email": "engineer@example.com",
    "full_name": "John Doe",
    "user_level": "L3"
  },
  {
    "id": 4,
    "email": "tech@example.com",
    "full_name": "Jane Smith",
    "user_level": "L4"
  }
]
```

**Filtering by User Level:**
- SUPER_ADMIN → sees L1, L2, L3, L4
- L1 → sees L2, L3, L4
- L2 → sees L3, L4 only
- L3/L4 → empty array

## Database Schema

The `project_team` table structure:
```sql
CREATE TABLE IF NOT EXISTS project_team (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);
```

## Frontend Integration

### For L2 Dashboard

```javascript
// Fetch users that L2 can add
const response = await apiFetch('/api/users/addable', {
  headers: {
    'x-dev-user-email': user.email
  }
});
const addableUsers = await response.json();

// Add a team member
const response = await apiFetch(`/api/projects/${projectId}/team`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: selectedUserId,
    role: 'Junior Engineer',
    assignedBy: currentUserId
  })
});
```

### For L3/L4 Dashboards

```javascript
// View design calculations (now accessible)
const response = await apiFetch(`/api/design-calculations?projectId=${projectId}`, {
  headers: {
    'x-dev-user-email': user.email
  }
});
const calculations = await response.json();

// View drawing schedules (now accessible)
const response = await apiFetch(`/api/drawing-schedules?projectId=${projectId}`, {
  headers: {
    'x-dev-user-email': user.email
  }
});
const drawings = await response.json();
```

## Access Control Matrix

| User Level | Add Team Members | View Projects | View Calculations | View Drawings | View Schedule |
|------------|-----------------|---------------|-------------------|---------------|---------------|
| SUPER_ADMIN | All levels | All | All | All | All |
| L1 | L2, L3, L4 | All | All | All | All |
| L2 | L3, L4 ✅ | Assigned | Assigned | Assigned | Assigned |
| L3 | None | Team Only ✅ | Team Only ✅ | Team Only ✅ | Team Only ✅ |
| L4 | None | Team Only ✅ | Team Only ✅ | Team Only ✅ | Team Only ✅ |

## Security Considerations

1. **Role Validation**: System validates user level before allowing team member addition
2. **Project Association**: Team members can only access data for projects they're assigned to
3. **Authentication**: All endpoints require valid JWT token via `verifyToken`
4. **Audit Trail**: `assigned_by` and `assigned_at` fields track who added team members
5. **Cascade Delete**: Removing a project or user automatically cleans up team associations

## Usage Example

### Scenario: L2 Lead Adding Engineers

```javascript
// 1. L2 user (lead) logs in to their assigned project
const projectId = 5;

// 2. Fetch available users to add (only L3 and L4 will be returned)
const users = await fetch('/api/users/addable', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json());

// 3. Add L3 engineer to project team
await fetch(`/api/projects/${projectId}/team`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: users.find(u => u.user_level === 'L3').id,
    role: 'Structural Engineer',
    assignedBy: currentL2UserId
  })
});

// 4. Now the L3 user can view:
// - Project details
// - Design calculations
// - Drawing schedules
// - Project timeline
```

## Testing

### Test Cases

1. **L2 adds L3 user** ✅
   - Should succeed
   - L3 user should gain view access

2. **L2 attempts to add L1 user** ✅
   - Should return 403 Forbidden
   - Error message explains restriction

3. **L3 user views calculations** ✅
   - Should only see calculations for projects they're team member of
   - Should not see other projects

4. **L4 user views drawings** ✅
   - Should only see drawings for their assigned projects
   - Should receive 403 for non-team projects

## Next Steps (Optional Enhancements)

1. **Role-specific permissions**: Different view/edit permissions based on team role
2. **Team notifications**: Email notifications when added to a team
3. **Team activity log**: Track who viewed what and when
4. **Bulk team addition**: Add multiple users at once
5. **Team templates**: Predefined team structures for common project types

## Migration Notes

- No database migration required (project_team table already exists)
- Existing team members retain their access
- No breaking changes to existing API endpoints

---

**Implementation Date:** February 3, 2026  
**Status:** ✅ Complete and Tested  
**Breaking Changes:** None
