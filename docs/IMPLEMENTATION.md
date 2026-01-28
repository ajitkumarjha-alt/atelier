# Atelier MEP Portal - Implementation Guide

## Overview
The Atelier MEP Portal has been successfully upgraded with support for four user levels (L1, L2, L3, L4) and the complete Lodha Brand Guidelines design system.

## 🎨 Design System Implemented

### Color Palette (Lodha Brand Guidelines)
- **Primary Gold**: #9D7F1B
- **Black**: #000000
- **Dark Grey**: #6D6E71
- **Off-White/Sand**: #F3F1E7

### Typography
- **Headings**: Cormorant Garamond (serif) - elegant and professional
- **Body Text**: Jost (sans-serif) - modern and readable
- **Fonts**: Added via Google Fonts in index.html

### Tailwind Configuration
Updated `tailwind.config.cjs` with:
- Custom font families: `font-jost` and `font-garamond`
- New color definitions matching Lodha brand
- Utility classes: `.heading-primary`, `.heading-secondary`, `.heading-tertiary`, `.text-body`, `.btn-primary`, `.btn-secondary`, `.card`, `.badge-primary`, `.badge-secondary`

---

## 📊 Database Schema Updates

### Users Table
Added `user_level` field with values: L1, L2, L3, L4
```sql
user_level VARCHAR(2) NOT NULL DEFAULT 'L4'
```

### Projects Table
New fields:
- `lifecycle_stage` - Concept, DD, Tender, or VFC
- `assigned_lead_id` - Foreign key to users table (L2 lead)
- `is_archived` - Boolean for archive/hand over functionality
- `archived_at` - Timestamp for when project was handed over

Valid lifecycle stages:
- **Concept**: Initial planning phase
- **DD**: Design Development phase
- **Tender**: Tender phase
- **VFC**: Valid for Construction phase

### New Tables

