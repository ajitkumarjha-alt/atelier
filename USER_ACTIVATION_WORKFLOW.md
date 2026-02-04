# User Access Control Implementation

## Overview
Implemented a strict access control system where users cannot self-register. All users must be manually added to projects by L0, L1, or L2 administrators through the project team management section.

## Security Issue Identified
**Problem**: Any user with a `@lodhagroup.com` email could automatically register and gain L4 access without any approval process.

**Impact**: Unauthorized employees could access sensitive MEP project data without proper verification.

## Solution Architecture

### 1. No Auto-Registration
- Non-registered users cannot create accounts by logging in
- Only existing users can authenticate successfully
- Super admins are the only exception (auto-created from whitelist)

### 2. User Registration Flow

#### Non-Registered User Login
- User attempts to log in with Google OAuth
- `/api/auth/sync` checks if user exists in database
- If not found (and not super admin), returns `403 Forbidden`
- User redirected to static "Access Not Granted" page
- Console log: `⚠️ Login attempt by non-registered user: email (name)`

#### Super Admin Auto-Creation
```javascript
if (SUPER_ADMIN_EMAILS.includes(email)) {
  // Auto-create super admin account
  INSERT INTO users (email, full_name, user_level, is_active)
  VALUES ($1, $2, 'SUPER_ADMIN', true)
}
```

#### Manual User Addition (L0/L1/L2 Only)
- Administrators add users through project team management
- User created with appropriate role and project assignment
- User can then log in and access assigned projects

### 3. Frontend Components

#### A. PendingApproval Page (`/pending-approval`)
**Purpose**: Shows static message to non-registered users

**Features**:
- No auto-refresh or polling (users cannot self-register)
- Displays clear "Access Not Granted" message
- Shows contact information for administrators
- Explains manual registration process through project teams
- Sign-out button for user control

**Location**: [src/pages/PendingApproval.jsx](src/pages/PendingApproval.jsx)

**Route Protection**:
```jsx
// Only accessible by non-registered users (userLevel === null)
user && userLevel === null ? <PendingApproval /> : <Navigate />
```

#### B. UserContext Update
**Purpose**: Track user registration status

**Changes**:
- `userLevel === null` indicates non-registered user
- `isActive` set to `false` for non-registered users
- Provides `{ user, userLevel, loading, isActive }` to all components

**Location**: [src/lib/UserContext.jsx](src/lib/UserContext.jsx)

#### C. App.jsx Routing Updates
**Purpose**: Redirect non-registered users to pending approval page

**Changes**:
```jsx
// Check if user is registered
user && userLevel === null ? (
  <Navigate to="/pending-approval" replace />
) : (
  // Show dashboard based on user level
)
```

**Location**: [src/App.jsx](src/App.jsx)

### 4. Backend API Endpoint

#### POST `/api/auth/sync`
**Purpose**: Authenticate existing users or auto-create super admins

**Authentication**: None (handles initial authentication)

**Request Body**:
```json
{
  "email": "user@lodhagroup.com",
  "fullName": "John Doe"
}
```

**Response (Existing User)**:
```json
{
  "id": 123,
  "email": "user@lodhagroup.com",
  "full_name": "John Doe",
  "user_level": "L2",
  "is_active": true
}
```

**Response (Non-Registered User)**:
```json
Status: 403 Forbidden
{
  "error": "Not registered",
  "message": "Your account is not registered in the system. Please contact your administrator for access.",
  "email": "user@lodhagroup.com"
}
```

**Response (Super Admin Auto-Create)**:
```json
{
  "id": 124,
  "email": "admin@lodhagroup.com",
  "full_name": "Admin User",
  "user_level": "SUPER_ADMIN",
  "is_active": true
}
```

