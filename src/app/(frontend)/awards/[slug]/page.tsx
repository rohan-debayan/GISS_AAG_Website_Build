import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

/** Per-award configuration. One entry per /awards/<slug> route. */
interface AwardConfig {
  key: 'student-honors' | 'aangeenbrug' | 'tobler-lecture'
  pageSlug: string
  title: string
  eyebrow: string
  lede: string
  topPositions: string[]
  positionLabels: Record<string, string>
  newsTitleRegex: RegExp
  secondaryPositions?: string[]
  // When true, display previous-year entries as a Past Chairs-style list
  // below the hero card(s). Used for awards with a single recipient per
  // year (Aangeenbrug, Tobler) where past years are meaningful history.
  showPastList?: boolean
  pastLabel?: string
  // If set, the /awards/<slug> page renders this hardcoded React content
  // in its About section instead of the imported Pages document.
  aboutContent?: React.ReactNode
}

const STUDENT_HONORS_ABOUT = (
  <>
    <p>
      The purpose of this competition is to promote scholarship and outstanding written
      and oral presentations by students in the field of GIScience. Any paper that
      advances an aspect of GIS, including theoretical, conceptual, and methodological
      developments, or innovative applications were welcome. Any paper that advances any
      aspect of GIS is welcome. We encourage papers on theoretical, conceptual, and
      methodological developments in GIS as well as on particular innovative GIS
      applications. Papers must be based upon original work, completed as an
      undergraduate or graduate student, relevant to the field of GIS and current GIS
      research. Papers must be mainly written by the applicant, but having co-authors is
      allowed. Students who are selected as finalists will be placed in a special session
      at the annual meeting. A single submission can only be submitted to one AAG special
      group honor paper competition.
    </p>
    <p style={{ fontStyle: 'italic' }}>
      Enhancing diversity, promoting inclusion, and broadening participation in the
      discipline of geography are goals that are central to the AAG and its mission. The
      GISS-SG strongly encourages female students and students in underrepresented groups
      in geography to participate in this competition.
    </p>
  </>
)

const AWARDS: Record<string, AwardConfig> = {
  'student-honors': {
    key: 'student-honors',
    pageSlug: 'student-honors-paper-competition',
    title: 'Student Honors Paper Competition',
    eyebrow: 'Annual student competition',
    lede:
      'An annual competition recognizing outstanding student research in GIS and GIScience. Undergraduate and graduate students present their work at the AAG Annual Meeting and compete for prizes and publication recognition.',
    topPositions: ['first', 'second', 'third'],
    positionLabels: {
      first: 'First place',
      second: 'Second place',
      third: 'Third place',
      'honorable-mention': 'Honorable mention',
      finalist: 'Finalist',
    },
    secondaryPositions: ['honorable-mention', 'finalist'],
    newsTitleRegex: /(student|honors paper|paper competition|finalists|competition result)/i,
    aboutContent: STUDENT_HONORS_ABOUT,
  },
  aangeenbrug: {
    key: 'aangeenbrug',
    pageSlug: 'aangeenbrug-award',
    title: 'Aangeenbrug Award',
    eyebrow: 'Distinguished career',
    lede:
      'Named for Dr. Robert Aangeenbrug, this award honors senior scholars for sustained and effective research contributions in geographic information science. The award is bestowed once each year by the Awards Committee on the basis of a long record of published research and outstanding service.',
    topPositions: ['recipient'],
    positionLabels: { recipient: 'Recipient' },
    newsTitleRegex: /(aangeenbrug|nyerges wins)/i,
    showPastList: true,
    pastLabel: 'Past recipients',
  },
  'tobler-lecture': {
    key: 'tobler-lecture',
    pageSlug: 'tobler-lecture',
    title: 'Waldo Tobler Distinguished Lecture',
    eyebrow: 'Invited keynote',
    lede:
      'A co-sponsored lecture with the GIScience journal Transactions in GIS honoring the legacy of Waldo Tobler. Each year a leading scholar delivers a keynote at a dedicated session during the AAG Annual Meeting.',
    topPositions: ['speaker'],
    positionLabels: { speaker: 'Distinguished speaker' },
    newsTitleRegex: /(tobler|wentz to present)/i,
    showPastList: true,
    pastLabel: 'Past distinguished speakers',
  },
}

export async function generateStaticParams() {
  return Object.keys(AWARDS).map((slug) => ({ slug }))
}

function formatDate(d?: string | null): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Extract the first `maxLen` characters of plain text from a Lexical
 * editor JSON document. Used as a fallback preview when a Post has no
 * explicit excerpt so news cards always show a little peek of content.
 */
