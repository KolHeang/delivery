const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_NAME || 'postgres',
  });

  await client.connect();
  try {
    const res = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'staff'
      );
    `);
    
    if (res.rows[0].exists) {
      console.log('Renaming table "staff" to "users"...');
      await client.query('ALTER TABLE staff RENAME TO users;');
      console.log('✅ Table "staff" successfully renamed to "users".');
    } else {
      console.log('Table "staff" does not exist (already renamed or not found).');
    }
  } catch (err) {
    console.error('Error renaming table:', err);
  } finally {
    await client.end();
  }
}

main();
