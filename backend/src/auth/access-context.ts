import { ForbiddenException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { UserRole } from './user.entity';

export interface AccessContext {
  sub: string;
  username: string;
  role: UserRole;
  plantId: string | null;
  organizationId: string | null;
  sessionVersion: number;
  exp?: number;
}

export const accessStorage = new AsyncLocalStorage<AccessContext>();
export function currentAccess(): AccessContext {
  const actor = accessStorage.getStore();
  if (!actor) throw new ForbiddenException('Authenticated context required');
  return actor;
}
export function currentPlant(): string {
  const plantId = currentAccess().plantId;
  if (!plantId) throw new ForbiddenException('Select an active plant before accessing manufacturing data');
  return plantId;
}
