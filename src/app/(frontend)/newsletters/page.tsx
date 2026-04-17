import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PdfCarouselLoader } from '../components/PdfCarouselLoader'

export const dynamic = 'force-dynamic'

function fmt(d?: string | null): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })
  } catch {
    return ''
  }
}

export default async function NewslettersPage() {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'newsletters',
    sort: '-issueDate',
    limit: 20,
    depth: 1,
  })

  const newsletters = docs as any[]
  const latest = newsletters[0]
  const older = newsletters.slice(1)

  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">Newsletter</span>
          <h1 style={{ maxWidth: '26ch' }}>
            The GISS-SG <em>newsletter</em>.
          </h1>
          <p className="lede">
            Community updates from the specialty group: meeting recaps, research
            highlights, people, and ways to get involved.
          </p>
        </div>
      </div>

      <section>
        <div className="container" style={{ maxWidth: '980px' }}>
          {!latest ? (
            <p className="section-intro">
              No newsletters have been published yet. Check back soon.
            </p>
          ) : (
            <>
              <h2>{latest.title}</h2>
              <p className="section-intro">
                {fmt(latest.issueDate)}
                {latest.issueNumber ? ` · Issue ${latest.issueNumber}` : ''}
                {latest.summary ? ` — ${latest.summary}` : ''}
              </p>
              {latest.pdf && typeof latest.pdf === 'object' && latest.pdf.url ? (
                <PdfCarouselLoader url={latest.pdf.url} downloadName={latest.pdf.filename} />
              ) : (
                <p style={{ color: 'var(--muted)' }}>No PDF attached.</p>
              )}
            </>
          )}
        </div>
      </section>

      {older.length > 0 ? (
        <section>
          <div className="container" style={{ maxWidth: '900px' }}>
            <h2>Past issues</h2>
            <ul className="doc-list">
              {older.map((n: any) => (
                <li key={n.id}>
                  <span className="doc-type">PDF</span>
                  <span className="doc-title">
                    {n.pdf && typeof n.pdf === 'object' && n.pdf.url ? (
                      <a href={n.pdf.url} target="_blank" rel="noopener noreferrer">
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                  </span>
                  <span className="doc-size">{fmt(n.issueDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  )
}
