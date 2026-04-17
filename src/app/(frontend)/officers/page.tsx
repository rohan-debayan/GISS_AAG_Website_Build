import { getPayload } from 'payload'
import config from '@/payload.config'
import { OfficerAvatar } from '../components/OfficerAvatar'
import { OfficerLinks } from '../components/OfficerLinks'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  chair: 'Chair',
  'vice-chair': 'Vice Chair',
  'immediate-past-chair': 'Immediate Past Chair',
  'past-chair': 'Past Chair',
  'academic-director': 'Academic Director',
  'communication-director': 'Communications Director',
  'commercial-director': 'Commercial Director',
  'government-director': 'Government Director',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
  'student-rep': 'Student Representative',
  'board-member': 'Board Member',
  'past-officer': 'Past Officer',
}

function year(d?: string | null): string {
  if (!d) return ''
  try {
    return new Date(d).getFullYear().toString()
  } catch {
    return ''
  }
}

function fullUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export default async function OfficersPage() {
  const payload = await getPayload({ config: await config })
  const [{ docs: current }, { docs: past }] = await Promise.all([
    payload.find({
      collection: 'officers',
      where: { isCurrent: { equals: true } },
      sort: 'sortOrder',
      limit: 50,
      depth: 1,
    }),
    payload.find({
      collection: 'officers',
      where: {
        and: [{ isCurrent: { equals: false } }, { role: { equals: 'past-chair' } }],
      },
      sort: '-termStart',
      limit: 200,
      depth: 0,
    }),
  ])

  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">People</span>
          <h1 style={{ maxWidth: '24ch' }}>
            The GISS-SG <em>board</em>.
          </h1>
          <p className="lede">
            Officers are elected by the specialty group members and serve the community
            through leadership, programming, and scholarship.
          </p>
        </div>
      </div>

      <section>
        <div className="container">
          <h2>Current officers</h2>
          <div className="officer-grid">
            {current.map((o: any) => {
              const siteHref = fullUrl(o.links?.website)
              return (
                <article className="officer-card" key={o.id}>
                  <OfficerAvatar photo={o.photo} name={o.name} size={128} />
                  <span className="category">{ROLE_LABELS[o.role] ?? o.role}</span>
                  <h3>{o.name}</h3>
                  {o.affiliation ? (
                    <p className="officer-affiliation">{o.affiliation}</p>
                  ) : null}
                  <div className="officer-contact">
                    {o.email ? (
                      <a
                        href={`mailto:${o.email}`}
                        className="officer-email"
                      >
                        {o.email}
                      </a>
                    ) : null}
                    {siteHref ? (
                      <a
                        href={siteHref}
                        className="officer-website"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Personal Website ↗
                      </a>
                    ) : null}
                  </div>
                  <OfficerLinks links={o.links} />
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {past.length > 0 ? (
        <section>
          <div className="container">
            <h2>Past chairs</h2>
            <p
              style={{
                color: 'var(--muted)',
                maxWidth: '60ch',
                marginBottom: '2.5rem',
                fontSize: '0.95rem',
              }}
            >
              The GISS Specialty Group has been led by {past.length} chairs since its
              founding in 1986. The record below preserves their service.
            </p>
            <ul className="past-chairs">
              {past.map((p: any) => (
                <li key={p.id}>
                  <span className="past-name">{p.name}</span>
                  <span className="past-years">
                    {year(p.termStart)}:{year(p.termEnd)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  )
}
