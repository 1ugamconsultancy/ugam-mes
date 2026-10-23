import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { Public } from './auth/public.decorator';
import * as path from 'path';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get()
  async getRoot() {
    let dbStatus = 'disconnected';
    let usersCount = 0;
    try {
      if (this.db.isDatabaseOnline()) {
        await this.db.query("SET search_path = public, pg_catalog;");
        const res = await this.db.query("SELECT COUNT(*) as count FROM public.users");
        usersCount = parseInt(res.rows[0]?.count || '0', 10);
        dbStatus = 'connected';
      }
    } catch {
      dbStatus = 'tables_missing_or_error';
    }

    return {
      status: 'online',
      name: 'UGAM Next Gen MES Backend API',
      version: '1.0.0',
      database: dbStatus,
      usersInDb: usersCount,
      environment: process.env.NODE_ENV || 'production',
      endpoints: {
        login: 'POST /auth/login',
        dbSetup: 'GET /db-setup',
        health: 'GET /health',
      },
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      databaseOnline: this.db.isDatabaseOnline(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('db-setup')
  async runDbSetup() {
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'setup_ugam_mes_db.sql'),
        path.join(__dirname, '..', 'setup_ugam_mes_db.sql'),
        path.join(__dirname, '..', '..', 'setup_ugam_mes_db.sql'),
        '/app/setup_ugam_mes_db.sql',
      ];

      let sqlContent = '';
      let foundPath = '';
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          sqlContent = fs.readFileSync(p, 'utf8');
          foundPath = p;
          break;
        }
      }

      if (!sqlContent) {
        return {
          success: false,
          error: 'setup_ugam_mes_db.sql file not found on server.',
        };
      }

      // Filter out any psql slash lines and force search_path to public
      const cleanSql = sqlContent
        .split('\n')
        .filter(line => !line.trim().startsWith('\\'))
        .join('\n');

      await this.db.query("SET search_path = public, pg_catalog;");
      await this.db.query(cleanSql);
      await this.db.query("SET search_path = public, pg_catalog;");
      const res = await this.db.query('SELECT username, role FROM public.users ORDER BY role');

      return {
        success: true,
        message: 'Database schema, tables, and seed users initialized successfully!',
        sourceFile: foundPath,
        usersCount: res.rows.length,
        usersInitialized: res.rows,
        defaultPassword: 'All accounts can log in with password: MES123',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        hint: 'Check database connection parameters or SSL configuration.',
      };
    }
  }
}
