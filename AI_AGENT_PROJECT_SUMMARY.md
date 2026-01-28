# Atelier MEP Portal - Complete Project Summary for AI Agents

## 📋 Project Overview

**Project Name:** Atelier MEP Portal
**Owner:** ajitkumarjha-alt (Lodha Group)
**Type:** Web-based MEP (Mechanical, Electrical, Plumbing) Project Management System
**Purpose:** Centralized platform for managing construction projects, material approvals, requests for information, and team collaboration across different access levels

**Current Status:** ✅ **Development Complete** - Fully functional with all core features implemented

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework:** React 19 with Vite
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 3 with custom Lodha color palette
- **Icons:** Lucide React
- **UI Component Library:** Custom components
- **State Management:** React Hooks (useState, useContext, useEffect)
- **Font:** Jost (body), Cormorant Garamond (headings)

### Backend
- **Runtime:** Node.js with ES Modules
- **Framework:** Express.js 4
- **Database:** PostgreSQL
- **Authentication:** Firebase (Google OAuth)
- **API Style:** RESTful JSON
- **CORS:** Enabled for localhost development
- **Port:** 3001 (API), 5173+ (Frontend)

### Database
- **Type:** PostgreSQL (hosted on Google Cloud SQL)
- **Tables:** 8 main tables with relationships
- **Connection:** SSL enabled, rejecting unauthorized connections disabled for Cloud SQL compatibility

---

## 🗄️ Database Schema & Structure

### Core Tables

#### 1. **users**
Stores user information and roles
```sql
- id: SERIAL PRIMARY KEY
- email: VARCHAR(255) UNIQUE NOT NULL
- full_name: VARCHAR(255)
- role: VARCHAR(50) DEFAULT 'user'
- user_level: VARCHAR(2) DEFAULT 'L4' [L1, L2, L3, L4, SUPER_ADMIN]
- last_login: TIMESTAMP
- created_at, updated_at: TIMESTAMP
```

