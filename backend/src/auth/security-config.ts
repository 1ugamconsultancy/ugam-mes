import 'dotenv/config';
import { randomBytes } from 'crypto';

export const appMode = process.env.APP_MODE || 'production';
if (!['production', 'demo'].includes(appMode)) throw new Error('APP_MODE must be production or demo');
const configuredSecret = process.env.JWT_SECRET;
if (!configuredSecret || configuredSecret.length < 32 || configuredSecret === 'SuperSecretMESJWTToken2026!') {
  if (process.env.NODE_ENV !== 'test') throw new Error('Provide a unique JWT_SECRET of at least 32 characters');
}
export const jwtSecret = configuredSecret || randomBytes(48).toString('hex');
export const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8085,http://localhost:5173').split(',').map(x => x.trim());
