import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

// Slugs that should be rendered with the heavier, more formal "legal" template
// (table-of-contents-style section dividers, drop caps, structured headings).
const LEGAL_SLUGS = new Set(['constitution'])

function formatApproval(d?: string): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default async function PageView({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
  })
  const page: any = docs[0]
  if (!page) notFound()

  const isLegal = LEGAL_SLUGS.has(slug)

  return (
    <article className={isLegal ? 'article legal' : 'article'}>
      <Link href="/" className="back-link">
        ← Home
      </Link>
      {isLegal ? (
        <span className="eyebrow article-eyebrow">Governing document</span>
      ) : page.subtitle ? (
        <span className="eyebrow article-eyebrow">{page.subtitle}</span>
      ) : null}
      <h1>{page.title}</h1>
      {isLegal ? (
        <div className="legal-meta">
          Adopted and ratified by the GISS-SG Board of Directors
        </div>
      ) : null}
      <RichText data={page.content} />
    </article>
  )
}
