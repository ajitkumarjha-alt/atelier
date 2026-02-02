# Atelier MEP Portal - Complete Project Summary for AI Agents

## 📋 Project Overview

**Project Name:** Atelier MEP Portal
**Owner:** ajitkumarjha-alt (Lodha Group)
**Type:** Web-based MEP (Mechanical, Electrical, Plumbing) Project Management System
**Purpose:** Centralized platform for managing construction projects, material approvals, requests for information, and team collaboration across different access levels

**Current Status:** ✅ **Development Complete** - Fully functional with all core features implemented

---

## 🏗️ Architecture & Tech Stack

## 🔧 Technology Stack Details

### Frontend Technologies
- **React 19.2.0** - Latest React with hooks and functional components
- **Vite 7.2.4** - Lightning-fast build tool and dev server
- **React Router 7.13.0** - Advanced routing with data loaders
- **Tailwind CSS 3.4.1** - Utility-first CSS framework with custom Lodha colors
- **Lucide React 0.563.0** - Modern icon library
- **Axios 1.13.3** - HTTP client for API calls
- **Firebase 12.8.0** - Authentication and real-time services
- **UUID 13.0.0** - Unique ID generation

### Backend Technologies
- **Node.js (ES Modules)** - Modern JavaScript runtime
- **Express.js 4.18.2** - Web server and API framework
- **PostgreSQL (pg 8.17.2)** - Relational database
- **Firebase Admin SDK 12.0.0** - Server-side Firebase operations
- **Google Cloud Storage** - File storage (@google-cloud/storage 7.18.0)
- **Google Generative AI (Gemini)** (@google/generative-ai 0.24.1) - LLM integration
- **Multer 2.0.2** - Multipart file upload handling
- **CORS 2.8.5** - Cross-origin resource sharing
- **dotenv 16.3.1** - Environment variable management

### Development Tools
- **ESLint 9.39.1** - Code linting and style enforcement
- **Nodemon 3.0.3** - Auto-restart server on changes
- **Concurrently 8.2.2** - Run multiple npm scripts concurrently
- **Vite 7.2.4** - Hot module replacement and build optimization
- **PostCSS 8.4.33** - CSS transformation tool
- **Autoprefixer 10.4.17** - Vendor prefix management

### Report Generation (Optional)
- **jsPDF 4.0.0** - PDF generation
- **jsPDF-autotable 5.0.7** - PDF table generation
- **ExcelJS 4.4.0** - Excel file creation

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

### Six User Levels + Super Admin

| Level | Title | Permissions | Dashboards | Features |
|-------|-------|-------------|-----------|----------|
| **SUPER_ADMIN** | Super Administrator | Full system access | All dashboards | Manage all users, edit project standards, override any function, view all projects |
| **L0** | Operations Lead | Project oversight | L0 Dashboard | View all projects, monitor progress, high-level oversight, analytics |
| **L1** | Admin | Project allocation | L1 Dashboard | Create projects, assign leads, view all projects, manage everything, team management |
| **L2** | Lead | Project execution | L2 Dashboard | Track assigned projects, handle MAS/RFI approvals, update progress, team collaboration |
| **L3** | Supervisor | Limited editing | L3 Dashboard | View projects, limited editing, monitor KPIs, change request tracking |
| **L4** | Team Member | View only | L4 Dashboard | View assigned projects, view basic info, no editing capability |
| **VENDOR** | Vendor | Vendor portal | Vendor Dashboard | Submit MAS materials, track approval status, upload documents |
| **CM** | Construction Manager | Execution & Reporting | CM Dashboard | Track construction progress, manage schedules, drawing/RFI management |

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
- **Building Types:** Support for different application types (Residential, Commercial, Clubhouse, MLCP, Institute, Industrial, Hospital, Hospitality, Data center)
- **Residential Types:** Different series (Aspi, Casa, Premium, Villa)
- **Flat Types:** Various configurations (1BHK, 2BHK, 3BHK, 4BHK, Studio)
- **Twin Buildings:** Support for twin/mirror building configuration
- **Project Archival:** Hand-over/archive projects when complete
- **Team Management:** Assign team members with specific roles to projects

### 2. Project Lifecycle Tracking
- **Stages:** Concept → DD (Design Development) → Tender → VFC (Vendor Final Confirmation)
- **Progress Tracking:** Completion percentage, floors completed, material stock percentage
- **MEP Status:** Pending, In Progress, Completed
- **Status Updates:** Real-time stage updates for project leads
- **Timestamps:** Track creation, updates, and archival dates

