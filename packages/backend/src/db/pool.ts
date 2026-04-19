import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  min: 20,
  max: 100,
});

export { pool };
