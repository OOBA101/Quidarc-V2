// API base URL. In development the Vite proxy forwards `/api` to the backend.
// In production set VITE_API_BASE_URL to the backend origin **including** the
// `/api` path, e.g. https://quidarc-backend.up.railway.app/api. Uses `||` so an
// empty-string env var falls back to the relative default rather than breaking.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
