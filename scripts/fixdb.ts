import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const variants = await client.query('SELECT * FROM "VariantProfile"');
  const cards = await client.query('SELECT id, attributes FROM "TradingCard" WHERE "isVariant" = true');
  for (const c of cards.rows) {
    let attr = typeof c.attributes === 'string' ? JSON.parse(c.attributes) : (c.attributes || {});
    if (attr.variantBadgeUrl && !attr.variantName) {
      const v = variants.rows.find(x => x.iconUrl === attr.variantBadgeUrl);
      if (v) {
        attr.variantName = v.name;
        await client.query('UPDATE "TradingCard" SET attributes = $1 WHERE id = $2', [JSON.stringify(attr), c.id]);
        console.log('Updated', c.id, 'to', v.name);
      }
    }
  }
  await client.end();
}
main().catch(console.error);
