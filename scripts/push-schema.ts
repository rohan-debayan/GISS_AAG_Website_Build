import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  console.log('Initializing Payload against DATABASE_URL...')
  const payload = await getPayload({ config: await config })
  console.log('Payload initialized; schema should be pushed.')

  const { totalDocs } = await payload.find({ collection: 'users', limit: 0 })
  console.log(`Users table exists, currently holds ${totalDocs} row(s).`)
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