### 3. Material Approval Sheets (MAS)
- **Track Materials:** Log material names, quantities, specifications
- **Approval Workflow:** Multi-level approval (L2 → L1 → Final)
- **Vendor Tracking:** Capture vendor information and submission
- **Status Management:** Pending, Approved, Rejected with comments
- **L1/L2 Reviews:** Separate review and comment tracking per level
- **Dashboard Visibility:** Pending counts and summary views

### 4. Requests for Information (RFI)
- **Create RFI:** Project leads create information requests
- **Status Tracking:** Pending, Resolved, Closed
- **Response Management:** Track responses and resolutions
- **Dashboard Integration:** RFI queues and pending counts
- **Audit Trail:** Track who raised and who resolved

### 5. Project Input Form (Complex Form)
- **Multi-level Form:** Buildings → Floors → Flats hierarchy
- **Copy Functionality:** Duplicate floors and buildings with related data
- **Real-time Validation:** Form validation on input
- **Auto-save:** Fields auto-save as user types
- **Live Preview:** See building structure in real-time
- **Google Maps Integration:** Location selection with map + Places autocomplete

### 6. Project Standards Management (Super Admin)
- **CRUD Operations:** Create, Read, Update, Delete dropdown options
- **Categories:** Application Types, Residential Types, Flat Types
- **Active/Inactive Toggle:** Deactivate without deleting
- **Edit Management:** In-line editing of standards
- **Duplicate Prevention:** Database-level unique constraints
- **Category Filtering:** Sidebar navigation by category

### 7. User Management & Team Collaboration
- **Automatic User Sync:** New users auto-created on login via Firebase
- **User Level Assignment:** Backend determines user level from Firebase
- **Lead Assignment:** L1 assigns leads to projects
- **Team Assignment:** Add team members with specific roles to projects
- **User Directory:** View users by level
- **Profile Management:** Track user info, last login, roles

### 8. Dashboard Navigation (8 Different Dashboards)
- **Role-Based Dashboards:** Each user level has custom dashboard
- **L0 Dashboard:** Operations overview and high-level metrics
- **L1 Dashboard:** Project allocation and admin functions
- **L2 Dashboard:** Lead execution tracking and approvals
- **L3 Dashboard:** Supervisor monitoring and change requests
- **L4 Dashboard:** Team member view and assigned projects
- **Super Admin Dashboard:** Full control and standards management
- **Vendor Dashboard:** Vendor-specific MAS submission and tracking
- **CM Dashboard:** Construction manager progress tracking

### 9. File Management & Document Handling
- **Google Cloud Storage Integration:** Upload and store project documents
- **Multi-file Upload:** Support for multiple file types (images, PDFs, Excel, Word, etc.)
- **File Deletion:** Remove uploaded documents
- **Storage Status:** Check GCS configuration and availability

### 10. AI Features & LLM Integration
- **Natural Language Queries:** Ask questions about project data in natural language
- **Database Chat:** Interactive chat with project database
- **Project Stories:** Generate AI-written project summaries and narratives
- **AI Reports:** Automated insights and visualizations
- **Visualization Suggestions:** AI recommends charts and reports
- **LLM Configuration:** Graceful fallback if AI not configured (using Gemini API)

---

## 🔗 API Endpoints

### Projects
- `GET /api/projects` - Fetch projects (filtered by user level)
- `GET /api/projects/:id` - Get single project
- `GET /api/projects-public` - Get public projects (no auth)
- `POST /api/projects` - Create new project with full hierarchy
- `PATCH /api/projects/:id` - Update project
- `GET /api/projects/:id/full` - Get project with all building/floor/flat data
- `POST /api/projects/:id/assign-lead` - Assign L2 lead
- `PATCH /api/projects/:id/stage` - Update lifecycle stage
- `POST /api/projects/:id/archive` - Archive/hand-over project
- `GET /api/projects/archive/list` - Get archived projects
- `GET /api/projects/:id/team` - Get project team members
- `POST /api/projects/:id/team` - Add team member to project
- `DELETE /api/projects/:id/team/:userId` - Remove team member

### Project Standards (Dropdown Options)
- `GET /api/project-standards` - Get active standards for dropdowns
- `GET /api/project-standards-all` - Get all standards (admin view)
- `POST /api/project-standards` - Create new standard
- `PATCH /api/project-standards/:id` - Update standard
- `DELETE /api/project-standards/:id` - Delete standard

