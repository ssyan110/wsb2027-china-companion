import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Returns the set of already-applied migration filenames.
 */
async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  const result = await client.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY id'
  );
  return new Set(result.rows.map((r) => r.filename));
}

/**
 * Reads all .sql files from the migrations directory, sorted by name.
 */
async function getMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((f) => f.endsWith('.sql')).sort();
}

/**
 * Runs all pending migrations inside individual transactions.
 */
export async function runMigrations(connectionString?: string): Promise<string[]> {
  const connStr =
    connectionString ?? process.env.DATABASE_URL ?? 'postgresql://localhost:5432/wsb';

  const client = new pg.Client({ connectionString: connStr });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = await getMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    const executed: string[] = [];

    for (const file of pending) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        executed.push(file);
        console.log(`✓ Applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed migration: ${file}`);
        throw err;
      }
    }

    if (executed.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Applied ${executed.length} migration(s).`);
    }

    return executed;
  } finally {
    await client.end();
  }
}

// Run directly when executed as a script
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isMain) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
