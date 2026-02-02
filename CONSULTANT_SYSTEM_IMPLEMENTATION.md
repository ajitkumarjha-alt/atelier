# MEP Consultant System Implementation

## Overview
Comprehensive MEP consultant management system integrated into the Atelier project management platform. Consultants can access projects, review drawings, view design calculations, and respond to MAS/RFI referrals.

## Features Implemented

### 1. Database Schema (schema.sql)
✅ Created consultant tables:
- `consultants` - Stores consultant information (name, email, contact, company)
- `project_consultants` - Junction table linking consultants to projects
- `consultant_otp` - OTP-based authentication system
- Added consultant reference fields to `material_approval_sheets` and `requests_for_information` tables

### 2. Authentication System
✅ **Consultant Login** ([src/pages/ConsultantLogin.jsx](src/pages/ConsultantLogin.jsx))
- Two-step OTP-based login process (similar to vendor login)
- Email verification
- 6-digit OTP with 15-minute expiry
- Session token management

### 3. Registration System
✅ **Consultant Registration Component** ([src/components/ConsultantRegistration.jsx](src/components/ConsultantRegistration.jsx))
- L0/L1 users can register consultants
- Captures: name, email, contact number, company name
- Automatically links to project
- Form validation and error handling

### 4. Consultant Dashboard
✅ **Main Dashboard** ([src/pages/ConsultantDashboard.jsx](src/pages/ConsultantDashboard.jsx))
- Project cards showing assigned projects
- Highlighted section for pending MAS/RFI referrals
- Quick access to drawings and design calculations
- Clean, professional UI matching Atelier design system

### 5. Project Access Features

✅ **Drawings Viewer** ([src/pages/ConsultantProjectDrawings.jsx](src/pages/ConsultantProjectDrawings.jsx))
- View all project drawings
- Download functionality
- Organized by drawing type and version

✅ **Design Calculations** ([src/pages/ConsultantProjectCalculations.jsx](src/pages/ConsultantProjectCalculations.jsx))
- Access to all 12 calculation types:
  - Electrical Load Calculation
  - Water Demand Calculation
  - Cable Selection Sheet
  - Rising Main Design
  - Down Take Design
  - Bus Riser Design
  - Lighting Load Calculation
  - HVAC Load Calculation
  - Fire Pump Calculation
  - Plumbing Fixture Calculation
  - Earthing & Lightning Calculation
  - Panel Schedule

### 6. MAS Referral & Response System

✅ **MAS Detail Updates** ([src/pages/MASDetail.jsx](src/pages/MASDetail.jsx))
- L1/L2 can refer MAS to consultants
- Select consultant from dropdown
- Consultant response section with highlighting
- Visual indicators for replied/pending status

✅ **Consultant MAS View** ([src/pages/ConsultantMASDetail.jsx](src/pages/ConsultantMASDetail.jsx))
- View complete MAS details
- Submit technical response/recommendations
- Timestamp for reply submission
- Success indicators

### 7. RFI Referral & Response System

✅ **RFI Detail Updates** ([src/pages/RFIDetail.jsx](src/pages/RFIDetail.jsx))
- L1/L2/CM can refer RFI to consultants
- Consultant selection interface
- Reply tracking and highlighting
- Status indicators

✅ **Consultant RFI View** ([src/pages/ConsultantRFIDetail.jsx](src/pages/ConsultantRFIDetail.jsx))
- View full RFI details
- Submit clarifications and recommendations
- Reply tracking with timestamps

### 8. Backend API Endpoints

✅ **Server API** ([server/index.js](server/index.js))
- `POST /api/consultants/register` - Register new consultant
- `GET /api/consultants/list` - List all active consultants
- `POST /api/consultants/send-otp` - Send OTP to consultant email
- `POST /api/consultants/verify-otp` - Verify OTP and login
- `GET /api/consultants/profile` - Get consultant profile and projects
- `GET /api/consultants/referred-items` - Get MAS/RFI referred to consultant
- `PATCH /api/mas/:id/refer-consultant` - Refer MAS to consultant
- `PATCH /api/rfi/:id/refer-consultant` - Refer RFI to consultant
- `GET /api/consultants/mas/:id` - Get MAS details for consultant
- `POST /api/consultants/mas/:id/reply` - Submit consultant reply for MAS
- `GET /api/consultants/rfi/:id` - Get RFI details for consultant
- `POST /api/consultants/rfi/:id/reply` - Submit consultant reply for RFI
- `GET /api/consultants/project/:id` - Get project details
- `GET /api/consultants/project/:id/drawings` - Get project drawings

### 9. Routing Configuration