### Users & Authentication
- `POST /api/auth/sync` - Sync user on login
- `GET /api/users/level/:level` - Get users by level
- `GET /api/users/email/:email` - Get user by email

### Material Approvals (MAS)
- `GET /api/mas/pending-count` - Get pending MAS count
- `GET /api/mas/summary` - Get MAS summary grouped by project
- `GET /api/mas/project/:projectId` - Get MAS items for project
- `GET /api/mas/:id` - Get single MAS item
- `POST /api/mas` - Create new MAS
- `PATCH /api/mas/:id` - Update MAS status and comments

### Requests for Information (RFI)
- `GET /api/rfi/pending-count` - Get pending RFI count
- `GET /api/rfi/summary` - Get RFI summary grouped by project
- `GET /api/rfi/project/:projectId` - Get RFI items for project
- `GET /api/rfi/:id` - Get single RFI item
- `POST /api/rfi` - Create new RFI
- `PATCH /api/rfi/:id` - Update RFI status and response

### File Management & Storage
- `POST /api/upload` - Upload files to Google Cloud Storage (multipart/form-data)
- `DELETE /api/upload` - Delete file from GCS
- `GET /api/upload/status` - Check if storage is configured

### LLM & AI Features
- `POST /api/llm/query` - Execute natural language database query
- `POST /api/llm/chat` - Chat with database via LLM
- `GET /api/llm/project-story/:projectId` - Generate AI project summary/story
- `GET /api/llm/status` - Check if LLM is configured

### System
- `GET /api/health` - Health check endpoint (no auth required)

---

## 🎨 Frontend Pages & Components