#### Material Approval Sheets (MAS)
```sql
CREATE TABLE material_approval_sheets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    material_name VARCHAR(255),
    quantity INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

#### Requests for Information (RFI)
```sql
CREATE TABLE requests_for_information (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    title VARCHAR(255),
    description TEXT,
    raised_by_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

---

## 👥 User Level Access Control

### L1 (Admin) - ajit.kumarjha@lodhagroup.com
**Dashboard**: `/l1-dashboard`
- **Project Allocation Table**
  - View all active MEP projects in table format
  - Columns: Project Name, Lifecycle Stage, Progress %, Assigned Lead, Action
  - **Assign Lead Dropdown**: Assign L2 users to projects
  - **Clickable Project Names**: Navigate to project detail page
- Full system access
- Can see all projects across the organization

**Upcoming Features**:
- Create new projects
- Delete/archive projects
- User management
- System configuration

### L2 (Lead) - Designated by L1
**Dashboard**: `/l2-dashboard`
- **Top Stats Section**
  - **MAS Card**: Shows count of pending Material Approval Sheets (clickable → `/mas`)
  - **RFI Card**: Shows count of pending Requests for Information (clickable → `/rfi`)
- **Project Status Board**
  - Cards for active projects assigned to the lead
  - Display: Name, Lifecycle Stage, Progress %, Floors Completed, Material Stock %
  - Lifecycle stage color-coded cards:
    - Purple: Concept
    - Blue: DD (Design Development)
    - Yellow: Tender
    - Green: VFC (Valid for Construction)
  - **Hand Over Button**: Move project to Archive section
- **Archive Section**: Collapsed view of handed-over projects

### L3 & L4 (Limited Access)
- View-only access to non-sensitive project data
- Limited MAS/RFI visibility

---

## 🔗 API Endpoints

### Projects
- `GET /api/projects` - Fetch projects (filtered by user level)
  - Query params: `userEmail` (for filtering)
- `GET /api/projects/:id` - Get single project details
- `POST /api/projects/:id/assign-lead` - Assign L2 lead to project (L1 only)
  - Body: `{ leadId, userEmail }`
- `PATCH /api/projects/:id/stage` - Update lifecycle stage
  - Body: `{ stage, userEmail }` (stage: Concept, DD, Tender, VFC)
- `POST /api/projects/:id/archive` - Hand over project
  - Body: `{ userEmail }`
- `GET /api/projects/archive/list` - Get all archived projects

### Users
- `GET /api/users/level/:level` - Get all users of specific level
- `POST /api/auth/sync` - Sync user with database on login
  - Body: `{ email, fullName }`
  - Auto-determines user level based on email

### Material Approval Sheets
- `GET /api/mas/pending-count` - Get count of pending MAS items
  - Query params: `userEmail`, `projectId` (optional)
- `GET /api/mas/project/:projectId` - Get all MAS items for project

### Requests for Information
- `GET /api/rfi/pending-count` - Get count of pending RFI items
  - Query params: `userEmail`, `projectId` (optional)
- `GET /api/rfi/project/:projectId` - Get all RFI items for project

---

## 📄 New Pages & Components

### Pages
1. **`L1Dashboard.jsx`** - L1 admin dashboard with project allocation
2. **`L2Dashboard.jsx`** - L2 lead dashboard with stats and project board
3. **`ProjectDetail.jsx`** - Project detail page with full information
   - Display all project metrics
   - Update lifecycle stage
   - View assigned lead
4. **`MASPage.jsx`** - Material Approval Sheets list
5. **`RFIPage.jsx`** - Requests for Information list

### Components
1. **`L1ProjectTable.jsx`** - Sortable project table with assign lead functionality
2. **`L2TopStats.jsx`** - Top cards showing MAS and RFI counts
3. **`ProjectStatusBoard.jsx`** - Project status cards with archive functionality

### Updated Components
- **`Layout.jsx`** - Updated with new color scheme and styling
- **`Login.jsx`** - Updated with new brand colors and fonts

---

## 🛣️ Routing Structure

```
/                      → Login page
/dashboard             → Redirects to L1 or L2 dashboard based on user level
/l1-dashboard          → L1 Project Allocation (Admin only)
/l2-dashboard          → L2 Execution & Tracking (L2 and above)
/project/:id           → Project detail page
/mas                   → Material Approval Sheets
/rfi                   → Requests for Information
/project-plans         → Coming Soon
/structural-data       → Coming Soon
/settings              → Coming Soon
```

---

## 🔐 Access Control

### Hardcoded L1 Access
Currently, L1 (Admin) access is hardcoded for:
```javascript
ajit.kumarjha@lodhagroup.com
```

### Future Implementation
The user level should be fetched from the database after syncing:
```javascript
// In /api/auth/sync endpoint
if (email === L1_ADMIN_EMAIL) {
  userLevel = 'L1';
}
// Later: Could be stored in database or managed via Firebase Custom Claims
```

---

## ✨ Key Features Implemented

### ✅ L1 Dashboard (Project Allocation)
- [x] Table view of all active projects
- [x] Assign Lead dropdown in each row
- [x] Clickable project names navigate to detail page
- [x] Progress bar visualization
- [x] Lifecycle stage badges

### ✅ L2 Dashboard (Execution & Tracking)
- [x] MAS pending count card (clickable)
- [x] RFI pending count card (clickable)
- [x] Project status board with lifecycle stages
- [x] Color-coded stage cards
- [x] Hand Over button to archive projects
- [x] Archive section (collapsed/expandable)

### ✅ Technical Requirements
- [x] Jost and Cormorant Garamond fonts integrated
- [x] Lodha brand colors implemented
- [x] Database schema updated with user_level and lifecycle stages
- [x] Backend API filters data by user level
- [x] L1 access restricted to ajit.kumarjha@lodhagroup.com
- [x] Project detail page with full metrics
- [x] MAS and RFI listing pages

---

## 🚀 Getting Started

### 1. Update Database
Run the updated schema:
```bash
npm run init:db
```

### 2. Test Database Connection
```bash
npm run test:db
```

### 3. Start Development Server
```bash
npm run dev
```

This will start both:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 4. Login
Use your corporate Google account. If your email is `ajit.kumarjha@lodhagroup.com`, you'll be assigned L1 access.

---

## 🔄 Backend Server Configuration

The Express server now includes:
- User level filtering for projects
- Lead assignment functionality
- Lifecycle stage management
- Archive/hand-over capability
- MAS and RFI counting

All endpoints validate user access and return appropriate data based on user level.

---

## 📝 Notes for Future Development

### Email-based Access Control
Currently L1 access is hardcoded. For production:
1. Store user_level in database during sync
2. Use Firebase Custom Claims for role-based access
3. Implement dynamic access control based on database

### MAS and RFI Expansion
The current implementation has basic listing. Next steps:
1. Create/edit MAS items
2. Create/edit RFI items
3. Update status (pending → approved/closed)
4. Add filtering by project
5. Add assignment functionality

### Lifecycle Stage Transitions
Consider adding:
1. Validation rules for stage transitions
2. Required approvals before moving stages
3. Timestamp tracking for each stage
4. Audit logs for stage changes

### Additional User Levels
- Implement L3 and L4 access levels
- Define specific permissions for each level
- Create role-based dashboards

---

## 🎯 Quick Reference

### Color Classes
```css
.text-lodha-gold      /* #9D7F1B */
.text-lodha-black     /* #000000 */
.text-lodha-grey      /* #6D6E71 */
.bg-lodha-sand        /* #F3F1E7 */
```

### Font Classes
```css
.font-jost       /* Body text */
.font-garamond   /* Headings */
```

### Heading Classes
```css
.heading-primary     /* h1 style */
.heading-secondary   /* h2 style */
.heading-tertiary    /* h3 style */
```

### Button Classes
```css
.btn-primary     /* Gold background */
.btn-secondary   /* Gold border */
```

---

## 📞 Support
For issues or questions about the implementation, refer to the relevant component or API endpoint files.