#### 2. **projects**
Main project entities
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- description: TEXT
- status: VARCHAR(50) DEFAULT 'Concept'
- lifecycle_stage: VARCHAR(50) [Concept, DD, Tender, VFC]
- completion_percentage: INTEGER DEFAULT 0
- floors_completed, total_floors: INTEGER
- mep_status: VARCHAR(50) [pending, in_progress, completed]
- material_stock_percentage: INTEGER
- assigned_lead_id: INTEGER (FK to users)
- start_date, target_completion_date: DATE
- is_archived: BOOLEAN DEFAULT FALSE
- archived_at: TIMESTAMP
- created_at, updated_at: TIMESTAMP
```

#### 3. **buildings**
Buildings within projects
```sql
- id: SERIAL PRIMARY KEY
- project_id: INTEGER FK projects(id)
- name: VARCHAR(255)
- application_type: VARCHAR(100) [Residential, Commercial, Clubhouse, MLCP, etc.]
- location_latitude, location_longitude: DECIMAL
- residential_type: VARCHAR(100) [Aspi, Casa, Premium, Villa]
- villa_type: VARCHAR(100)
- villa_count: INTEGER
- twin_of_building_id: INTEGER (self-referencing for twin buildings)
- is_twin: BOOLEAN
- created_at, updated_at: TIMESTAMP
```

#### 4. **floors**
Floors within buildings
```sql
- id: SERIAL PRIMARY KEY
- building_id: INTEGER FK buildings(id)
- floor_number: INTEGER
- floor_name: VARCHAR(100)
- created_at, updated_at: TIMESTAMP
```

#### 5. **flats**
Individual units/flats within floors
```sql
- id: SERIAL PRIMARY KEY
- floor_id: INTEGER FK floors(id)
- flat_type: VARCHAR(100) [1BHK, 2BHK, 3BHK, 4BHK, Studio]
- area_sqft: DECIMAL(10, 2)
- number_of_flats: INTEGER
- created_at, updated_at: TIMESTAMP
```

#### 6. **project_standards**
Dropdown options/standards (managed by Super Admin)
```sql
- id: SERIAL PRIMARY KEY
- category: VARCHAR(100) [application_type, residential_type, flat_type]
- value: VARCHAR(255) [actual option like "Residential", "2BHK"]
- description: TEXT
- is_active: BOOLEAN DEFAULT TRUE
- created_at, updated_at: TIMESTAMP
- UNIQUE(category, value)
```

#### 7. **material_approval_sheets (MAS)**
Material approval tracking
```sql
- id: SERIAL PRIMARY KEY
- project_id: INTEGER FK projects(id)
- material_name: VARCHAR(255)
- quantity: INTEGER
- status: VARCHAR(50) [pending, approved, rejected]
- created_at, updated_at: TIMESTAMP
```

#### 8. **requests_for_information (RFI)**
Information requests and clarifications
```sql
- id: SERIAL PRIMARY KEY
- project_id: INTEGER FK projects(id)
- title: VARCHAR(255)
- description: TEXT
- raised_by_id: INTEGER FK users(id)
- status: VARCHAR(50) [pending, resolved, closed]
- created_at, updated_at: TIMESTAMP
```

---

## 👥 User Roles & Access Control

### Four User Levels + Super Admin

| Level | Title | Permissions | Dashboards | Features |
|-------|-------|-------------|-----------|----------|
| **SUPER_ADMIN** | Super Administrator | Full system access | All dashboards | Manage all users, edit project standards, override any function |
| **L1** | Admin | Project allocation | L1 Dashboard | Create projects, assign L2 leads, view all projects, manage everything |
| **L2** | Lead | Project execution | L2 Dashboard | Track assigned projects, handle MAS/RFI approvals, update progress |
| **L3** | Supervisor | Limited editing | L3 Dashboard | View projects, limited editing, monitor KPIs, read-only mostly |
| **L4** | Team Member | View only | L4 Dashboard | View assigned projects, view basic info, no editing capability |

### Authentication
- Firebase Google OAuth for login
- Email-based user identification
- Automatic user level assignment via backend sync
- Role checked on every protected route

---

## 🎨 Theme & Design System

### Lodha Color Palette (Luxury Brand Colors)
```
- lodha-gold: #9D7F1B (Primary accent color)
- lodha-deep: #9E7E1D (Hover/active states)
- lodha-bronze: #5C4B13 (Alternative accent)
- lodha-sand: #F3F1E7 (Light background/cards)
- lodha-black: #000000 (Text)
- lodha-grey: #6D6E71 (Secondary text)
```

### Typography
- **Body Font:** Jost (sans-serif, modern, clean)
- **Heading Font:** Cormorant Garamond (serif, elegant, luxury feel)

### Design Approach
✨ Suave, sophisticated, premium aesthetic
- No bright colors (red, green, blue, yellow)
- All colors from Lodha corporate standards
- Consistent across all pages
- Responsive design (mobile, tablet, desktop)

---

## 🚀 Core Features & Functionality

### 1. Project Management
- **Create Projects:** L1 users create new projects with name, location, buildings
- **Project Hierarchy:** Projects → Buildings → Floors → Flats structure
- **Building Types:** Support for different application types (Residential, Commercial, Clubhouse, MLCP, etc.)
- **Residential Types:** Different series (Aspi, Casa, Premium, Villa)
- **Flat Types:** Various configurations (1BHK, 2BHK, 3BHK, 4BHK, Studio)
- **Twin Buildings:** Support for twin/mirror building configuration
- **Project Archival:** Hand-over/archive projects when complete

### 2. Project Lifecycle Tracking
- **Stages:** Concept → DD (Design Development) → Tender → VFC (Vendor Final Confirmation)
- **Progress Tracking:** Completion percentage, floors completed, material stock percentage
- **MEP Status:** Pending, In Progress, Completed
- **Status Updates:** Real-time stage updates for project leads

### 3. Material Approval Sheets (MAS)
- **Track Materials:** Log material names and quantities
- **Approval Status:** Pending, Approved, Rejected
- **L2 Approvals:** Lead-level approval management
- **Pending Counts:** Dashboard shows pending approvals

### 4. Requests for Information (RFI)
- **Create RFI:** L2 leads create information requests
- **Tracking:** Status tracking (Pending, Resolved, Closed)
- **Pending Counts:** Dashboard shows RFI queue

### 5. Project Input Form (Complex Form)
- **Multi-level Form:** Buildings → Floors → Flats hierarchy
- **Copy Functionality:** Duplicate floors and buildings
- **Real-time Validation:** Form validation on input
- **Auto-save:** Fields auto-save as user types
- **Live Preview:** See building structure in real-time
- **Google Maps Integration:** Location selection with map

### 6. Project Standards Management (Super Admin Only)
- **CRUD Operations:** Create, Read, Update, Delete dropdown options
- **Categories:** Application Types, Residential Types, Flat Types
- **Active/Inactive Toggle:** Deactivate without deleting
- **Edit Management:** In-line editing of standards
- **Duplicate Prevention:** Database-level unique constraints
- **Category Filtering:** Sidebar navigation by category

### 7. User Management
- **Automatic User Sync:** New users auto-created on login via Firebase
- **User Level Assignment:** Backend determines user level
- **Lead Assignment:** L1 assigns L2 leads to projects
- **User Directory:** View users by level

### 8. Dashboard Navigation
- **Role-Based Dashboards:** Each user level has custom dashboard
- **Quick Actions:** Create project, view pending items buttons
- **Navigation Cards:** Easy access to all features
- **Statistics:** Pending counts, project progress overview

---

## 🔗 API Endpoints

### Projects
- `GET /api/projects` - Fetch projects (filtered by user level)
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project with full hierarchy
- `PATCH /api/projects/:id` - Update project
- `GET /api/projects/:id/full` - Get project with all building/floor/flat data
- `POST /api/projects/:id/assign-lead` - Assign L2 lead (L1 only)
- `PATCH /api/projects/:id/stage` - Update lifecycle stage
- `POST /api/projects/:id/archive` - Archive/hand-over project
- `GET /api/projects/archive/list` - Get archived projects

### Project Standards (Dropdown Options)
- `GET /api/project-standards` - Get active standards for dropdowns
- `GET /api/project-standards-all` - Get all standards (admin view)
- `POST /api/project-standards` - Create new standard
- `PATCH /api/project-standards/:id` - Update standard
- `DELETE /api/project-standards/:id` - Delete standard

### Users & Authentication
- `POST /api/auth/sync` - Sync user on login
- `GET /api/users/level/:level` - Get users by level

### Material Approvals (MAS)
- `GET /api/mas/pending-count` - Get pending MAS count
- `GET /api/mas/project/:projectId` - Get MAS items for project

### Requests for Information (RFI)
- `GET /api/rfi/pending-count` - Get pending RFI count
- `GET /api/rfi/project/:projectId` - Get RFI items for project

### System
- `GET /api/health` - Health check endpoint

---

## 📁 Project Structure

```
/workspaces/atelier/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              # Firebase authentication
│   │   ├── Dashboard.jsx          # Default landing (redirects to role dashboard)
│   │   ├── L1Dashboard.jsx        # Admin - Project allocation
│   │   ├── L2Dashboard.jsx        # Lead - Execution tracking
│   │   ├── L3Dashboard.jsx        # Supervisor - Limited access
│   │   ├── L4Dashboard.jsx        # Member - View only
│   │   ├── SuperAdminDashboard.jsx # Super admin - Full control
│   │   ├── ProjectInput.jsx       # Create/edit projects (complex form)
│   │   ├── ProjectDetail.jsx      # View single project
│   │   ├── ProjectStandardsManagement.jsx # Manage dropdown options
│   │   ├── MASPage.jsx            # Material approval sheets
│   │   └── RFIPage.jsx            # Requests for information
│   ├── components/
│   │   ├── Layout.jsx             # Main layout wrapper
│   │   ├── SuperAdminLayout.jsx   # Super admin layout variant
│   │   ├── L1ProjectTable.jsx     # Projects table for L1
│   │   ├── ProjectStatusBoard.jsx # Project status cards
│   │   ├── GoogleMapComponent.jsx # Map integration
│   │   └── ProjectCard.jsx        # Project card component
│   ├── services/
│   │   └── userService.js         # User API service
│   ├── lib/
│   │   └── firebase.js            # Firebase configuration
│   ├── api/
│   │   └── db.js                  # Database utilities
│   ├── App.jsx                    # Main app with routing
│   └── main.jsx                   # React entry point
├── server/
│   ├── index.js                   # Express server + all API endpoints
│   └── db.js                      # Database connection
├── schema.sql                     # Database schema & sample data
├── tailwind.config.cjs            # Tailwind + Lodha colors
├── vite.config.cjs                # Vite build config
├── firebase.json                  # Firebase config (empty)
└── package.json                   # Dependencies
```

---

## 🔄 Key Workflows & User Journeys

### Workflow 1: Create a New Project (L1 Admin)
1. Login with L1 credentials
2. Navigate to L1 Dashboard → "Create New Project" button
3. Fill project name, location, latitude/longitude
4. Add buildings (select type, residential type if applicable)
5. For each building, add floors (floor number, floor name)
6. For each floor, add flats (type, area, count)
7. Use copy buttons to duplicate floors/buildings
8. View live preview on right side
9. Click "Create Project" button
10. Project saved to database with full hierarchy
11. Redirect to project list
12. Project now visible to appropriate users

### Workflow 2: Assign Lead to Project (L1 Admin)
1. Go to L1 Dashboard
2. View projects table
3. Click "Assign Lead" on a project
4. Select L2 lead from dropdown
5. Lead assigned, receives access to project

### Workflow 3: Track Project Execution (L2 Lead)
1. Login with L2 credentials
2. Navigate to L2 Dashboard
3. See only assigned projects
4. View project details
5. Handle MAS (Material Approvals) - review and approve/reject
6. Handle RFI (Info Requests) - respond to information requests
7. Update project stage (DD, Tender, VFC)
8. Track completion percentage, floors, material stock

### Workflow 4: Manage Project Standards (Super Admin)
1. Login as Super Admin (lodhaatelier@gmail.com)
2. Navigate to Super Admin Dashboard
3. Click "Project Standards" card
4. Select category (Application Types, Residential Types, Flat Types)
5. Add new standard (value + description)
6. Edit existing standards inline
7. Deactivate/activate standards
8. Delete standards
9. Changes immediately reflect in project creation forms

### Workflow 5: View Dashboard by User Level
1. Login with any level
2. Automatically redirected to appropriate dashboard
3. Each dashboard shows role-specific information
4. Navigation cards link to accessible features
5. User can switch dashboards via Super Admin Dashboard

---

## 💾 Database Initialization

### Auto-Created on Server Start
- Tables created automatically via `initializeDatabase()` function
- Uses `CREATE TABLE IF NOT EXISTS` for safety
- No manual database setup needed

### Sample Data
- Pre-loaded project standards for all three categories
- Sample projects in schema.sql (but auto-deleted when dev server restarts)

### Connection Details
```
Host: Determined by DB_HOST env var (Google Cloud SQL)
Port: 5432
SSL: Enabled (rejectUnauthorized: false for Cloud SQL)
User: DB_USER env var
Password: DB_PASSWORD env var
Database: DB_NAME env var
```

---

## 🛡️ Security & Validation

### Frontend Validation
- Required field checks
- Email format validation
- Unique constraint checks (dropdown options)
- Role-based route protection

### Backend Validation
- User level verification on protected endpoints
- Query parameterization to prevent SQL injection
- CORS enabled only for localhost
- Error messages don't leak sensitive data
- 404 responses for not-found resources
- 400 responses for validation failures
- 500 responses for server errors

### Authentication
- Firebase handles password security
- No passwords stored in local database
- Email-based user identification
- Automatic user creation on first login
- Session via Firebase auth token

---

## 📊 Current Features Status

### ✅ Completed Features
- User authentication (Firebase OAuth)
- Role-based access control (4 levels + Super Admin)
- Project hierarchy (Projects → Buildings → Floors → Flats)
- Project creation with complex form
- Project editing and updates
- Project archival (hand-over)
- Material Approval Sheets (MAS) tracking
- Requests for Information (RFI) tracking
- Project Standards management (Super Admin)
- Lead assignment to projects
- Lifecycle stage updates
- Google Maps integration
- Dashboard for each user level
- Responsive design
- Lodha brand theme (all pages)
- Database auto-initialization
- API endpoints for all features
- Copy/duplicate functionality for buildings and floors
- Live preview of project structure
- Inline editing for standards
- Status filtering and sorting

### 🎨 UI/UX Improvements Applied
- All bright colors replaced with Lodha palette
- Consistent theming across all pages
- Professional, suave appearance
- Accessible color contrasts
- Responsive layout
- Clear navigation hierarchy

---

## 🚨 Known Limitations & Future Enhancements

### Current Limitations
1. No real-time notifications
2. No project sharing/collaboration features
3. No attachment uploads
4. No email notifications
5. Limited reporting/analytics
6. No bulk operations
7. No audit trail/activity logs
8. No comment/discussion threads

### Potential Enhancements
- Real-time updates using WebSockets
- File uploads for projects and MAS
- Email notifications for approvals
- Advanced filtering and search
- Project templates
- Budget tracking
- Resource allocation
- Timeline/Gantt charts
- Mobile app version
- Export to PDF/Excel

---

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run dev on specific port
PORT=5174 npm run dev
```