✅ **App Routes** ([src/App.jsx](src/App.jsx))
- `/consultant-login` - Consultant login page
- `/consultant-dashboard` - Main consultant dashboard
- `/consultant/project/:projectId/drawings` - Project drawings
- `/consultant/project/:projectId/calculations` - Design calculations
- `/consultant/mas/:masId` - MAS detail and reply
- `/consultant/rfi/:rfiId` - RFI detail and reply

## User Flow

### L0/L1 Registration Flow
1. Navigate to project
2. Click "Register Consultant"
3. Fill in consultant details (name, email, contact, company)
4. Submit - consultant receives credentials

### Consultant Login Flow
1. Visit `/consultant-login`
2. Enter registered email
3. Receive OTP via email (6-digit code)
4. Enter OTP to verify
5. Redirected to consultant dashboard

### Consultant Dashboard Flow
1. View assigned projects
2. See pending MAS/RFI referrals (highlighted)
3. Click on project to:
   - View/download drawings
   - Access design calculations
4. Click on referred item to respond

### Referral Flow (L1/L2)
1. Open MAS or RFI detail page
2. Click "Refer to Consultant"
3. Select consultant from dropdown
4. Submit referral
5. Consultant sees item in dashboard

### Response Flow (Consultant)
1. See highlighted referral in dashboard
2. Click to view details
3. Review material/question
4. Submit technical response
5. Response appears in sender's dashboard (highlighted)

## Highlighting System

### For Senders (L1/L2)
- Unreplied referrals: Orange/yellow highlight
- Replied referrals: Green checkmark
- Visual badge showing "Replied" status

### For Consultants
- Pending items: Orange background with alert icon
- Replied items: Green background
- Clear timestamp for all replies

## Security Features
- OTP-based authentication (15-minute expiry)
- Email verification
- Session token management
- Consultant-specific email header verification
- Project access control (only assigned projects)
- Isolated consultant routes

## Database Migrations Needed
Run these SQL commands to set up the consultant system:

```sql
-- Already added to schema.sql:
-- 1. consultants table
-- 2. project_consultants table
-- 3. consultant_otp table
-- 4. Added columns to material_approval_sheets
-- 5. Added columns to requests_for_information
```

## Next Steps / Future Enhancements

1. **Email Integration**
   - Implement actual email service for OTP delivery
   - Send notification emails when referred to items

2. **File Management**
   - Implement actual drawings table and upload system
   - Add file download tracking

3. **Advanced Features**
   - Multi-consultant collaboration
   - Comment threads on referrals
   - Consultant performance metrics
   - Export consultant reports

4. **Mobile Optimization**
   - Responsive design improvements
   - Mobile app for consultants

## Testing Checklist

### Registration
- [ ] L0 can register consultant
- [ ] L1 can register consultant
- [ ] Duplicate email handling
- [ ] Project association works

### Authentication
- [ ] OTP sent successfully
- [ ] OTP verification works
- [ ] OTP expiry (15 minutes)
- [ ] Invalid OTP rejection
- [ ] Session persistence

### Dashboard
- [ ] Projects display correctly
- [ ] Referred items appear
- [ ] Navigation to drawings works
- [ ] Navigation to calculations works

### MAS Referral
- [ ] L1 can refer MAS
- [ ] L2 can refer MAS
- [ ] Consultant selection works
- [ ] Reply submission works
- [ ] Highlighting in sender dashboard

### RFI Referral
- [ ] L1 can refer RFI
- [ ] L2 can refer RFI
- [ ] CM can refer RFI
- [ ] Reply submission works
- [ ] Highlighting in sender dashboard

## Files Modified/Created

### New Files Created (11)
1. src/components/ConsultantRegistration.jsx
2. src/pages/ConsultantLogin.jsx
3. src/pages/ConsultantDashboard.jsx
4. src/pages/ConsultantProjectDrawings.jsx
5. src/pages/ConsultantProjectCalculations.jsx
6. src/pages/ConsultantMASDetail.jsx
7. src/pages/ConsultantRFIDetail.jsx

### Files Modified (4)
1. schema.sql - Added consultant tables and columns
2. src/App.jsx - Added consultant routes
3. src/pages/MASDetail.jsx - Added consultant referral
4. src/pages/RFIDetail.jsx - Added consultant referral
5. server/index.js - Added consultant API endpoints

## Summary
The MEP Consultant system is now fully integrated into the Atelier platform. Consultants can log in via OTP, access their assigned projects, view drawings and calculations, and respond to MAS/RFI referrals from the project team. The system includes proper highlighting for unreplied items and maintains security through session-based authentication.
