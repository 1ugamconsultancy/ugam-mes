import 'dotenv/config';
import { randomBytes } from 'crypto';

export const appMode = process.env.APP_MODE || 'production';
if (!['production', 'demo'].includes(appMode)) throw new Error('APP_MODE must be production or demo');
const configuredSecret = process.env.JWT_SECRET;
export const jwtSecret = (configuredSecret && configuredSecret.length >= 32 && configuredSecret !== 'SuperSecretMESJWTToken2026!')
  ? configuredSecret
  : 'UgamMESEnterprise2026ProductionSecureJWTSecretKey1234567890!';
export const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://ugam-mes.vercel.app,http://localhost:8085,http://localhost:5173,http://localhost:3000,http://localhost:3001').split(',').map(x => x.trim());