### Pages Implemented
```
/src/pages/
├── Login.jsx                          # Firebase authentication
├── Dashboard.jsx                      # Smart redirect based on user level
├── L0Dashboard.jsx                    # Operations oversight
├── L1Dashboard.jsx                    # Admin project management
├── L2Dashboard.jsx                    # Lead execution tracking
├── L3Dashboard.jsx                    # Supervisor monitoring
├── L4Dashboard.jsx                    # Team member view
├── SuperAdminDashboard.jsx            # Super admin control center
├── VendorDashboard.jsx                # Vendor portal
├── CMDashboard.jsx                    # Construction manager tracking
├── ProjectDetail.jsx                  # View single project details
├── ProjectInput.jsx                   # Complex project creation/editing form
├── ProjectStandardsManagement.jsx     # Manage dropdown options
├── MASPage.jsx                        # Material Approval Sheets list
├── MASForm.jsx                        # Create/edit MAS
├── MASDetail.jsx                      # View MAS details
├── RFIPage.jsx                        # Requests for Information list
├── RFICreate.jsx                      # Create RFI
├── RFIDetail.jsx                      # View RFI details
├── DrawingSchedule.jsx                # Drawing schedule management
└── ChangeRequestsPage.jsx             # Change request tracking

/src/components/
├── Layout.jsx                         # Main layout wrapper
├── SuperAdminLayout.jsx               # Super admin layout variant
├── L1ProjectTable.jsx                 # Projects table for L1
├── L2TopStats.jsx                     # Key statistics component
├── ProjectStatusBoard.jsx             # Project status cards
├── ProjectCard.jsx                    # Reusable project card
├── GoogleMapComponent.jsx             # Map integration
├── AIChat.jsx                         # AI chat interface
├── AIReports.jsx                      # AI-generated reports
├── FileUpload.jsx                     # File upload component
├── ProjectTeamManagement.jsx          # Team member management
└── CreateMAS.jsx                      # MAS creation component
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
12. Project now visible to appropriate users based on role

### Workflow 2: Assign Lead & Team to Project (L1 Admin)
1. Go to L1 Dashboard
2. View projects table
3. Click "Assign Lead" on a project
4. Select L2 lead from dropdown
5. Lead assigned, receives access to project
6. Add additional team members by role
7. Team members notified of assignment

### Workflow 3: Submit & Track Material Approval (Vendor or L2)
1. Login as Vendor or L2
2. Navigate to MAS page
3. Click "Create New MAS"
4. Fill material details (name, quantity, vendor info, specifications)
5. Upload supporting documents
6. Submit for L2 review
7. L2 reviews and adds comments
8. Vendor receives feedback
9. Submits revised MAS if needed
10. L2 approves, escalates to L1
11. L1 provides final approval
12. Status updated to "Approved"

### Workflow 4: Raise & Resolve Information Request (L2 Lead)
1. Login as L2 lead
2. Navigate to RFI page
3. Click "Create RFI"
4. Describe information needed, assign owner
5. RFI created with "Pending" status
6. Assigned person reviews and responds
7. Lead verifies response
8. Mark as "Resolved" or "Closed"
9. Historical record maintained

### Workflow 5: Manage Project Standards (Super Admin)
1. Login as Super Admin
2. Navigate to Super Admin Dashboard
3. Click "Project Standards" card
4. Select category (Application Types, Residential Types, Flat Types)
5. Add new standard (value + description)
6. Edit existing standards inline
7. Deactivate/activate standards as needed
8. Delete standards if no longer needed
9. Changes immediately reflect in project creation forms
10. All user levels see updated options

### Workflow 6: Assign Team to Drawing Schedule (CM)
1. Login as CM
2. Navigate to Drawing Schedule page
3. View drawing items and schedule
4. Assign team members to specific drawings
5. Set milestones and deadlines
6. Track progress by floor/section
7. Update status as drawings complete
8. Generate reports on schedule adherence

### Workflow 7: Track Change Requests (L3/L2)
1. Login as L2 or L3
2. Navigate to Change Requests page
3. Create new change request or view existing
4. Provide change details and justification
5. Track through approval workflow
6. L2 reviews and approves
7. L3 supervisor monitors all changes
8. Generate change log and reports
9. Update project timeline as needed

### Workflow 8: Smart Dashboard Redirect
1. User logs in with their role
2. System automatically determines user level
3. Redirect to appropriate dashboard:
   - SUPER_ADMIN → Super Admin Dashboard
   - L0 → Operations Dashboard
   - L1 → Admin Dashboard
   - L2/L3/L4 → Role-specific dashboard
   - VENDOR → Vendor portal
   - CM → Construction Manager dashboard

---

## 💾 Database Initialization & Management

### Auto-Created on Server Start
- Tables created automatically via initialization function in server/index.js
- Uses `CREATE TABLE IF NOT EXISTS` for safe initialization
- Indexes created for common queries (email, status, project lookups)
- Triggers set up for automatic `updated_at` timestamp updates
- No manual database setup needed - fully automated

### Sample Data
- Pre-loaded project standards for all categories (application types, residential types, flat types)
- Sample projects created in schema.sql demonstrating full hierarchy
- Sample data auto-cleaned on each server restart in development mode
- Production data persists across restarts (Cloud SQL)

### Database Features
- **Cascading Deletes:** Orphaned records automatically removed when parents deleted
- **Automatic Timestamps:** `created_at` and `updated_at` managed by triggers
- **Foreign Key Constraints:** Relational integrity enforced at database level
- **Unique Constraints:** Duplicate prevention (e.g., user emails, standard options)
- **Indexes:** Performance optimization for common queries
- **SSL Connections:** Secure database connections (especially for Cloud SQL)

### Database Connection & Configuration
```
Host: Determined by DB_HOST env var (Google Cloud SQL or local PostgreSQL)
Port: 5432
SSL: Enabled (rejectUnauthorized: false for Cloud SQL compatibility)
User: DB_USER env var
Password: DB_PASSWORD env var
Database: DB_NAME env var
Connection Method: Node.js pg library with pooling
```

### Additional Tables

#### 9. **project_team**
Project team member assignments
```sql
- id: SERIAL PRIMARY KEY
- project_id: INTEGER FK projects(id) ON DELETE CASCADE
- user_id: INTEGER FK users(id) ON DELETE CASCADE
- role: VARCHAR(100) [role description]
- assigned_by: INTEGER FK users(id)
- assigned_at: TIMESTAMP
- created_at: TIMESTAMP
- UNIQUE(project_id, user_id)
```

#### 10-12. **Additional Tables** (In schema but with extended functionality)
- **material_approval_sheets**: Extended with vendor tracking, L1/L2 approval workflows
- **requests_for_information**: Extended tracking and status management
- Potential additional tables for change_requests, drawing_schedule, vendor_profiles

---

## � Security & Validation Features

### Frontend Validation
- Required field checks with visual feedback
- Email format validation
- Unique constraint checks for dropdown options
- Role-based route protection with automatic redirects
- Form validation on submit and auto-save
- CSRF protection through Firebase tokens

### Backend Validation & Security
- Firebase ID token verification on all protected endpoints
- User level verification on all protected endpoints
- Query parameterization to prevent SQL injection
- Prepared statements for all database queries
- CORS enabled for specified origins (development/production)
- Error messages don't leak sensitive data
- 404 responses for not-found resources
- 400 responses for validation failures
- 500 responses for server errors
- Rate limiting capability (can be added)
- File upload validation (MIME type checking)
- User permission checks for data access

### Authentication Flow
- Firebase OAuth 2.0 with Google login
- ID token verification on backend
- Automatic user creation on first login
- Session management via Firebase SDK
- User level stored in PostgreSQL
- Role-based access control checks on every request
- Development mode bypass with x-dev-user-email header (dev only)

### Data Privacy
- Passwords never stored (managed by Firebase)
- User data encrypted in transit (HTTPS)
- Database connections use SSL (Cloud SQL)
- Sensitive configs in environment variables
- File uploads stored in Google Cloud Storage with access control

---

## 📊 Current Features Status

### ✅ Completed Features
- User authentication (Firebase OAuth with email/Google)
- Role-based access control (6 user levels + Super Admin)
- Project hierarchy (Projects → Buildings → Floors → Flats)
- Project creation with complex form
- Project editing and updates
- Project archival (hand-over)
- Material Approval Sheets (MAS) with multi-level workflow
- Requests for Information (RFI) tracking with status management
- Project Standards management (Super Admin)
- Lead assignment to projects
- Team member assignment and management
- Lifecycle stage updates
- Google Maps integration with Places autocomplete
- Dashboard for each user level (8 dashboards total)
- Responsive design (mobile, tablet, desktop)
- Lodha brand theme (all pages with custom colors)
- Database auto-initialization
- API endpoints for all features
- Copy/duplicate functionality for buildings and floors
- Live preview of project structure
- Inline editing for standards
- Status filtering and sorting
- Google Cloud Storage integration for file uploads
- LLM/AI integration (Gemini API) for natural language queries
- Project team management and collaboration
- Drawing schedule management (CM Dashboard)
- Change request tracking (L3 Dashboard)
- Vendor portal (MAS submission)
- AI-generated project stories and reports
- File management and document storage

### 🎨 UI/UX Enhancements Applied
- All colors aligned with Lodha brand palette (gold, sand, black, grey)
- Consistent theming across all 8 dashboards
- Professional, luxury aesthetic
- Accessible color contrasts
- Responsive layout
- Clear navigation hierarchy
- Multiple dashboard variants for different user roles
- Intuitive team collaboration interface

---

## 🚨 Known Limitations & Future Enhancements

### Current Limitations
1. Real-time notifications not yet implemented (but infrastructure ready)
2. Email notifications not configured (but can be added via SendGrid or similar)
3. No comment/discussion threads on projects yet
4. Limited audit trail (creation/update tracked but limited granularity)
5. No bulk operations/batch processing
6. Search functionality limited to basic filtering
7. No project templates (but can be easily added)
8. No mobile app (web is fully responsive though)

### Potential Enhancements
- Real-time updates using WebSockets/Socket.io
- Email notifications for approvals and status changes
- Advanced search with full-text search capabilities
- Project templates for quick project creation
- Budget tracking and cost analysis
- Resource allocation and capacity planning
- Timeline/Gantt charts for scheduling
- Export to PDF/Excel with multiple formats
- Mobile app version (React Native)
- Advanced analytics and reporting
- Integration with external systems (ERP, CRM)
- Approval workflow automation
- Document version control
- Comments and discussions on items
- Activity feed and audit logs
- Notification preferences per user

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

## 📱 Responsive Design & Cross-Platform Support

- **Mobile (< 768px):** Full responsive layout with hamburger menu, single column
- **Tablet (768px - 1024px):** 2-column layouts where appropriate, medium spacing
- **Desktop (> 1024px):** Full 3-column layouts (sidebar + content + preview)
- **Touch-friendly:** All buttons and interactive elements meet minimum touch target size
- **Accessibility:** WCAG 2.1 AA compliant colors and contrast ratios
- **Font Scaling:** Responsive typography with rem-based sizing
- **Images:** Optimized images with proper aspect ratios
- **Navigation:** Context-aware menus and clear hierarchy

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

## 📞 Configuration & Environment Variables

### Firebase Configuration (Frontend)
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Google Maps Configuration (Frontend)
```
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Database Configuration (Backend)
```
DB_USER=postgres_username
DB_PASSWORD=postgres_password
DB_HOST=localhost_or_cloud_sql_instance
DB_NAME=atelier_mep
INSTANCE_CONNECTION_NAME=project:region:instance (for Cloud SQL)
```

