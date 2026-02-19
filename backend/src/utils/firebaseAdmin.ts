import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || path.resolve(process.cwd(), '../auth-f9e85-firebase-adminsdk-fbsvc-b06f1890b0.json');

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const raw = fs.readFileSync(serviceAccountPath, 'utf8');
  return JSON.parse(raw);
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default admin;
