import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private isConnected = false;

  onModuleInit() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME || 'mes_admin',
      password: process.env.DB_PASSWORD || 'SecretMESPassword123',
      database: process.env.DB_DATABASE || 'ugam_mes',
      max: 10, // maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    this.pool.query('SELECT NOW()')
      .then(async () => {
        this.isConnected = true;
        console.log('Successfully connected to PostgreSQL Database Server');
        await this.autoBootstrapIfEmpty();
      })
      .catch((err) => {
        this.isConnected = false;
        console.warn('PostgreSQL database connection failed. Falling back to local mock storage. Error:', err.message);
      });
  }

  private async autoBootstrapIfEmpty() {
    try {
      const check = await this.pool.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
      );
      if (check.rowCount === 0) {
        console.log('⚠️ Database is empty. Running auto-bootstrap from setup_ugam_mes_db.sql...');
        const path = require('path');
        const fs = require('fs');
        const candidatePaths = [
          path.join(process.cwd(), 'setup_ugam_mes_db.sql'),
          path.join(__dirname, '..', '..', 'setup_ugam_mes_db.sql'),
          path.join(__dirname, '..', '..', '..', 'setup_ugam_mes_db.sql'),
          '/app/setup_ugam_mes_db.sql'
        ];
        let sqlContent = '';
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            sqlContent = fs.readFileSync(p, 'utf8');
            console.log(`Found bootstrap script at: ${p}`);
            break;
          }
        }
        if (sqlContent) {
          await this.pool.query(sqlContent);
          console.log('✅ Auto-bootstrap completed successfully! All tables, stations and seed users initialized.');
        } else {
          console.warn('Could not locate setup_ugam_mes_db.sql for auto-bootstrap.');
        }
      } else {
        console.log('PostgreSQL database schema verified (users table exists).');
      }
    } catch (err: any) {
      console.error('Error during auto-bootstrap check:', err?.message || err);
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('Database connection is currently offline');
    }
    return this.pool.query<T>(text, params);
  }

  isDatabaseOnline(): boolean {
    return this.isConnected;
  }
}
