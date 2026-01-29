# Local Firebase Admin SDK setup

This document explains how to configure the Firebase Admin SDK for local development so server-side token verification works.

1. Create or download a service account key JSON from the Google Cloud Console:

   - Go to **IAM & Admin → Service Accounts** → create a new service account (e.g. `atelier-local-admin`).
   - Grant the service account the roles it needs (for quick testing you can use `Owner`, but prefer least privilege in real projects).
   - Create a key (JSON) and download it to a safe location on your machine, e.g. `~/secrets/atelier-service-account.json`.

2. Point the server to the credentials file (one-time per shell/session):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/secrets/atelier-service-account.json"
```

3. Alternative: export the JSON as a single env var (useful in some CI environments):

```bash
export FIREBASE_ADMIN_SDK="$(jq -c . ~/secrets/atelier-service-account.json)"
```

4. Restart your dev server so the server picks up the credential:

```bash
# in project root
npm run dev
```

Notes:
- Using `GOOGLE_APPLICATION_CREDENTIALS` is the standard Google SDK approach. `FIREBASE_ADMIN_SDK` is supported by this project as an alternative (the server will parse the JSON string).
- Do not commit service account JSON files to source control. Add them to `.gitignore`.
- If you prefer not to use credentials locally, I can add a development bypass for auth for faster UI testing, but enabling Admin SDK is safer.
