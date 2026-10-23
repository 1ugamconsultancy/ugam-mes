// Dynamic API base URL configuration that adapts to environment variable, localhost, local network IP, or domain
export const getApiBaseUrl = (): string => {
  // If explicitly configured in Vercel or cloud environment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    // Vite local dev server
    if (port === '5173' || port === '5174') {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:3001`;
    }
    // Production behind Nginx reverse proxy
    return '/api';
  }
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If the endpoint is already an uploads or static asset path
  if (cleanEndpoint.startsWith('/uploads/')) {
    if (typeof window !== 'undefined' && window.location && (window.location.port === '5173' || window.location.port === '5174')) {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:3001${cleanEndpoint}`;
    }
    return cleanEndpoint;
  }

  if (base.endsWith('/')) {
    return `${base.slice(0, -1)}${cleanEndpoint}`;
  }
  return `${base}${cleanEndpoint}`;
};

export const getWsUrl = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    if (port === '5173' || port === '5174') {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:3001`;
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
};

