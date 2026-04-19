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
    
    // Split seed SQL into individual statements and execute each one
    // This gives better error reporting than running the whole file at once
    const statements = seedSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    await client.query('BEGIN');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt.endsWith(';') ? stmt : stmt + ';');
      } catch (err) {
        const preview = stmt.substring(0, 120).replace(/\n/g, ' ');
        console.error(`Seed statement ${i + 1} failed: ${preview}...`);
        console.error(`Error: ${(err as Error).message}`);
        throw err;
      }
    }
    
    await client.query('COMMIT');
    console.log(`✓ Seed data inserted (${statements.length} statements).`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed (non-fatal, app will start without demo data):', (err as Error).message);
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
