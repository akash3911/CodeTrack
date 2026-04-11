import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export const signInWithGoogle = async (): Promise<User> => {
  if (!auth || !googleProvider) {
    throw new Error("Firebase auth is not configured. Set VITE_FIREBASE_* values in frontend/.env.");
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signOutUser = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const getIdToken = async (): Promise<string | null> => {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};
