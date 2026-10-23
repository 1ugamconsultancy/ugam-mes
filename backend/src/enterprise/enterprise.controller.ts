/**
 * @file enterprise.controller.ts
 * @module Backend/Enterprise
 * @description REST API Controller for enterprise multi-site management, plant provisioning,
 * dynamic theme customization, and cross-plant user allocations. Enforces SuperAdmin RBAC guards.
 * 
 * @compliance GAMP 5 Category 4 Configured Enterprise System
 * @compliance ISO 9001:2015 Clause 7.1.3 (Infrastructure) & Clause 7.1.4 (Environment for Operation)
 * @compliance IATF 16949:2016 Clause 7.1.3.1 (Plant, Facility, and Equipment Planning)
 */

import { Controller, Get, Post, Patch, Put, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * @class EnterpriseController
 * @description Exposes corporate structure endpoints, multi-plant provisioning, site-specific theme
 * palette customization, and personnel site allocations.
 */
@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  // =========================================================================
  // SECTION 1: PUBLIC TENANT DIRECTORY (LOGIN DISCOVERY)
  // =========================================================================

  /**
   * @function getPublicTenants
   * @description Public endpoint returning the active organization and plant hierarchy
   * with pre-configured color schemes to populate login dropdowns.
   * 
   * @returns {Promise<Array<object>>} Active enterprise organizations and child plants
   */
  @Get('tenants')
  async getPublicTenants() {
    return this.enterpriseService.getPublicTenants();
  }

  // =========================================================================
  // SECTION 2: SUPER_ADMIN CORPORATE ORGANIZATIONS
  // =========================================================================

  /**
   * @function getOrganizations
   * @description Retrieves all enterprise organizations with active plant metrics.
   * Accessible to SUPER_ADMIN and ADMIN roles.
   * 
   * @returns {Promise<Array<object>>} Organizations list
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('organizations')
  async getOrganizations() {
    return this.enterpriseService.getOrganizations();
  }

  /**
   * @function getOrganizationById
   * @description Fetches details of a specific organization by ID.
   * 
   * @param {string} id - Organization UUID
   * @returns {Promise<Organization>} Organization details
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('organizations/:id')
  async getOrganizationById(@Param('id') id: string) {
    return this.enterpriseService.getOrganizationById(id);
  }

  /**
   * @function createOrganization
   * @description Registers a new parent organization within the enterprise.
   * 
   * @param {any} dto - Organization attributes (name, code, industryType, logoUrl)
   * @returns {Promise<Organization>} Created organization entity
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('organizations')
  async createOrganization(@Body() dto: any) {
    return this.enterpriseService.createOrganization(dto);
  }

  /**
   * @function updateOrganization
   * @description Updates existing organization metadata or activation state.
   * 
   * @param {string} id - Target organization UUID
   * @param {any} dto - Updatable fields
   * @returns {Promise<Organization>} Updated organization entity
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('organizations/:id')
  async updateOrganization(@Param('id') id: string, @Body() dto: any) {
    return this.enterpriseService.updateOrganization(id, dto);
  }

  // =========================================================================
  // SECTION 3: SUPER_ADMIN MANUFACTURING PLANTS
  // =========================================================================

  /**
   * @function getPlants
   * @description Lists manufacturing plants, optionally filtered by organization.
   * 
   * @param {string} [organizationId] - Optional parent organization filter UUID
   * @returns {Promise<Array<object>>} Manufacturing plants list
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('plants')
  async getPlants(@Query('organizationId') organizationId?: string) {
    return this.enterpriseService.getPlants(organizationId);
  }

  /**
   * @function getPlantById
   * @description Fetches manufacturing plant details by primary UUID.
   * 
   * @param {string} id - Plant UUID
   * @returns {Promise<Plant>} Plant details
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('plants/:id')
  async getPlantById(@Param('id') id: string) {
    return this.enterpriseService.getPlantById(id);
  }

  /**
   * @function createPlant
   * @description Provisions a new manufacturing plant and seeds its default theme.
   * 
   * @param {any} dto - Plant creation attributes
   * @returns {Promise<Plant>} Persisted plant entity
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('plants')
  async createPlant(@Body() dto: any) {
    return this.enterpriseService.createPlant(dto);
  }

  /**
   * @function updatePlant
   * @description Modifies existing plant settings, timezone, location, or status.
   * 
   * @param {string} id - Target plant UUID
   * @param {any} dto - Updated fields
   * @returns {Promise<Plant>} Updated plant entity
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('plants/:id')
  async updatePlant(@Param('id') id: string, @Body() dto: any) {
    return this.enterpriseService.updatePlant(id, dto);
  }

  // =========================================================================
  // SECTION 4: PLANT THEME CONFIGURATION
  // =========================================================================

  /**
   * @function getPlantTheme
   * @description Retrieves the configured UI color palette for a target plant site.
   * 
   * @param {string} plantId - Plant UUID
   * @returns {Promise<PlantThemeSetting | object>} Theme colors configuration
   */
  @UseGuards(AuthGuard)
  @Get('themes/:plantId')
  async getPlantTheme(@Param('plantId') plantId: string) {
    return this.enterpriseService.getPlantTheme(plantId);
  }

  /**
   * @function updatePlantTheme
   * @description Updates or initializes customized CSS branding tokens for a plant site.
   * Restricted to SUPER_ADMIN and ADMIN roles.
   * 
   * @param {string} plantId - Target plant UUID
   * @param {any} dto - Theme name, colors object, and dark mode flag
   * @param {any} req - Authenticated request containing user ID
   * @returns {Promise<PlantThemeSetting>} Updated theme setting
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Put('themes/:plantId')
  async updatePlantTheme(@Param('plantId') plantId: string, @Body() dto: any, @Request() req: any) {
    return this.enterpriseService.updatePlantTheme(plantId, {
      ...dto,
      userId: req.user?.sub,
    });
  }

  // =========================================================================
  // SECTION 5: ENTERPRISE USERS & CROSS-SITE ALLOCATIONS
  // =========================================================================

  /**
   * @function getAllUsers
   * @description Retrieves enterprise users with assigned plant and organization mappings.
   * Accessible to SUPER_ADMIN and ADMIN roles.
   * 
   * @returns {Promise<Array<object>>} Users list with allocated site details
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('users')
  async getAllUsers() {
    return this.enterpriseService.getAllUsers();
  }

  /**
   * @function updateUserAllocation
   * @description Reassigns a user's plant, parent organization, or system role.
   * Accessible to SUPER_ADMIN and ADMIN roles.
   * 
   * @param {string} id - Target user UUID
   * @param {any} dto - New organizationId, plantId, or role
   * @returns {Promise<User>} Updated user entity
   * @compliance 21 CFR Part 11 (§11.10(d) Authority checks)
   */
  @UseGuards(AuthGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('users/:id/allocation')
  async updateUserAllocation(@Param('id') id: string, @Body() dto: any) {
    return this.enterpriseService.updateUserAllocation(id, dto);
  }
}

