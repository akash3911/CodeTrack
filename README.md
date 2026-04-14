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
FRONTEND_URL=http://localhost:5173
# Local MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=codetrack
DB_PASSWORD=codetrack
DB_NAME=codetrack
# JWT
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
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
```

Open the app, create an account with username/email/password, pick a problem, write code, Run (example tests) or Submit (stores result + code in MySQL).

### Docker Compose
```bash
docker compose up --build
```

This starts:
- MySQL on port 3306
- Backend on port 3000
- Frontend on port 80

## Judge0 Notes
- Without JUDGE0_KEY it uses the public CE endpoint (rate limits apply).
- With JUDGE0_KEY + RapidAPI base it uses authenticated quota.
- Only Python & Java currently mapped (extend LANGUAGE_MAP to add more).

## Folder Snapshot
```
backend/src
  controllers/ (auth, problems, submissions, user)
  data/ (mysql, users, submissions)
  middleware/auth.ts
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
