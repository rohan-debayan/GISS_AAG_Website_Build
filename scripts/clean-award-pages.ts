/**
 * Trim the "Past Winners" / "Past Tobler Lecture Awardees" section out of
 * the imported Aangeenbrug and Tobler Pages so the /awards/<slug> About
 * section only shows evergreen description text. The past-recipients /
 * past-speakers list continues to come from the Winners collection.
 *
 * Run:   npx tsx scripts/clean-award-pages.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const TARGETS: Array<{
  slug: string
  // Case-insensitive substring we look for as the marker heading text.
  stopHeading: string
}> = [
  { slug: 'aangeenbrug-award', stopHeading: 'past winners' },
  { slug: 'tobler-lecture', stopHeading: 'past tobler lecture' },
]

function gatherText(n: any): string {
  if (!n) return ''
  if (n.type === 'text') return n.text || ''
  const kids = n.children || []
  return kids.map(gatherText).join('')
}

async function main() {
  const payload = await getPayload({ config: await config })

  for (const t of TARGETS) {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: t.slug } },
      limit: 1,
    })
    const page = docs[0] as any
    if (!page) {
      console.log(`skip: no page with slug=${t.slug}`)
      continue
    }

    const root = page.content?.root
    const kids: any[] = root?.children ?? []
    const cutIdx = kids.findIndex(
      (c) =>
        c.type === 'heading' &&
        gatherText(c).toLowerCase().includes(t.stopHeading),
    )
    if (cutIdx < 0) {
      console.log(`skip ${t.slug}: no heading matching "${t.stopHeading}"`)
      continue
    }

    const trimmed = kids.slice(0, cutIdx)
    const newContent = {
      ...page.content,
      root: {
        ...root,
        children: trimmed,
      },
    }

    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { content: newContent as any },
    })

    console.log(`${t.slug}: trimmed ${kids.length - cutIdx} nodes (from index ${cutIdx})`)
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
