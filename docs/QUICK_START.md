# Atelier MEP Portal - Quick Start Guide

## What's New

The Atelier MEP Portal has been completely redesigned with support for four user levels and the official Lodha Brand Guidelines.

## 🎯 Key Changes Summary

### 1. **Design System**
- ✅ New Lodha Brand color palette implemented
- ✅ Jost (sans-serif) for body text
- ✅ Cormorant Garamond (serif) for headings
- ✅ Updated all UI components to match new styling

### 2. **User Levels**
- **L1 (Admin)**: Full system access - Project allocation and team management
- **L2 (Lead)**: Project execution and tracking
- **L3/L4**: Limited read-only access

### 3. **New Features**

#### L1 Dashboard
- Project allocation table with all active projects
- Assign L2 leads to projects via dropdown
- Click project names to view details
- Progress visualization with percentage and stage

#### L2 Dashboard
- **Top Statistics**:
  - Material Approval Sheets (MAS) pending count
  - Requests for Information (RFI) pending count
  - Both cards are clickable and link to dedicated pages
- **Project Status Board**
  - View assigned projects with current lifecycle stage
  - Stages: Concept, DD, Tender, VFC (color-coded)
  - Progress tracking per project
  - **Hand Over button** to archive completed projects
- **Archive Section**
  - View handed-over projects (collapsed by default)

#### Project Detail Page
- Complete project information
- Timeline (start date, target completion)
- Assigned team lead
- All metrics: Progress %, Floors, Materials, MEP Status
- Update lifecycle stage directly from the page

#### MAS & RFI Pages
- View all pending Material Approval Sheets
- View all Requests for Information
- Status tracking
- Detailed information display

### 4. **Database Updates**
- Added `user_level` field to users table
- Added `lifecycle_stage` to projects table
- Added `assigned_lead_id` for lead assignment
- Added `is_archived` and `archived_at` for project archiving
- New tables: `material_approval_sheets` and `requests_for_information`

### 5. **API Endpoints**
Complete backend API with filtering based on user level:
- Project CRUD with filtering
- Lead assignment
- Stage management
- Archiving
- MAS/RFI counting and listing

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- PostgreSQL running
- Firebase credentials configured

### Setup Steps

1. **Update Database**
   ```bash
   npm run init:db
   ```

2. **Test Connection**
   ```bash
   npm run test:db
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

4. **Login**
   - Use your corporate Google account
   - If email = `ajit.kumarjha@lodhagroup.com` → L1 access
   - Otherwise → L2 access (default)

---

## 📚 File Structure

```
src/
├── pages/
│   ├── L1Dashboard.jsx         ← L1 admin dashboard
│   ├── L2Dashboard.jsx         ← L2 lead dashboard
│   ├── ProjectDetail.jsx       ← Project detail page
│   ├── MASPage.jsx             ← Material Approval Sheets
│   ├── RFIPage.jsx             ← Requests for Information
│   └── Login.jsx               ← Updated login page
├── components/
│   ├── L1ProjectTable.jsx      ← Projects table with assign lead
│   ├── L2TopStats.jsx          ← MAS/RFI stat cards
│   ├── ProjectStatusBoard.jsx  ← Project cards with archive
│   └── Layout.jsx              ← Updated with new branding
└── App.jsx                     ← Updated routing

docs/
├── IMPLEMENTATION.md           ← Full documentation
└── QUICK_START.md             ← This file

server/
└── index.js                    ← Updated with new endpoints
```

---

## 🎨 Using the Design System

### Colors
```jsx
// Use these classes in your components
className="text-lodha-gold"      // Primary color
className="text-lodha-black"     // Text color
className="text-lodha-grey"      // Secondary text
className="bg-lodha-sand"        // Background
```

### Fonts
```jsx
// Headings (Cormorant Garamond)
<h1 className="font-garamond font-bold text-2xl">Title</h1>

// Body text (Jost)
<p className="font-jost text-base">Content</p>

// Or use utility classes
<h1 className="heading-primary">Main Heading</h1>
<p className="text-body">Body text</p>
```

### Buttons
```jsx
// Primary button (gold)
<button className="btn-primary">Action</button>

// Secondary button (gold border)
<button className="btn-secondary">Secondary</button>
```

---

## 🔑 Key Points to Remember

### Access Control
- **L1**: `ajit.kumarjha@lodhagroup.com` (hardcoded)
- **L2**: Assigned by L1 users
- **L3/L4**: Default for other emails

### Lifecycle Stages
Only four valid stages:
- **Concept**: Initial planning
- **DD**: Design Development
- **Tender**: Tender phase
- **VFC**: Valid for Construction

### Project Archiving
- Only L2 leads can archive their own projects
- Archived projects move to "Handed Over" section
- Timestamp is recorded when archived

### Database Queries
All projects are filtered by:
1. User level (L1 sees all, L2 sees only assigned)
2. Archived status (active projects by default)
3. User's assigned projects (for L2)

---

## 🔗 Navigation Flow

```
Login
  ↓
auth.sync → Determine user level
  ↓
/dashboard (redirects to appropriate dashboard)
  ├─ L1: /l1-dashboard
  │   ├─ Click Project → /project/:id
  │   └─ Assign Lead → Updates project
  └─ L2: /l2-dashboard
      ├─ Click MAS Card → /mas
      ├─ Click RFI Card → /rfi
      ├─ Click Project → /project/:id
      └─ Hand Over Project → Archives project
```

---

## 🐛 Troubleshooting

### Project not showing up?
- Check if archived (is_archived = FALSE)
- Check user level filters
- Verify assigned_lead_id for L2 users

### MAS/RFI not showing counts?
- Ensure material_approval_sheets/requests_for_information tables exist
- Check projectId parameter is correct
- Verify database connection

### Color not applying?
- Check Tailwind CSS is built (`npm run build`)
- Verify color class name is correct
- Clear browser cache

### Fonts not loading?
- Check index.html has Google Fonts link
- Verify font-family in tailwind.config.cjs
- Check network tab for font loading errors

---

## 📞 Next Steps

1. **Add sample data**: Insert test projects, users, and MAS/RFI items
2. **User management**: L1 should manage L2/L3/L4 users
3. **MAS/RFI management**: Create/edit functionality
4. **Notifications**: Alert for pending approvals
5. **Reports**: Project analytics and dashboards

---

## 🔐 Security Reminders

- Current L1 access is hardcoded - implement database-based roles for production
- Validate all user permissions on backend
- Use Firebase Custom Claims for role management
- Encrypt sensitive data in database
- Implement audit logging for all changes

---

## 📖 Documentation Files

1. **IMPLEMENTATION.md** - Complete technical documentation
2. **QUICK_START.md** - This file
3. **README.md** - Original project setup (legacy)
4. **secrets-management.md** - Environment variables and secrets

---

## ✅ Verification Checklist

- [x] All database tables created with correct schema
- [x] New pages and components created
- [x] Routing configured for all user levels
- [x] Backend API endpoints updated
- [x] Design system applied to all components
- [x] Fonts integrated and configured
- [x] Color scheme updated throughout
- [x] Access control implemented
- [x] Archive/hand-over functionality working
- [x] Project detail page functional

---

**Last Updated**: January 28, 2026
**Status**: ✅ Ready for Testing
