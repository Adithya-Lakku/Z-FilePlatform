import axios from 'axios';

// Axios instance configured for the FastAPI backend.
// In development, Vite proxies /api/* to localhost:8000.
// In production, both frontend and backend are served from the same origin.
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
  },
});

export default api;
