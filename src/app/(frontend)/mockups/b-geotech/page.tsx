import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import { getPayload } from 'payload'
import config from '@/payload.config'

const geist = Geist({ subsets: ['latin'], weight: ['400', '500', '700', '900'], variable: '--g-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--g-mono' })

export const dynamic = 'force-dynamic'

export default async function MockupGeoTech() {
  const payload = await getPayload({ config: await config })
  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 3,
  })

  return (
    <div className={`${geist.variable} ${geistMono.variable}`}>
      <style>{`
        .gt-root {
          font-family: var(--g-sans), system-ui, sans-serif;
          background: #0f1a15;
          color: #e8efe9;
          min-height: 100vh;
        }
        .gt-mono { font-family: var(--g-mono), monospace; }
        .gt-container { max-width: 1400px; margin: 0 auto; padding: 0 2rem; }
        .gt-hero {
          padding: 6rem 0 8rem;
          background:
            radial-gradient(800px 400px at 10% 120%, rgba(194, 90, 61, 0.18), transparent 70%),
            linear-gradient(180deg, #0f1a15 0%, #172721 100%);
          position: relative;
          overflow: hidden;
        }
        .gt-hero::before {
          content: "";
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(143, 180, 157, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(143, 180, 157, 0.06) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
        }
        .gt-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--g-mono);
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #c25a3d;
          background: rgba(194, 90, 61, 0.08);
          border: 1px solid rgba(194, 90, 61, 0.35);
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          margin-bottom: 2rem;
          position: relative;
        }
        .gt-tag::before {
          content: ""; width: 6px; height: 6px; background: #c25a3d; border-radius: 999px;
        }
        .gt-h1 {
          font-weight: 900;
          font-size: clamp(3.5rem, 8vw, 7rem);
          line-height: 0.92;
          letter-spacing: -0.04em;
          margin: 0 0 1.5rem;
          color: #ffffff;
          max-width: 16ch;
          position: relative;
        }
        .gt-h1 span { color: #8fb49d; }
        .gt-lede {
          font-size: clamp(1rem, 1.25vw, 1.25rem);
          line-height: 1.55;
          max-width: 52ch;
          color: #9cb2a4;
          position: relative;
        }
        .gt-meta {
          display: flex;
          gap: 2rem;
          margin-top: 3rem;
          font-family: var(--g-mono);
          font-size: 0.8rem;
          color: #6d8577;
          position: relative;
        }
        .gt-meta strong { color: #e8efe9; font-family: var(--g-sans); font-weight: 700; }
        .gt-section {
          padding: 6rem 0;
          background: #0f1a15;
          border-top: 1px solid #1d2f28;
        }
        .gt-section h2 {
          font-weight: 700;
          font-size: 2.25rem;
          margin: 0 0 3rem;
          letter-spacing: -0.02em;
          color: #ffffff;
        }
        .gt-section h2 small {
          display: block;
          font-family: var(--g-mono);
          font-size: 0.75rem;
          color: #6d8577;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .gt-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 900px) { .gt-grid { grid-template-columns: 1fr; } }
        .gt-card {
          background: #172721;
          border: 1px solid #1d2f28;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.18s ease;
          border-radius: 2px;
        }
        .gt-card:hover {
          border-color: #c25a3d;
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(194, 90, 61, 0.12);
        }
        .gt-card .gt-cat {
          font-family: var(--g-mono);
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c25a3d;
        }
        .gt-card h3 {
          font-size: 1.25rem;
          line-height: 1.3;
          margin: 0;
          font-weight: 500;
          letter-spacing: -0.01em;
        }
        .gt-card h3 a { color: #e8efe9; text-decoration: none; }
        .gt-card h3 a:hover { color: #8fb49d; }
        .gt-card .gt-date {
          font-family: var(--g-mono);
          font-size: 0.8rem;
          color: #6d8577;
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid #1d2f28;
        }
        .gt-back {
          display: inline-block;
          margin: 2rem 0;
          font-family: var(--g-mono);
          font-size: 0.85rem;
          color: #6d8577;
        }
        .gt-type .row { display: flex; align-items: baseline; gap: 2rem; margin-bottom: 1.25rem; }
        .gt-type .label { font-family: var(--g-mono); font-size: 0.7rem; color: #6d8577; text-transform: uppercase; letter-spacing: 0.15em; width: 8rem; flex-shrink: 0; }
      `}</style>
      <div className="gt-root">
        <div className="gt-container">
          <Link href="/mockups" className="gt-back">
            [ back to mockups ]
          </Link>
        </div>

        <header className="gt-hero">
          <div className="gt-container" style={{ position: 'relative' }}>
            <div className="gt-tag">AAG · GISS-SG · 2026</div>
            <h1 className="gt-h1">
              GIScience at the <span>edge of</span> discovery.
            </h1>
            <p className="gt-lede">
              We are a specialty group of the American Association of Geographers, building
              the methods, tools, and communities that make modern GIScience possible.
            </p>
            <div className="gt-meta">
              <div><strong>44</strong> articles</div>
              <div><strong>10</strong> years</div>
              <div><strong>11</strong> authors</div>
            </div>
          </div>
        </header>

        <section className="gt-section">
          <div className="gt-container">
            <h2>
              <small>// 01 latest</small>
              Recent activity
            </h2>
            <div className="gt-grid">
              {posts.map((p: any) => (
                <article className="gt-card" key={p.id}>
                  <div className="gt-cat">{p.category?.replace(/-/g, ' ')}</div>
                  <h3>
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <div className="gt-date">
                    {new Date(p.publishedAt).toISOString().slice(0, 10)}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gt-section gt-type">
          <div className="gt-container">
            <h2>
              <small>// 02 typography</small>
              System
            </h2>
            <div className="row"><span className="label">Display 900</span><span style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#ffffff' }}>Spatial systems.</span></div>
            <div className="row"><span className="label">Title 700</span><span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>Annual Meeting 2026</span></div>
            <div className="row"><span className="label">Body 400</span><span style={{ fontSize: '1rem', maxWidth: '50ch', color: '#c2d1c7' }}>Mapping is modeling. Every projection is a choice. Every classification is a perspective.</span></div>
            <div className="row"><span className="label">Mono 400</span><span className="gt-mono" style={{ fontSize: '0.9rem', color: '#8fb49d' }}>lon=-122.4194  lat=37.7749</span></div>
          </div>
        </section>
      </div>
    </div>
  )
}
