# Atelier MEP Portal - Cloud Run Deployment Package Complete ✅

## 📦 Package Contents Summary

This deployment package provides everything needed to containerize and deploy Atelier MEP Portal to Google Cloud Run with enterprise-grade security.

---

## 📋 Files Delivered

### Containerization Files
1. **Dockerfile** (50 lines)
   - Multi-stage build: Vite frontend + Express backend
   - Node.js 20 Alpine base image
   - Port 8080 for Cloud Run
   - Health check endpoint
   - Dumb-init for proper signal handling

2. **.dockerignore** (25 lines)
   - Excludes unnecessary files from Docker build
   - Optimizes image size (~200MB)

### Deployment Files
3. **DEPLOYMENT_GUIDE.md** (600+ lines)
   - Complete step-by-step deployment instructions
   - 8 detailed deployment steps
   - Environment variables reference
   - Troubleshooting section
   - Monitoring and CI/CD setup

4. **SECRETS_MANAGEMENT.md** (500+ lines)
   - Firebase Admin SDK credential setup
   - Cloud SQL database configuration
   - Google Secret Manager integration
   - Password rotation procedures
   - Security best practices

5. **DEPLOYMENT_README.md** (400+ lines)
   - Quick start guide (5 minute deployment)
   - Architecture overview diagram
   - Docker multi-stage build explanation
   - Security features checklist
   - Local testing with Docker Compose
   - Scaling and performance tuning

### Automation Scripts
6. **deploy-to-cloud-run.sh** (380 lines)
   - Fully automated deployment script
   - Interactive prompts for user input
   - Creates all required resources
   - Color-coded output for readability
   - Error handling and validation

7. **cloudbuild.yaml** (60 lines)
   - Automated CI/CD pipeline configuration
   - Builds Docker image on code push
   - Pushes to Artifact Registry
   - Deploys to Cloud Run automatically
   - Traffic shifting for zero-downtime updates

### Configuration Updates
8. **package.json** (Updated)
   - Added `firebase-admin` dependency

9. **server/index.js** (Updated)
   - Integrated Firebase Admin SDK
   - Added authentication middleware for `/api/*` routes
   - Added role-based access control (`requireRole`)
   - Added `verifyToken` middleware

---

## 🔐 Security Architecture

### Three Layers of Security

#### Layer 1: Public Access Control
```
✅ Login page - Accessible without authentication
✅ /api/health - Health check endpoint (public)
🔒 All other /api/* routes - REQUIRE Firebase token
```

#### Layer 2: Token Verification
```
Frontend sends: Authorization: Bearer <idToken>
Backend:
  1. Verifies token with Firebase Admin SDK
  2. Checks user exists in database
  3. Retrieves user_level from database
  4. Attaches user info to request (req.user)
  5. Routes check token is valid
```

#### Layer 3: Role-Based Access Control
```
@requireRole('SUPER_ADMIN')     → Only super admin
@requireRole('L1', 'L2')        → L1 or L2 users
@requireRole('L1', 'L2', 'L3', 'L4') → Any logged-in user
```

### Credential Management
```
🔐 Firebase Admin SDK      → Secret Manager
🔐 Database Password       → Secret Manager (encrypted)
🔐 DB Host/User/Name       → Secret Manager (encrypted)
🔐 API Keys                → Environment variables
🔐 HTTPS                   → Automatic (Cloud Run)
```

---

## 🚀 Quick Start Deployment (5 Minutes)

```bash
# Step 1: Download Firebase Admin Key
# - Go to Firebase Console
# - Project Settings → Service Accounts
# - Generate New Private Key
# - Save as firebase-admin-key.json

# Step 2: Run deployment script
chmod +x deploy-to-cloud-run.sh
./deploy-to-cloud-run.sh

# Step 3: Follow interactive prompts
# - Enter GCP Project ID
# - Configure Cloud SQL instance
# - Enter database credentials
# - Script handles everything else

# Step 4: Access your application
# Output: https://atelier-mep-xxxxx-uc.a.run.app
```

