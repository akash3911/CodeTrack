## Quick Start

### Backend
```bash
cd backend
npm install
```

Create `.env`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=<your_mongodb_uri>
FRONTEND_URL=http://localhost:5173
# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=./auth-f9e85-firebase-adminsdk-fbsvc-b06f1890b0.json
# Or set FIREBASE_SERVICE_ACCOUNT_JSON to the service account JSON string
# Judge0 (leave key blank to use public CE)
JUDGE0_BASE=https://ce.judge0.com
# If using RapidAPI:
# JUDGE0_BASE=https://judge0-ce.p.rapidapi.com
# JUDGE0_KEY=<your_rapidapi_key>
```

Run:
```bash
npm run dev
```
Backend: http://localhost:5000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=<your_firebase_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<your_firebase_auth_domain>
VITE_FIREBASE_PROJECT_ID=<your_firebase_project_id>
VITE_FIREBASE_STORAGE_BUCKET=<your_firebase_storage_bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your_firebase_sender_id>
VITE_FIREBASE_APP_ID=<your_firebase_app_id>
```

Open the app, sign in with Google, pick a problem, write code, Run (example tests) or Submit (stores result + code in Mongo).

## Judge0 Notes
- Without JUDGE0_KEY it uses the public CE endpoint (rate limits apply).
- With JUDGE0_KEY + RapidAPI base it uses authenticated quota.
- Only Python & Java currently mapped (extend LANGUAGE_MAP to add more).

## Folder Snapshot
```
backend/src
  controllers/ (auth, problems, submissions)
  middleware/auth.ts
  models/ (User, Submission)
  utils/fsProblems.ts
frontend/src
  pages/ (Problems, Problem)
  components/
```

## Adding a Problem (for contributors)
1. Create a new folder or file in the backend `problems` directory following existing slug conventions.  
2. Provide metadata (title, difficulty, category, order, examples, etc.) in the same structure as existing problems.  
3. Restart the backend; it rescans problems on startup.  
4. Verify it appears in the Problems list and examples run via “Run”.  
5. Submit a PR including the new problem file only (no `.env`, no build artifacts).

## Environment Security
Never commit real `.env` values (already ignored by `.gitignore`).

## License
MIT (add a LICENSE file if distributing).
