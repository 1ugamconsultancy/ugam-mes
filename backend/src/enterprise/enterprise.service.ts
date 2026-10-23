/**
 * @file enterprise.service.ts
 * @module Backend/Enterprise
 * @description Enterprise multi-tenant hierarchy, manufacturing site provisioning, and theme customization service.
 * Manages parent corporations (Organizations), discrete production facilities (Plants), dynamic plant-level
 * CSS brand palettes (Themes), and cross-plant personnel allocations.
 * 
 * @compliance GAMP 5 Category 4 Configured Enterprise System
 * @compliance ISO 9001:2015 Clause 7.1.3 (Infrastructure) & Clause 7.1.4 (Environment for Operation)
 * @compliance IATF 16949:2016 Clause 7.1.3.1 (Plant, Facility, and Equipment Planning)
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { currentAccess } from '../auth/access-context';
import { Organization } from './organization.entity';
import { PlantThemeSetting, ThemeColors } from './plant-theme.entity';
import { Plant } from '../plants/plants.entity';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/user.entity';

/**
 * @class EnterpriseService
 * @description Service handling multi-tier enterprise topology, site configurations,
 * color palette customization, and administrative user allocations.
 */
@Injectable()
export class EnterpriseService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
    @InjectRepository(Plant)
    private plantRepo: Repository<Plant>,
    @InjectRepository(PlantThemeSetting)
    private themeRepo: Repository<PlantThemeSetting>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private authService: AuthService,
  ) {}

  private rejectArchiveFields(dto: any) {
    if (Object.keys(dto).some(key => /archiv/i.test(key))) throw new BadRequestException('Use the archive/restore action');
  }
  private async writableOrganization(id: string) {
    const org = await this.getOrganizationById(id);
    if (org.archivedAt) throw new ConflictException('Restore the organization before making changes');
    return org;
  }
  private async writablePlant(id: string) {
    const plant = await this.getPlantById(id);
    if (plant.archivedAt) throw new ConflictException('Restore the plant before making changes');
    if (plant.organizationId) await this.writableOrganization(plant.organizationId);
    return plant;
  }
  private async mutation(action: (service: EnterpriseService) => Promise<any>) {
    return this.orgRepo.manager.transaction(async manager => {
      await manager.query('SELECT pg_advisory_xact_lock(180026,1)');
      const scoped = new EnterpriseService(manager.getRepository(Organization), manager.getRepository(Plant), manager.getRepository(PlantThemeSetting), manager.getRepository(User), this.authService);
      return action(scoped);
    });
  }
  async archiveEntity(kind: 'organization' | 'plant', id: string, restore: boolean) {
    const actor = currentAccess();
    if (actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super administrator required');
    return this.mutation(async service => {
      const repository = kind === 'organization' ? service.orgRepo : service.plantRepo;
      const entity: Organization | Plant = await repository.findOne({where:{id},lock:{mode:'pessimistic_write'}});
      if (!entity) throw new NotFoundException('Organization or plant not found');
      if (kind === 'plant' && (entity as Plant).organizationId) await service.writableOrganization((entity as Plant).organizationId);
      if (Boolean(entity.archivedAt) === !restore) return {id, archivedAt:entity.archivedAt, changed:false};
      const table = kind === 'organization' ? 'organizations' : 'plants';
      const manager = service.orgRepo.manager;
      const [updated] = await manager.query(`UPDATE ${table} SET archived_at=$2, archived_by=$3 WHERE id=$1 RETURNING archived_at AS "archivedAt"`, [id,restore ? null : new Date(),restore ? null : actor.sub]);
      await manager.query(`UPDATE users SET session_version=session_version+1 WHERE ${kind === 'organization' ? 'organization_id=$1 OR plant_id IN (SELECT id FROM plants WHERE organization_id=$1)' : 'plant_id=$1'}`, [id]);
      await manager.query('INSERT INTO enterprise_archive_events(entity_type,entity_id,action,actor_id) VALUES($1,$2,$3,$4)', [kind,id,restore?'RESTORE':'ARCHIVE',actor.sub]);
      return {id,...updated,changed:true};
    });
  }

  // =========================================================================
  // SECTION 1: ENTERPRISE ORGANIZATIONS HIERARCHY
  // Manages top-level corporate entities and aggregates operational plant counts.
  // =========================================================================

  /**
   * @function getOrganizations
   * @description Retrieves all enterprise organizations ordered alphabetically,
   * enriched with their live count of associated manufacturing plants.
   * 
   * @returns {Promise<Array<Organization & { plantCount: number }>>} Organizations list with plant metrics
   */
  async getOrganizations(includeArchived = false) {
    const orgs = await this.orgRepo.find({ where: includeArchived ? {} : {archivedAt:IsNull()}, order: { name: 'ASC' } });
    const plants = await this.plantRepo.find();
    
    return orgs.map((org) => ({
      ...org,
      plantCount: plants.filter((p) => p.organizationId === org.id && (includeArchived || !p.archivedAt)).length,
    }));
  }

  /**
   * @function getOrganizationById
   * @description Fetches a single organization record by its primary UUID key.
   * 
   * @param {string} id - Organization UUID
   * @returns {Promise<Organization>} Found organization record
   * @throws {NotFoundException} If organization is not found
   */
  async getOrganizationById(id: string) {
    const org = await this.orgRepo.findOneBy({ id });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  /**
   * @function createOrganization
   * @description Registers a new parent corporate entity with a unique upper-case code.
   * 
   * @param {Partial<Organization>} dto - Organization attributes (name, code, industryType, logoUrl)
   * @returns {Promise<Organization>} Newly persisted organization entity
   * @throws {ConflictException} If organization code is already registered
   */
  async createOrganization(dto: Partial<Organization>) {
    this.rejectArchiveFields(dto);
    return this.mutation(service => service.createOrganizationLocked(dto));
  }
  private async createOrganizationLocked(dto: Partial<Organization>) {
    const existing = await this.orgRepo.findOneBy({ code: dto.code?.toUpperCase() });
    if (existing) throw new ConflictException(`Organization with code ${dto.code} already exists`);

    const org = this.orgRepo.create({
      name: dto.name, industryType: dto.industryType, logoUrl: dto.logoUrl,
      code: dto.code?.toUpperCase(),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.orgRepo.save(org);
  }

  /**
   * @function updateOrganization
   * @description Updates corporate metadata, status, or unique code for an existing organization.
   * 
   * @param {string} id - Target organization UUID
   * @param {Partial<Organization>} dto - Partial fields to update
   * @returns {Promise<Organization>} Updated organization entity
   * @throws {ConflictException} If new code clashes with an existing organization
   */
  async updateOrganization(id: string, dto: Partial<Organization>) {
    this.rejectArchiveFields(dto);
    return this.mutation(service => service.updateOrganizationLocked(id, dto));
  }
  private async updateOrganizationLocked(id: string, dto: Partial<Organization>) {
    const org = await this.writableOrganization(id);
    if (dto.code && dto.code !== org.code) {
      const existing = await this.orgRepo.findOneBy({ code: dto.code.toUpperCase() });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Organization with code ${dto.code} already exists`);
      }
      org.code = dto.code.toUpperCase();
    }
    if (dto.name !== undefined) org.name = dto.name;
    if (dto.industryType !== undefined) org.industryType = dto.industryType;
    if (dto.logoUrl !== undefined) org.logoUrl = dto.logoUrl;
    if (dto.isActive !== undefined) org.isActive = dto.isActive;

    return this.orgRepo.save(org);
  }

  // =========================================================================
  // SECTION 2: MANUFACTURING PLANT OPERATIONS & MAPPING
  // Manages discrete production facilities, location metadata, timezones,
  // and assigns default plant branding themes upon provisioning.
  // =========================================================================

  /**
   * @function getPlants
   * @description Retrieves registered manufacturing plants, optionally filtered by parent organization.
   * Enriches each plant entity with organization code and its currently configured theme palette.
   * 
   * @param {string} [organizationId] - Optional parent organization UUID filter
   * @returns {Promise<Array<object>>} List of plants with parent organization and theme metadata
   */
  async getPlants(organizationId?: string, includeArchived = false) {
    const query = this.plantRepo.createQueryBuilder('plant')
      .leftJoinAndSelect('plant.areas', 'area')
      .orderBy('plant.name', 'ASC');

    if (organizationId) {
      query.where('plant.organizationId = :organizationId', { organizationId });
    }

    const plants = await query.getMany();
    const orgs = await this.orgRepo.find();
    const themes = await this.themeRepo.find();

    return plants.filter(plant => includeArchived || (!plant.archivedAt && !orgs.find(o => o.id === plant.organizationId)?.archivedAt)).map((plant) => {
      const parentOrg = orgs.find((o) => o.id === plant.organizationId);
      const theme = themes.find((t) => t.plantId === plant.id);
      return {
        ...plant,
        inheritedArchived: Boolean(parentOrg?.archivedAt),
        organizationName: parentOrg ? parentOrg.name : 'Unassigned',
        organizationCode: parentOrg ? parentOrg.code : 'N/A',
        themeName: theme ? theme.themeName : 'Ugam Corporate Navy',
        themeColors: theme ? theme.colors : null,
      };
    });
  }

  /**
   * @function getPlantById
   * @description Fetches a manufacturing plant by primary UUID key.
   * 
   * @param {string} id - Plant UUID
   * @returns {Promise<Plant>} Found plant entity
   * @throws {NotFoundException} If plant ID is not found
   */
  async getPlantById(id: string) {
    const plant = await this.plantRepo.findOneBy({ id });
    if (!plant) throw new NotFoundException(`Plant ${id} not found`);
    const parent = plant.organizationId ? await this.orgRepo.findOneBy({id:plant.organizationId}) : null;
    return {...plant, inheritedArchived:Boolean(parent?.archivedAt)};
  }

  /**
   * @function createPlant
   * @description Creates a new manufacturing plant under a designated parent organization.
   * Automatically initializes and seeds a default theme record for the newly provisioned facility.
   * 
   * @param {object} dto - Plant attributes, location, timezone, and optional custom theme colors
   * @returns {Promise<Plant>} Persisted plant entity
   * @throws {ConflictException} If plant code is already in use
   */
  async createPlant(dto: { name: string; code: string; organizationId: string; location?: string; timezone?: string; themeName?: string; themeColors?: ThemeColors }) {
    this.rejectArchiveFields(dto);
    return this.mutation(service => service.createPlantLocked(dto));
  }
  private async createPlantLocked(dto: { name: string; code: string; organizationId: string; location?: string; timezone?: string; themeName?: string; themeColors?: ThemeColors }) {
    await this.writableOrganization(dto.organizationId);
    const existing = await this.plantRepo.findOneBy({ code: dto.code.toUpperCase() });
    if (existing) throw new ConflictException(`Plant with code ${dto.code} already exists`);

    const plant = this.plantRepo.create({
      name: dto.name,
      code: dto.code.toUpperCase(),
      organizationId: dto.organizationId,
      location: dto.location || '',
      timezone: dto.timezone || 'Asia/Kolkata',
      status: 'ACTIVE',
    });
    const savedPlant = await this.plantRepo.save(plant);

    // Seed default theme for this new plant
    const defaultColors: ThemeColors = dto.themeColors || {
      bgPrimary: '#FFFFFF',
      bgSection: '#F4F5F6',
      bgCard: '#FFFFFF',
      textPrimary: '#171717',
      textSecondary: '#475569',
      borderColor: 'rgba(23, 74, 124, 0.20)',
      colorPrimary: '#174A7C',
      colorCorporate: '#142A45',
      colorAccent: '#F5A623',
    };

    const theme = this.themeRepo.create({
      organizationId: dto.organizationId,
      plantId: savedPlant.id,
      themeName: dto.themeName || 'Ugam Corporate Navy',
      paletteType: 'PRESET',
      colors: defaultColors,
    });
    await this.themeRepo.save(theme);

    return savedPlant;
  }

  /**
   * @function updatePlant
   * @description Modifies existing plant properties including name, location, parent organization, or status.
   * 
   * @param {string} id - Plant UUID
   * @param {Partial<Plant>} dto - Updated plant fields
   * @returns {Promise<Plant>} Updated plant entity
   * @throws {ConflictException} If the new code conflicts with an existing plant
   */
  async updatePlant(id: string, dto: Partial<Plant>) {
    this.rejectArchiveFields(dto);
    return this.mutation(service => service.updatePlantLocked(id, dto));
  }
  private async updatePlantLocked(id: string, dto: Partial<Plant>) {
    const plant = await this.writablePlant(id);
    if (dto.organizationId) await this.writableOrganization(dto.organizationId);
    if (dto.code && dto.code !== plant.code) {
      const existing = await this.plantRepo.findOneBy({ code: dto.code.toUpperCase() });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Plant with code ${dto.code} already exists`);
      }
      plant.code = dto.code.toUpperCase();
    }
    if (dto.name !== undefined) plant.name = dto.name;
    if (dto.location !== undefined) plant.location = dto.location;
    if (dto.organizationId !== undefined) plant.organizationId = dto.organizationId;
    if (dto.timezone !== undefined) plant.timezone = dto.timezone;
    if (dto.status !== undefined) plant.status = dto.status;

    return this.plantRepo.save(plant);
  }

  // =========================================================================
  // SECTION 3: PLANT THEME & DYNAMIC BRAND PALETTE MANAGEMENT
  // Manages custom and preset color palettes (primary, corporate, accent, dark mode)
  // per manufacturing site.
  // =========================================================================

  /**
   * @function getPlantTheme
   * @description Fetches the configured CSS theme palette for a given plant.
   * Returns a default corporate navy fallback if no custom theme has been assigned.
   * 
   * @param {string} plantId - Plant UUID
   * @returns {Promise<PlantThemeSetting | object>} Configured or fallback theme palette
   */
  async getPlantTheme(plantId: string) {
    const theme = await this.themeRepo.findOneBy({ plantId });
    if (!theme) {
      // Return default corporate theme fallback
      return {
        themeName: 'Ugam Corporate Navy',
        paletteType: 'PRESET',
        isDarkMode: false,
        colors: {
          bgPrimary: '#FFFFFF',
          bgSection: '#F4F5F6',
          bgCard: '#FFFFFF',
          textPrimary: '#171717',
          textSecondary: '#475569',
          borderColor: 'rgba(23, 74, 124, 0.20)',
          colorPrimary: '#174A7C',
          colorCorporate: '#142A45',
          colorAccent: '#F5A623',
        },
      };
    }
    return theme;
  }

  /**
   * @function updatePlantTheme
   * @description Updates or initializes custom CSS color tokens for a plant site.
   * Enables SuperAdmins to align UI accents with plant-specific corporate identities.
   * 
   * @param {string} plantId - Target plant UUID
   * @param {object} dto - New theme name, color definitions, dark mode flag, and modifying user ID
   * @returns {Promise<PlantThemeSetting>} Persisted theme record
   */
  async updatePlantTheme(plantId: string, dto: { themeName: string; colors: ThemeColors; isDarkMode?: boolean; userId?: string }) {
    this.rejectArchiveFields(dto);
    return this.mutation(service => service.updatePlantThemeLocked(plantId, dto));
  }
  private async updatePlantThemeLocked(plantId: string, dto: { themeName: string; colors: ThemeColors; isDarkMode?: boolean; userId?: string }) {
    let theme = await this.themeRepo.findOneBy({ plantId });
    const plant = await this.writablePlant(plantId);

    if (!theme) {
      theme = this.themeRepo.create({
        plantId,
        organizationId: plant.organizationId,
        themeName: dto.themeName,
        paletteType: 'CUSTOM',
        isDarkMode: dto.isDarkMode || false,
        colors: dto.colors,
        updatedBy: dto.userId,
      });
    } else {
      theme.themeName = dto.themeName;
      theme.colors = dto.colors;
      if (dto.isDarkMode !== undefined) theme.isDarkMode = dto.isDarkMode;
      if (dto.userId) theme.updatedBy = dto.userId;
    }

    return this.themeRepo.save(theme);
  }

  // =========================================================================
  // SECTION 4: ENTERPRISE USERS & CROSS-SITE ALLOCATIONS
  // Provides centralized operator, supervisor, and manager site-scoping tools.
  // =========================================================================

  /**
   * @function getAllUsers
   * @description Retrieves all enterprise users mapped with their parent organization
   * and designated manufacturing plant names.
   * 
   * @returns {Promise<Array<object>>} List of users with enriched site allocation names
   */
  async getAllUsers() {
    const users = await this.userRepo.find({ order: { username: 'ASC' } });
    const orgs = await this.orgRepo.find();
    const plants = await this.plantRepo.find();

    return users.map((u) => {
      const org = orgs.find((o) => o.id === u.organizationId);
      const plant = plants.find((p) => p.id === u.plantId);
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        assignmentArchived: Boolean(org?.archivedAt || plant?.archivedAt || orgs.find(o => o.id === plant?.organizationId)?.archivedAt),
        organizationId: u.organizationId,
        organizationName: org ? org.name : 'Universal Enterprise',
        plantId: u.plantId,
        plantName: plant ? plant.name : 'Universal Enterprise',
      };
    });
  }

  /**
   * @function updateUserAllocation
   * @description Reallocates an enterprise user to a different plant site, organization, or elevated role.
   * 
   * @param {string} userId - Target user UUID
   * @param {object} dto - Target organizationId, plantId, and role
   * @returns {Promise<User>} Updated user record
   * @throws {NotFoundException} If user ID is not found
   * @compliance 21 CFR Part 11 (§11.10(d) Limiting system access to authorized individuals)
   */
  async updateUserAllocation(userId: string, dto: { organizationId?: string; plantId?: string; role?: any }) {
    return this.authService.updateUser(userId, dto);
  }

  // =========================================================================
  // SECTION 5: PUBLIC AUTHENTICATION TENANTS DIRECTORY
  // Serves public hierarchy metadata for login dropdown cascading menus.
  // =========================================================================

  /**
   * @function getPublicTenants
   * @description Returns the complete hierarchy of active organizations and plants
   * along with their pre-configured theme colors for pre-login brand loading.
   * 
   * @returns {Promise<Array<object>>} Public tenant hierarchy
   */
  async getPublicTenants() {
    const orgs = await this.orgRepo.find({ where: { isActive: true, archivedAt: IsNull() }, order: { name: 'ASC' } });
    const plants = await this.plantRepo.find({ where: { status: 'ACTIVE', archivedAt: IsNull() }, order: { name: 'ASC' } });
    const themes = await this.themeRepo.find();

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      code: org.code,
      industryType: org.industryType,
      plants: plants
        .filter((p) => p.organizationId === org.id)
        .map((p) => {
          const theme = themes.find((t) => t.plantId === p.id);
          return {
            id: p.id,
            name: p.name,
            code: p.code,
            location: p.location,
            themeName: theme ? theme.themeName : 'Ugam Corporate Navy',
            themeColors: theme ? theme.colors : null,
          };
        }),
    }));
  }
}
