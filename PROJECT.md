# Atelier MEP Portal — Complete Project Blueprint

> **Purpose**: This document is a complete technical blueprint of the Atelier MEP Portal. An AI agent or developer reading this should understand the entire system and be able to recreate it from scratch.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Backend Architecture](#6-backend-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [API Reference](#9-api-reference)
10. [Business Logic & Workflows](#10-business-logic--workflows)
11. [Domain Logic — Calculation Engines](#11-domain-logic--calculation-engines)
12. [API Contracts & Error Handling](#12-api-contracts--error-handling)
13. [Design System](#13-design-system)
14. [Deployment](#14-deployment)
15. [Development Setup](#15-development-setup)
16. [Testing](#16-testing)

---

## 1. Overview

**Atelier MEP Portal** is a full-stack web application for managing MEP (Mechanical, Electrical, Plumbing) projects in real estate construction. It provides:

- **Project lifecycle management** — Concept → Detailed Design → Tender → VFC (Value for Comment)
- **Design calculations** — 16 engineering calculators (electrical load, water demand, HVAC, fire fighting, cable selection, duct sizing, etc.)
- **Document workflows** — Material Approval Sheets (MAS), Requests for Information (RFI), Change Requests (CR/RFC)
- **Drawing Delivery Schedule (DDS)** — Policy-driven generation, tracking, and analytics
- **Multi-role access** — Hierarchical user levels from Leadership (L0) to Viewer (L4), plus Vendors, Consultants, and Construction Managers
- **AI assistant** — Google Gemini integration for natural language queries, design sheets, and project narratives
- **Meeting Point** — AI-augmented engineering forum with RAG-powered AtelierBot, semantic search (pgvector), anonymous posting, and knowledge base
- **Consultant & Vendor portals** — OTP-based authentication with separate dashboards
- **Policy management** — Versioned policy system for water rates, occupancy factors, and calculation parameters

**Domain**: Real estate MEP engineering (Lodha Group / Macrotech Developers)  
**Users**: Internal engineers (L0–L4), Super Admins, Construction Managers, external Consultants, and Vendors

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2 | UI framework |
| Vite | 7.2 | Build tool & dev server (port 5174) |
| React Router | 7.13 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Lucide React | 0.563 | Icon library |
| react-hot-toast | 2.6 | Toast notifications |
| jsPDF + autoTable | 4.0 / 5.0 | PDF generation |
| Firebase | 12.8 | Auth (Google SSO) |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 (Alpine) | Runtime |
| Express | 4.18 | HTTP framework (port 5175) |
| PostgreSQL | — | Primary database (via `pg` driver) |
| Firebase Admin | 12.0 | Server-side auth verification |
| Google Cloud Storage | 7.18 | File storage (production) |
| Google Generative AI | 0.24 | Gemini LLM integration |
| Multer | 2.0 | File upload handling |
| Nodemailer | 8.0 | Email (OTP delivery) |
| Winston | 3.19 | Structured logging |
| ExcelJS | 4.4 | Excel export |
| uuid | 13.0 | UUID generation (file uploads) |
| axios | 1.13 | HTTP client |
| Helmet | 8.1 | Security headers |
| express-rate-limit | 8.2 | Rate limiting |
| express-validator | 7.3 | Request validation |
| Morgan | 1.10 | HTTP request logging |

### DevOps
| Technology | Purpose |
|-----------|---------|
| pgvector | PostgreSQL vector similarity search (Meeting Point RAG) |
| Docker | Multi-stage containerization |
| Google Cloud Run | Production hosting |
| Cloud Build | CI/CD (cloudbuild.yaml) |
| Firebase Hosting | SPA fallback config |

---

## 3. Project Structure

```
atelier/
├── server/                          # Backend (Express)
│   ├── index.js                     # Main server (~6900 lines, routes + inline endpoints)
│   ├── db.js                        # PostgreSQL connection pool
│   ├── storage.js                   # GCS / local file storage
│   ├── llm.js                       # Gemini AI integration
│   ├── middleware/
│   │   ├── auth.js                  # Firebase token verification + dev bypass
│   │   ├── validation.js            # express-validator rules
│   │   └── index.js                 # Rate limiter, security headers, compression, error handler
│   ├── routes/
│   │   ├── auth.js                  # User sync/login
│   │   ├── projects.js              # Project CRUD with buildings/floors/flats
│   │   ├── users.js                 # User management
│   │   ├── mas.js                   # Material Approval Sheets
│   │   ├── rfi.js                   # Requests for Information
│   │   ├── dds.js                   # Drawing Delivery Schedule
│   │   ├── consultants.js           # Consultant registration, OTP, referrals
│   │   ├── vendors.js               # Vendor registration, OTP
│   │   ├── tasks.js                 # Task management
│   │   ├── standards.js             # Calculation/engineering standards CRUD
│   │   ├── building-details.js      # Staircases, lifts, lobbies, parking, pools, etc.
│   │   ├── societies.js             # Society grouping of buildings
│   │   ├── drawing-schedules.js     # Drawing schedules
│   │   ├── site-areas.js            # Landscape, amenity, infrastructure areas
│   │   ├── change-requests.js       # Change request workflow
│   │   ├── rfc.js                   # Request for Change workflow
│   │   ├── my-assignments.js        # Unified assignment view
│   │   ├── meeting-point.js         # Meeting Point forum (AI-augmented)
│   │   └── policy.js                # Policy version management
│   ├── routes/
│   │   ├── mep-calculations.js      # Unified CRUD router for all MEP calculators
│   │   └── ...                      # (see routes/ listing above)
│   ├── services/
│   │   ├── electricalLoadService.js # Electrical load calculation engine (legacy, standalone)
│   │   ├── hvacLoadService.js       # HVAC cooling load (ECBC 2017, IS 3103)
│   │   ├── firePumpService.js       # Fire pump sizing (NBC 2016 Part 4)
│   │   ├── cableSelectionService.js # Cable selection (IS 732, IEC 60502)
│   │   ├── lightingDesignService.js # Lighting design (IS 3646, ECBC 2017)
│   │   ├── earthingLightningService.js # Earthing & lightning (IS 3043, IEC 62305)
│   │   ├── plumbingFixtureService.js # Plumbing fixture units (IS 2065)
│   │   ├── phePumpService.js        # PHE pump selection (IS 2065, NPSH/VFD)
│   │   ├── ventilationPressurizationService.js # Ventilation (IS 3103, NBC 2016)
│   │   ├── ductSizingService.js     # Duct sizing (ASHRAE equal friction)
│   │   ├── panelScheduleService.js  # Panel schedule (IS 732, IS 8828)
│   │   ├── risingMainService.js     # Rising main / down take / bus riser (IS 732)
│   │   ├── fireFightingService.js   # Fire fighting system (NBC 2016, NFPA 13/14/20)
│   │   └── meetingPointAI.js        # RAG pipeline, AtelierBot, embeddings
│   ├── lib/
│   │   └── ddsPolicy.js             # DDS Policy 130 generation engine
│   └── utils/
│       ├── emailService.js          # Nodemailer OTP/welcome emails
│       ├── health.js                # Health check utilities
│       └── logger.js                # Winston logger config
│
├── src/                             # Frontend (React)
│   ├── main.jsx                     # App entry point
│   ├── App.jsx                      # Route definitions + lazy loading
│   ├── index.css                    # Global styles + Tailwind directives
│   ├── App.css                      # App-level styles
│   ├── lib/
│   │   ├── firebase.js              # Firebase app init + Google auth provider
│   │   ├── UserContext.jsx          # Global auth state (React Context)
│   │   ├── userLevel.js             # User level utilities + SUPER_ADMIN context switching
│   │   └── api.js                   # Auth-aware fetch wrapper (Bearer token)
│   ├── components/
│   │   ├── Layout.jsx               # Main app shell (sidebar + header)
│   │   ├── SuperAdminLayout.jsx     # Admin layout (top navbar)
│   │   ├── ProtectedRoute.jsx       # Route guard (auth + role check)
│   │   ├── ErrorBoundary.jsx        # React error boundary
│   │   ├── AIChat.jsx               # AI assistant chat panel
│   │   ├── Breadcrumbs.jsx          # Navigation breadcrumbs
│   │   ├── NotificationBell.jsx     # Notification indicator
│   │   ├── ProjectCard.jsx          # Project summary cards
│   │   ├── ProjectStatusBoard.jsx   # Kanban-style project board
│   │   ├── ProjectTeamManagement.jsx # Team member management
│   │   ├── MyAssignmentsWidget.jsx  # Personal assignments summary
│   │   ├── L2TopStats.jsx           # KPI stats bar
│   │   ├── L1ProjectTable.jsx       # Project management table
│   │   ├── DDSProgressChart.jsx     # DDS progress visualization
│   │   ├── DDSBoqList.jsx           # BOQ items list
│   │   ├── DDSDrawingList.jsx       # Drawing items list
│   │   ├── PolicyCreationWizard.jsx # Policy creation step wizard
│   │   ├── FileUpload.jsx           # File upload component
│   │   ├── GoogleMapComponent.jsx   # Google Maps integration
│   │   ├── CreateMAS.jsx            # MAS creation form
│   │   ├── PendingUsers.jsx         # Pending user activation
│   │   ├── ConsultantRegistration.jsx # Consultant registration form
│   │   ├── VendorRegistration.jsx   # Vendor registration form
│   │   ├── StatusBadge.jsx          # Color-coded status badges
│   │   ├── AIReports.jsx            # NL-to-SQL report generator (L0 dashboard)
│   │   ├── MepCalculatorShell.jsx   # Reusable calculator page shell (CRUD, routing, layout)
│   │   ├── MeetingPointWidget.jsx   # Meeting Point dashboard widget
│   │   ├── meeting-point/
│   │   │   ├── NewThreadModal.jsx    # Thread creation with AI duplicate detection
│   │   │   └── ThreadCard.jsx        # Thread preview card
│   │   ├── ConfirmDialog.jsx        # Confirmation modal
│   │   ├── PromptDialog.jsx         # Input prompt modal
│   │   ├── SkeletonLoader.jsx       # Loading skeleton
│   │   ├── Spinner.jsx              # Loading spinner
│   │   ├── EmptyState.jsx           # Empty data state
│   │   ├── Tabs.jsx                 # Tab navigation
│   │   └── Tooltip.jsx              # Tooltip component
│   ├── pages/
│   │   ├── WelcomePage.jsx          # Landing + Google SSO login
│   │   ├── Login.jsx                # Login flow
│   │   ├── PendingApproval.jsx      # Awaiting activation
│   │   ├── Dashboard.jsx            # Dashboard router/redirect
│   │   ├── SuperAdminDashboard.jsx  # Admin control panel
│   │   ├── L0Dashboard.jsx          # Leadership dashboard
│   │   ├── L1Dashboard.jsx          # Project manager dashboard
│   │   ├── L2Dashboard.jsx          # Design team dashboard
│   │   ├── L3Dashboard.jsx          # Drafter dashboard
│   │   ├── L4Dashboard.jsx          # Viewer dashboard
│   │   ├── CMDashboard.jsx          # Construction manager dashboard
│   │   ├── VendorLogin.jsx          # Vendor OTP login
│   │   ├── VendorDashboard.jsx      # Vendor portal
│   │   ├── ConsultantLogin.jsx      # Consultant OTP login
│   │   ├── ConsultantDashboard.jsx  # Consultant portal
│   │   ├── ConsultantMASDetail.jsx  # Consultant MAS view
│   │   ├── ConsultantRFIDetail.jsx  # Consultant RFI view
│   │   ├── ConsultantProjectDrawings.jsx
│   │   ├── ConsultantProjectCalculations.jsx
│   │   ├── ProjectDetail.jsx        # Full project view
│   │   ├── ProjectInput.jsx         # Create/edit project
│   │   ├── StandardsHub.jsx         # Central standards/policy hub
│   │   ├── StandardsManagement.jsx  # Standards CRUD
│   │   ├── ProjectStandardsManagement.jsx
│   │   ├── PolicyManagement.jsx     # Policy versions
│   │   ├── DDSManagement.jsx        # DDS tracking & analytics
│   │   ├── TaskManagement.jsx       # Task board
│   │   ├── MyAssignments.jsx        # Unified personal assignments
│   │   ├── DrawingSchedule.jsx      # Drawing schedule management
│   │   ├── DesignCalculations.jsx   # Calculation hub
│   │   ├── WaterDemandCalculation.jsx
│   │   ├── MASPage.jsx              # MAS list
│   │   ├── MASForm.jsx              # MAS creation
│   │   ├── MASDetail.jsx            # MAS detail/review
│   │   ├── RFIPage.jsx              # RFI list
│   │   ├── RFICreate.jsx            # RFI creation
│   │   ├── RFIDetail.jsx            # RFI detail/review
│   │   ├── ChangeRequestsPage.jsx   # Change requests list
│   │   ├── ChangeRequestDetail.jsx  # CR detail/review
│   │   ├── RFCManagement.jsx        # RFC list & management
│   │   ├── MeetingPoint.jsx         # Meeting Point forum (bento grid dashboard)
│   │   ├── MeetingPointThread.jsx   # Thread detail + replies
│   │   ├── project/
│   │   │   └── ProjectInputEnhanced.jsx  # Enhanced tabbed project input
│   │   └── calculations/            # 16 MEP calculation pages
│   │       ├── ElectricalLoadCalculation.jsx  # Legacy standalone (1760 lines)
│   │       ├── WaterDemandCalculation.jsx      # Legacy standalone (927 lines)
│   │       ├── HVACLoadCalculation.jsx         # MepCalculatorShell-based
│   │       ├── FirePumpCalculation.jsx         # MepCalculatorShell-based
│   │       ├── CableSelectionSheet.jsx         # MepCalculatorShell-based
│   │       ├── LightingLoadCalculation.jsx     # MepCalculatorShell-based
│   │       ├── EarthingLightningCalculation.jsx # MepCalculatorShell-based
│   │       ├── PlumbingFixtureCalculation.jsx  # MepCalculatorShell-based
│   │       ├── PHEPumpSelection.jsx            # MepCalculatorShell-based
│   │       ├── VentilationPressurisation.jsx   # MepCalculatorShell-based
│   │       ├── DuctSizingCalculation.jsx       # MepCalculatorShell-based
│   │       ├── PanelSchedule.jsx               # MepCalculatorShell-based
│   │       ├── RisingMainDesign.jsx            # MepCalculatorShell-based
│   │       ├── DownTakeDesign.jsx              # MepCalculatorShell-based
│   │       ├── BusRiserDesign.jsx              # MepCalculatorShell-based
│   │       └── FireFightingSystemDesign.jsx    # MepCalculatorShell-based
│   ├── services/
│   │   ├── policyService.js         # Cached policy data fetcher (5-min TTL)
│   │   └── userService.js           # User sync (POST /api/auth/sync)
│   ├── hooks/
│   │   └── useDialog.js             # Reusable dialog hook
│   ├── utils/
│   │   ├── validation.js            # Client-side validation
│   │   ├── toast.js                 # Toast helpers
│   │   └── accessibility.js         # A11y utilities
│   └── styles/
│       └── accessibility.css        # A11y styles
│
├── migrations/                      # SQL migration files
├── scripts/                         # DB init, migration, seed scripts
├── tests/                           # Vitest test files
├── uploads/                         # Local file storage (dev)
│   └── meeting-point/               # Meeting Point file attachments
├── public/                          # Static assets
├── reference/                       # Reference documents
│
├── schema.sql                       # Complete database schema
├── package.json                     # Dependencies & scripts
├── vite.config.cjs                  # Vite + proxy config
├── tailwind.config.cjs              # Tailwind theme
├── postcss.config.cjs               # PostCSS config
├── eslint.config.js                 # ESLint config
├── Dockerfile                       # Multi-stage Docker build
├── cloudbuild.yaml                  # Cloud Build CI/CD
├── firebase.json                    # Firebase Hosting config
└── deploy-to-cloud-run.sh           # Deployment script
```

---

## 4. Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | PostgreSQL host |
| `DB_NAME` | PostgreSQL database name |
| `DB_PORT` | PostgreSQL port (default: 5432) |

### Optional — Authentication
| Variable | Description |
|----------|-------------|
| `FIREBASE_ADMIN_SDK` | Firebase Admin SDK service account JSON (production) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account file (development) |

### Optional — Storage
| Variable | Description |
|----------|-------------|
| `GCS_BUCKET_NAME` | GCS bucket name (default: `atelier-mep-files`) |
| `GCP_SERVICE_ACCOUNT` | GCS service account JSON (production) |

### Optional — AI / LLM
| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features |

### Optional — Email
| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `EMAIL_FROM` | Sender email address |

### Optional — Server
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5175 dev, 8080 production) |
| `NODE_ENV` | Environment (`development` / `production`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `DB_SSL` | `false` to disable SSL |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` to allow self-signed certs |
| `DB_POOL_MAX` | Max pool connections (default: 20) |

### Frontend (Vite — prefixed with `VITE_`)
| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key |

---

## 5. Database Schema

PostgreSQL database with ~30 tables. Auto-initialized on server start via `server/index.js`.

### Core Tables

```
users
├── id (SERIAL PK)
├── email (VARCHAR 255, UNIQUE)
├── full_name (VARCHAR 255)
├── role (VARCHAR 50, default 'user')
├── user_level (VARCHAR 20, default 'L4') → SUPER_ADMIN, L0, L1, L2, L3, L4, CM, VENDOR
├── organization (VARCHAR 255, default 'lodhagroup')
├── last_login, created_at, updated_at (TIMESTAMPTZ)

projects
├── id (SERIAL PK)
├── name, description, state, status
├── lifecycle_stage (VARCHAR 50) → Concept, DD, Tender, VFC
├── completion_percentage, floors_completed, total_floors
├── mep_status → pending, in_progress, completed
├── material_stock_percentage
├── assigned_lead_id → FK users(id)
├── start_date, target_completion_date
├── is_archived, archived_at
├── created_at, updated_at
```

### Building Hierarchy

```
projects (1) → societies (N) → buildings (N) → floors (N) → flats (N)

societies
├── id, project_id → FK projects
├── name, description

buildings
├── id, project_id → FK projects
├── society_id → FK societies (optional)
├── name, application_type → Residential, Clubhouse, MLCP, Commercial, ...
├── residential_type → Luxury, Hi-end, Aspirational, Casa
├── location_latitude, location_longitude
├── twin_of_building_id → FK buildings (self-ref for twin buildings)
├── is_twin

floors
├── id, building_id → FK buildings
├── floor_number, floor_name
├── floor_height
├── typical_lobby_area
├── twin_of_floor_id → FK floors (self-ref)

flats
├── id, floor_id → FK floors
├── flat_type → 1BHK, 1.5BHK, 2BHK, 2.5BHK, 3BHK, 4BHK, Studio
├── area_sqft
├── number_of_flats
```

### Document Workflow Tables

```
material_approval_sheets (MAS)
├── id, project_id, material_name, quantity
├── status → pending, l2_approved, l2_rejected, l1_approved, l1_rejected
├── referred_to_consultant_id → FK consultants
├── consultant_reply, consultant_reply_status

requests_for_information (RFI)
├── id, project_id, title, description
├── raised_by_id → FK users
├── status → pending, in_progress, resolved, closed
├── referred_to_consultant_id → FK consultants

project_change_requests (CR)
├── id, project_id, title, description, type
├── l2_status, l1_status
├── implemented_at

requests_for_change (RFC)
├── id, project_id, title, description
├── raised_by, assigned_to
├── l2_status, l1_status
```

### DDS (Drawing Delivery Schedule)

```
dds
├── id, project_id, version, status
├── policy_version_id
├── total_items, completed_items

dds_items
├── id, dds_id, building_id
├── discipline → Electrical, Plumbing, HVAC, Fire Fighting
├── drawing_type, description, phase
├── status → not_started, in_progress, completed, revised
├── expected_date, completed_date
├── architect_input_received, structure_input_received

dds_drawings — individual drawing tracking
dds_boq_items — bill of quantities items
dds_history — audit trail
dds_item_revisions — revision tracking
dds_policies — policy configuration
```

### Standards & Policy Tables

```
project_standards — master list of options (application_type, flat_type, etc.)
project_standard_selections — per-project standard overrides
project_standards_documents — uploaded reference PDFs

electrical_load_factors — electrical load calculation parameters
  ├── category, sub_category, description (composite key pattern)
  ├── watt_per_sqm, mdf, edf, fdf (demand factors)
  ├── guideline (e.g., 'MSEDCL 2016'), is_active, notes
design_factor_substation_space — MSEDCL substation space norms
  ├── installation_type → DTC_OUTDOOR, DTC_INDOOR, DTC_COMPACT, HT_PANEL_ROOM
  ├── rating_kva, room_length_m, room_width_m, total_area_sqm, clearance_m
electrical_load_calculations — saved calculation results
electrical_load_lookup_tables — equipment power lookup
  ├── category (lift_power, phe_pump, ff_main_pump, etc.)
  ├── lookup_key, lookup_value → result_value

calculation_standards — engineering calculation parameters
transformer_ratings — standard transformer sizes
phe_standards — plumbing standards
fire_standards — fire fighting standards
population_standards — population norms
ev_standards — EV charging standards
mep_norms_master — master MEP norms reference table

policy_versions — versioned policy system
policy_water_rates — water consumption rates per policy
policy_occupancy_factors — occupancy factors per policy
policy_calculation_parameters — calculation parameters per policy
policy_change_log — policy change history
```

### Regulatory Framework Tables

```
electrical_regulation_frameworks — master list of frameworks (MSEDCL, NBC, etc.)
  ├── framework_code, framework_name, is_default, is_active
project_regulation_selection — per-project framework selection
  ├── project_id, framework_id, is_active

regulation_area_types — METRO, MAJOR_CITIES, URBAN, RURAL definitions
regulation_load_standards — minimum load per sq.m by premise type (75 W/sqm residential)
regulation_dtc_thresholds — DTC requirement thresholds by area (Rural ≤25kVA, Urban ≤75kVA, Metro ≤250kVA)
regulation_sanctioned_load_limits — max kW/kVA per consumer type
regulation_power_factors — PF per load type (Sanctioned=0.8, After DF=0.9)
regulation_substation_requirements — substation specs by load range
regulation_land_requirements — land/space norms for DTC and substations
regulation_lease_terms — MSEDCL lease terms (duration, rent, surrender notice)
regulation_infrastructure_specs — individual transformer, ring main requirements
regulation_definitions — regulatory term definitions
```

### External User Tables

```
consultants — consultant profiles
consultant_otp — OTP tokens for consultant auth
project_consultants — project ↔ consultant assignments

vendors — vendor profiles
vendor_otp — OTP tokens for vendor auth
project_vendors — project ↔ vendor assignments
```

### Other Tables

```
project_team — project membership (user + role + assigned_by)
tasks — task management (assignee, due_date, linked DDS item)
drawing_schedules — drawing schedule entries
design_calculations — saved design calculations
water_demand_calculations — water demand calculation results
site_areas — landscape, amenity, parking, infrastructure areas
user_documents — uploaded knowledge base documents
ai_chat_history — AI conversation tracking
design_sheets — AI-generated design sheets
user_preferences — personalized settings
notifications — in-app notifications
activity_log — project activity audit trail
temporary_access — time-limited project access grants
cm_components — construction management components
staircases, staircase_windows, staircase_doors — building details
lifts, lobbies, shops, parking — floor-level details
swimming_pools, landscapes, surface_parking, infrastructure — project-level amenities
```

### Meeting Point Tables (pgvector extension required)

```
mp_threads — forum discussion threads
├── id (SERIAL PK)
├── title (VARCHAR 500)
├── body (TEXT)
├── service_tag (VARCHAR 50) → Electrical, HVAC, PHE, Fire, LV, General
├── author_id → FK users(id)
├── is_anonymous, anonymous_alias
├── status → open, resolved
├── is_pinned, is_trending
├── view_count, reply_count
├── verified_solution (TEXT)
├── embedding vector(768) — Gemini embedding for semantic search
├── created_at, updated_at

mp_posts — thread replies
├── id (SERIAL PK)
├── thread_id → FK mp_threads(id) ON DELETE CASCADE
├── author_id → FK users(id)
├── body (TEXT)
├── is_anonymous, anonymous_alias
├── is_bot_reply (BOOLEAN) — AtelierBot auto-replies
├── bot_sources (JSONB) — RAG source references
├── helpful_count, is_verified
├── embedding vector(768)
├── created_at, updated_at

mp_reactions — helpful/correct reactions
├── id (SERIAL PK)
├── post_id → FK mp_posts(id) ON DELETE CASCADE
├── user_id → FK users(id)
├── reaction_type (VARCHAR 20, default 'helpful')
├── UNIQUE(post_id, user_id, reaction_type)

mp_attachments — file attachments (thread or post level)
├── id (SERIAL PK)
├── thread_id → FK mp_threads(id) (optional)
├── post_id → FK mp_posts(id) (optional)
├── file_name, file_url, file_type, file_size
├── is_indexed — whether chunked for RAG

mp_knowledge_chunks — RAG document chunks with embeddings
├── id (SERIAL PK)
├── attachment_id → FK mp_attachments(id) ON DELETE CASCADE
├── chunk_index (INTEGER)
├── chunk_text (TEXT)
├── embedding vector(768)
├── metadata (JSONB)
```

### Key Indexes
- `idx_users_email`, `idx_users_organization`
- `idx_projects_status`
- `idx_project_team_project`, `idx_project_team_user`
- `idx_consultants_email`, `idx_vendors_email`
- `idx_site_areas_project_id`, `idx_site_areas_area_type`
- `idx_mp_threads_service`, `idx_mp_threads_status`, `idx_mp_threads_author`
- `idx_mp_posts_thread`, `idx_mp_posts_author`
- `idx_mp_attachments_thread`, `idx_mp_knowledge_chunks_attachment`
- `idx_mp_threads_embedding` (IVFFlat cosine similarity, lists=50)
- All FK columns have supporting indexes

### Triggers
- `update_updated_at_column()` — auto-updates `updated_at` on all major tables

---

## 6. Backend Architecture

### Server Entry Point
`server/index.js` (~6900 lines) — monolithic Express server that:
1. Initializes Firebase Admin SDK
2. Sets up middleware (CORS, Helmet, compression, rate limiting, Morgan logging)
3. Auto-initializes all database tables with `CREATE TABLE IF NOT EXISTS`
4. Mounts route modules under `/api`
5. Defines inline routes for health, upload, LLM, and some legacy endpoints
6. Serves static frontend in production (`public/` directory)
7. SPA fallback: serves `index.html` for all non-API routes

### Database Layer (`server/db.js`)
- Uses `pg` `Pool` with configurable connection parameters
- Exports: `query()`, `getClient()`, `transaction()`, `closePool()`
- Pool: max 20 connections, 30s idle timeout, 5s connection timeout
- SSL configurable via env vars

### File Storage (`server/storage.js`)
- **Production**: Google Cloud Storage uploads with UUID filenames
- **Development**: Local disk storage in `uploads/` directory
- File validation: max 50MB, allowed types (PDF, images, Excel, Word, CAD)
- Multer middleware with memory or disk storage based on GCS availability

### LLM Integration (`server/llm.js`)
- Google Gemini (`gemini-1.5-flash`) for:
  - Natural language database queries
  - Chat with database context
  - Design sheet generation
  - Schedule tracking summaries
  - Project narrative generation
- Chat history persistence in `ai_chat_history` table

### Meeting Point AI Service (`server/services/meetingPointAI.js`)
- **RAG Pipeline** for the Meeting Point forum using pgvector
- Google Gemini `embedding-001` for 768-dimensional vector embeddings
- **AtelierBot** — "Shadow Listener" that auto-replies with RAG-sourced answers if no human responds within 5 minutes
- Cosine similarity search across threads and knowledge chunks
- AI-powered anonymous content sanitization (strips names, project codes, identifiers)
- Thread resolution summary synthesis
- Real-time duplicate detection as user types
- Document chunking and indexing for knowledge base

### Email Service (`server/utils/emailService.js`)
- Nodemailer SMTP for OTP delivery and welcome emails
- Configurable via `SMTP_*` env vars

### Middleware Stack
```
Request → securityHeaders (Helmet) → CORS → compression → JSON parser
  → Morgan logger → rate limiter → [verifyToken] → route handler → errorHandler
```

### Authentication Middleware (`server/middleware/auth.js`)
- `verifyToken` — Verifies Firebase ID token from `Authorization: Bearer <token>`
- Dev bypass: accepts `x-dev-user-email` header when Firebase Admin not configured
- Attaches `req.user` with `{ uid, email, userId, userLevel, isAdmin, isL1–L4 }`
- `requireRole(...roles)` — Role gate middleware
- `checkProjectAccess` — Verifies user has access to specific project

---

## 7. Frontend Architecture

### Entry Point & Routing
- `src/main.jsx` → renders `<App />` inside `<UserProvider>` and `<ErrorBoundary>`
- `src/App.jsx` → defines all routes with `React.lazy()` + `<Suspense>` for code splitting
- All pages except `WelcomePage` are lazily loaded

### State Management
| Pattern | Usage |
|---------|-------|
| React Context | `UserProvider` / `useUser()` — global auth state |
| Local state | `useState` / `useEffect` in components — no Redux |
| sessionStorage | SUPER_ADMIN context switching to impersonate roles |
| localStorage | Vendor/Consultant auth persistence |
| In-memory cache | `policyService.js` — 5-minute TTL cache |

### Layout System
1. **Layout.jsx** — Main app shell with fixed sidebar (60px, expandable) + top header with breadcrumbs and notification bell. Role-adaptive navigation items.
2. **SuperAdminLayout.jsx** — Admin layout with full-width top navbar (black/gold branding), centered content area.

### API Client (`src/lib/api.js`)
- `apiFetch(url, options)` — wraps `fetch` with:
  - `Authorization: Bearer <idToken>` from Firebase
  - `x-dev-user-email` header as dev fallback
  - Error handling and response parsing
- `apiFetchJson(url, options)` — JSON variant

### Key Component Patterns
- **ProtectedRoute** — checks `user` + optional `roles` array, redirects unauthorized
- **ErrorBoundary** — catches React render errors, shows recovery UI
- **Breadcrumbs** — context-aware navigation trail
- **ConfirmDialog / PromptDialog** — reusable modal dialogs via `useDialog` hook
- **AIReports** — Natural-language-to-SQL report generator embedded in L0Dashboard; users type queries and get tabular results with CSV/JSON export
- **MepCalculatorShell** — Reusable calculator page shell handling CRUD, step management, JSON export, and URL routing. All new calculators use this with `renderInputs`/`renderResults` render-props. Exports `CalcFieldGroup`, `CalcField`, `ResultCard`, `ResultTable` helper components.
- **MeetingPointWidget** — Dashboard card integrated into all role dashboards (L0–L4, SuperAdmin, CM)

### Route Map

#### Public Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | WelcomePage | Landing page + Google SSO login |
| `/vendor-login` | VendorLogin | Vendor OTP login |
| `/consultant-login` | ConsultantLogin | Consultant OTP login |
| `/pending-approval` | PendingApproval | Awaiting user activation |

#### Dashboard Routes (role-gated)
| Path | Component | Access |
|------|-----------|--------|
| `/super-admin-dashboard` | SuperAdminDashboard | SUPER_ADMIN |
| `/l0-dashboard` | L0Dashboard | L0, SUPER_ADMIN |
| `/l1-dashboard` | L1Dashboard | L1, SUPER_ADMIN |
| `/l2-dashboard` | L2Dashboard | SUPER_ADMIN, L1, L2 |
| `/l3-dashboard` | L3Dashboard | Any authenticated |
| `/l4-dashboard` | L4Dashboard | Any authenticated |
| `/cm-dashboard` | CMDashboard | CM, SUPER_ADMIN |
| `/vendor-dashboard` | VendorDashboard | Vendor (localStorage) |
| `/consultant-dashboard` | ConsultantDashboard | Consultant (localStorage) |

#### Project Routes
| Path | Component | Access |
|------|-----------|--------|
| `/project/:id` | ProjectDetail | Any authenticated |
| `/project-input` | ProjectInput | SUPER_ADMIN, L0, L1 |
| `/project-input/:projectId` | ProjectInput | SUPER_ADMIN, L0, L1 |
| `/project-input-enhanced` | ProjectInputEnhanced | SUPER_ADMIN, L0, L1 |
| `/project-input-enhanced/:projectId` | ProjectInputEnhanced | SUPER_ADMIN, L0, L1 |

#### Workflow Routes
| Path | Component | Access |
|------|-----------|--------|
| `/dds/:projectId` | DDSManagement | Any authenticated |
| `/task-management` | TaskManagement | Any authenticated |
| `/my-assignments` | MyAssignments | Any authenticated |
| `/mas-list` | MASPage | SUPER_ADMIN, L1, L2, VENDOR |
| `/mas-form` | MASForm | SUPER_ADMIN, L1, L2, VENDOR |
| `/mas/:id` | MASDetail | SUPER_ADMIN, L1, L2, VENDOR |
| `/rfi` | RFIPage | SUPER_ADMIN, L1, L2 |
| `/rfi/create` | RFICreate | CM, SUPER_ADMIN |
| `/rfi/:id` | RFIDetail | SUPER_ADMIN, L1, L2, CM |
| `/rfc-management` | RFCManagement | SUPER_ADMIN, L1, L2, L3 |
| `/change-requests/:projectId` | ChangeRequestsPage | SUPER_ADMIN, L1, L2 |
| `/change-request/:id` | ChangeRequestDetail | SUPER_ADMIN, L1, L2 |

#### Meeting Point
| Path | Component | Access |
|------|-----------|--------|
| `/meeting-point` | MeetingPoint | Any authenticated |
| `/meeting-point/:threadId` | MeetingPointThread | Any authenticated |

#### Standards & Policy
| Path | Component | Access |
|------|-----------|--------|
| `/standards` | StandardsHub | Any authenticated |
| `/drawing-schedule/:projectId` | DrawingSchedule | SUPER_ADMIN, L1, L2 |
| `/design-calculations/:projectId` | DesignCalculations | Any authenticated |

#### Calculation Routes (`/projects/:projectId/calculations/<type>/:calculationId?`)
| Route Slug | Component | Domain |
|------------|-----------|--------|
| `electrical-load` | ElectricalLoadCalculation | Electrical — building load estimation |
| `cable-selection` | CableSelectionSheet | Electrical — cable sizing |
| `rising-main` | RisingMainDesign | Electrical — vertical power riser |
| `down-take` | DownTakeDesign | Electrical — down-take cable |
| `bus-riser` | BusRiserDesign | Electrical — busbar riser |
| `lighting-load` | LightingLoadCalculation | Electrical — lighting load |
| `panel-schedule` | PanelSchedule | Electrical — panel scheduling |
| `earthing-lightning` | EarthingLightningCalculation | Electrical — earthing & lightning |
| `water-demand` | WaterDemandCalculation | Plumbing — water demand |
| `plumbing-fixture` | PlumbingFixtureCalculation | Plumbing — fixture units |
| `phe-pump-selection` | PHEPumpSelection | Plumbing — pump selection |
| `hvac-load` | HVACLoadCalculation | HVAC — heating/cooling |
| `ventilation-pressurisation` | VentilationPressurisation | HVAC — ventilation |
| `fire-pump` | FirePumpCalculation | Fire — pump sizing |
| `fire-fighting-system-design` | FireFightingSystemDesign | Fire — system design |
| `duct-sizing` | DuctSizingCalculation | HVAC — duct sizing |

---

## 8. Authentication & Authorization

### Authentication Flow

```
┌─────────────┐     signInWithPopup()     ┌───────────────┐
│ WelcomePage  │  ──────────────────────>  │ Firebase Auth  │
│   (Google)   │  <──────────────────────  │  (Google SSO)  │
└──────┬──────┘      user credential       └───────────────┘
       │
       ▼
  POST /api/auth/sync  { email, fullName }
       │
       ├─ 403 → email not registered → /pending-approval
       ├─ 200 → user_level=null → /pending-approval
       └─ 200 → user_level set → role-specific dashboard
```

1. User clicks Google sign-in on WelcomePage
2. Firebase handles Google OAuth popup
3. Client calls `POST /api/auth/sync` with email and name
4. Server creates/updates user record, returns `user_level` and `is_active`
5. If 403 — user not whitelisted; if `user_level` is null — awaiting activation
6. `UserContext` stores auth state globally; `ProtectedRoute` enforces access

### Vendor/Consultant Auth (separate flow)
1. Enter email on `/vendor-login` or `/consultant-login`
2. Server sends 6-digit OTP via email
3. User enters OTP → server verifies → returns session token
4. Auth stored in `localStorage` (`vendorEmail` / `consultantEmail`)

### User Level Hierarchy
```
SUPER_ADMIN  →  Full system access, user management, impersonation
     L0      →  Leadership oversight, project creation
     L1      →  Project management, lead assignment, approvals
     L2      →  Design/execution, calculations create/edit
     L3      →  RFC participation, general read access
     L4      →  View-only access
     CM      →  Construction manager (RFI creation)
   VENDOR    →  Material submissions (separate portal)
 CONSULTANT  →  Read-only project/drawing/MAS/RFI access (separate portal)
```

### Role Groups (defined in App.jsx)
- `ADMIN_ROLES` = `['SUPER_ADMIN']`
- `LEADERSHIP` = `['SUPER_ADMIN', 'L0', 'L1']`
- `DESIGN_TEAM` = `['SUPER_ADMIN', 'L1', 'L2']`
- `MAS_ROLES` = `['SUPER_ADMIN', 'L1', 'L2', 'VENDOR']`
- `RFI_ROLES` = `['SUPER_ADMIN', 'L1', 'L2', 'CM']`
- `RFC_ROLES` = `['SUPER_ADMIN', 'L1', 'L2', 'L3']`

---

## 9. API Reference

~170 endpoints across 19 route modules + inline routes. All prefixed with `/api`.

### Health & System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Simple health check |
| GET | `/api/health/detailed` | DB + Firebase status |
| GET | `/api/ready` | Readiness probe |
| GET | `/api/alive` | Liveness probe |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sync` | Sync/login user |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects (role-scoped) |
| GET | `/api/projects-public` | List all projects (public) |
| GET | `/api/projects/:id` | Get project |
| GET | `/api/projects/:id/full` | Full project with buildings/floors/flats |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| PATCH | `/api/projects/:id/stage` | Update lifecycle stage |
| POST | `/api/projects/:id/archive` | Archive project |
| GET | `/api/projects/archive/list` | List archived |
| GET | `/api/projects/:id/team` | Get team members |
| POST | `/api/projects/:id/team` | Add team member |
| DELETE | `/api/projects/:id/team/:userId` | Remove team member |
| POST | `/api/projects/:id/assign-lead` | Assign lead |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/email/:email` | Find by email |
| GET | `/api/users/level/:level` | List by level |
| GET | `/api/users/addable` | Addable users for current role |
| GET | `/api/users/pending` | Pending activation |
| POST | `/api/users/:id/activate` | Activate user |

### MAS (Material Approval Sheets)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mas` | List with filters |
| POST | `/api/mas` | Create MAS |
| GET | `/api/mas/:id` | Get MAS detail |
| PATCH | `/api/mas/:id` | Update fields |
| PATCH | `/api/mas/:id/l2-review` | L2 approve/reject |
| PATCH | `/api/mas/:id/l1-review` | L1 approve/reject |
| PATCH | `/api/mas/:id/assign` | Assign to user |
| DELETE | `/api/mas/:id` | Delete |
| GET | `/api/mas/pending-count` | Pending count |
| GET | `/api/mas/summary` | Summary by project |
| GET | `/api/mas/project/:projectId` | List by project |

### RFI (Requests for Information)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rfi` | List with filters |
| POST | `/api/rfi` | Create RFI |
| GET | `/api/rfi/:id` | Get RFI |
| PATCH | `/api/rfi/:id` | Update RFI |
| DELETE | `/api/rfi/:id` | Delete |
| GET | `/api/rfi/pending-count` | Pending count |
| GET | `/api/rfi/project/:projectId` | List by project |

### DDS (Drawing Delivery Schedule)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/dds/generate/:projectId` | Generate from Policy 130 |
| POST | `/api/dds/preview-policy` | Preview policy output |
| GET | `/api/dds/policy-info` | Policy 130 config |
| GET | `/api/dds/project/:projectId` | Get latest DDS |
| GET | `/api/dds/:id` | Get DDS with items |
| PUT | `/api/dds/:id` | Bulk update items |
| POST | `/api/dds/:id/regenerate` | Regenerate items |
| PUT | `/api/dds/items/:id/complete` | Mark item completed |
| PUT | `/api/dds/items/:id/revise` | Submit item revision |
| PUT | `/api/dds/items/:id/mark-input` | Mark input received |
| GET | `/api/dds/:id/progress` | Progress by discipline/phase |
| GET | `/api/dds/:id/overdue` | Overdue items |
| GET | `/api/dds/:id/drawings` | Drawing lists |
| GET | `/api/dds/:id/boq` | BOQ items |
| GET | `/api/dds/:id/export` | Export with status colors |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks` | List with filters |
| GET | `/api/tasks/my` | My tasks |
| PATCH | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/complete` | Complete task |
| GET | `/api/tasks/history` | Task history |
| GET | `/api/tasks/stats` | Task statistics |

### Consultants
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/consultants/register` | Register consultant |
| GET | `/api/consultants/list` | List consultants |
| POST | `/api/consultants/send-otp` | Send OTP |
| POST | `/api/consultants/verify-otp` | Verify OTP |
| GET | `/api/consultants/profile` | Consultant profile |
| GET | `/api/consultants/referred-items` | MAS/RFI referred to consultant |
| PATCH | `/api/mas/:id/refer-consultant` | Refer MAS to consultant |
| PATCH | `/api/rfi/:id/refer-consultant` | Refer RFI to consultant |

### Vendors
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/vendors/register` | Register vendor |
| GET | `/api/vendors/list` | List vendors |
| POST | `/api/vendors/send-otp` | Send OTP |
| POST | `/api/vendors/verify-otp` | Verify OTP |
| GET | `/api/vendors/profile` | Vendor profile |

### Standards
| Method | Path | Description |
|--------|------|-------------|
| GET/POST/PUT/DELETE | `/api/standards/calculation` | Calculation standards CRUD |
| GET/POST/PUT | `/api/standards/transformers` | Transformer ratings |
| GET/POST/PUT | `/api/standards/phe` | PHE standards |
| GET/POST | `/api/standards/fire` | Fire standards |
| GET/POST | `/api/standards/population` | Population norms |
| GET/POST | `/api/standards/ev` | EV charging standards |
| GET/POST | `/api/standards/dds-policies` | DDS policies |
| GET/POST | `/api/standards/reference-documents` | Reference documents |

### Change Requests & RFC
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/change-requests` | Create CR |
| GET | `/api/change-requests` | List CRs |
| PATCH | `/api/change-requests/:id/l2-review` | L2 review |
| PATCH | `/api/change-requests/:id/l1-review` | L1 review |
| PATCH | `/api/change-requests/:id/implement` | Mark implemented |
| POST | `/api/rfc` | Create RFC |
| GET | `/api/rfc` | List RFCs |
| PATCH | `/api/rfc/:id/l2-review` | L2 review |
| PATCH | `/api/rfc/:id/l1-review` | L1 review |

### My Assignments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/my-assignments` | All items assigned to user |
| GET | `/api/my-assignments/summary` | Count per type |

### Policy Management
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/policy-versions` | List/create policies |
| GET/PUT | `/api/policy-versions/:id` | Get/update policy |
| POST | `/api/policy-versions/:id/activate` | Activate policy |
| GET/POST | `/api/policy-versions/:policyId/water-rates` | Water rates |
| GET/POST | `/api/policy-versions/:policyId/occupancy-factors` | Occupancy factors |

### File Upload
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload files (max 10) |
| DELETE | `/api/upload` | Delete file |
| GET | `/api/upload/status` | Storage config status |

### LLM / AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/llm/query` | Natural language DB query |
| POST | `/api/llm/chat` | Chat with database |
| GET | `/api/llm/chat-history/:sessionId` | Chat history |
| POST | `/api/llm/design-sheet` | Generate design sheet |
| GET | `/api/llm/project-story/:projectId` | Project narrative |
| GET | `/api/llm/status` | LLM availability |

### Meeting Point (AI-Augmented Forum)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/meeting-point/threads` | List threads (filter by service, status, search, sort, paginate) |
| GET | `/api/meeting-point/threads/:id` | Get thread with posts, attachments, similar threads |
| POST | `/api/meeting-point/threads` | Create thread (supports file upload, anonymous posting) |
| PATCH | `/api/meeting-point/threads/:id` | Edit own thread |
| DELETE | `/api/meeting-point/threads/:id` | Delete thread (author or admin) |
| POST | `/api/meeting-point/threads/:id/posts` | Reply to thread (with files, anonymous option) |
| POST | `/api/meeting-point/threads/:id/view` | Increment view count |
| PATCH | `/api/meeting-point/threads/:id/resolve` | Mark resolved + AI summary generation |
| PATCH | `/api/meeting-point/threads/:id/pin` | Pin/unpin thread (L1+ only) |
| POST | `/api/meeting-point/posts/:id/react` | Toggle helpful reaction |
| PATCH | `/api/meeting-point/posts/:id/verify` | Mark as verified solution (L1+ only) |
| PATCH | `/api/meeting-point/posts/:id` | Edit own post |
| DELETE | `/api/meeting-point/posts/:id` | Delete post (author or admin) |
| GET | `/api/meeting-point/stats` | Dashboard stats (total, open, resolved, by-service, trending, top contributors) |
| GET | `/api/meeting-point/suggest` | Real-time duplicate detection as user types |
| GET | `/api/meeting-point/search` | Semantic search (pgvector + knowledge base) |
| GET | `/api/meeting-point/attachments/:id` | Download attachment |

---

## 10. Business Logic & Workflows

### Two-Tier Review Workflow (MAS, CR, RFC)
```
Creator → L2 Review (approve/reject) → L1 Review (approve/reject) → Final
```
- L1 review requires prior L2 approval
- Each review captures reviewer email, comments, timestamp
- Notifications sent on status changes

### Project Lifecycle
```
Concept → Detailed Design (DD) → Tender → VFC (Value for Comment)
```
- Stage transitions tracked via `PATCH /api/projects/:id/stage`
- Each stage unlocks different features (e.g., DDS generation needs DD stage)

### DDS Policy 130 Engine
- Auto-generates drawing delivery items based on project configuration
- Considers: building types, disciplines (Electrical, Plumbing, HVAC, Fire), phases (DD, VFC)
- Tracks per-item: expected dates, completion, revisions, architect/structure inputs
- Analytics: progress by discipline, overdue items, monthly planned vs actual

### Electrical Load Calculation
- Server-side calculation engine (`server/services/electricalLoadService.js`)
- Uses: flat types × load factors × diversity factors → building demand → transformer sizing
- References MSEDCL (Maharashtra State Electricity Distribution Co.) norms
- Configurable via `electrical_load_factors` and `design_factor_substation_space` tables

### Task-DDS Integration
- Tasks can be linked to DDS items
- Completing a task auto-updates the linked DDS item status
- Notifications sent to task assigner on completion

### Consultant Referral Flow
```
Internal user → Refers MAS/RFI to consultant → Consultant receives notification
  → Consultant reviews via portal → Submits reply → Internal user sees reply
```

### Policy Versioning
```
Draft → Active (only one active at a time) → Archived
```
- Stores: water consumption rates, occupancy factors, calculation parameters
- Policy changes logged in `policy_change_log`
- Frontend caches active policy for 5 minutes

### Meeting Point Forum

#### Thread Lifecycle
```
Create Thread (optional: anonymous, file attachments)
  → Duplicate Detection (AI suggests similar threads in real-time)
  → Published (open)
  → Replies (human + AtelierBot auto-reply after 5 min if no human response)
  → Verified Solution (L1+ marks a post as verified)
  → Resolved (author or L1+ closes thread, AI generates resolution summary)
```

#### AtelierBot (Shadow Listener)
- Monitors new threads; if no human replies within 5 minutes, auto-generates a RAG-sourced answer
- Sources: indexed knowledge base documents (`mp_knowledge_chunks`) + similar resolved threads
- Bot replies flagged with `is_bot_reply=true` and include `bot_sources` JSON

#### Anonymous Posting
- Users can post threads/replies anonymously with a generated alias (e.g., "Senior_Engineer_4721")
- AI sanitization strips names, project codes, and identifiers from anonymous content

#### Semantic Search
- pgvector cosine similarity on thread/post embeddings (768-dim Gemini `embedding-001`)
- Combined search across forum threads and knowledge base chunks
- IVFFlat index for approximate nearest neighbor search

#### Service Tags
- Threads categorized by: Electrical, HVAC, PHE, Fire, LV, General
- Dashboard stats broken down by service tag

#### Moderation
- Thread pinning (L1+ only)
- Verified solution marking (L1+ only)
- Author and admin can edit/delete own content

---

## 11. Domain Logic — Calculation Engines

### 11.1 Electrical Load Calculation Engine

**File**: `server/services/electricalLoadService.js` (1,892 lines)

The `ElectricalLoadCalculator` class performs building and society-level electrical load calculations. All factors are database-driven and configurable by L0 users.

#### Calculation Pipeline

```
1. Load factors from `electrical_load_factors` (keyed by category/sub_category/description)
2. Load regulatory framework from `electrical_regulation_frameworks` + related tables
3. Per-building:
   a. Building CA Loads (7 categories):
      - Lighting & Small Power (GF lobby, typical floor lobby, staircases, terrace, landscape)
      - Lifts (passenger, passenger+fire, firemen — power looked up by building height)
      - HVAC & Ventilation (lobby AC or mechanical vent fans)
      - Pressurization (staircase fans, fire lift lobby fans)
      - PHE Building (booster pumps, sewage pumps)
      - Fire Fighting Building (wet riser pump — mandatory for buildings >15m per NBC 2016)
      - Other (security/CCTV, common area small power)
   b. Flat Loads (per flat type × area × watt_per_sqm × count)
   c. Apply demand factors (MDF, EDF, FDF) to each item
   d. Apply building diversity factor (MSEDCL Circular 35530):
      - Metro/Major Cities: DF = 0.50 (i.e., ÷2)
      - Other areas: DF = 0.40 (i.e., ÷2.5)
      - Fire load is EXEMPT from diversity factor
4. Society-level loads (STP, clubhouse, EV charging, street lighting, fire pumps, transfer pumps)
5. Aggregate: Building totals × n_buildings + Society totals = Grand totals
6. Regulatory compliance:
   a. MSEDCL minimum load (75 W/sq.m carpet area for residential)
   b. Sanctioned Load (WITHOUT DF, PF=0.8) — for billing/quotation
   c. Load After DF (WITH DF, PF=0.9) — for DTC/infrastructure sizing ONLY
   d. Validate against limits (single consumer: max 160kW/200kVA; multiple: max 480kW/600kVA)
   e. DTC requirements (threshold: Rural ≤25kVA, Urban ≤75kVA, Metro ≤250kVA)
   f. Substation requirements (for loads >3 MVA)
   g. Land and space requirements
   h. Lease terms (MSEDCL)
7. Transformer sizing: select next standard size from [100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150] kVA
```

#### Demand Factor Pattern

Every load item carries three demand factors:
- **MDF** (Maximum Demand Factor): `TCL × MDF = Max Demand kW`
- **EDF** (Essential Demand Factor): `TCL × EDF = Essential Load kW`
- **FDF** (Fire Demand Factor): `TCL × FDF = Fire Load kW`

Factors are loaded from `electrical_load_factors` table with key pattern: `{category}/{sub_category}/{description}`

#### Equipment Power Lookups

The `electrical_load_lookup_tables` table stores equipment power values:
| Category | Lookup Method | Default Value |
|----------|--------------|---------------|
| `lift_power` | By building height | 15 kW |
| `phe_pump` | By flow (LPM) | 2.2 kW |
| `ff_main_pump` | By flow (LPM) | 112 kW |
| `ff_jockey_pump` | Standard | 9.33 kW |
| `ff_sprinkler_pump` | By flow (LPM) | 56 kW |
| `ac_power` | By tonnage | 1.2 kW/TR |
| `ventilation_fan` | By CFM | 1.5 kW |
| `pressurization_fan` | By type | 5.5 kW |
| `sewage_pump` | By capacity (LPM) | 3.0 kW |
| `stp_power` | By capacity (KLD) | 30 kW |
| `ev_charger` | By type (fast/slow) | 7.4 kW |

#### Substation Space Requirements

From `design_factor_substation_space`, installation types:
- `DTC_OUTDOOR` — outdoor distribution transformer center
- `DTC_INDOOR` — indoor transformer room
- `DTC_COMPACT` — compact substation (space-efficient)
- `HT_PANEL_ROOM` — HT panel/metering room
- `SUBSTATION_33_11_OUTDOOR`, `SUBSTATION_33_11_INDOOR`, `SUBSTATION_GIS`

Each has: `rating_kva`, `room_length_m`, `room_width_m`, `total_area_sqm`, `clearance_m`, `ventilation_notes`

### 11.2 DDS Policy 130 Engine

**File**: `server/lib/ddsPolicy.js` (793 lines)

Auto-generates Drawing Delivery Schedule items based on Policy 130 v12 ("3 Yr 10 M Project Completion Guideline") and a 54-item, 9-phase master template.

#### 9-Phase Model

| Phase | Name | Items | Scope | Description |
|-------|------|-------|-------|-------------|
| A | Concept | 3 | Project | Design Brief, DBR, Space Planning |
| B | Liaison | 2 | Project | Utility Approval, MoEF Package |
| C | SLDs | 5 | Project | PHE, Electrical, ELV, Fire Fighting, FAVA Schematics |
| D | SD | 1 | Project | SD Package (coordination closure) |
| E | DD | 2 | Per Building | DD Package + Plinth Level |
| F | Detailed Calcs | 7 | Per Building | PHE pumps/pipes, HVAC heat load/ventilation, Electrical voltage drop/earthing/lightning |
| G | Builder's Work | 8 levels | Per Building | Basement→Podium→Ground→Typical→Refuge→Service→Penthouse→Terrace |
| H | Tender | 17 | Project | Lift, Electrical, PHE, FF, HVAC, FAVA, Pumps, Security, OWC, STP, WTP, Odour, Pools, RWH, DG, PNG, Substation |
| I | VFCs | 9 levels | Per Building | Plinth→Basement→Podium→Ground→Typical→Refuge→Service→Penthouse→Terrace |

#### Height-Based Timeline Tiers (Policy 130 §2)

| Max Height | Design Months | Construction Months | Total |
|-----------|--------------|-------------------|-------|
| ≤90m | 7 | 30 | 37 |
| 90-120m | 10 | 36 | 46 |
| 120-150m | 11 | 40 | 51 |
| 150-200m | 12 | 42 | 54 |

#### Timeline Modifiers

- **Height modifier**: +30 days if building >120m
- **Basement modifier**: +30 days per basement level
- **Land modifier**: -30 days if existing land (not new)
- **Tower stagger**: `towerIndex × towerStaggerWeeks × 7` days (default 4 weeks)

#### Annexure A Milestones (16 milestones)

Key milestones from MP Start Date (Day 0):
- Consultant appointment: Day 15
- Concept closure (Arch): Day 90 (new) / 75 (existing)
- Detailed timeline sign-off: Day 105/90
- Concept all packages: Day 180/150
- DD closure + Budget: Day 290/260
- Excavation start (Construction Day 0): Day 335/305
- First concrete pour: Day 380/350
- Typical floor VFC: Day 425/395
- First habitable floor pour: Day 500/470

#### Conditional Inclusion Rules

Items include/exclude based on building config:
- `has_basement` — Basement BW/VFC levels
- `has_podium` — Podium BW/VFC levels
- `has_penthouse` — Penthouse BW/VFC levels (auto-enabled for buildings >60m or >15 floors)
- `has_swimming_pool` — Pools Tender
- `has_fitout` — Fitout-related items
- `has_parking` — Car Parking Ventilation calculation

#### Drawing List Generation

Two separate drawing lists are generated per building:

**VFC Drawings** (9 trades × floor levels):
Trades: Fire Fighting, PHE, HVAC, Lighting, Small Power, Lightning Protection, Containment, FA & PA, ELV

**DD Drawings** (3 sections):
- Section A: Calculations (19 templates — pump sizing, heat load, cable schedule, earthing, etc.)
- Section B: Schematics (11 templates — water supply, drainage, electrical SLD, ELV, etc.)
- Section C+: Layouts (11 categories × applicable floor levels)

Trade-level applicability rules determine which trades apply to which floor types for VFC vs DD drawings.

#### Floor Classification

Floor names are classified via string matching into standardized level types:
`BASEMENT`, `PLINTH LEVEL`, `PODIUM LEVEL`, `STILT FLOOR`, `GROUND FLOOR`, `MEZZANINE FLOOR`, `GARDEN LEVEL`, `TYPICAL FLOOR`, `REFUGE FLOOR`, `PENTHOUSE LEVEL`, `TERRACE FLOOR`, `ROOF LEVEL`, `LIFT MACHINE ROOM`, `OHT LEVEL`, `PARKING LEVEL`

### 11.3 Unified MEP Calculator Architecture

All new calculators (12 engines) share a unified architecture different from the legacy Electrical Load calculator.

#### Database — `mep_calculations` Table

**Migration**: `migrations/0026_mep_calculations.sql`

Single table for all calculator types using JSONB columns:
| Column | Type | Purpose |
|--------|------|---------|
| `id` | SERIAL PK | Auto-increment ID |
| `project_id` | INT FK | References `projects(id)` |
| `calculation_type` | VARCHAR(50) | Engine identifier (see CALCULATOR_MAP below) |
| `calculation_name` | VARCHAR(200) | User-given name |
| `input_parameters` | JSONB | Full input payload (engine-specific) |
| `results` | JSONB | Full calculation output |
| `selected_buildings` | JSONB | Building IDs if building-specific |
| `building_id` | INT | Optional single building reference |
| `summary` | JSONB | Dashboard-friendly summary (extracted per type) |
| `status` | VARCHAR(20) | `draft` / `calculated` / `approved` / `rejected` |
| `calculated_by` / `verified_by` / `approved_by` | VARCHAR(100) | Audit trail |
| `remarks` | TEXT | Notes |
| `version` | INT DEFAULT 1 | Versioning |

Indexes: `project_id`, `calculation_type`, compound `(project_id, calculation_type)`, `status`, `created_at DESC`.

#### API Router — Unified CRUD

**File**: `server/routes/mep-calculations.js`
**Prefix**: `/api/mep-calculations`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create + calculate (instantiates engine, runs `calculate()`, saves) |
| GET | `/` | List by `projectId` query param, optional `calculationType` filter |
| GET | `/:id` | Get single calculation with full results |
| PUT | `/:id` | Update — recalculates if `input_parameters` changed |
| DELETE | `/:id` | Soft delete |

**CALCULATOR_MAP** — maps `calculation_type` strings to service classes:

| Key | Service File | Indian Standard Codes |
|-----|-------------|----------------------|
| `hvac_load` | `hvacLoadService.js` | ECBC 2017, IS 3103, ASHRAE |
| `fire_pump` | `firePumpService.js` | NBC 2016 Part 4, IS 15105 |
| `cable_selection` | `cableSelectionService.js` | IS 732, IS 3961, IEC 60502 |
| `lighting_design` | `lightingDesignService.js` | IS 3646, NBC 2016, ECBC 2017 |
| `earthing_lightning` | `earthingLightningService.js` | IS 3043, IEC 62305 |
| `plumbing_fixture` | `plumbingFixtureService.js` | IS 2065 (fixture unit method) |
| `phe_pump` | `phePumpService.js` | IS 2065 (NPSH, VFD analysis) |
| `ventilation` | `ventilationPressurizationService.js` | IS 3103, NBC 2016, BS EN 12101-6 |
| `duct_sizing` | `ductSizingService.js` | ASHRAE Fundamentals, ISHRAE |
| `panel_schedule` | `panelScheduleService.js` | IS 732, IS 8828, IS 13947 |
| `rising_main` | `risingMainService.js` | IS 732, IS 694, IS 8623 |
| `fire_fighting` | `fireFightingService.js` | NBC 2016, IS 15105, NFPA 13/14/20 |

Each service is an ES module class:
```js
export default class CalculatorName {
  constructor(db) { this.db = db; }
  async calculate(params, items, projectId) { /* returns results object */ }
}
```

#### Frontend — MepCalculatorShell Component

**File**: `src/components/MepCalculatorShell.jsx`

Reusable calculator page shell that handles:
- Project loading, calculation CRUD via `/api/mep-calculations`
- Step management: `input` → `calculating` → `results` → `loading`
- URL updating with calculation ID after save
- JSON export of results

**Props**:
| Prop | Type | Description |
|------|------|-------------|
| `calculationType` | string | Key from CALCULATOR_MAP |
| `title` | string | Page title |
| `icon` | Component | Lucide icon component |
| `defaultParams` | object | Initial form values |
| `renderInputs(params, onChange)` | function | Renders input form |
| `renderResults(results)` | function | Renders results display |
| `validateInputs(params)` | function? | Optional validation |

**Exported helper components**: `CalcFieldGroup`, `CalcField`, `ResultCard`, `ResultTable`

Each calculator page is thin (~100-170 lines) — just defines `defaultParams`, `renderInputs()`, `renderResults()` and wraps in `<MepCalculatorShell>`.

#### Engine Summaries

**HVAC Load** (`hvacLoadService.js`): Room-by-room cooling load — wall/glass/roof transmission, solar heat gain (9 orientations × 3 seasons), occupancy sensible+latent, lighting (LPD), equipment, ventilation. Sizes chiller, AHUs, cooling tower. Reference data: 15 wall U-values, 8 Indian city design conditions, ECBC lighting power densities.

**Fire Pump** (`firePumpService.js`): NBC 2016 fire water demand by building type/height, hydrant system hydraulic calc with Hazen-Williams, sprinkler system per IS 15105/NFPA 13 hazard classes, jockey pump, diesel pump, pump room sizing, tank capacity.

**Cable Selection** (`cableSelectionService.js`): Three-criteria selection (current carrying, voltage drop, short circuit). 21 standard sizes, CCC tables for XLPE/PVC Cu/Al, derating for ambient temp, grouping, installation method, soil resistivity. Governing criteria identified.

**Lighting Design** (`lightingDesignService.js`): Lumen method with Room Index, utilization factor, maintenance factor. 30+ space types with IS 3646 lux requirements, 13 LED luminaire types, ECBC 2017 LPD compliance check, LENI calculation.

**Earthing & Lightning** (`earthingLightningService.js`): IS 3043 earth resistance formulas for 9 electrode types in 12 soil types, parallel rod calculation to meet target resistance. IEC 62305-2 risk assessment, LPS design (mesh size, rolling sphere, down conductors), SPD requirements.

**Plumbing Fixture** (`plumbingFixtureService.js`): IS 2065 fixture unit method with Hunter's curve (30 data points), cold water pipe sizing, riser sizing, hot water system with solar collector option.

**PHE Pump** (`phePumpService.js`): Duty point selection from 21 standard kW ratings, system curve with 15 fitting types, NPSH verification, VFD energy savings analysis with affinity laws.

**Ventilation & Pressurization** (`ventilationPressurizationService.js`): ACH-based ventilation for 17 space types, staircase/lift lobby/shaft pressurization per IS 5765/BS EN 12101-6, smoke extraction, jet fan selection for basements, CO sensor layout.

**Duct Sizing** (`ductSizingService.js`): Equal friction method with rectangular/circular sizing, 5 duct materials with roughness factors, 14 fitting loss coefficients, critical path analysis, fan static pressure, material schedule/BoQ.

**Panel Schedule** (`panelScheduleService.js`): Circuit-level calculation with MCB/MCCB/ACB selection per IS 13947, 3-phase balancing, incoming device sizing, diversity factors, busbar sizing from 12 standard sizes, panel dimension estimation.

**Rising Main** (`risingMainService.js`): Supports RISING_MAIN, DOWN_TAKE, BUS_RISER design types. Floor-by-floor voltage drop with diversity factors, 12 busbar ratings with impedance data, 13 cable sizes, section-by-section conductor selection.

**Fire Fighting System** (`fireFightingService.js`): Comprehensive NBC 2016 Part 4 compliance — wet/dry riser, sprinkler (4 hazard classes), hose reel, internal/yard hydrant, water storage, portable extinguisher schedule, zone valve design.

---

## 12. API Contracts & Error Handling

### 12.1 Error Response Formats

All errors follow consistent JSON shapes:

**Validation Error (400)**:
```json
{
  "error": "Validation Error",
  "details": [{ "field": "name", "message": "Project name is required", "value": "" }]
}
```

**Auth Error (401/403)**:
```json
{ "error": "Forbidden", "message": "L2 users can only add L3 and L4 team members" }
```

**Not Found (404)**:
```json
{ "error": "Not Found", "message": "Cannot GET /api/foo", "path": "/api/foo" }
```

**Rate Limit (429)**:
```json
{ "error": "Too Many Requests", "message": "Too many requests...", "retryAfter": "timestamp" }
```

**Server Error (500)**:
```json
{ "error": "Internal Server Error", "message": "...", "stack": "... (dev only)" }
```

### 12.2 Validation Rules

Defined in `server/middleware/validation.js`:
- `projectName`: 3–255 chars, trimmed, not empty
- `email`: trimmed, normalized, must be valid email
- `fullName`: 2–255 chars
- `materialName`: max 255 chars, not empty
- `quantity`: float ≥ 0
- `rfiSubject`: max 255 chars, not empty
- `page` query: integer ≥ 1
- `limit` query: integer 1–100
- `date` fields: ISO8601 format
- `userLevel`: must be one of `L1, L2, L3, L4, SUPER_ADMIN`

Validation rule sets: `createProject`, `updateProject`, `createMAS`, `createRFI`, `userSync`, `pagination`

### 12.3 Middleware Configuration

**Rate Limiting** (`server/middleware/index.js`):
- General: 100 req/IP per 15 min (production), 1000 (dev)
- Auth: 5 attempts per 15 min, skips successful requests

**Compression**: level 6, threshold 1024 bytes (only responses >1KB)

**CSP Directives**: `defaultSrc: 'self'`, `styleSrc: 'self' + 'unsafe-inline'`, `scriptSrc: 'self' + 'unsafe-inline'`, `imgSrc: 'self' + data: + https:`

**Request Logging**: Morgan → Winston stream, skips `/api/health`

### 12.4 POST /api/projects — Request Body

Deeply nested creation — creates project + buildings + floors + flats + twin linkages in a single transaction:

```json
{
  "name": "string (required, 3-255 chars)",
  "location": "string",
  "latitude": "string|number",
  "longitude": "string|number",
  "assignedLeadId": "number|null",
  "buildings": [{
    "name": "string",
    "applicationType": "Residential|Clubhouse|MLCP|Commercial|...",
    "residentialType": "Luxury|Hi-end|Aspirational|Casa|null",
    "villaType": "string|null",
    "villaCount": "number|null",
    "buildingType": "string|null",
    "gfEntranceLobby": "number|null (sqm)",
    "poolVolume": "number|null",
    "hasLift": "boolean",
    "liftName": "string|null",
    "liftPassengerCapacity": "number|null",
    "carParkingCountPerFloor": "number|null",
    "carParkingArea": "number|null",
    "twoWheelerParkingCount": "number|null",
    "twoWheelerParkingArea": "number|null",
    "evParkingPercentage": "number|null",
    "shopCount": "number|null",
    "shopArea": "number|null",
    "officeCount": "number|null",
    "officeArea": "number|null",
    "commonArea": "number|null",
    "twinOfBuildingName": "string|null (links to another building by name)",
    "floors": [{
      "floorNumber": "number",
      "floorName": "string",
      "floorHeight": "number|null",
      "twinOfFloorName": "string|null",
      "flats": [{
        "type": "1BHK|1.5BHK|2BHK|2.5BHK|3BHK|4BHK|Studio",
        "area": "number (sqm despite column name area_sqft)",
        "count": "number"
      }]
    }]
  }]
}
```

**Twin Linking**: Two-pass approach — first creates all buildings/floors, then links twins by name using `buildingIdMap` and `floorIdMap`.

### 12.5 POST /api/mas — Request Body

```json
{
  "projectId": "number (required)",
  "materialName": "string (required, max 255)",
  "materialCategory": "string",
  "manufacturer": "string",
  "modelSpecification": "string",
  "quantity": "number (float ≥ 0)",
  "unit": "string",
  "submittedByVendor": "string",
  "vendorEmail": "string",
  "attachmentUrls": "string[] (JSON stringified)"
}
```
- Auto-generates `mas_ref_no` = `MAS-YYYYMMDD-NNN`

### 12.6 Building Details Endpoints (Undocumented in main API Reference)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/buildings/:buildingId/staircases` | List staircases with windows and doors |
| POST | `/api/buildings/:buildingId/staircases` | Create staircase + windows + doors |
| PUT | `/api/staircases/:id` | Update staircase (replaces windows/doors) |
| DELETE | `/api/staircases/:id` | Delete staircase |
| GET | `/api/buildings/:buildingId/lifts` | List lifts with floor names |
| POST | `/api/buildings/:buildingId/lifts` | Create lift |
| PUT | `/api/lifts/:id` | Update lift |
| DELETE | `/api/lifts/:id` | Delete lift |
| POST | `/api/floors/:floorId/lobbies` | Create lobby |
| GET | `/api/buildings/:buildingId/lobbies` | List lobbies |
| POST | `/api/floors/:floorId/shops` | Create shop |
| GET | `/api/floors/:floorId/shops` | List shops |
| POST | `/api/floors/:floorId/parking` | Create parking details |
| GET | `/api/projects/:projectId/swimming-pools` | List swimming pools |
| POST | `/api/projects/:projectId/swimming-pools` | Create swimming pool |
| GET | `/api/projects/:projectId/landscapes` | List landscapes |
| POST | `/api/projects/:projectId/landscapes` | Create landscape |
| POST | `/api/projects/:projectId/surface-parking` | Create surface parking |
| GET | `/api/projects/:projectId/infrastructure` | List infrastructure (STP, substation) |
| POST | `/api/projects/:projectId/infrastructure` | Create infrastructure |

### 12.7 Notifications & Activity Log Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications (optional `unread_only=true`) |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |
| PATCH | `/api/notifications/mark-all-read` | Mark all as read |
| GET | `/api/projects/:projectId/activity-log` | Activity log (optional `entity_type`, `limit`) |
| POST | `/api/projects/:projectId/temporary-access` | Grant temporary access |
| GET | `/api/projects/:projectId/temporary-access` | List active temporary access |
| POST | `/api/projects/:projectId/cm-components` | Create CM building component |
| GET | `/api/projects/:projectId/cm-components` | List CM components |
| PUT | `/api/cm-components/:id` | Update CM component status |

**Notifications created on**: task assignment, task completion, RFC review, MAS status change

**Notification schema**: `user_id, project_id, title, message, notification_type, entity_type, entity_id, is_read`

**Activity log schema**: `project_id, user_id, user_email, entity_type, entity_id, action, changes (JSONB), description`

### 12.8 Pagination Pattern

Only **Meeting Point threads** uses cursor/page-based pagination:
```json
// Response shape:
{ "threads": [...], "pagination": { "page": 1, "limit": 20, "total": 145, "totalPages": 8 } }
```
All other list endpoints (projects, MAS, RFI, tasks, etc.) return **full arrays** with no pagination.

### 12.9 File Upload Constraints

- **Max file size**: 50MB
- **Max files per upload**: 10
- **Allowed types**: `.pdf`, `.dwg`, `.dxf`, `.rvt`, `.xlsx`, `.xls`, `.csv`, `.doc`, `.docx`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- **Production**: UUID-based filenames on Google Cloud Storage
- **Development**: Local disk storage in `uploads/` (meeting-point attachments in `uploads/meeting-point/`)

### 12.10 Dashboard Content by Role

| Dashboard | Key Content |
|-----------|------------|
| **SuperAdminDashboard** | 9-card grid linking to all dashboards (L0–L4, CM, Vendor, Consultant, Standards), each with gradient color and description |
| **L0Dashboard** | Stats cards (total projects, pending MAS, pending RFI), RFC stats, task stats, project cards grid, AIReports widget, MyAssignments widget, MeetingPoint widget, project delete capability |
| **L1Dashboard** | "Project Allocation" header, Create New Project button, quick-action buttons (RFC Review, Tasks, MAS Approvals, Standards), L1ProjectTable with project listing, MeetingPoint + MyAssignments widgets |
| **L2Dashboard** | "Execution Dashboard" with board/list toggle, L2TopStats KPI bar, activity ribbon, quick filters (All/In Progress/Delayed/Completed), Kanban board (ProjectStatusBoard), MeetingPoint + MyAssignments widgets |
| **L3Dashboard** | Read-level project view, MeetingPoint + MyAssignments widgets |
| **L4Dashboard** | View-only project listings, MeetingPoint + MyAssignments widgets |
| **CMDashboard** | Construction manager view, MeetingPoint widget |

### 12.11 Sidebar Navigation by Role

| Level | Sidebar Items |
|-------|--------------|
| SUPER_ADMIN | Dashboard, L0/L1/L2 Dashboards, Standards, User Management |
| L0 | Dashboard, L0 Dashboard, Standards |
| L1 | Dashboard, Project Management, Create Project, Standards |
| L2/L3/L4 | Dashboard, MAS Management, Standards |
| VENDOR | Dashboard, Material Submissions |
| CM | Dashboard (RFI accessed via project detail) |

### 12.12 Seed Data & Default Values

**Electrical lookup defaults** (when DB lookup fails):
```
lift_power=15kW, phe_pump=2.2kW, ff_main_pump=112kW, ff_jockey_pump=9.33kW,
ff_sprinkler_pump=56kW, ac_power=1.2kW/TR, ventilation_fan=1.5kW,
pressurization_fan=5.5kW, sewage_pump=3.0kW, stp_power=30kW, ev_charger=7.4kW
```

**Standard transformer sizes** (IS/IEC): `[100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150]` kVA

**Default demand factors** (fallback): MDF=0.6, EDF=0.6, FDF=0

**Default regulatory framework** (when DB empty): MSEDCL defaults with residential 75 W/sq.m, PF 0.8/0.9, DTC thresholds 25/75/250 kVA

### 12.13 Database Migration Strategy

- Migration files in `migrations/` directory (numbered `.sql` files)
- Run via `npm run migrate` → `scripts/migrate.js`
- Naming convention: mixed (`0001_init_schema.sql`, `2026-02-10_create_*.sql`)
- Server also auto-creates tables with `CREATE TABLE IF NOT EXISTS` on startup (in `server/index.js` and route modules)
- Seed scripts: `scripts/seed-electrical-lookup-tables.sql`, `scripts/seed-electrical-lookups.js`

---

## 13. Design System

### Brand Colors (Tailwind custom tokens)
| Token | Hex | Usage |
|-------|-----|-------|
| `lodha-gold` | #9D7F1B | Primary accent, CTAs |
| `lodha-grey` | #6D6E71 | Secondary text |
| `lodha-cream` | #F0EADC | Light backgrounds |
| `lodha-sand` | #F3F1E7 | Page backgrounds |
| `lodha-black` | #2D2926 | Headings (warm black) |
| `lodha-steel` | #CED8DD | Borders, dividers |
| `lodha-deep` | #7A6415 | Hover states (dark gold) |
| `lodha-muted-gold` | #CAC6A3 | Muted accents |
| `lodha-sage` | #E8E6D4 | Soft backgrounds |
| `lodha-cool-grey` | #949CA1 | Neutral text |
| `lodha-bronze` | #6D6E71 | Tertiary accents |

### Typography
- **Headings**: Cormorant Garamond (serif) — loaded via Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Jost:wght@300;400;500;600;700&display=swap')`
- **Body**: Jost (sans-serif)
- Font import MUST be at top of `src/index.css` (not in HTML)

### Shadows (Tailwind `boxShadow` tokens)
- `card`: subtle resting shadow
- `card-hover`: elevated with gold-tinted glow
- `elevated`: strong elevated shadow

### CSS Utility Classes (`src/index.css`)
Custom Tailwind `@apply` classes — use these for consistency:

| Class | Purpose |
|-------|---------|
| `.heading-primary` | Page titles (Cormorant Garamond) |
| `.heading-secondary` | Section titles |
| `.heading-tertiary` | Sub-section titles |
| `.text-body` | Body text |
| `.text-caption` | Small muted text |
| `.btn-primary` | Gold CTA button |
| `.btn-secondary` | Outlined button |
| `.btn-ghost` | Transparent button |
| `.btn-cancel` | Red cancel button |
| `.card` | Card container with shadow |
| `.card-hover` | Card with hover elevation |
| `.input-field` | Text input styling |
| `.select-field` | Select dropdown styling |
| `.table-header` | Table header row |
| `.table-row` | Table body row |
| `.table-cell` | Table cell |
| `.badge-{variant}` | Badge (primary, secondary, success, warning, danger, neutral) |
| `.stat-card` / `.stat-value` / `.stat-label` | Statistics display cards |
| `.section-card` / `.section-header` / `.section-body` | Content sections |
| `.modal-overlay` / `.modal-card` | Modal dialog |
| `.empty-state` | Empty state container |

### Component Patterns
- Cards with `shadow-card` / `shadow-card-hover`
- `borderRadius: card = 0.75rem`
- Status badges with color-coded backgrounds
- Toast notifications (react-hot-toast)
- Skeleton loading states
- Empty state illustrations

---

## 14. Deployment

### Docker (Multi-stage Build)
```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
COPY . .
RUN npm ci && npm run build

# Stage 2: Production runtime
FROM node:20-alpine
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY server/ ./server/
COPY --from=frontend-builder /app/dist ./public
EXPOSE 8080
CMD ["node", "server/index.js"]
```

### Google Cloud Run
- Container image built via Cloud Build (`cloudbuild.yaml`)
- Env vars injected via Secret Manager
- Port 8080
- Health check at `/api/health`
- Non-root user (`node`)
- `dumb-init` for proper signal handling

### Key Production Configurations
- `NODE_ENV=production`
- Express serves static files from `public/`
- SPA fallback: all non-API routes serve `index.html`
- `trust proxy` should be enabled for Cloud Run (behind load balancer)
- SSL enforced via Cloud Run managed certificates

---

## 15. Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL (local or remote)
- Firebase project with Google auth enabled

### Quick Start
```bash
# 1. Clone and install
git clone <repo-url>
cd atelier
npm install

# 2. Set up environment
cp .env.example .env  # Configure DB_*, VITE_FIREBASE_* vars

# 3. Start both servers
npm run dev
# → Backend: http://localhost:5175
# → Frontend: http://localhost:5174 (proxies /api to backend)
```

### Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run client` | Start Vite dev server only |
| `npm run server` | Start Express with nodemon |
| `npm run build` | Build frontend for production |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run migrate` | Run database migrations |
| `npm run migrate:status` | Check migration status |
| `npm run init:db` | Initialize database |

### Vite Dev Server Config
- Port: 5174
- Proxy: `/api` → `http://localhost:5175`
- HMR client port: 443 (for GitHub Codespaces)

### Dev Mode Features
- Firebase Admin bypass: `x-dev-user-email` header accepted when no Firebase Admin configured
- Local file storage in `uploads/` when GCS not configured
- LLM features disabled when Gemini API key not set
- Console warnings for unconfigured services (non-blocking)

---

## 16. Testing

### Framework
- **Vitest** — test runner (config in `vite.config.cjs`)
- **jsdom** — DOM environment
- **@testing-library/react** — component testing
- **@testing-library/jest-dom** — DOM assertions

### Test Files
```
tests/
├── setup.js                    # Test setup (jsdom, matchers)
├── ProtectedRoute.test.jsx     # Route guard tests
├── auth-middleware.test.js      # Auth middleware unit tests
├── health.test.js               # Health endpoint tests
├── positive.test.js             # Positive path tests
└── validation.test.js           # Validation middleware tests
```

### Running Tests
```bash
npm run test                    # Single run
npm run test:watch              # Watch mode
npm run test:coverage           # With coverage report
```

---

## Appendix: Data Relationships Diagram

```
users ──────┬──── projects ──────┬──── societies ──── buildings ──── floors ──── flats
            │         │          │                        │
            │         │          ├──── site_areas         ├──── staircases (windows, doors)
            │         │          ├──── swimming_pools     ├──── lifts
            │         │          ├──── landscapes         ├──── lobbies
            │         │          ├──── infrastructure     ├──── shops
            │         │          │                        └──── parking
            │         │          │
            │         ├──── dds ──── dds_items ──── dds_item_revisions
            │         │       │                     dds_history
            │         │       ├──── dds_drawings
            │         │       └──── dds_boq_items
            │         │
            │         ├──── material_approval_sheets ────── consultants
            │         ├──── requests_for_information ────── consultants
            │         ├──── project_change_requests
            │         ├──── requests_for_change
            │         ├──── drawing_schedules
            │         ├──── design_calculations
            │         ├──── water_demand_calculations
            │         ├──── electrical_load_calculations
            │         │
            │         ├──── project_team ──── users
            │         ├──── project_consultants ──── consultants
            │         ├──── project_vendors ──── vendors
            │         └──── project_standard_selections
            │
            ├──── tasks
            ├──── notifications
            ├──── user_documents
            ├──── ai_chat_history
            ├──── design_sheets
            └──── user_preferences

project_standards (global)
policy_versions ──── policy_water_rates
                ├──── policy_occupancy_factors
                ├──── policy_calculation_parameters
                └──── policy_change_log

electrical_load_factors (global)
design_factor_substation_space (global)
calculation_standards (global)

users ──── mp_threads ──── mp_posts ──── mp_reactions
                │              │
                ├──── mp_attachments ──── mp_knowledge_chunks
                └── (pgvector embeddings for semantic search)
```

---

*Last updated: February 23, 2026*
