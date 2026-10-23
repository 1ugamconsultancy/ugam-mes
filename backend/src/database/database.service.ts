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
      .then(() => {
        this.isConnected = true;
        console.log('Successfully connected to PostgreSQL Database Server');
      })
      .catch((err) => {
        this.isConnected = false;
        console.warn('PostgreSQL database connection failed. Falling back to local mock storage. Error:', err.message);
      });
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
