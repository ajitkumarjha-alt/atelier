# Vendor OTP Authentication System

## Overview
The vendor OTP authentication system provides external vendors with secure access to their assigned projects using email-based one-time passwords. This system mirrors the consultant OTP implementation for consistency.

## Database Schema

### Tables Created
1. **vendors** - Stores vendor information
   - id (Primary Key)
   - name
   - email (Unique)
   - contact_number
   - company_name
   - is_active (Default: true)
   - created_at, updated_at

2. **project_vendors** - Links vendors to projects
   - id (Primary Key)
   - project_id (Foreign Key)
   - vendor_id (Foreign Key)
   - assigned_by_id (Foreign Key to users)
   - assigned_at

3. **vendor_otp** - Stores OTP codes
   - id (Primary Key)
   - email
   - otp (6-digit code)
   - expires_at (15 minutes from creation)
   - is_used (Default: false)
   - created_at

## Frontend Components

### 1. VendorRegistration Component
**File:** [src/components/VendorRegistration.jsx](src/components/VendorRegistration.jsx)

**Purpose:** L0/L1 users register vendors and assign them to projects

**Features:**
- Form fields: Name, Email, Contact Number, Company Name
- Automatic project association
- Email validation
- Success/error notifications
- Modal interface

**Usage:**
```jsx
<VendorRegistration
  projectId={projectId}
  onSuccess={handleSuccess}
  onClose={handleClose}
/>
```

### 2. VendorLogin Page
**File:** [src/pages/VendorLogin.jsx](src/pages/VendorLogin.jsx)

**Purpose:** Two-step OTP authentication for vendors

**Features:**
- Step 1: Enter email address → Sends 6-digit OTP
- Step 2: Enter OTP → Validates and creates session
- Session stored in localStorage (vendorEmail, vendorToken, vendorId)
- Automatic redirect to vendor dashboard
- Error handling for invalid/expired OTPs

**Routes:**
- `/vendor-login` - Public access for vendors

### 3. VendorDashboard Page
**File:** [src/pages/VendorDashboard.jsx](src/pages/VendorDashboard.jsx)

**Updates:**
- Now checks for vendor OTP session instead of Google auth
- Displays vendor name in header
- Logout button to clear session
- Super admin can also access
- Shows assigned projects and MAS summary

## Backend API Endpoints

### POST /api/vendors/register
Register a new vendor and link to project.

**Headers:** Authorization (Firebase token)

**Body:**
```json
{
  "name": "Vendor Name",
  "email": "vendor@example.com",
  "contactNumber": "+91-1234567890",
  "companyName": "Company Name",
  "projectId": 1
}
```

**Response:**
```json
{
  "success": true,
  "vendorId": 1
}
```

### GET /api/vendors/list
Get all registered vendors (L0/L1/Super Admin only).

**Response:**
```json
[
  {
    "id": 1,
    "name": "Vendor Name",
    "email": "vendor@example.com",
    "contact_number": "+91-1234567890",
    "company_name": "Company Name",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST /api/vendors/send-otp
Send 6-digit OTP to vendor email.

**Body:**
```json
{
  "email": "vendor@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email"
}
```

**Notes:**
- OTP is currently logged to console (implement email service in production)
- OTP expires after 15 minutes
- Old unused OTPs remain valid until expiry

### POST /api/vendors/verify-otp
Verify OTP and create session.

**Body:**
```json
{
  "email": "vendor@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "base64-encoded-token",
  "vendorId": 1,
  "vendor": {
    "id": 1,
    "name": "Vendor Name",
    "email": "vendor@example.com"
  }
}
```

**Error Responses:**
- 401: Invalid or expired OTP
- 400: Missing email or OTP

### GET /api/vendors/profile
Get vendor details and assigned projects.

**Headers:**
- `x-vendor-email`: vendor@example.com
- `Authorization`: Bearer {token}

OR (for super admin):
- `x-dev-user-email`: admin@lodhagroup.com

**Response:**
```json
{
  "vendor": {
    "id": 1,
    "name": "Vendor Name",
    "email": "vendor@example.com",
    "contact_number": "+91-1234567890",
    "company_name": "Company Name"
  },
  "projects": [
    {
      "id": 1,
      "name": "Project A",
      "description": "Description",
      "lifecycle_stage": "Design",
      "completion_percentage": 45
    }
  ]
}
```

## Authentication Flow

### Vendor Registration (by L0/L1)
1. L0 or L1 user clicks "Add Vendor" in Project Team Management
2. Fills out vendor registration form
3. System creates vendor record and links to project
4. Vendor receives email with login instructions (to be implemented)

### Vendor Login
1. Vendor visits `/vendor-login`
2. Enters email address
3. Clicks "Send OTP"
4. System generates 6-digit OTP, stores in database with 15-minute expiry
5. OTP logged to console (implement email service)
6. Vendor enters OTP
7. System validates OTP and creates session
8. Session data stored in localStorage:
   - vendorEmail
   - vendorToken
   - vendorId
9. Redirects to `/vendor-dashboard`

### Session Management
- **Storage:** localStorage (browser-based)
- **Duration:** Until explicit logout or browser clear
- **Authentication Check:** On page load, checks for vendorEmail/vendorToken
- **Logout:** Clears localStorage and redirects to login

### Super Admin Access
- Super admin can access vendor dashboard using their Lodha email
- No need for vendor credentials
- Sees all projects (not limited to vendor assignments)

## Integration Points

### Project Team Management
**File:** [src/components/ProjectTeamManagement.jsx](src/components/ProjectTeamManagement.jsx)

**Added Features:**
- "Add Vendor" button (alongside "Add Consultant")
- Opens VendorRegistration modal
- Success message after registration
- Registered vendors can login via `/vendor-login`

### App Routing
**File:** [src/App.jsx](src/App.jsx)

**Routes Added:**
```jsx
<Route path="/vendor-login" element={<VendorLogin />} />
<Route 
  path="/vendor-dashboard" 
  element={
    (localStorage.getItem('vendorEmail') || (user && userLevel === 'SUPER_ADMIN')) 
      ? <VendorDashboard /> 
      : <Navigate to="/vendor-login" replace />
  }
