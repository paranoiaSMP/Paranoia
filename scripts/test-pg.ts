import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  const res = await client.query(`SELECT id, title, attributes, "isVariant" FROM "TradingCard" WHERE title = 'Brillantesque'`);
  console.log(JSON.stringify(res.rows, null, 2));
  
  const links = await client.query(`SELECT * FROM "CardVariantLink"`);
  console.log('Links:', links.rowCount);
  
  const profiles = await client.query(`SELECT * FROM "VariantProfile"`);
  console.log('Profiles:', JSON.stringify(profiles.rows, null, 2));
  
  await client.end();
}
main().catch(console.error);
