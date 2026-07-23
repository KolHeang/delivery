const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123',
  database: 'delivery',
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, column_default, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'merchants' AND column_name = 'deliveryFee';
  `);
  console.log('COLUMN DEF:');
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