/>
```

## Security Considerations

### OTP Security
- 6-digit numeric code (1 in 1,000,000 chance)
- 15-minute expiration window
- Single-use tokens (marked as used after verification)
- Database-stored (not in-memory)

### Session Security
- Token is base64-encoded email:timestamp
- Stored in localStorage (client-side)
- Cleared on logout
- No server-side session validation (implement JWT in production)

### Recommended Production Enhancements
1. **Email Service Integration**
   - Replace console.log with actual email sending
   - Use services like SendGrid, AWS SES, or Nodemailer

2. **JWT Tokens**
   - Replace simple base64 tokens with JWT
   - Add server-side token validation
   - Implement token refresh mechanism

3. **Rate Limiting**
   - Limit OTP requests per email (e.g., 3 per hour)
   - Prevent brute force attacks

4. **HTTPS Only**
   - Ensure all authentication happens over HTTPS
   - Set secure cookies if using cookie-based sessions

5. **OTP Cleanup**
   - Implement cron job to delete expired OTPs
   - Keep database lean

## Testing the Implementation

### Manual Test Flow

1. **Register a Vendor (as L0/L1)**
   ```
   - Login as L0 or L1 user
   - Navigate to a project
   - Go to team management
   - Click "Add Vendor"
   - Fill form:
     - Name: Test Vendor
     - Email: testvendor@example.com
     - Contact: +91-1234567890
     - Company: Test Company
   - Submit
   ```

2. **Vendor Login**
   ```
   - Navigate to /vendor-login
   - Enter email: testvendor@example.com
   - Click "Send OTP"
   - Check server console for OTP
   - Enter OTP
   - Click "Verify OTP"
   - Should redirect to vendor dashboard
   ```

3. **Vendor Dashboard Access**
   ```
   - Should see vendor name in header
   - Should see assigned projects
   - Should see MAS summary
   - Click logout → redirects to login
   ```

4. **Super Admin Access**
   ```
   - Login as super admin
   - Navigate to /vendor-dashboard
   - Should access without OTP
   - Should see all projects
   ```

## Comparison with Consultant System

Both systems are identical in architecture:

| Feature | Consultant | Vendor |
|---------|-----------|--------|
| Database Tables | 3 (consultants, project_consultants, consultant_otp) | 3 (vendors, project_vendors, vendor_otp) |
| OTP Expiry | 15 minutes | 15 minutes |
| OTP Length | 6 digits | 6 digits |
| Session Storage | localStorage | localStorage |
| Session Keys | consultantEmail, consultantToken, consultantId | vendorEmail, vendorToken, vendorId |
| Registration | L0/L1 via modal | L0/L1 via modal |
| Login Route | /consultant-login | /vendor-login |
| Dashboard Route | /consultant-dashboard | /vendor-dashboard |
| Super Admin Access | ✅ Supported | ✅ Supported |
| API Endpoints | /api/consultants/* | /api/vendors/* |

## Files Modified/Created

### Created
1. `schema.sql` - Added vendor tables
2. `src/components/VendorRegistration.jsx` - Registration component
3. `src/pages/VendorLogin.jsx` - OTP login page
4. `VENDOR_OTP_IMPLEMENTATION.md` - This documentation

### Modified
1. `src/pages/VendorDashboard.jsx` - Added OTP authentication support
2. `src/App.jsx` - Added vendor login route
3. `src/components/ProjectTeamManagement.jsx` - Added vendor registration button
4. `server/index.js` - Added 4 vendor API endpoints

## Next Steps

### Immediate
- ✅ Database schema created
- ✅ Registration component created
- ✅ Login page created
- ✅ API endpoints created
- ✅ Dashboard updated
- ✅ Routes configured
- ✅ Team management integration

### Production Deployment
1. Implement email service for OTP delivery
2. Replace base64 tokens with JWT
3. Add rate limiting for OTP requests
4. Set up HTTPS
5. Implement OTP cleanup job
6. Add audit logging for vendor access
7. Configure email templates for OTP

### Feature Enhancements
1. Two-factor authentication option
2. Password-based login alongside OTP
3. SMS OTP as fallback
4. Remember device functionality
5. Session timeout warnings
6. Activity logging

## Support

For issues or questions:
- Check console for OTP codes during testing
- Verify database tables are created (run schema.sql)
- Ensure vendor is registered before attempting login
- Check localStorage for session data
- Verify API endpoints are responding

## Conclusion

The vendor OTP authentication system is now fully implemented and ready for testing. It provides a secure, user-friendly way for external vendors to access their assigned projects without requiring Google accounts, maintaining consistency with the consultant authentication flow.
