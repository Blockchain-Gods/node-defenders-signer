// Thin wrapper around the Cloudflare D1 REST API. All DB access in the signer goes through this — keeps the fetch logic in one place.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

@Injectable()
export class D1Service implements OnModuleInit {
  private readonly logger = new Logger(D1Service.name);
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const accountId = this.config.get<string>('cloudflare.accountId');
    const dbId = this.config.get<string>('cloudflare.d1DatabaseId');
    const token = this.config.get<string>('cloudflare.apiToken');

    this.logger.log(`CF_ACCOUNT_ID: ${accountId}`);
    this.logger.log(`CF_D1_DATABASE_ID: ${dbId}`);
    this.logger.log(`CF_API_TOKEN: ${token ? 'set' : 'MISSING'}`);

    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`;
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<D1Result<T>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`D1 query failed: ${error}`);
      throw new Error(`D1 query failed: ${response.status}`);
    }

    const data = (await response.json()) as { result: D1Result<T>[] };
    return data.result[0];
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.query(sql, params);
  }

  // Call once on first deploy to initialise the schema
  async migrate(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL UNIQUE,
        encrypted_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS tx_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        tx_hash TEXT,
        method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS pending_soul_mints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        wallet_address TEXT NOT NULL,
        amount TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    this.logger.log('D1 migration complete');
  }
}
