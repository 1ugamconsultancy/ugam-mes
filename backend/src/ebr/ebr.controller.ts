/**
 * @file ebr.controller.ts
 * @module Backend/EBR
 * @description REST API Controller exposing Electronic Batch Record (eBR) operations.
 * Handles batch dossier aggregation, QA review phase transition, 21 CFR Part 11 compliant digital
 * signature approvals, and dynamic streaming of regulatory cGMP batch record PDF files.
 * 
 * @compliance FDA 21 CFR Part 11 (Electronic Records; Electronic Signatures)
 * @compliance GAMP 5 Category 4 / Category 5 Validated Manufacturing Software
 * @compliance cGMP 21 CFR Part 211.188 & Part 211.192
 */

import { Controller, Get, Post, Body, Param, Res, UseGuards, Req, Query } from '@nestjs/common';
import { EbrService } from './ebr.service';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * @class EbrController
 * @description Controller responsible for exposing eBR endpoints to the front-end application.
 * Enforces role-based access control (RBAC) and JWT authentication across all batch review
 * and release operations.
 */
@Controller('ebr')
@UseGuards(AuthGuard)
export class EbrController {
  constructor(private readonly ebrService: EbrService) {}

  // =========================================================================
  // SECTION 1: EBR DOSSIER RETRIEVAL & CREATION
  // =========================================================================

  /**
   * @function getEbr
   * @description Retrieves or dynamically compiles the Electronic Batch Record for the specified Work Order.
   * 
   * @param {string} workOrderId - Unique Work Order identifier UUID
   * @returns {Promise<ElectronicBatchRecord>} Aggregated electronic batch record dossier
   */
  @Get(':workOrderId')
  async getEbr(@Param('workOrderId') workOrderId: string) {
    return this.ebrService.getOrCreateEbr(workOrderId);
  }

  // =========================================================================
  // SECTION 2: BATCH RECORD LIFE CYCLE ADVANCEMENT
  // =========================================================================

  /**
   * @function submitForReview
   * @description Transitions the EBR lifecycle state to 'QA_REVIEW'.
   * Restricted to Production Managers, Supervisors, and System Administrators.
   * 
   * @param {string} workOrderId - Unique Work Order identifier UUID
   * @returns {Promise<ElectronicBatchRecord>} Updated EBR in QA_REVIEW status
   * @compliance GAMP 5 Phase Transition Gateways
   */
  @Roles('PRODUCTION_MANAGER', 'SUPERVISOR', 'ADMIN')
  @Post(':workOrderId/submit')
  async submitForReview(@Param('workOrderId') workOrderId: string, @Body() dto: any) {
    return this.ebrService.submitForReview(workOrderId,dto);
  }

  // =========================================================================
  // SECTION 3: 21 CFR PART 11 QA AUTHORIZATION & BATCH RELEASE
  // =========================================================================

  /**
   * @function approveEbr
   * @description Captures the formal 21 CFR Part 11 compliant electronic signature of the Quality Engineer
   * or Administrator, marks the batch record as 'QA_APPROVED', and closes the associated Work Order.
   * 
   * @param {string} workOrderId - Unique Work Order identifier UUID
   * @param {string} meaning - Declared 21 CFR Part 11 signature meaning / reason for signing
   * @param {any} req - Express request object containing authenticated JWT user details
   * @returns {Promise<ElectronicBatchRecord>} Finalized and QA-released batch record entity
   * @compliance 21 CFR Part 11 (§11.50 Signature manifestations, §11.200 Components and controls)
   * @compliance cGMP 21 CFR 211.192 (Batch release authorization)
   */
  @Roles('SUPERVISOR', 'ADMIN')
  @Post(':workOrderId/approve')
  async approveEbr(
    @Param('workOrderId') workOrderId: string,
    @Body() dto: any,
    @Req() req: any
  ) {
    const username = req.user?.username;
    const name = req.user?.name || username;
    return this.ebrService.approveEbr(workOrderId, dto);
  }

  // =========================================================================
  // SECTION 4: cGMP VECTOR PDF BATCH DOSSIER STREAMING
  // =========================================================================

  /**
   * @function downloadPdf
   * @description Compiles and streams a high-resolution, vector-rendered cGMP PDF batch dossier
   * containing all formulation materials, routing steps, CPP sensor telemetry, IPQC checks,
   * deviations, and electronic signature audit records.
   * 
   * @param {string} workOrderId - Target Work Order UUID
   * @param {Response} res - Express response object for binary PDF stream piping
   * @returns {Promise<void>}
   * @compliance 21 CFR Part 11 (§11.10(b) Protection of records, §11.10(c) Retrieval of records)
   */
  @Get(':workOrderId/pdf')
  async downloadPdf(
    @Param('workOrderId') workOrderId: string,
    @Res() res: Response,
    @Query('final') final?: string
  ) {
    const ebr = await this.ebrService.getOrCreateEbr(workOrderId);
    const woNumber = ebr.workOrder?.woNumber || workOrderId.substring(0, 8);
    const buffer = await this.ebrService.generateEbrPdf(workOrderId,final==='true');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=EBR-${woNumber}.pdf`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}