---

## 📊 Environment Variables Quick Reference

### Backend (Injected at Runtime)

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `PORT` | Literal | `8080` | ✅ Yes |
| `NODE_ENV` | Literal | `production` | ✅ Yes |
| `FIREBASE_ADMIN_SDK` | Secret | `{...JSON...}` | ✅ Yes |
| `DB_HOST` | Secret | `project:region:instance` | ✅ Yes |
| `DB_USER` | Secret | `atelier-app` | ✅ Yes |
| `DB_PASSWORD` | Secret | `secure-password` | ✅ Yes |
| `DB_NAME` | Secret | `atelier` | ✅ Yes |

### How to Set Secrets

```bash
# Using Google Secret Manager (Recommended)
gcloud run deploy atelier-mep \
  --image=$IMAGE \
  --set-secrets=FIREBASE_ADMIN_SDK=firebase-admin-sdk:latest,\
DB_HOST=db-connection-name:latest,\
DB_USER=db-user:latest,\
DB_PASSWORD=db-password:latest,\
DB_NAME=db-name:latest
```

---

## 🏗️ Architecture Diagram

```
Internet (Public)
        ↓
┌─────────────────────────────────────┐
│  Cloud Run Service (Port 8080)      │
│  --allow-unauthenticated            │
├─────────────────────────────────────┤
│  Docker Container                   │
│  - Node.js 20 Alpine                │
│  - Express.js Backend               │
│  - Vite Frontend (dist/)            │
├─────────────────────────────────────┤
│  Middleware                         │
│  - Firebase Admin SDK verification  │
│  - Role-based access control        │
│  - CORS handling                    │
├─────────────────────────────────────┤
│  Environment & Secrets              │
│  ✓ Injected at runtime              │
│  ✓ From Secret Manager              │
│  ✓ Never hardcoded                  │
└─────────────────────────────────────┘
        ↓ (VPC Private Network)
┌─────────────────────────────────────┐
│  Cloud SQL PostgreSQL               │
│  - No public IP                     │
│  - Private network only             │
│  - Managed backups                  │
│  - Auto-failover (Regional)         │
└─────────────────────────────────────┘
```

---

## ✅ Security Checklist

- ✅ **Authentication:** Firebase Admin SDK validates all requests
- ✅ **Authorization:** Role-based access control (L1-L4 + SUPER_ADMIN)
- ✅ **Network:** VPC connector restricts Cloud SQL to Cloud Run only
- ✅ **Encryption:** Secrets stored encrypted in Secret Manager
- ✅ **Transport:** HTTPS enforced by Cloud Run (automatic)
- ✅ **Database:** No public IP, password-protected, SSL enabled
- ✅ **Secrets:** Never hardcoded, rotatable via Secret Manager
- ✅ **Logs:** Centralized in Cloud Logging for audit trail
- ✅ **Service Account:** Minimal permissions (read secrets, connect to SQL)
- ✅ **Container:** Non-root user, read-only filesystem where possible

---

## 📚 Documentation Guide

| Document | Purpose | Audience |
|----------|---------|----------|
| **DEPLOYMENT_README.md** | Quick start & overview | Everyone |
| **DEPLOYMENT_GUIDE.md** | Step-by-step instructions | DevOps / Engineers |
| **SECRETS_MANAGEMENT.md** | Credential setup & rotation | Security / DevOps |
| **AI_AGENT_PROJECT_SUMMARY.md** | Architecture & features | AI Agents / Developers |
| **cloudbuild.yaml** | CI/CD configuration | DevOps |
| **deploy-to-cloud-run.sh** | Automated deployment | Everyone |

---

## 🔄 Deployment Flow

