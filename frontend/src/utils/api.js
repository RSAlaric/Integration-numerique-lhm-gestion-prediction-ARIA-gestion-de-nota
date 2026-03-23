import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 60000,  // 60s pour laisser le temps à l'IA de répondre
});

// Ajouter le token JWT automatiquement
api.interceptors.request.use(config => {
  const token = localStorage.getItem('lhm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gérer les erreurs d'authentification
// ⚠️ Ne pas déconnecter sur les erreurs venant des routes /ai/*
// car l'API Anthropic peut retourner un 401 (clé invalide) sans rapport avec la session
api.interceptors.response.use(
  response => response,
  error => {
    const isAIRoute = error.config?.url?.includes('/ai/');
    if (error.response?.status === 401 && !isAIRoute) {
      localStorage.removeItem('lhm_token');
      localStorage.removeItem('lhm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