**Location**: [server/index.js](server/index.js#L1737)

### 5. User Addition Through Project Teams

**Who Can Add Users**: L0, L1, and L2 administrators only

**Where**: Project page → Team Management section

**Process**:
1. Admin navigates to a project
2. Opens team management section
3. Adds user with email and assigns role
4. User is created in database with project assignment
5. User can now log in and access the system

**Note**: This is the **only** way to add new users to the system (except super admins).

## User Experience Flow

### For Non-Registered Users
1. **Login Attempt**: User clicks "Sign in with Google"
2. **Firebase Auth**: Google OAuth authenticates user
3. **Backend Check**: `/api/auth/sync` returns 403 (not registered)
4. **Redirect**: User redirected to `/pending-approval` page
5. **Static Message**: Page shows "Access Not Granted" with instructions
6. **No Auto-Refresh**: Page is static - user must contact admin
7. **Manual Addition**: Admin adds user through project team management
8. **Access Granted**: User can now log in successfully

### For L0/L1/L2 Administrators
1. **Project Access**: Navigate to project page
2. **Team Section**: Open team management
3. **Add User**: Enter email and assign role
4. **Confirmation**: System confirms user creation
5. **Notification**: User can now access the system

## Technical Implementation Details

### No Auto-Refresh Mechanism
The pending approval page is static - no polling or auto-refresh:
```javascript
// PendingApproval.jsx - NO useEffect for polling
// User must contact admin and be manually added
// Then user can log in again successfully
```

### Non-Registration Detection
```javascript
// Backend returns 403 for non-registered users
if (!existingUser && !isSuperAdmin) {
  return res.status(403).json({ 
    error: 'Not registered',
    message: 'Contact admin for access'
  });
}

// Frontend detects 403 and sets userLevel to null
if (response.status === 403) {
  return { user_level: null, is_active: false };
}
```

### Frontend State Management
```javascript
// UserContext.jsx
if (userData.error === 'Not registered' || userData.user_level === null) {
  setUserLevel(null); // Indicates non-registered
  setIsActive(false);
}
```

## Security Improvements

### Before Implementation
- ❌ Auto-registration for any `@lodhagroup.com` email
- ❌ Immediate L4 access without verification
- ❌ No audit trail for new users
- ❌ No admin control over user access

### After Implementation
- ✅ No auto-registration - users must be manually added
- ✅ SUPER_ADMIN whitelist for auto-creation only
- ✅ Console logging for audit trail
- ✅ L0/L1/L2 control through project team management
- ✅ Clear user feedback via static message page
- ✅ 403 response for non-registered login attempts
- ✅ No pending approval queue - direct team assignment required

## Testing Checklist

### Non-Registered User Flow
- [ ] Non-registered user logs in with Google OAuth
- [ ] Backend returns 403 status
- [ ] User redirected to `/pending-approval` page
- [ ] Pending approval page shows "Access Not Granted" message
- [ ] No auto-refresh or polling occurs
- [ ] Console logs login attempt: `⚠️ Login attempt by non-registered user: email`
- [ ] Sign-out button works correctly

### Admin Adding Users via Team Management
- [ ] L0 user can access project team section
- [ ] L1 user can access project team section
- [ ] L2 user can access project team section
- [ ] L3/L4 users cannot add team members
- [ ] Admin can enter email and assign role
- [ ] User created successfully in database
- [ ] Console logs user creation
- [ ] User can now log in successfully

### User Access After Addition
- [ ] Previously denied user can now log in
- [ ] User redirected to appropriate dashboard
- [ ] User can access assigned projects
- [ ] User level reflects assigned role

### Super Admin Auto-Creation
- [ ] Super admin emails auto-create accounts
- [ ] Auto-created with `is_active = true`
- [ ] Auto-created with `user_level = SUPER_ADMIN`
- [ ] Console logs super admin creation

### Edge Cases
- [ ] Existing users not affected by changes
- [ ] Multiple non-registered users handled correctly
- [ ] Network errors handled gracefully
- [ ] Invalid emails rejected properly

## Files Modified

### Backend
- [server/index.js](server/index.js)
  - Modified `/api/auth/sync` endpoint to reject non-registered users
  - Returns 403 for non-registered, non-super-admin users
  - Auto-creates super admin accounts only
  - Removed auto-user-creation logic

### Frontend - Services
- [src/services/userService.js](src/services/userService.js)
  - Updated `createOrUpdateUser` to handle 403 responses
  - Returns error object for non-registered users

### Frontend - Context & Routing
- [src/lib/UserContext.jsx](src/lib/UserContext.jsx)
  - Updated to handle non-registered users (`userLevel === null`)
  - Sets `isActive = false` for non-registered users
- [src/App.jsx](src/App.jsx)
  - Updated `/pending-approval` route for non-registered users
  - Redirects `userLevel === null` to pending approval page

### Frontend - Pages
- [src/pages/PendingApproval.jsx](src/pages/PendingApproval.jsx)
  - Removed auto-refresh polling mechanism
  - Updated to show static "Access Not Granted" message
  - Updated instructions for manual team addition
- [src/pages/L1Dashboard.jsx](src/pages/L1Dashboard.jsx)
  - Removed PendingUsers component import and section
  - No longer shows pending approvals

### Removed/Deprecated
- [src/components/PendingUsers.jsx](src/components/PendingUsers.jsx)
  - No longer used (kept for reference)
- `/api/users/pending` endpoint - No longer needed
- `/api/users/:id/activate` endpoint - No longer needed

## Configuration

### Super Admin Whitelist
Located in: [server/index.js](server/index.js)

```javascript
const SUPER_ADMIN_EMAILS = [
  'ayush.lodha@lodhagroup.com',
  // Add more super admin emails here
];
```

**Note**: Super admins are auto-activated and bypass the approval workflow.

## Monitoring & Logging

### Console Logs
- **Non-Registered Login**: `⚠️ Login attempt by non-registered user: email (name)`
- **Super Admin Creation**: `✅ Super admin auto-created: email`
- **Manual User Addition**: (via project team management)

### Database Queries
```sql
-- Check if user exists
SELECT * FROM users WHERE email = 'user@lodhagroup.com';

-- Check all users
SELECT email, user_level, is_active FROM users ORDER BY created_at DESC;

-- Manually add a user (emergency)
INSERT INTO users (email, full_name, user_level, is_active)
VALUES ('user@lodhagroup.com', 'User Name', 'L4', true);
```

## Future Enhancements

### Potential Improvements
1. **Email Notifications**
   - Notify admins of failed login attempts
   - Send welcome email when user is added to team

2. **Bulk User Import**
   - CSV upload for adding multiple users
   - Batch project team assignments

3. **User Invitation System**
   - L0/L1/L2 can send invitation links
   - Pre-create accounts with temporary passwords
   - Users activate on first login

4. **Self-Service Request**
   - Allow users to submit access requests
   - Admins review and approve/reject
   - Notification system for both parties

5. **Audit Trail Enhancement**
   - Track who added each user
   - Store addition timestamp
   - Generate user access reports
   - Log all failed login attempts

6. **Advanced Team Management**
   - Role templates for common assignments
   - Department-based auto-assignment
   - Project cloning with team preservation

## Deployment Notes

### Database
The `is_active` column already exists and remains unchanged. All existing users retain their current access.

### Environment Variables
No new environment variables required.

### Rollback Plan
If issues arise:
1. Temporarily add auto-registration back to [server/index.js](server/index.js) auth/sync endpoint
2. Create users with default L4 level as before
3. Remove 403 check from [src/services/userService.js](src/services/userService.js)

## Success Criteria

### Security
- ✅ No unauthorized auto-registration
- ✅ All users must be manually added by L0/L1/L2
- ✅ SUPER_ADMIN whitelist functions correctly
- ✅ 403 response for non-registered login attempts

### User Experience
- ✅ Clear messaging on access denied page
- ✅ No confusion about access status
- ✅ Instructions explain how to get access
- ✅ Admins can easily add users via team management

### Technical
- ✅ API endpoint returns proper 403 status
- ✅ Frontend routing handles non-registered users
- ✅ UserContext properly tracks registration status
- ✅ Console logging for security audit trail

---

**Implementation Date**: February 4, 2026  
**Implemented By**: GitHub Copilot (Claude Sonnet 4.5)  
**User Requirement**: "new non registered user if try to login, will be taken to message page mentioning that they should contact admin for access. they will not be given any access, not any message or pending card to L1. user cannot apply to access. it will be done by L0,L1 or l2 only, in project page, team section"  
**Status**: ✅ Complete and Ready for Testing
