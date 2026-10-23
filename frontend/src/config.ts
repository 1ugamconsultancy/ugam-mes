// Dynamic API base URL configuration that adapts to environment variable, localhost, local network IP, or domain
export const getApiBaseUrl = (): string => {
  // 1. Explicit cloud environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    const port = window.location.port;

    // 2. Vercel cloud deployment auto-detection: connect directly to live Render backend
    if (hostname.endsWith('.vercel.app') || hostname.includes('vercel')) {
      return 'https://ugam-backend-eguo.onrender.com';
    }

    // 3. Vite local dev server
    if (port === '5173' || port === '5174') {
      return `http://${hostname}:3001`;
    }

    // 4. Production behind local Nginx reverse proxy
    return '/api';
  }
  return 'https://ugam-backend-eguo.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

export const getApiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If the endpoint is already an uploads or static asset path
  if (cleanEndpoint.startsWith('/uploads/')) {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname || 'localhost';
      const port = window.location.port;
      if (hostname.endsWith('.vercel.app') || hostname.includes('vercel')) {
        return `https://ugam-backend-eguo.onrender.com${cleanEndpoint}`;
      }
      if (port === '5173' || port === '5174') {
        return `http://${hostname}:3001${cleanEndpoint}`;
      }
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
    const hostname = window.location.hostname || 'localhost';
    const port = window.location.port;
    if (hostname.endsWith('.vercel.app') || hostname.includes('vercel')) {
      return 'https://ugam-backend-eguo.onrender.com';
    }
    if (port === '5173' || port === '5174') {
      return `http://${hostname}:3001`;
    }
    return window.location.origin;
  }
  return 'https://ugam-backend-eguo.onrender.com';
};
