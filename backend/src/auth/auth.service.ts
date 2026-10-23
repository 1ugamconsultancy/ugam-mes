/**
 * @file auth.service.ts
 * @module Backend/Auth
 * @description Enterprise multi-tenant authentication, password hashing, and role authorization service.
 * Implements bcrypt credential verification, strict credential verification,
 * multi-plant tenant scoping, dynamic CSS color theme payload generation, and signed JWT issuance.
 * 
 * @compliance FDA 21 CFR Part 11 (§11.100 General requirements, §11.200 Electronic signature components and controls)
 * @compliance GAMP 5 Category 4 Configured Software Security Architecture
 * @compliance ISO/IEC 27001 Access Control & Credential Management
 */

import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from './user.entity';
import { AccessContext, currentAccess, currentPlant } from './access-context';
import { USER_ROLES } from './user.dto';
import * as bcrypt from 'bcrypt';

import { Plant } from '../plants/plants.entity';
import { Organization } from '../enterprise/organization.entity';
import { PlantThemeSetting } from '../enterprise/plant-theme.entity';

/**
 * @class AuthService
 * @description Core authentication service managing user identity, credential verification,
 * plant tenancy scoping, and JWT session token generation.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Plant)
    private plantRepository: Repository<Plant>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(PlantThemeSetting)
    private themeRepository: Repository<PlantThemeSetting>,
    private jwtService: JwtService,
  ) {}

  // =========================================================================
  // SECTION 1: AUTHENTICATION & SESSION TOKEN ISSUANCE
  // Validates credentials, resolves multi-tenant plant scoping, injects theme
  // metadata, and signs the user session JWT payload.
  // =========================================================================

  /**
   * @function login
   * @description Authenticates a user against stored bcrypt password hashes. Resolves user plant and organization assignments,
   * retrieves customized CSS theme variables for the selected site, and generates a signed JWT.
   * 
   * @param {string} username - Target user login handle
   * @param {string} pass - Plaintext password candidate provided by client
   * @param {string} [requestedPlantId] - Optional plant UUID selected from the multi-plant login selector
   * @param {string} [requestedOrgId] - Optional organization UUID selected from the login selector
   * @returns {Promise<{ access_token: string, user: object }>} Signed JWT token and user session profile
   * @throws {UnauthorizedException} If account does not exist, is deactivated, or password fails verification
   * @compliance 21 CFR Part 11 (§11.200 Controls for identification codes/passwords)
   */
  async login(username: string, pass: string, requestedPlantId?: string, requestedOrgId?: string) {
    const user = await this.userRepository.findOne({ where: { username: (username || '').trim().toLowerCase() }, select: ['id','username','passwordHash','isActive','role','organizationId','plantId','firstName','lastName','sessionVersion'] });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (typeof pass !== 'string' || !await bcrypt.compare(pass, user.passwordHash).catch(() => false)) throw new UnauthorizedException('Invalid username or password');
    let { plantId, organizationId } = await this.resolveScope(user, requestedPlantId, requestedOrgId);

    let plantName = '';
    let organizationName = '';
    let themeColors = null;
    let themeName = 'Ugam Corporate Navy';

    if (plantId) {
      const plant = await this.plantRepository.findOneBy({ id: plantId });
      if (plant) {
        plantName = plant.name;
        if (!organizationId && plant.organizationId) {
          organizationId = plant.organizationId;
        }
      }

      const plantTheme = await this.themeRepository.findOneBy({ plantId });
      if (plantTheme) {
        themeColors = plantTheme.colors;
        themeName = plantTheme.themeName;
      }
    }

    if (organizationId) {
      const org = await this.organizationRepository.findOneBy({ id: organizationId });
      if (org) {
        organizationName = org.name;
      }
    }

    // Fallback default theme if not configured
    if (!themeColors) {
      themeColors = {
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
    }

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;

    const payload = {
      sub: user.id,
      sessionVersion: user.sessionVersion,
      username: user.username,
      role: user.role,
      name,
      plantId,
      plantName,
      organizationId,
      organizationName,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name,
        plantId,
        plantName,
        organizationId,
        organizationName,
        theme: {
          themeName,
          colors: themeColors,
        },
      },
    };
  }

  // =========================================================================
  // SECTION 2: MULTI-TENANT HIERARCHY & PLANT DISCOVERY
  // Provides active enterprise hierarchy of organizations and plants with
  // respective branding color schemes for client login selectors.
  // =========================================================================

  /**
   * @function getTenants
   * @description Fetches the full organizational hierarchy of active organizations and plants.
   * Enriches each plant with its configured CSS theme settings to allow immediate brand
   * synchronization on the client login screen.
   * 
   * @returns {Promise<Array<object>>} List of active organizations with nested child plants and themes
   */
  async getTenants() {
    const orgs = await this.organizationRepository.find({ where: { isActive: true, archivedAt: IsNull() }, order: { name: 'ASC' } });
    const plants = await this.plantRepository.find({ where: { status: 'ACTIVE', archivedAt: IsNull() }, order: { name: 'ASC' } });
    const themes = await this.themeRepository.find();

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

  // =========================================================================
  // SECTION 3: USER PROVISIONING & IDENTITY MANAGEMENT
  // Administrative user queries, secure password encryption, and profile updates.
  // =========================================================================

  /**
   * @function getUsers
   * @description Retrieves all system user records for administrative management and diagnostics.
   * 
   * @returns {Promise<User[]>} Complete list of registered users
   */
  safeUser(user: User) { const { passwordHash, ...safe } = user; return safe; }

  async resolveScope(user: User, requestedPlantId?: string, requestedOrgId?: string) {
    const global = user.role === 'SUPER_ADMIN';
    const plantId = global ? requestedPlantId || null : user.plantId;
    if (!global && (!plantId || !user.organizationId || (requestedPlantId && requestedPlantId !== plantId) || (requestedOrgId && requestedOrgId !== user.organizationId))) throw new ForbiddenException('User is not assigned to the requested plant');
    if (!plantId) {
      if (requestedOrgId) throw new ForbiddenException('Select a plant for this organization');
      return { plantId: null, organizationId: null };
    }
    const plant = await this.plantRepository.findOneBy({ id: plantId });
    if (!plant || plant.archivedAt || plant.status !== 'ACTIVE' || !plant.organizationId) throw new ForbiddenException('Plant unavailable');
    const org = await this.organizationRepository.findOneBy({ id: plant.organizationId });
    if (!org?.isActive || org.archivedAt || (requestedOrgId && requestedOrgId !== org.id) || (!global && user.organizationId !== org.id)) throw new ForbiddenException('Invalid organization assignment');
    return { plantId: plant.id, organizationId: org.id };
  }

  async authenticateToken(token: string): Promise<AccessContext> {
    let payload: any;
    try { payload = await this.jwtService.verifyAsync(token); } catch { throw new UnauthorizedException('Session expired or invalid'); }
    if (typeof payload.sub !== 'string' || !Number.isInteger(payload.sessionVersion)) throw new UnauthorizedException('Please sign in again');
    const user = await this.userRepository.findOneBy({ id: payload.sub });
    if (!user?.isActive || user.sessionVersion !== payload.sessionVersion || user.role !== payload.role) throw new UnauthorizedException('Session revoked');
    const scope = await this.resolveScope(user, payload.plantId, payload.organizationId);
    return { ...scope, sub: user.id, username: user.username, role: user.role, sessionVersion: user.sessionVersion, exp: payload.exp };
  }

  async getUsers() {
    const actor = currentAccess();
    const users = await this.userRepository.find({ where: actor.role === 'SUPER_ADMIN' ? {} : { plantId: currentPlant() }, order: { username: 'ASC' } });
    return users.map(u => this.safeUser(u));
  }
  async getDirectory() {
    const users = await this.userRepository.find({ where: { plantId: currentPlant(), isActive: true } });
    return users.map(({ id, username, firstName, lastName, role }) => ({ id, username, firstName, lastName, role }));
  }
  private assertAdmin() {
    const actor = currentAccess();
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new ForbiddenException('Administrator required');
    return actor;
  }
  private async assignment(role: User['role'], plantId?: string, organizationId?: string) {
    if (!USER_ROLES.includes(role)) throw new BadRequestException('Unknown role');
    if (role === 'SUPER_ADMIN') return { plantId: null, organizationId: null };
    if (!plantId) throw new BadRequestException('Plant assignment required');
    const plant = await this.plantRepository.findOneBy({ id: plantId });
    if (!plant || plant.archivedAt || plant.status !== 'ACTIVE' || !plant.organizationId) throw new BadRequestException('Select an active plant');
    if (organizationId && organizationId !== plant.organizationId) throw new BadRequestException('Plant does not belong to organization');
    const org = await this.organizationRepository.findOneBy({ id: plant.organizationId });
    if (!org?.isActive || org.archivedAt) throw new BadRequestException('Organization inactive');
    return { plantId, organizationId: plant.organizationId };
  }
  async createUser(dto: any) {
    const actor = this.assertAdmin(); const role = dto.role || 'OPERATOR';
    if (actor.role !== 'SUPER_ADMIN' && (role === 'SUPER_ADMIN' || (dto.plantId && dto.plantId !== actor.plantId) || (dto.organizationId && dto.organizationId !== actor.organizationId))) throw new ForbiddenException('Cannot grant access outside your plant');
    const scope = await this.assignment(role, dto.plantId || actor.plantId, dto.organizationId || (actor.role === 'SUPER_ADMIN' ? undefined : actor.organizationId));
    const username = dto.username.trim().toLowerCase();
    if (await this.userRepository.findOneBy({ username })) throw new ConflictException('Username already exists');
    const user = this.userRepository.create({ username, email: dto.email, passwordHash: await bcrypt.hash(dto.password, 12), role, ...scope, firstName: dto.firstName || '', lastName: dto.lastName || '', isActive: dto.isActive ?? true, sessionVersion: 0 });
    try { return this.safeUser(await this.userRepository.save(user)); }
    catch (e) { if (e.code === '23514') throw new BadRequestException('Assignment is unavailable or archived'); if (e.code === '23505') throw new ConflictException('Username or email already exists'); throw e; }
  }
  async updateUser(id: string, dto: any) {
    const actor = this.assertAdmin();
    return this.userRepository.manager.transaction(async manager => {
    await manager.query('SELECT pg_advisory_xact_lock(180026,1)');
    const repository = manager.getRepository(User);
    const user = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!user || (actor.role !== 'SUPER_ADMIN' && (user.role === 'SUPER_ADMIN' || user.plantId !== actor.plantId))) throw new NotFoundException('User not found');
    const role = dto.role ?? user.role;
    if (actor.role !== 'SUPER_ADMIN' && (role === 'SUPER_ADMIN' || (dto.plantId !== undefined && dto.plantId !== actor.plantId) || (dto.organizationId !== undefined && dto.organizationId !== actor.organizationId))) throw new ForbiddenException('Only super administrators may transfer users or grant global access');
    if (id === actor.sub && (role !== user.role || dto.isActive === false || (dto.plantId !== undefined && dto.plantId !== user.plantId))) throw new BadRequestException('Cannot revoke or transfer your own administrator access');
    const scope = await this.assignment(role, dto.plantId ?? user.plantId, dto.organizationId ?? (dto.plantId ? undefined : user.organizationId));
    Object.assign(user, scope, { role });
    for (const key of ['email', 'firstName', 'lastName', 'isActive']) if (dto[key] !== undefined) user[key] = dto[key];
    if (dto.password !== undefined) user.passwordHash = await bcrypt.hash(dto.password, 12);
    user.sessionVersion += 1;
    try { return this.safeUser(await repository.save(user)); }
    catch (e) { if (e.code === '23514') throw new BadRequestException('Assignment is unavailable or archived'); if (e.code === '23505') throw new ConflictException('Email already exists'); throw e; }
    });
  }
}