---

## 📱 Responsive Design

- Mobile: Full responsive layout
- Tablet: 2-column layouts where appropriate
- Desktop: Full 3-column layouts (sidebar + content + preview)
- Hamburger menu on mobile
- Touch-friendly buttons and spacing

---

## 🎯 Project Goals Achievement

✅ **Goal 1:** Centralized project management system → **ACHIEVED**
- Multi-level hierarchy for projects
- All project details captured
- Easy project creation and editing

✅ **Goal 2:** Role-based access control → **ACHIEVED**
- 4 user levels + Super Admin
- Route protection based on roles
- Level-appropriate dashboards

✅ **Goal 3:** Material and RFI tracking → **ACHIEVED**
- MAS module for material approvals
- RFI module for information requests
- Pending counts and status tracking

✅ **Goal 4:** Professional UI/UX → **ACHIEVED**
- Lodha brand theme applied
- Responsive across devices
- Intuitive navigation
- Complex forms simplified

✅ **Goal 5:** Scalable architecture → **ACHIEVED**
- RESTful API design
- Database auto-initialization
- Modular component structure
- Clear separation of concerns

---

## 📞 Contact & Support

**Project Owner:** ajitkumarjha-alt
**Organization:** Lodha Group
**Repository:** ajitkumarjha-alt/atelier
**Current Branch:** main

---

## 📝 Notes for AI Agents

**Key Context:**
- This is a production-ready MEP project management portal
- Uses modern React with Vite for fast development
- Database is PostgreSQL with full schema auto-initialization
- All authentication handled by Firebase
- Theme uses only Lodha corporate colors (gold, sand, black, grey)
- No external UI framework - pure Tailwind CSS
- Full role-based access control implemented
- Complex form management for project hierarchy

**Common Tasks:**
1. To add a new feature: Create page component → Add route in App.jsx → Add backend API endpoint → Update database if needed
2. To add a new user level: Update user_level values → Add route protection → Create new dashboard page
3. To modify colors: Update tailwind.config.cjs with new Lodha colors → Replace all page color classes
4. To test endpoints: Use curl or Postman with JSON payloads
5. To debug: Check console logs in browser DevTools and backend terminal output

**Critical Files:**
- App.jsx: Main routing and authentication logic
- server/index.js: All backend API endpoints
- schema.sql: Database structure reference
- tailwind.config.cjs: Design system colors

---

**Last Updated:** January 28, 2026
**Status:** Fully Functional ✅
