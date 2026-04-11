import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isPlaceholder = (value?: string) => {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^<.*>$/.test(trimmed);
};

const hasValidFirebaseConfig =
  !isPlaceholder(firebaseConfig.apiKey) &&
  !isPlaceholder(firebaseConfig.authDomain) &&
  !isPlaceholder(firebaseConfig.projectId) &&
  !isPlaceholder(firebaseConfig.appId);

let authInstance: ReturnType<typeof getAuth> | null = null;
let providerInstance: GoogleAuthProvider | null = null;

if (hasValidFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    providerInstance = new GoogleAuthProvider();
    providerInstance.setCustomParameters({ prompt: "select_account" });
  } catch (err) {
    console.warn("Firebase auth is disabled due to invalid client config.", err);
  }
} else {
  console.warn("Firebase auth is disabled: missing or placeholder VITE_FIREBASE_* env values.");
}

export const auth = authInstance;
export const googleProvider = providerInstance;
export const isFirebaseAuthEnabled = !!authInstance;
