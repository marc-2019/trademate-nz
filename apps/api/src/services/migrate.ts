/**
 * Database Migration Service
 * Runs init.sql and numbered migrations on startup.
 * Uses a _migrations tracking table to avoid re-running.
 */

import { Pool } from 'pg';
import { config } from '../config/index.js';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database');

/**
 * Run all pending migrations against the database.
 * Safe to call on every startup - only runs migrations that haven't been applied.
 */
export async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 2,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('[migrate] Starting database migration check...');

    // Create migrations tracking table if it doesn't exist
    await pool.query(
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    );

    // Get list of already-applied migrations
    const { rows: applied } = await pool.query(
      'SELECT name FROM _migrations ORDER BY name'
    );
    const appliedSet = new Set(applied.map((r: { name: string }) => r.name));

    // Build ordered list of migration files
    const migrationFiles: { name: string; sql: string }[] = [];

    // 1. init.sql (always first)
    const initPath = path.join(MIGRATIONS_DIR, 'init.sql');
    if (fs.existsSync(initPath)) {
      migrationFiles.push({
        name: '000_init',
        sql: fs.readFileSync(initPath, 'utf-8'),
      });
    }

    // 2. Numbered migrations from migrations/ subfolder
    const migrationsDir = path.join(MIGRATIONS_DIR, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter((f: string) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const migName = file.replace('.sql', '');
        migrationFiles.push({
          name: migName,
          sql: fs.readFileSync(path.join(migrationsDir, file), 'utf-8'),
        });
      }
    }

    // Run any unapplied migrations
    let ranCount = 0;
    for (const migration of migrationFiles) {
      if (appliedSet.has(migration.name)) {
        continue;
      }

      console.log([migrate] Applying: );
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO _migrations (name) VALUES ()',
          [migration.name]
        );
        await client.query('COMMIT');
        console.log([migrate] Applied: );
        ranCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error([migrate] FAILED: , err);
        throw err;
      } finally {
        client.release();
      }
    }

    if (ranCount === 0) {
      console.log('[migrate] All migrations already applied. Database is up to date.');
    } else {
      console.log([migrate] Successfully applied  migration(s).);
    }
  } finally {
    await pool.end();
  }
}