### Firebase Admin SDK (Backend)
```
FIREBASE_ADMIN_SDK={"type":"service_account","project_id":"..."}
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Google Cloud Storage (File Upload)
```
GCS_BUCKET_NAME=atelier-mep-files
GCP_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
# OR uses GOOGLE_APPLICATION_CREDENTIALS
```

### LLM Integration (Gemini AI)
```
GEMINI_API_KEY=your_gemini_api_key
```

### Server Configuration
```
PORT=5175 (or 3001, configurable)
NODE_ENV=development|production
```

---

## 📝 Notes for AI Agents & Future Developers

### Key Architecture Principles
1. **Modular Design:** Each feature/page is self-contained and reusable
2. **Role-Based Access Control:** Every endpoint checks user level
3. **Database-First:** Schema drives the entire data model
4. **API-First:** Frontend communicates only through REST API
5. **Error Handling:** Graceful degradation when optional services unavailable
6. **Security:** Defense in depth with validation at multiple layers

### Common Development Tasks

#### Adding a New Feature
1. Design database schema changes if needed
2. Update schema.sql with new tables/columns
3. Create API endpoint in server/index.js with role verification
4. Create React component/page in src/pages/ or src/components/
5. Add route in src/App.jsx with role protection
6. Update navigation in relevant dashboard
7. Test with multiple user levels

#### Adding a New User Level
1. Define new user level string (e.g., "L5_CUSTOM")
2. Add route protection in App.jsx
3. Create new dashboard page
4. Update database initialization if needed
5. Update role checks in all protected endpoints
6. Test authentication flow

#### Modifying Colors/Theme
1. Update tailwind.config.cjs with new Lodha colors
2. Replace all page color classes using search/replace
3. Test on all dashboard variants
4. Ensure contrast meets WCAG standards
5. Test on mobile/tablet/desktop

#### Testing Endpoints
```bash
# Example: Get projects with auth header
curl -H "Authorization: Bearer $TOKEN" \
  -H "x-dev-user-email: user@example.com" \
  http://localhost:5175/api/projects

