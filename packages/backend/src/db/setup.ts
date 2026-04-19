/**
 * Database setup script: runs migrations and optionally seeds data.
 * Usage: node dist/db/setup.js [--seed]
 */
import { runMigrations } from './migrate.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function seedDatabase(): Promise<void> {
  const connStr = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/wsb';
  const client = new pg.Client({ connectionString: connStr });
  await client.connect();

  try {
    // Check if seed data already exists
    const check = await client.query('SELECT COUNT(*)::int AS count FROM travelers');
    if (check.rows[0].count > 0) {
      console.log('Database already has data, skipping seed.');
      return;
    }

    const seedSql = await readFile(join(__dirname, 'seed.sql'), 'utf-8');
    await client.query(seedSql);
    console.log('✓ Seed data inserted.');
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('=== Running migrations ===');
  await runMigrations();

  if (process.argv.includes('--seed')) {
    console.log('\n=== Seeding database ===');
    await seedDatabase();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