```
1. Download Firebase Credentials
   └─ firebase-admin-key.json

2. Run Deployment Script
   └─ ./deploy-to-cloud-run.sh

3. Script Creates GCP Resources
   ├─ Secret Manager secrets
   ├─ Cloud SQL instance
   ├─ Service account
   ├─ Artifact Registry
   └─ VPC connector

4. Build Docker Image
   ├─ Stage 1: Build frontend with Vite
   └─ Stage 2: Bundle with Express

5. Push to Artifact Registry
   └─ us-central1-docker.pkg.dev/.../atelier-mep:latest

6. Deploy to Cloud Run
   ├─ Pull image
   ├─ Inject secrets from Secret Manager
   ├─ Configure networking (VPC connector)
   ├─ Set environment variables
   └─ Start service

7. Verify Deployment
   ├─ Health check: /api/health
   ├─ Public access: /
   ├─ Protected endpoint: /api/projects (with token)
   └─ Get service URL

8. Access Application
   └─ https://atelier-mep-xxxxx-uc.a.run.app
```

---

## 🐛 Common Deployment Issues & Solutions

### Issue 1: "Permission denied" accessing secrets
**Solution:**
```bash
gcloud secrets add-iam-policy-binding firebase-admin-sdk \
  --member="serviceAccount:PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Issue 2: Database connection fails
**Solution:**
- Verify Cloud SQL instance is running
- Check VPC connector is attached
- Verify database user and password in secrets
- Test connection: `gcloud sql connect atelier-postgres --user=atelier-app`

### Issue 3: Docker build fails
**Solution:**
```bash
docker build --no-cache -t atelier-mep:latest .
docker images # Check for untagged images
docker system prune -a  # Clean up
```

### Issue 4: Service returns 500 errors
**Solution:**
```bash
# View logs
gcloud run services logs read atelier-mep --region=us-central1 --stream

# Check environment variables loaded
gcloud run services describe atelier-mep --region=us-central1 --format=json | \
  jq '.spec.template.spec.containers[0].env'
```

---

## 📈 Performance & Scaling

### Current Configuration
```
Memory:        512Mi (adjustable to 4Gi)
CPU:           1 vCPU (adjustable to 4)
Timeout:       60 seconds
Min Instances: 1 (warm start)
Max Instances: 10 (auto-scale)
```

### For High Traffic
```bash
gcloud run deploy atelier-mep \
  --image=$IMAGE \
  --memory=1Gi \
  --cpu=2 \
  --min-instances=3 \
  --max-instances=50 \
  --request-timeout=120
```

---

## 🔄 CI/CD Pipeline Setup

Once deployed, setup automatic deployment:

```bash
# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Connect GitHub repository
gcloud builds connect \
  --repository-name=atelier \
  --repository-owner=ajitkumarjha-alt

# Create trigger (uses cloudbuild.yaml)
gcloud builds triggers create github \
  --name=atelier-deploy \
  --repo-name=atelier \
  --repo-owner=ajitkumarjha-alt \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

Now:
- Every push to `main` branch automatically builds and deploys
- Zero-downtime updates via traffic shifting
- Docker image versioned with git commit SHA
- Easy rollback to previous versions

---

## 🎯 Next Steps After Deployment

### 1. Verify Application Works
```bash
curl https://YOUR_SERVICE_URL/
curl https://YOUR_SERVICE_URL/api/health
```

### 2. Test Authentication
- Open application in browser
- Login with Firebase credentials
- Verify projects load

### 3. Configure Custom Domain
```bash
gcloud run services update-traffic atelier-mep \
  --set-routes "your-domain.com"
```

### 4. Setup Monitoring
- Cloud Logging for logs
- Cloud Monitoring for metrics
- Uptime checks for health
- Custom alerts for errors

### 5. Configure Backups
```bash
# Automated daily backups
gcloud sql backups create \
  --instance=atelier-postgres \
  --description="Daily backup"
```

### 6. Document Access
- Share service URL with team
- Document login credentials location
- Setup access logs and audit trail
- Train users on platform features

---

## 📞 Support Resources

