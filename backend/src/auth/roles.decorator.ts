import { SetMetadata } from '@nestjs/common';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PRODUCTION_MANAGER' | 'SUPERVISOR' | 'OPERATOR' | 'QUALITY_ENGINEER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
