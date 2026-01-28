# Secrets Management Guide for RISi

## Local Development

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Fill in your development credentials in `.env`

## Production Secrets in Google Cloud

### Step 1: Store Secrets in Secret Manager

```bash
# Install Google Cloud CLI if not already installed
curl https://sdk.cloud.google.com | bash

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project [YOUR_PROJECT_ID]

# Create secrets for each environment variable
gcloud secrets create FIREBASE_API_KEY --replication-policy="automatic"
gcloud secrets create DB_USER --replication-policy="automatic"
gcloud secrets create DB_PASSWORD --replication-policy="automatic"
gcloud secrets create DB_HOST --replication-policy="automatic"
gcloud secrets create DB_NAME --replication-policy="automatic"
gcloud secrets create INSTANCE_CONNECTION_NAME --replication-policy="automatic"

# Add secret versions with your values
gcloud secrets versions add FIREBASE_API_KEY --data-file=<(echo -n "your-api-key")
gcloud secrets versions add DB_USER --data-file=<(echo -n "your-db-user")
gcloud secrets versions add DB_PASSWORD --data-file=<(echo -n "your-db-password")
gcloud secrets versions add DB_HOST --data-file=<(echo -n "your-db-host")
gcloud secrets versions add DB_NAME --data-file=<(echo -n "your-db-name")
gcloud secrets versions add INSTANCE_CONNECTION_NAME --data-file=<(echo -n "your-instance-connection")
```

### Step 2: Configure Service Account

1. Create a service account for your app:
```bash
gcloud iam service-accounts create risi-app --display-name="RISi Application"
```

2. Grant Secret Manager access:
```bash
gcloud projects add-iam-policy-binding [YOUR_PROJECT_ID] \
    --member="serviceAccount:risi-app@[YOUR_PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Step 3: Deploy with Secret Access

1. Update your app.yaml or cloud run configuration to use secrets:

```yaml
env_variables:
  NODE_ENV: "production"

secrets:
  - FIREBASE_API_KEY
  - DB_USER
  - DB_PASSWORD
  - DB_HOST
  - DB_NAME
  - INSTANCE_CONNECTION_NAME
```

2. Deploy your application:
```bash
gcloud app deploy
# or for Cloud Run:
gcloud run deploy
```

## Security Best Practices

1. Never commit `.env` files to version control
2. Rotate secrets regularly
3. Use different secrets for development and production
4. Limit service account permissions to only required secrets
5. Monitor secret access in Cloud Audit Logs

## Accessing Secrets in Code

The environment variables will be automatically available in your application through `process.env`. The [`src/api/db.js`](src/api/db.js) file is already configured to use these environment variables for database connection.

## Secret Rotation

To rotate secrets:

1. Create a new version in Secret Manager:
```bash
gcloud secrets versions add [SECRET_NAME] --data-file=<(echo -n "new-value")
```

2. The application will automatically use the latest version of the secret

## Monitoring

Enable monitoring of secret access:
```bash
gcloud services enable cloudaudit.googleapis.com
```

View secret access logs in Cloud Audit Logs:
```bash
gcloud logging read "resource.type=secret_manager_secret"