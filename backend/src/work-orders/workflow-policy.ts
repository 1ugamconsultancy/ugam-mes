import { BadRequestException, ForbiddenException } from '@nestjs/common';
export const transitions = {
    PLAN: { from: ['DRAFT'], to: 'PLANNED', roles: ['PRODUCTION_MANAGER'] },
    RELEASE: { from: ['PLANNED'], to: 'RELEASED', roles: ['PRODUCTION_MANAGER'] },
    START: { from: ['RELEASED'], to: 'IN_PROGRESS', roles: ['OPERATOR', 'SUPERVISOR', 'PRODUCTION_MANAGER'] },
    PAUSE: { from: ['IN_PROGRESS'], to: 'PAUSED', roles: ['OPERATOR', 'SUPERVISOR', 'PRODUCTION_MANAGER'] },
    RESUME: { from: ['PAUSED'], to: 'IN_PROGRESS', roles: ['OPERATOR', 'SUPERVISOR', 'PRODUCTION_MANAGER'] },
    APPROVE_SHORTFALL: { from: ['IN_PROGRESS', 'PAUSED'], to: null, roles: ['SUPERVISOR'] },
    COMPLETE: { from: ['IN_PROGRESS', 'PAUSED'], to: 'COMPLETED', roles: ['OPERATOR', 'SUPERVISOR', 'PRODUCTION_MANAGER'] },
    REVIEW: { from: ['COMPLETED'], to: 'REVIEWED', roles: ['SUPERVISOR'] },
    REJECT_REVIEW: { from: ['COMPLETED', 'REVIEWED'], to: 'COMPLETED', roles: ['SUPERVISOR'] },
    CLOSE: { from: ['REVIEWED'], to: 'CLOSED', roles: ['PRODUCTION_MANAGER'] },
};
export function permitted(action: string, status: string, role: string) {
    const rule = transitions[action];
    return !!rule && rule.from.includes(status) && (['ADMIN', 'SUPER_ADMIN'].includes(role) || rule.roles.includes(role));
}
export function assertTransition(action: string, status: string, role: string) {
    if (!transitions[action] || !transitions[action].from.includes(status))
        throw new BadRequestException('Invalid workflow transition');
    if (!permitted(action, status, role))
        throw new ForbiddenException('Role cannot perform this action');
}
export function validateRequirements(items: any) {
    if (!Array.isArray(items) || !items.length)
        throw new BadRequestException('A reviewed recipe evidence checklist is required');
    const ids = new Set();
    for (const item of items) {
        if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || ids.has(item.id) || !['PRE_START', 'EXECUTION'].includes(item.phase) || typeof item.label !== 'string' || !item.label.trim() || !['MANUAL', 'MATERIAL', 'QUALITY', 'PRODUCTION', 'WEIGHING', 'VERIFIER'].includes(item.kind))
            throw new BadRequestException('Invalid evidence requirement');
        ids.add(item.id);
    }
    return items;
}
