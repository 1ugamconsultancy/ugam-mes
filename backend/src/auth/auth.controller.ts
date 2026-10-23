import { appMode } from './security-config';
/**
 * @file auth.controller.ts
 * @module Backend/Auth
 * @description REST API Controller exposing enterprise multi-tenant authentication,
 * JWT session management, tenant discovery for login selectors, and administrative user provisioning.
 * 
 * @compliance FDA 21 CFR Part 11 (§11.100 General requirements, §11.200 Electronic signature components and controls)
 * @compliance GAMP 5 Category 4 Configured Software Security Architecture
 * @compliance ISO/IEC 27001 Access Control
 */

import { Controller, Post, Patch, Param, Body, Get, UseGuards, Request } from '@nestjs/common';
import { currentAccess } from './access-context';
import { Public } from './public.decorator';
import { CreateUserDto, UpdateUserDto, LoginDto } from './user.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Roles } from './roles.decorator';

/**
 * @class AuthController
 * @description Exposes authentication, user identity, and tenant resolution endpoints.
 * Protects session endpoints with JWT AuthGuard and provides open endpoints for login and tenant discovery.
 */
@Controller('auth')
export class AuthController {
  @Get('runtime')
  runtime(){return {appMode};}

  constructor(private authService: AuthService) {}
  @Get('directory')
  getDirectory() { return this.authService.getDirectory(); }

  // =========================================================================
  // SECTION 1: AUTHENTICATION & PUBLIC TENANT DISCOVERY
  // =========================================================================

  /**
   * @function login
   * @description Authenticates user credentials with multi-plant site scoping and returns
   * a signed JWT session bearer token together with customized plant CSS theme settings.
   * 
   * @param {Record<string, string>} body - Login payload (username, password, plantId, organizationId)
   * @returns {Promise<{ access_token: string, user: object }>} JWT session token and profile
   * @compliance 21 CFR Part 11 (§11.200 Controls for identification codes/passwords)
   */
  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password, body.plantId, body.organizationId);
  }

  /**
   * @function getTenants
   * @description Open endpoint returning the active hierarchy of organizations and plants
   * along with configured brand themes to populate login dropdown selectors.
   * 
   * @returns {Promise<Array<object>>} Active enterprise organizations and child plants
   */
  @Public()
  @Get('tenants')
  async getTenants() {
    return this.authService.getTenants();
  }

  // =========================================================================
  // SECTION 2: USER PROFILE & RBAC ROLE DEFINITIONS
  // =========================================================================

  /**
   * @function getProfile
   * @description Returns the authenticated user's session payload decoded from the active JWT token.
   * 
   * @param {any} req - Express request object containing decoded JWT claims
   * @returns {object} Authenticated user profile and plant tenancy
   */
  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  /**
   * @function getRoles
   * @description Returns system RBAC role definitions with human-readable titles and descriptions.
   * 
   * @returns {Array<{ code: string, name: string, description: string }>} Available system roles
   */
  @UseGuards(AuthGuard)
  @Get('roles')
  getRoles() {
    const roles = [
      { code: 'ADMIN', name: 'ADMIN', description: 'System Administrator with full master config access' },
      { code: 'PRODUCTION_MANAGER', name: 'PRODUCTION MANAGER', description: 'Production Manager with campaign & batch management' },
      { code: 'SUPERVISOR', name: 'SUPERVISOR', description: 'Shift Supervisor with line clearance authorizations' },
      { code: 'OPERATOR', name: 'OPERATOR', description: 'Shopfloor Operator with workstation execution console' },
      { code: 'QUALITY_ENGINEER', name: 'QUALITY ENGINEER', description: 'Quality Assurance with deviation, CAPA & batch release signoff' },
    ];
    if (currentAccess().role === 'SUPER_ADMIN') roles.unshift({ code: 'SUPER_ADMIN', name: 'SUPER ADMIN', description: 'All plants and enterprise administration' });
    return roles;
  }

  // =========================================================================
  // SECTION 3: USER PROVISIONING & IDENTITY MANAGEMENT
  // =========================================================================

  /**
   * @function getUsers
   * @description Retrieves registered user accounts for administrative management.
   * 
   * @returns {Promise<User[]>} All user accounts in the system
   */
  @UseGuards(AuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }

  /**
   * @function createUser
   * @description Provisions a new user account with hashed password and role assignments.
   * 
   * @param {any} dto - User creation DTO
   * @returns {Promise<User>} Created user entity
   * @compliance 21 CFR Part 11 (§11.200 Controls for identification codes/passwords)
   */
  @UseGuards(AuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  /**
   * @function updateUser
   * @description Modifies user attributes, role elevation, or re-hashes an updated password.
   * 
   * @param {string} id - Target user UUID
   * @param {any} dto - Updatable fields
   * @returns {Promise<User>} Updated user entity
   * @compliance 21 CFR Part 11 (§11.100 General requirements)
   */
  @UseGuards(AuthGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.authService.updateUser(id, dto);
  }
}

