# Atelier MEP Portal - Deployment Checklist

## Pre-Deployment Verification

### ✅ Frontend Components
```
src/pages/
├── L1Dashboard.jsx          ✅ Created
├── L2Dashboard.jsx          ✅ Created
├── ProjectDetail.jsx        ✅ Created
├── MASPage.jsx              ✅ Created
├── RFIPage.jsx              ✅ Created
└── Login.jsx                ✅ Updated

src/components/
├── L1ProjectTable.jsx       ✅ Created
├── L2TopStats.jsx           ✅ Created
├── ProjectStatusBoard.jsx   ✅ Created
├── Layout.jsx               ✅ Updated
└── ProjectCard.jsx          ✅ Existing
```

### ✅ Backend APIs
```
Endpoints Implemented:
✅ GET /api/projects (with level filtering)
✅ GET /api/projects/:id
✅ POST /api/projects/:id/assign-lead
✅ PATCH /api/projects/:id/stage
✅ POST /api/projects/:id/archive
✅ GET /api/projects/archive/list
✅ GET /api/users/level/:level
✅ POST /api/auth/sync
✅ GET /api/mas/pending-count
✅ GET /api/rfi/pending-count
✅ GET /api/mas/project/:projectId
✅ GET /api/rfi/project/:projectId
```

### ✅ Database Schema
```
Tables Updated:
✅ users (added user_level)
✅ projects (added lifecycle_stage, assigned_lead_id, is_archived, archived_at)
✅ material_approval_sheets (new)
✅ requests_for_information (new)

Triggers:
✅ Auto-update timestamps on record changes
✅ Archive with timestamp recording
```

### ✅ Design System
```
Fonts:
✅ Jost (sans-serif) - Body text
✅ Cormorant Garamond (serif) - Headings

Colors:
✅ Gold (#9D7F1B)
✅ Black (#000000)
✅ Grey (#6D6E71)
✅ Sand (#F3F1E7)

Components:
✅ heading-primary
✅ heading-secondary
✅ heading-tertiary
✅ text-body
✅ btn-primary
✅ btn-secondary
✅ card
✅ badge-primary
✅ badge-secondary
```

### ✅ Routing
```
Routes Implemented:
✅ /                    → Login
✅ /dashboard          → Level-based redirect
✅ /l1-dashboard       → L1 admin view
✅ /l2-dashboard       → L2 lead view
✅ /project/:id        → Project details
✅ /mas                → Material Approvals
✅ /rfi                → Requests for Info
✅ /project-plans      → Coming Soon
✅ /structural-data    → Coming Soon
✅ /settings           → Coming Soon
```

## Deployment Steps

### 1. Database Migration
```bash
# Connect to PostgreSQL
psql -U $DB_USER -h $DB_HOST -d $DB_NAME

# Run schema update
\i schema.sql

# Verify tables created
\dt
```

### 2. Backend Setup
```bash
# Ensure .env is configured
cp .env.example .env
# Edit .env with actual values

# Test backend connection
npm run test:db

# Start backend (runs on port 3001)
npm run server
```

### 3. Frontend Build
```bash
# Install dependencies (already done in workspace)
npm install

# Build for production
npm run build

# Verify dist folder created
ls -la dist/
```

### 4. Environment Variables
Required in .env:
```
VITE_FIREBASE_API_KEY=xxxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxxx
VITE_FIREBASE_PROJECT_ID=xxxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxx
VITE_FIREBASE_APP_ID=xxxxx
DB_USER=xxxxx
DB_PASSWORD=xxxxx
DB_HOST=xxxxx
DB_NAME=xxxxx
NODE_ENV=production
PORT=3001
```

### 5. Firebase Configuration
```bash
# Firebase project setup
firebase init

# Deploy hosting
firebase deploy --only hosting

# Deploy functions (if using Cloud Functions)
firebase deploy --only functions
```