# Or use x-dev-user-email header in development (without Firebase)
curl -H "x-dev-user-email: test@example.com" \
  http://localhost:5175/api/projects
```

#### Debug Mode
- Check browser console for React errors
- Check terminal output for backend logs
- Use Network tab in DevTools to inspect API calls
- Development mode allows x-dev-user-email bypass for testing

### Critical Implementation Details

**Authentication Flow:**
- Firebase client SDK handles login UI
- On successful auth, token sent to backend in Authorization header
- Backend validates token with Firebase Admin SDK
- User created/updated in PostgreSQL if new
- User level fetched from database on each request

**Project Hierarchy:**
- Projects contain multiple Buildings
- Buildings contain multiple Floors
- Floors contain multiple Flats
- All deletions cascade to child records
- Copy function creates new records, not references

**MAS Workflow:**
- Create with vendor info and specifications
- L2 reviews and adds comments (status: pending → reviewed)
- L1 reviews comments and approves/rejects
- Final status indicates project approval
- Comments preserved for audit trail

**File Management:**
- Files uploaded to Google Cloud Storage
- References stored in database
- Signed URLs generated for downloads
- Deletion removes from both GCS and database

**LLM Integration:**
- Optional - graceful fallback if not configured
- Uses Gemini API for natural language understanding
- Database schema provided as context
- Results can be used to generate visualizations
- No data sent externally except to Google's Gemini API

### Important Files Reference
- **src/App.jsx:** Main routing, authentication logic, role-based redirects
- **server/index.js:** All API endpoints, database queries, authentication
- **server/db.js:** PostgreSQL connection pool
- **server/storage.js:** Google Cloud Storage integration
- **server/llm.js:** Gemini AI integration
- **schema.sql:** Complete database structure and initial data
- **tailwind.config.cjs:** Design system colors and utilities
- **src/lib/firebase.js:** Firebase client configuration
- **src/services/userService.js:** User creation/sync API calls

## 📞 Project Information

**Project Owner:** ajitkumarjha-alt
**Organization:** Lodha Group
**Repository:** ajitkumarjha-alt/atelier
**Current Branch:** main
**Development Status:** ✅ Fully Functional & Production-Ready

**Quick Links:**
- [GitHub Repository](https://github.com/ajitkumarjha-alt/atelier)
- [Deployment Guide](./DEPLOYMENT.md)
- [Implementation Documentation](./docs/IMPLEMENTATION.md)
- [Quick Start Guide](./docs/QUICK_START.md)