function lexicalPeek(lex: any, maxLen = 160): string {
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
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…'
}

interface WinnerDoc {
  id: number
  name: string
  year: number
  position: string
  affiliation?: string
  paperTitle?: string
  photo?: any
  notes?: string
  sortOrder?: number
}

function WinnerCard({
  w,
  positionLabel,
}: {
  w: WinnerDoc
  positionLabel: string
}) {
  const img = w.photo && typeof w.photo === 'object' ? w.photo : null
  const src = img?.url ?? null
  return (
    <article className="winner-card">
      <div className="winner-photo">
        {src ? (
          <Image
            src={src}
            alt={img?.alt || `Photo of ${w.name}`}
            width={img?.width || 600}
            height={img?.height || 600}
            sizes="(max-width: 720px) 100vw, 320px"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="winner-photo-placeholder">
            {w.name
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0])
              .join('')
              .toUpperCase()}
          </div>
        )}
      </div>
      <span className="winner-position">{positionLabel}</span>
      <h3 className="winner-name">{w.name}</h3>
      {w.affiliation ? <div className="winner-affiliation">{w.affiliation}</div> : null}
      {w.paperTitle ? <p className="winner-paper">&ldquo;{w.paperTitle}&rdquo;</p> : null}
    </article>
  )
}

export default async function AwardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cfg = AWARDS[slug]
  if (!cfg) notFound()

  const payload = await getPayload({ config: await config })

  const [
    { docs: pageDocs },
    { docs: allWinners },
    { docs: newsPosts },
    { docs: awardEventDocs },
  ] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: {
        and: [
          { slug: { equals: cfg.pageSlug } },
          { _status: { equals: 'published' } },
        ],
      },
      limit: 1,
      depth: 2,
    }),
    payload.find({
      collection: 'winners',
      where: { award: { equals: cfg.key } },
      sort: ['-year', 'sortOrder'],
      limit: 500,
      depth: 1,
    }),
    payload.find({
      collection: 'posts',
      where: {
        and: [
          { category: { equals: 'award' } },
          { _status: { equals: 'published' } },
        ],
      },
      sort: '-publishedAt',
      limit: 50,
      depth: 1,
    }),
    payload.find({
      collection: 'award-events',
      where: { award: { equals: cfg.key } },
      sort: '-year',
      limit: 1,
      depth: 1,
    }),
  ])

  const awardEvent: any = awardEventDocs[0]

  const page: any = pageDocs[0]
  const winners = allWinners as WinnerDoc[]
  const latestYear = winners.length > 0 ? winners[0].year : null

  const topWinners = latestYear
    ? cfg.topPositions.flatMap((pos) =>
        winners.filter((w) => w.year === latestYear && w.position === pos),
      )
    : []

  const secondaryWinners =
    latestYear && cfg.secondaryPositions
      ? cfg.secondaryPositions.flatMap((pos) =>
          winners.filter((w) => w.year === latestYear && w.position === pos),
        )
      : []

  // Past entries: every winner NOT in the latest year (for awards that show a past list).
  const pastWinners = cfg.showPastList
    ? winners.filter((w) => w.year !== latestYear)
    : []

  const relevantPosts = (newsPosts as any[])
    .filter((p) => cfg.newsTitleRegex.test(p.title))
    .slice(0, 8)

  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">{cfg.eyebrow}</span>
          <h1 style={{ maxWidth: '24ch' }}>{cfg.title}.</h1>
          <p className="lede">{cfg.lede}</p>
        </div>
      </div>

      {/* Winners section */}
      <section>
        <div className="container">
          <h2>
            {latestYear
              ? `${latestYear} ${
                  cfg.key === 'student-honors'
                    ? 'awardees'
                    : cfg.key === 'tobler-lecture'
                    ? topWinners.length > 1
                      ? 'distinguished speakers'
                      : 'distinguished speaker'
                    : 'recipient'
                }`
              : 'Latest'}
          </h2>
          {topWinners.length > 0 ? (
            <div
              className={`winner-grid ${
                cfg.key === 'student-honors' ? '' : 'winner-grid-solo'
              }`}
            >
              {topWinners.map((w) => (
                <WinnerCard
                  key={w.id}
                  w={w}
                  positionLabel={cfg.positionLabels[w.position] ?? w.position}
                />
              ))}
            </div>
          ) : (
            <div className="winner-empty">
              <p>
                Winners for this year haven&apos;t been added yet. Once results are
                finalized, admins can add them via{' '}
                <Link href="/admin/collections/winners">the admin panel</Link>: choose
                award &quot;{cfg.title}&quot;, set the year, and upload each photo.
              </p>
            </div>
          )}

          {secondaryWinners.length > 0 ? (
            <div className="winner-secondary">
              {Object.entries(
                secondaryWinners.reduce((acc: Record<string, WinnerDoc[]>, w) => {
                  ;(acc[w.position] ||= []).push(w)
                  return acc
                }, {}),
              ).map(([pos, list]) => (
                <div key={pos}>
                  <h4>{cfg.positionLabels[pos] ?? pos}</h4>
                  <ul>
                    {list.map((w) => (
                      <li key={w.id}>
                        <strong>{w.name}</strong>
                        {w.affiliation ? `, ${w.affiliation}` : ''}
                        {w.paperTitle
                          ? ` \u2014 \u201C${w.paperTitle}\u201D`
                          : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* About the award */}
      {cfg.aboutContent || page ? (
        <section>
          <div className="container" style={{ maxWidth: '900px' }}>
            <h2>About the award</h2>
            <div className="award-info">
              {cfg.aboutContent ? cfg.aboutContent : <RichText data={page.content} />}
            </div>
          </div>
        </section>
      ) : null}

      {/* Past recipients / past distinguished speakers (Past Chairs-style) */}
      {pastWinners.length > 0 ? (
        <section>
          <div className="container" style={{ maxWidth: '900px' }}>
            <h2>{cfg.pastLabel ?? 'Past entries'}</h2>
            <ul className="past-chairs past-winners">
              {pastWinners.map((p) => (
                <li key={p.id}>
                  <span className="past-name">
                    <span className="past-name-primary">{p.name}</span>
                    {p.affiliation ? (
                      <span className="past-affiliation">{p.affiliation}</span>
                    ) : null}
                  </span>
                  <span className="past-years">{p.year}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Annual event details (poster + schedule) */}
      {awardEvent ? (
        <section>
          <div className="container">
            <h2>
              {awardEvent.year} {cfg.title}
            </h2>
            <div className="award-event">
              {awardEvent.poster &&
              typeof awardEvent.poster === 'object' &&
              awardEvent.poster.url ? (
                <div className="award-event-poster">
                  <Image
                    src={awardEvent.poster.url}
                    alt={awardEvent.poster.alt || `${cfg.title} ${awardEvent.year} poster`}
                    width={awardEvent.poster.width || 1200}
                    height={awardEvent.poster.height || 1600}
                    sizes="(max-width: 820px) 100vw, 45vw"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              ) : null}
              <div className="award-event-body">
                {(awardEvent.eventDate || awardEvent.location || awardEvent.format) ? (
                  <div className="award-event-details">
                    <h3>Event details</h3>
                    <ul>
                      {awardEvent.eventDate ? (
                        <li>
                          <strong>Date:</strong>{' '}
                          {new Date(awardEvent.eventDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </li>
                      ) : null}
                      {awardEvent.location ? (
                        <li>
                          <strong>Location:</strong> {awardEvent.location}
                        </li>
                      ) : null}
                      {awardEvent.format ? (
                        <li>
                          <strong>Format:</strong> {awardEvent.format}
                        </li>
                      ) : null}
                      {awardEvent.registrationUrl ? (
                        <li>
                          <strong>Registration:</strong>{' '}
                          <a
                            href={awardEvent.registrationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            session page ↗
                          </a>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(awardEvent.sessions) && awardEvent.sessions.length > 0 ? (
                  <div className="award-event-sessions">
                    <h3>Session agendas</h3>
                    {awardEvent.sessions.map((s: any, i: number) => (
                      <div key={i} className="award-event-session">
                        <h4>
                          {s.title}
                          {s.time ? <span className="session-time"> ({s.time})</span> : null}
                        </h4>
                        {Array.isArray(s.presenters) && s.presenters.length > 0 ? (
                          <table className="session-table">
                            <thead>
                              <tr>
                                <th>Presenter</th>
                                <th>University</th>
                                <th>Paper title</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.presenters.map((p: any, j: number) => (
                                <tr key={j}>
                                  <td>{p.name}</td>
                                  <td>{p.affiliation}</td>
                                  <td>{p.paperTitle}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Recent announcements */}
      {relevantPosts.length > 0 ? (
        <section>
          <div className="container">
            <h2>Recent announcements</h2>
            <div className="card-grid">
              {relevantPosts.map((p: any) => {
                const peek = p.excerpt || lexicalPeek(p.content)
                return (
                  <article className="card" key={p.id}>
                    <span className="category">Award</span>
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
      ) : null}
    </>
  )
}
