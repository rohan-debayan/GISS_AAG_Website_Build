import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  news: 'News',
  award: 'Award',
  meeting: 'Meeting',
  event: 'Event',
  'call-for-papers': 'Call for Papers',
  newsletter: 'Newsletter',
  'board-nomination': 'Board Nomination',
  jobs: 'Jobs',
  'website-update': 'Website Update',
}

function formatDate(d?: string | null): string {
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

function lexicalPeek(lex: any, maxLen = 180): string {
  if (!lex?.root) return ''
  const parts: string[] = []
  function walk(n: any) {
    if (n?.type === 'text') parts.push(n.text || '')
    for (const c of n?.children || []) walk(c)
    if (n?.type === 'paragraph' || n?.type === 'heading') parts.push(' ')
  }
  walk(lex.root)
  const text = parts.join('').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '\u2026'
}

export default async function BlogIndex() {
  const payload = await getPayload({ config: await config })
  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 200,
    depth: 1,
  })

  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">Archive</span>
          <h1 style={{ maxWidth: '28ch' }}>News &amp; announcements.</h1>
          <p className="lede">
            A decade of GISS-SG activity: meetings, award announcements, calls for
            papers, newsletters, and community updates.
          </p>
        </div>
      </div>
      <section>
        <div className="container">
          <div className="card-grid">
            {posts.map((p: any) => {
              const peek = p.excerpt || lexicalPeek(p.content)
              return (
                <article className="card" key={p.id}>
                  <span className="category">
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </span>
                  <hr className="rule" />
                  <h3>
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <div className="meta">{formatDate(p.publishedAt)}</div>
                  {peek ? <p className="excerpt">{peek}</p> : null}
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
