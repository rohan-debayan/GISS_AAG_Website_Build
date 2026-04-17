import Link from 'next/link'
import { Fraunces, Inter } from 'next/font/google'
import { getPayload } from 'payload'
import config from '@/payload.config'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '800'],
  style: ['normal', 'italic'],
  variable: '--f-serif',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--f-sans',
})

export const dynamic = 'force-dynamic'

export default async function MockupEditorial() {
  const payload = await getPayload({ config: await config })
  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 3,
  })

  return (
    <div className={`${fraunces.variable} ${inter.variable}`}>
      <style>{`
        .ed-root {
          font-family: var(--f-sans), system-ui, sans-serif;
          background: #fbf7f0;
          color: #1b1b1b;
          min-height: 100vh;
        }
        .ed-root .serif { font-family: var(--f-serif), Georgia, serif; }
        .ed-container { max-width: 1280px; margin: 0 auto; padding: 0 2rem; }
        .ed-hero {
          padding: 8rem 0 6rem;
          border-bottom: 1px solid #e4dbc9;
        }
        .ed-eyebrow {
          display: inline-block;
          font-family: var(--f-sans);
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c25a3d;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }
        .ed-h1 {
          font-family: var(--f-serif);
          font-weight: 600;
          font-size: clamp(3rem, 7vw, 6rem);
          line-height: 0.95;
          letter-spacing: -0.035em;
          margin: 0 0 1.5rem;
          color: #1b3a2a;
          max-width: 18ch;
        }
        .ed-h1 em { font-style: italic; color: #c25a3d; }
        .ed-lede {
          font-family: var(--f-serif);
          font-size: clamp(1.125rem, 1.5vw, 1.5rem);
          line-height: 1.45;
          max-width: 48ch;
          color: #3a3a3a;
        }
        .ed-section {
          padding: 5rem 0;
          border-bottom: 1px solid #e4dbc9;
        }
        .ed-section h2 {
          font-family: var(--f-serif);
          font-weight: 600;
          font-size: 2rem;
          margin: 0 0 3rem;
          color: #1b3a2a;
          letter-spacing: -0.02em;
        }
        .ed-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
        }
        @media (max-width: 900px) { .ed-grid { grid-template-columns: 1fr; gap: 2.5rem; } }
        .ed-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .ed-card .ed-cat {
          font-size: 0.7rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c25a3d;
          font-weight: 700;
        }
        .ed-card h3 {
          font-family: var(--f-serif);
          font-size: 1.5rem;
          line-height: 1.2;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .ed-card h3 a { color: #1b3a2a; text-decoration: none; }
        .ed-card h3 a:hover { text-decoration: underline; text-decoration-color: #c25a3d; }
        .ed-card .ed-date {
          font-size: 0.85rem;
          color: #6b6459;
          font-variant-numeric: oldstyle-nums;
        }
        .ed-card .ed-rule { width: 2.5rem; height: 2px; background: #1b3a2a; margin: 0.25rem 0; }
        .ed-type-sample {
          padding: 5rem 0 6rem;
        }
        .ed-type-sample .row { display: flex; align-items: baseline; gap: 2rem; margin-bottom: 1.25rem; }
        .ed-type-sample .label { font-size: 0.75rem; color: #6b6459; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 500; width: 8rem; flex-shrink: 0; }
        .ed-back {
          display: inline-block;
          margin: 2rem 0;
          font-size: 0.9rem;
          color: #6b6459;
        }
      `}</style>
      <div className="ed-root">
        <div className="ed-container">
          <Link href="/mockups" className="ed-back">
            &larr; All mockups
          </Link>
        </div>

        <header className="ed-hero">
          <div className="ed-container">
            <div className="ed-eyebrow">AAG Specialty Group · Est. 1985</div>
            <h1 className="ed-h1">
              Advancing <em>Geographic</em> Information Science.
            </h1>
            <p className="ed-lede">
              A community of researchers, educators, and practitioners shaping how the world
              sees, maps, and makes sense of place.
            </p>
          </div>
        </header>

        <section className="ed-section">
          <div className="ed-container">
            <h2>Latest news</h2>
            <div className="ed-grid">
              {posts.map((p: any) => (
                <article className="ed-card" key={p.id}>
                  <div className="ed-cat">{p.category?.replace(/-/g, ' ')}</div>
                  <div className="ed-rule" />
                  <h3>
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <div className="ed-date">
                    {new Date(p.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ed-type-sample">
          <div className="ed-container">
            <h2>Typography</h2>
            <div className="row"><span className="label">Display</span><span className="serif" style={{ fontSize: '3.5rem', lineHeight: 1, fontWeight: 600, color: '#1b3a2a' }}>Spatial inquiry.</span></div>
            <div className="row"><span className="label">Headline</span><span className="serif" style={{ fontSize: '2.25rem', fontWeight: 600, color: '#1b3a2a' }}>Mapping the unseen</span></div>
            <div className="row"><span className="label">Title</span><span className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>AAG 2026 in San Francisco</span></div>
            <div className="row"><span className="label">Body</span><span style={{ fontSize: '1rem', maxWidth: '50ch' }}>GIScience sits at the intersection of geography, computation, and critical reflection on how data represents people and places.</span></div>
            <div className="row"><span className="label">Caption</span><span style={{ fontSize: '0.85rem', color: '#6b6459' }}>Photograph courtesy of the Waldo Tobler archive.</span></div>
          </div>
        </section>
      </div>
    </div>
  )
}
