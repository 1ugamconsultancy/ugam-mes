/**
 * ============================================================================
 * FILE: backend/src/compliance/compliance.controller.ts
 * ============================================================================
 * Manufacturing Execution System (MES) - Regulatory Compliance & Quality API
 *
 * Exposes REST endpoints for 21 CFR Part 11 digital signatures, immutable audit logs,
 * deviation management (NCR), CAPA life cycle tracking, change controls (ECO), and
 * controlled document distribution.
 *
 * Compliance Standards:
 *  - 21 CFR Part 11 (§11.10, §11.50, §11.200)
 *  - GAMP 5 Category 4 / Category 5
 *  - IATF 16949:2016 Clauses 8.5.2, 8.5.6, 10.2
 *  - ISO 9001:2015 Clause 8.5.6
 * ============================================================================
 */

import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req, Ip } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Controller providing REST API endpoints for regulatory quality and compliance controls.
 *
 * @class ComplianceController
 */
@Controller('compliance')
@UseGuards(AuthGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // =========================================================================
  // SECTION 1: ELECTRONIC SIGNATURE VALIDATION (21 CFR PART 11)
  // =========================================================================
  /**
   * Executes dual-factor re-authentication and commits a 21 CFR Part 11 electronic signature.
   *
   * @async
   * @function sign
   * @param {string} username - Signatory account username.
   * @param {string} pass - Account password challenge.
   * @param {string} meaning - Explicit regulatory manifestation of signature intent.
   * @param {any} req - Express request object.
   * @param {string} ipAddress - Client IP address.
   * @returns {Promise<ElectronicSignature>}
   */
  @Post('sign')
  async sign(
    @Body('username') username: string,
    @Body('password') pass: string,
    @Body('meaning') meaning: string,
    @Req() req: any,
    @Ip() ipAddress: string,
  ) {
    const signatoryIdentifier = username || req.user?.username || req.user?.sub;
    return this.complianceService.sign(signatoryIdentifier, pass, meaning, ipAddress);
  }

  // =========================================================================
  // SECTION 2: IMMUTABLE AUDIT TRAIL LOGGING
  // =========================================================================
  /**
   * Retrieves chronological audit trail events for quality inspection and regulatory oversight.
   *
   * @async
   * @function getAuditLogs
   * @returns {Promise<any[]>}
   */
  @Get('audit-logs')
  async getAuditLogs() {
    return this.complianceService.getAuditLogs();
  }

  // =========================================================================
  // SECTION 3: QUALITY DEVIATIONS & NON-CONFORMANCE REPORTS (NCR)
  // =========================================================================
  /**
   * Fetches all registered shopfloor non-conformances and deviations.
   *
   * @async
   * @function getDeviations
   * @returns {Promise<any[]>}
   */
  @Get('deviations')
  async getDeviations() {
    return this.complianceService.getDeviations();
  }

  /**
   * Logs a new non-conformance report / deviation observed during manufacturing.
   *
   * @async
   * @function reportDeviation
   * @param {any} dto - Deviation parameters (title, description, severity, category, workOrderId).
   * @param {any} req - Express request with authenticated JWT user context.
   * @returns {Promise<Deviation>}
   */
  @Roles('OPERATOR', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('deviations')
  async reportDeviation(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.complianceService.reportDeviation(userId, dto);
  }

  /**
   * Closes a deviation with formal root-cause findings and corrective investigation notes.
   *
   * @async
   * @function resolveDeviation
   * @param {string} id - Deviation record UUID.
   * @param {string} investigationDetails - Root cause investigation text.
   * @param {string} rootCause - Primary failure mechanism.
   * @param {any} req - Express request context.
   * @returns {Promise<Deviation>}
   */
  @Roles('SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Patch('deviations/:id/resolve')
  async resolveDeviation(
    @Param('id') id: string,
    @Body('investigationDetails') investigationDetails: string,
    @Body('rootCause') rootCause: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    return this.complianceService.resolveDeviation(userId, id, { investigationDetails, rootCause });
  }

  // =========================================================================
  // SECTION 4: CORRECTIVE AND PREVENTIVE ACTIONS (CAPA)
  // =========================================================================
  /**
   * Retrieves all corrective and preventive actions.
   *
   * @async
   * @function getCapas
   * @returns {Promise<any[]>}
   */
  @Get('capas')
  async getCapas() {
    return this.complianceService.getCapas();
  }

  /**
   * Initiates a new CAPA action tied to a quality issue.
   *
   * @async
   * @function createCapa
   * @param {any} dto - CAPA details (title, actionType, assignedTo, dueDate).
   * @param {any} req - Express request context.
   * @returns {Promise<Capa>}
   */
  @Roles('SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('capas')
  async createCapa(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.complianceService.createCapa(userId, dto);
  }

  /**
   * Completes and signs off on a CAPA verification of effectiveness.
   *
   * @async
   * @function completeCapa
   * @param {string} id - CAPA record UUID.
   * @param {string} verificationDetails - Verification summary.
   * @param {any} req - Express request context.
   * @returns {Promise<Capa>}
   */
  @Roles('SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Patch('capas/:id/complete')
  async completeCapa(
    @Param('id') id: string,
    @Body('verificationDetails') verificationDetails: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    return this.complianceService.completeCapa(userId, id, verificationDetails);
  }

  // =========================================================================
  // SECTION 5: ENGINEERING CHANGE CONTROL (ECO / CC)
  // =========================================================================
  /**
   * Retrieves all Engineering Change Orders.
   *
   * @async
   * @function getChangeControls
   * @returns {Promise<any[]>}
   */
  @Get('change-controls')
  async getChangeControls() {
    return this.complianceService.getChangeControls();
  }

  /**
   * Initiates a formal Engineering Change Order under review.
   *
   * @async
   * @function initiateChangeControl
   * @param {any} dto - ECO details (title, description, reasonForChange).
   * @param {any} req - Express request context.
   * @returns {Promise<ChangeControl>}
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('change-controls')
  async initiateChangeControl(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.complianceService.initiateChangeControl(userId, dto);
  }

  /**
   * Approves or rejects a proposed Engineering Change Order.
   *
   * @async
   * @function approveChangeControl
   * @param {string} id - Change control UUID.
   * @param {'APPROVED' | 'REJECTED'} approvalStatus - Disposition decision.
   * @param {string} impactAssessment - Risk and impact review text.
   * @param {any} req - Express request context.
   * @returns {Promise<ChangeControl>}
   */
  @Roles('QUALITY_ENGINEER', 'ADMIN')
  @Patch('change-controls/:id/approve')
  async approveChangeControl(
    @Param('id') id: string,
    @Body('status') approvalStatus: 'APPROVED' | 'REJECTED',
    @Body('impactAssessment') impactAssessment: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    return this.complianceService.approveChangeControl(userId, id, approvalStatus, impactAssessment);
  }

  // =========================================================================
  // SECTION 6: CONTROLLED DOCUMENT MANAGEMENT (SOP & WI)
  // =========================================================================
  /**
   * Retrieves active controlled documents and SOPs.
   *
   * @async
   * @function getDocuments
   * @returns {Promise<any[]>}
   */
  @Get('documents')
  async getDocuments() {
    return this.complianceService.getDocuments();
  }

  /**
   * Publishes a new controlled Standard Operating Procedure document.
   *
   * @async
   * @function uploadDocument
   * @param {any} dto - Document details (documentNumber, title, version, documentType, filePath).
   * @param {any} req - Express request context.
   * @returns {Promise<DocumentManagement>}
   */
  @Roles('SUPERVISOR', 'QUALITY_ENGINEER', 'ADMIN')
  @Post('documents')
  async uploadDocument(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.sub;
    return this.complianceService.uploadDocument(userId, dto);
  }
}
