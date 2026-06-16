/**
 * One-shot: initialize Payload which triggers Drizzle `push: true`
 * to create all tables on whatever DATABASE_URL is set. Used for
 * first-time bootstrap of a fresh Postgres (e.g. Railway staging).
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/push-schema.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  console.log('Initializing Payload against DATABASE_URL...')
  const payload = await getPayload({ config: await config })
  console.log('Payload initialized; schema should be pushed.')
  // Quick sanity: try to count users to verify tables exist.
  const { totalDocs } = await payload.find({ collection: 'users', limit: 0 })
  console.log(`Users table exists, currently holds ${totalDocs} row(s).`)
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
