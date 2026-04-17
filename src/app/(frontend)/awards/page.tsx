import Link from 'next/link'

export const dynamic = 'force-dynamic'

// The three honors maintained by the specialty group.
// Each `slug` points at its dedicated /awards/<slug> page (hero +
// current-year winners + info + recent news), not the raw WP import.
const AWARDS: Array<{
  slug: string
  title: string
  eyebrow: string
  blurb: string
}> = [
  {
    slug: 'student-honors',
    title: 'Student Honors Paper Competition',
    eyebrow: 'Annual student competition',
    blurb:
      'Recognizes outstanding student research in GIS and GIScience. Undergraduate and graduate students present their work in a dedicated session at the AAG Annual Meeting; top papers receive cash prizes and publication recognition.',
  },
  {
    slug: 'aangeenbrug',
    title: 'Aangeenbrug Award',
    eyebrow: 'Distinguished career',
    blurb:
      'Honors senior scholars for sustained and effective research contributions in geographic information science. Named for Dr. Robert Aangeenbrug, the award is bestowed once a year on a protracted record of published research and other outstanding achievements.',
  },
  {
    slug: 'tobler-lecture',
    title: 'Waldo Tobler Distinguished Lecture in GIScience',
    eyebrow: 'Invited keynote',
    blurb:
      'A co-sponsored lecture with the GIScience journal Transactions in GIS honoring the legacy of Waldo Tobler. Each year a leading scholar delivers a keynote at a dedicated session during the AAG Annual Meeting.',
  },
]

export default async function AwardsPage() {
  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">Honors</span>
          <h1 style={{ maxWidth: '24ch' }}>
            Awards &amp; <em>recognition</em>.
          </h1>
          <p className="lede">
            Each year the specialty group honors AAG student and professional members
            through three distinguished awards that recognize research contributions to
            geographic information science.
          </p>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="awards-grid">
            {AWARDS.map((a) => (
              <article className="award-card" key={a.slug}>
                <span className="category">{a.eyebrow}</span>
                <h3 className="award-title">{a.title}</h3>
                <p className="award-blurb">{a.blurb}</p>
                <Link href={`/awards/${a.slug}`} className="more-link award-link">
                  Full details →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