### 6. Testing Checklist
```
Frontend Tests:
□ Load login page - verify styling
□ Login as ajit.kumarjha@lodhagroup.com
□ Verify redirects to /l1-dashboard
□ View project allocation table
□ Click project name - navigates to detail
□ Click assign lead dropdown - shows L2 users
□ Assign lead - updates and shows name
□ Click MAS/RFI cards - navigates to pages
□ View MAS page - shows pending items
□ View RFI page - shows pending requests
□ Click hand over - archives project
□ Verify archived section shows handed-over
□ Test responsive design on mobile
□ Verify colors match Lodha brand
□ Verify fonts (Jost and Garamond) load

Backend Tests:
□ GET /api/health returns healthy
□ GET /api/projects returns all (L1)
□ GET /api/projects filters by user (L2)
□ POST /api/auth/sync creates user
□ POST /api/projects/:id/assign-lead works
□ PATCH /api/projects/:id/stage updates
□ POST /api/projects/:id/archive archives
□ GET /api/mas/pending-count returns count
□ GET /api/rfi/pending-count returns count
```

### 7. Production Monitoring
```
Monitor:
□ Server logs for errors
□ Database performance
□ API response times
□ User authentication flow
□ Project data consistency
□ Archive functionality
```

## Performance Optimization

### Frontend
- ✅ Vite for fast builds
- ✅ React 19 for performance
- ✅ Code splitting (route-based)
- ✅ Image optimization via Unsplash CDN

### Backend
- ✅ Connection pooling
- ✅ Query optimization with indexes
- ✅ CORS configured
- ✅ Error handling middleware

### Database
- ✅ Indexes on: email, status, project_id
- ✅ Foreign keys for data integrity
- ✅ Auto-updating timestamps
- ✅ Archive system for old data

## Security Checklist

- ✅ Firebase Auth enabled
- ✅ CORS properly configured
- ✅ Backend validates user level
- ✅ Routes protected with authentication guards
- ✅ Sensitive data in environment variables
- ✅ Database connections use SSL/TLS
- ✅ No hardcoded credentials
- ⚠️ TODO: Implement rate limiting
- ⚠️ TODO: Add audit logging
- ⚠️ TODO: Implement data encryption

## Post-Deployment

### 1. Monitor Application
```bash
# Check server health
curl http://localhost:3001/api/health

# Monitor logs
tail -f server.log
```

### 2. Verify Data
```sql
-- Check users created
SELECT COUNT(*) FROM users;

-- Check projects are accessible
SELECT * FROM projects WHERE is_archived = FALSE;

-- Verify archive functionality
SELECT * FROM projects WHERE is_archived = TRUE;
```

### 3. User Communication
- [ ] Send L1 admin access instructions
- [ ] Provide user documentation (QUICK_START.md)
- [ ] Set up training session
- [ ] Create support channel

## Rollback Plan

### If Issues Occur
1. Revert database: Keep backup before migration
2. Revert code: Git revert to last stable commit
3. Notify users: Communicate downtime
4. Investigate: Check logs and error messages
5. Test locally: Reproduce and fix issue
6. Redeploy: After verification

## Documentation Locations

- **Full Documentation**: `/docs/IMPLEMENTATION.md`
- **Quick Start**: `/docs/QUICK_START.md`
- **Feature Completion**: `/docs/FEATURE_COMPLETION.md`
- **Implementation Summary**: `/docs/IMPLEMENTATION_SUMMARY.md`
- **Secrets Management**: `/docs/secrets-management.md`

## Support Contacts

For deployment support:
1. Check documentation first
2. Review error logs
3. Verify environment variables
4. Test database connection
5. Check Firebase configuration

## Sign-off

- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Team trained
- [ ] Monitoring configured
- [ ] Deployment approved

**Deployment Date**: ___________
**Deployed By**: ___________
**Verified By**: ___________

---

*Last Updated: January 28, 2026*
*Status: Ready for Deployment*
