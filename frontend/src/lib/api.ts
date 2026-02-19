import { getIdToken } from "./auth";

// API configuration and utilities
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Get auth token from Firebase (if signed in)
const getAuthToken = async (): Promise<string | null> => {
  return getIdToken();
};

// API request wrapper with authentication
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  let data: any = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = (data && (data.message || data.error)) || 'Something went wrong';
    // Throw an Error object augmented with status and data for richer handling upstream
    const err = Object.assign(new Error(message), { status: response.status, data });
    throw err;
  }

  return data;
};

// Authentication API
export const authAPI = {
  getMe: async () => {
    return apiRequest('/auth/me');
  }
};

// Problems API
export const problemsAPI = {
  getCategories: async () => {
    return apiRequest('/problems/categories');
  },

  getProblemsByCategory: async (category: string, page = 1, limit = 20) => {
    return apiRequest(`/problems/category/${category}?page=${page}&limit=${limit}`);
  },

  getProblem: async (id: string) => {
    return apiRequest(`/problems/${id}`);
  },

  searchProblems: async (query: string, category?: string, difficulty?: string) => {
    const params = new URLSearchParams({ q: query });
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);
    
    return apiRequest(`/problems/search?${params}`);
  },
};

// Submissions / Code execution API
export const submissionsAPI = {
  run: async (code: string, language: 'python' | 'java' = 'python', input = '') => {
    return apiRequest('/submissions/run', {
      method: 'POST',
      body: JSON.stringify({ code, language, input }),
    });
  },
  list: async (slug: string) => {
    return apiRequest(`/submissions/${slug}`);
  },
  create: async (slug: string, code: string, language: 'python' | 'java' = 'python') => {
    return apiRequest(`/submissions/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    });
  },
  runExamples: async (slug: string, code: string, language: 'python' | 'java' = 'python') => {
    return apiRequest(`/submissions/run/${slug}`, {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    });
  }
};

// User API
export const userAPI = {
  getProfile: async () => {
    return apiRequest('/user/profile');
  },

  getSolvedProblems: async () => {
    return apiRequest('/user/solved');
  },

  getStarredProblems: async () => {
    return apiRequest('/user/starred');
  },

  markProblemSolved: async (problemId: string) => {
    return apiRequest(`/user/solve/${problemId}`, {
      method: 'POST',
    });
  },

  unmarkProblemSolved: async (problemId: string) => {
    return apiRequest(`/user/solve/${problemId}`, {
      method: 'DELETE',
    });
  },

  toggleProblemStar: async (problemId: string) => {
    return apiRequest(`/user/star/${problemId}`, {
      method: 'POST',
    });
  },
};