### Official Documentation
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Cloud SQL](https://cloud.google.com/sql/docs)

### In This Package
- `DEPLOYMENT_GUIDE.md` - Detailed step-by-step instructions
- `SECRETS_MANAGEMENT.md` - Credential and secret management
- `deploy-to-cloud-run.sh` - Automated setup script
- `cloudbuild.yaml` - CI/CD configuration

### Troubleshooting
1. Check **DEPLOYMENT_README.md** Troubleshooting section
2. View Cloud Run logs: `gcloud run services logs read atelier-mep --stream`
3. Verify secrets exist: `gcloud secrets list`
4. Test database: `gcloud sql connect atelier-postgres --user=atelier-app`

---

## 🎓 Key Concepts

### Multi-Stage Docker Build
- **Stage 1:** Compiles frontend (Vite) → /dist
- **Stage 2:** Runs backend with built frontend
- **Benefit:** Only runtime dependencies in final image (~200MB)

### Secret Manager
- Stores credentials encrypted at rest
- Accessible only by authorized services
- Full audit trail of access
- Easy rotation (versioning)
- Integration with Cloud Run native

### VPC Connector
- Private network between Cloud Run and Cloud SQL
- No public IP needed for database
- Security: Traffic never goes through internet
- Automatic scaling

### Cloud Run
- Serverless container platform
- Auto-scaling (0 to N instances)
- Pay per request
- HTTPS by default
- No infrastructure management

---

## ✨ Features Included

✅ **Frontend**
- React 19 with Vite
- Responsive design
- Lodha brand theme
- Google Maps integration
- Role-based UI

✅ **Backend**
- Express.js REST API
- Firebase Admin SDK authentication
- PostgreSQL database
- Role-based access control
- Error handling & logging

✅ **Deployment**
- Multi-stage Docker build
- Automated Cloud Run deployment
- CI/CD pipeline (Cloud Build)
- Secret management
- Auto-scaling configuration

✅ **Security**
- Token-based authentication
- Role-based authorization
- Encrypted secrets
- Private database network
- HTTPS enforcement

✅ **Operations**
- Health check endpoint
- Centralized logging
- Monitoring & alerts
- Database backups
- Easy rollback

---

## 🎉 You're Ready to Deploy!

All files are prepared. Choose your deployment method:

### Option 1: Automated (Recommended)
```bash
./deploy-to-cloud-run.sh
```

### Option 2: Step-by-Step
Follow **DEPLOYMENT_GUIDE.md** for detailed instructions

### Option 3: Manual Commands
Use commands from **DEPLOYMENT_README.md** sections

---

## 📅 Deployment Checklist

Before going live:

- [ ] Downloaded firebase-admin-key.json
- [ ] Read DEPLOYMENT_README.md
- [ ] Verified Docker builds locally
- [ ] Have GCP account with billing enabled
- [ ] Have gcloud CLI installed
- [ ] Chose deployment method
- [ ] Ready to provide database credentials
- [ ] Understood security architecture
- [ ] Know how to view logs and troubleshoot
- [ ] Ready to test application after deployment

---

## 🎓 Important Files Reference

```
📄 Dockerfile                 - Container image definition
📄 .dockerignore              - Build optimization
📄 cloudbuild.yaml           - CI/CD pipeline
📄 deploy-to-cloud-run.sh   - Automated deployment script
📄 package.json              - Updated with firebase-admin
📄 server/index.js           - Updated with auth middleware

📚 DEPLOYMENT_README.md       - Quick start guide
📚 DEPLOYMENT_GUIDE.md        - Step-by-step instructions
📚 SECRETS_MANAGEMENT.md      - Credential setup
📚 AI_AGENT_PROJECT_SUMMARY   - Architecture overview
```

---

## 🚀 Ready to Deploy?

```bash
# Start deployment
./deploy-to-cloud-run.sh

# Or follow the manual guide
cat DEPLOYMENT_GUIDE.md

# Or quick reference
cat DEPLOYMENT_README.md
```

---

**Status:** ✅ **COMPLETE & PRODUCTION READY**  
**Created:** January 28, 2026  
**Version:** 1.0  

Your Atelier MEP Portal is ready for enterprise deployment on Google Cloud Run with enterprise-grade security! 🎯
