import Link from 'next/link'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

const KIND_LABELS: Record<string, string> = {
  minutes: 'Minutes',
  presentation: 'Presentation',
  budget: 'Budget',
  'annual-report': 'Annual Report',
  other: 'Other',
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

function kbOrMb(bytes: number): string {
  if (!bytes) return ''
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

function prettyDate(): string {
  return ''
}

export default async function ReportsPage() {
  const payload = await getPayload({ config: await config })

  // Honour the same read access we configured on the collection. The
  // Local API bypasses access by default, so we filter explicitly.
  const { user } = await payload.auth({ headers: await nextHeaders() })

  const [{ docs: reports }, hidden] = await Promise.all([
    payload.find({
      collection: 'reports',
      where: user ? {} : { visibility: { equals: 'public' } },
      sort: ['-year', 'sortOrder'],
      limit: 200,
      depth: 1,
    }),
    // Count officers-only reports so we can surface a "sign in to see N
    // additional documents" nudge on the public view.
    user
      ? Promise.resolve({ totalDocs: 0 })
      : payload.find({
          collection: 'reports',
          where: { visibility: { equals: 'officers' } },
          limit: 0,
        }),
  ])
  const hiddenCount = hidden.totalDocs

  const { docs: businessPages } = await payload.find({
    collection: 'pages',
    where: { slug: { in: ['2014-business-meeting', '2015-business-meeting'] } },
    sort: '-slug',
    limit: 5,
    depth: 0,
  })

  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">Governance</span>
          <h1 style={{ maxWidth: '26ch' }}>
            Reports &amp; <em>minutes</em>.
          </h1>
          <p className="lede">
            Business-meeting minutes, presentations, and budget documents from the
            specialty group&apos;s annual gatherings. Looking for the latest newsletter?{' '}
            <Link href="/newsletters" style={{ color: 'var(--terracotta)' }}>
              Read it here →
            </Link>
          </p>
        </div>
      </div>

      <section>
        <div className="container" style={{ maxWidth: '900px' }}>
          <h2>Documents</h2>
          {reports.length === 0 ? (
            <p className="section-intro">
              No reports have been uploaded yet.{' '}
              {user ? (
                <>
                  Admins can add them at{' '}
                  <Link href="/admin/collections/reports">/admin → Content → Reports</Link>.
                </>
              ) : (
                <>Officers can upload new reports after logging in.</>
              )}
            </p>
          ) : (
            <>
              <p className="section-intro">
                Annual business-meeting minutes, slide decks, and budget sheets. Click any
                row to download the file.
              </p>
              <ul className="doc-list">
                {reports.map((r: any) => {
                  const file = r.file
                  const isLocked = r.visibility === 'officers'
                  const url = file && typeof file === 'object' ? file.url : null
                  return (
                    <li key={r.id}>
                      <span className="doc-type">
                        {extOf(file?.filename || '') || KIND_LABELS[r.kind]}
                      </span>
                      <span className="doc-title">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            {r.title}
                          </a>
                        ) : (
                          r.title
                        )}
                        {r.summary ? (
                          <div
                            style={{
                              color: 'var(--muted)',
                              fontSize: '0.85rem',
                              marginTop: '0.25rem',
                              fontFamily: 'var(--sans)',
                            }}
                          >
                            {r.summary}
                          </div>
                        ) : null}
                        {isLocked ? (
                          <span
                            title="Officers only"
                            style={{
                              display: 'inline-block',
                              marginLeft: '0.5rem',
                              fontSize: '0.7rem',
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              color: 'var(--terracotta)',
                              fontFamily: 'var(--sans)',
                              fontWeight: 700,
                            }}
                          >
                            · Officers only
                          </span>
                        ) : null}
                      </span>
                      <span className="doc-size">{kbOrMb(file?.filesize || 0)}</span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {!user && hiddenCount > 0 ? (
            <div
              style={{
                marginTop: '2rem',
                padding: '1.25rem 1.5rem',
                background: 'var(--paper-2)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--ink-soft)',
                fontSize: '0.95rem',
              }}
            >
              <strong style={{ color: 'var(--forest)' }}>
                {hiddenCount} additional document{hiddenCount === 1 ? '' : 's'}
              </strong>{' '}
              marked officers-only {hiddenCount === 1 ? 'is' : 'are'} not shown here.{' '}
              <Link href="/admin">Sign in as an officer →</Link>
            </div>
          ) : null}
        </div>
      </section>

      {businessPages.length > 0 ? (
        <section>
          <div className="container" style={{ maxWidth: '900px' }}>
            <h2>Annual business meetings</h2>
            <p className="section-intro">
              Archived pages from the specialty group business meetings held during the
              AAG Annual Meeting.
            </p>
            <ul className="doc-list">
              {(businessPages as any[]).map((p) => (
                <li key={p.id}>
                  <span className="doc-type">Page</span>
                  <span className="doc-title">
                    <Link href={`/pages/${p.slug}`}>{p.title}</Link>
                  </span>
                  <span />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  )
}
