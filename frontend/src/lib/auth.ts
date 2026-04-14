type AuthUser = {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  solvedProblems?: string[];
  starredProblems?: string[];
  createdAt?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'codetrack_token';
const USER_KEY = 'codetrack_user';

const listeners = new Set<(user: AuthUser | null) => void>();

const emitAuthChange = (user: AuthUser | null): void => {
  listeners.forEach((listener) => listener(user));
};

const readUserFromStorage = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

const persistSession = (token: string, user: AuthUser): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthChange(user);
};

export const getCurrentUser = (): AuthUser | null => readUserFromStorage();

export const getAuthToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const onAuthChange = (callback: (user: AuthUser | null) => void) => {
  listeners.add(callback);
  callback(readUserFromStorage());
  return () => {
    listeners.delete(callback);
  };
};

export const registerWithPassword = async (payload: { username: string; email: string; password: string }): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Registration failed');
  }
  persistSession(data.token, data.user);
  return data.user;
};

export const loginWithPassword = async (payload: { email: string; password: string }): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Login failed');
  }
  persistSession(data.token, data.user);
  return data.user;
};

export const signOutUser = (): Promise<void> => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitAuthChange(null);
  return Promise.resolve();
};
