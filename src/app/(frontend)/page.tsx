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

// --- Lexical tree helpers for the Mission band ---
type LxNode = { type?: string; text?: string; children?: LxNode[] }

function gatherText(n: LxNode | undefined | null): string {
  if (!n) return ''
  if (n.type === 'text') return n.text ?? ''
  return (n.children ?? []).map(gatherText).join('')
}

function extractMission(lex: any): { intro: string; items: string[] } | null {
  const root = lex?.root
  if (!root?.children) return null
  const kids: LxNode[] = root.children
  // Find first paragraph (intro) and first list (bullets).
  const intro = kids.find((c) => c.type === 'paragraph')
  const list = kids.find((c) => c.type === 'list')
  if (!intro && !list) return null
  const items = (list?.children ?? []).map(gatherText).map((s) => s.trim()).filter(Boolean)
  return { intro: gatherText(intro).trim(), items }
}

export default async function HomePage() {
  const payload = await getPayload({ config: await config })

  const [
    { docs: posts },
    { totalDocs: postTotal },
    { totalDocs: authorTotal },
    { docs: oldestPostDocs },
    { docs: missionDocs },
  ] = await Promise.all([
    payload.find({
      collection: 'posts',
      where: { _status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 6,
      depth: 1,
    }),
    payload.find({
      collection: 'posts',
      where: { _status: { equals: 'published' } },
      limit: 0,
    }),
    payload.find({ collection: 'users', limit: 0 }),
    payload.find({
      collection: 'posts',
      where: { _status: { equals: 'published' } },
      sort: 'publishedAt',
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: 'pages',
      where: { slug: { equals: 'mission' } },
      limit: 1,
      depth: 0,
    }),
  ])

  const oldest = oldestPostDocs[0] as any
  const earliestYear = oldest?.publishedAt
    ? new Date(oldest.publishedAt).getFullYear()
    : new Date().getFullYear()
  const years = Math.max(1, new Date().getFullYear() - earliestYear + 1)

  const mission = missionDocs[0] ? extractMission((missionDocs[0] as any).content) : null

  return (
    <>
      <div className="hero hero-topo">
        <div className="container">
          <span className="eyebrow">AAG Specialty Group · Est. 1985</span>
          <h1>
            Advancing <em>Geographic</em> Information Science.
          </h1>
          <p className="lede">
            A community of researchers, educators, and practitioners shaping how the world
            sees, maps, and makes sense of place.
          </p>
          <div className="hero-meta">
            <div>
              <div className="num">{postTotal}</div>
              <div className="cap">Articles</div>
            </div>
            <div>
              <div className="num">{authorTotal}</div>
              <div className="cap">Contributors</div>
            </div>
            <div>
              <div className="num">{years}</div>
              <div className="cap">
                Years of record
                <br />
                <span style={{ fontSize: '0.7em', opacity: 0.8 }}>
                  since {earliestYear}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mission ? (
        <div className="mission-band">
          <div className="container">
            <div className="mission-grid">
              <div className="mission-label">
                <span className="eyebrow">Our mission</span>
                <h2>
                  What the group stands <em>for</em>.
                </h2>
              </div>
              <div className="mission-content">
                {mission.intro ? <p className="lead">{mission.intro}</p> : null}
                {mission.items.length > 0 ? (
                  <ol>
                    {mission.items.map((it, i) => (
                      <li key={i}>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <section>
        <div className="container">
          <h2>Latest news</h2>
          {posts.length === 0 ? (
            <p>No posts yet.</p>
          ) : (
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
          )}
          <Link href="/blog" className="more-link">
            Read all news →
          </Link>
        </div>
      </section>
    </>
  )
}
