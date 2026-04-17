import Link from 'next/link'
import { Space_Grotesk, IBM_Plex_Serif } from 'next/font/google'
import { getPayload } from 'payload'
import config from '@/payload.config'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--b-sans',
})
const plexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--b-serif',
})

export const dynamic = 'force-dynamic'

export default async function MockupBauhaus() {
  const payload = await getPayload({ config: await config })
  const { docs: posts } = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 3,
  })

  return (
    <div className={`${spaceGrotesk.variable} ${plexSerif.variable}`}>
      <style>{`
        .bh-root {
          font-family: var(--b-sans), system-ui, sans-serif;
          background: #f5f1e8;
          color: #0a0a0a;
          min-height: 100vh;
          padding: 0;
        }
        .bh-container { max-width: 1100px; margin: 0 auto; padding: 0 2.5rem; }
        .bh-frame {
          border: 2px solid #0a0a0a;
          margin: 2rem;
          min-height: calc(100vh - 4rem);
          display: flex;
          flex-direction: column;
        }
        .bh-top {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          border-bottom: 2px solid #0a0a0a;
          padding: 1rem 2rem;
          font-family: var(--b-sans);
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-weight: 500;
        }
        .bh-top .issue { color: #c25a3d; font-weight: 700; }
        .bh-hero {
          padding: 6rem 3rem 4rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: end;
          border-bottom: 2px solid #0a0a0a;
        }
        @media (max-width: 900px) { .bh-hero { grid-template-columns: 1fr; gap: 2rem; } }
        .bh-big {
          font-family: var(--b-sans);
          font-size: clamp(6rem, 14vw, 11rem);
          line-height: 0.85;
          letter-spacing: -0.06em;
          font-weight: 700;
          color: #1b3a2a;
          margin: 0;
        }
        .bh-big .num {
          color: #c25a3d;
          font-feature-settings: "tnum";
        }
        .bh-right h1 {
          font-family: var(--b-serif);
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          line-height: 1.15;
          font-weight: 400;
          margin: 0 0 1.5rem;
          color: #1b3a2a;
          letter-spacing: -0.01em;
        }
        .bh-right h1 em {
          font-style: italic;
          color: #c25a3d;
        }
        .bh-right p {
          font-family: var(--b-serif);
          font-size: 1rem;
          line-height: 1.6;
          max-width: 40ch;
          color: #333;
        }
        .bh-meta-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 2px solid #0a0a0a;
        }
        .bh-meta-row > div {
          padding: 1.5rem 2rem;
          border-right: 2px solid #0a0a0a;
        }
        .bh-meta-row > div:last-child { border-right: none; }
        .bh-meta-row .num {
          font-family: var(--b-sans);
          font-size: 2.5rem;
          font-weight: 700;
          color: #c25a3d;
          line-height: 1;
        }
        .bh-meta-row .cap {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 0.5rem;
          color: #6b6459;
          font-weight: 500;
        }
        .bh-section {
          padding: 4rem 3rem;
          border-bottom: 2px solid #0a0a0a;
        }
        .bh-section h2 {
          font-family: var(--b-sans);
          font-weight: 700;
          font-size: 2rem;
          letter-spacing: -0.02em;
          margin: 0 0 2.5rem;
          display: flex;
          align-items: baseline;
          gap: 1rem;
        }
        .bh-section h2 .num {
          font-size: 0.9rem;
          color: #c25a3d;
          font-weight: 500;
          letter-spacing: 0.15em;
        }
        .bh-posts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          margin: 0 -3rem -4rem;
          border-top: 2px solid #0a0a0a;
        }
        @media (max-width: 900px) { .bh-posts { grid-template-columns: 1fr; } }
        .bh-post {
          padding: 2rem;
          border-right: 2px solid #0a0a0a;
          border-bottom: 2px solid #0a0a0a;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .bh-post:last-child { border-right: none; }
        @media (max-width: 900px) { .bh-post { border-right: none; } .bh-post:last-child { border-bottom: 2px solid #0a0a0a; } }
        .bh-post .bh-n {
          font-family: var(--b-sans);
          font-size: 3rem;
          font-weight: 700;
          color: #1b3a2a;
          line-height: 1;
        }
        .bh-post .bh-cat {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c25a3d;
          font-weight: 500;
        }
        .bh-post h3 {
          font-family: var(--b-serif);
          font-size: 1.25rem;
          line-height: 1.25;
          font-weight: 400;
          margin: 0;
        }
        .bh-post h3 a { color: #0a0a0a; text-decoration: none; }
        .bh-post h3 a:hover { border-bottom: 2px solid #c25a3d; }
        .bh-post .bh-date {
          font-family: var(--b-sans);
          font-size: 0.8rem;
          color: #6b6459;
          margin-top: auto;
        }
        .bh-type .row { display: flex; align-items: baseline; gap: 2rem; margin-bottom: 1.25rem; }
        .bh-type .label { font-size: 0.7rem; color: #6b6459; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 500; width: 8rem; flex-shrink: 0; }
        .bh-back { margin: 1rem 2rem; display: inline-block; font-size: 0.85rem; color: #6b6459; }
      `}</style>
      <div className="bh-root">
        <Link href="/mockups" className="bh-back">
          ← mockups
        </Link>
        <div className="bh-frame">
          <div className="bh-top">
            <span>Geographic Information Science &amp; Systems / Specialty Group / AAG</span>
            <span className="issue">Vol. 40, No. 01</span>
          </div>

          <div className="bh-hero">
            <div>
              <div className="bh-big">
                <span className="num">2026</span>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#6b6459',
                  marginTop: '0.5rem',
                  fontWeight: 500,
                }}
              >
                Annual Meeting · San Francisco · March 17–21
              </div>
            </div>
            <div className="bh-right">
              <h1>
                A specialty group for those who <em>think spatially</em>.
              </h1>
              <p>
                The GISS Specialty Group advances Geographic Information Science within the
                American Association of Geographers through research, education, and community.
              </p>
            </div>
          </div>

          <div className="bh-meta-row">
            <div>
              <div className="num">44</div>
              <div className="cap">Articles</div>
            </div>
            <div>
              <div className="num">11</div>
              <div className="cap">Authors</div>
            </div>
            <div>
              <div className="num">10</div>
              <div className="cap">Years</div>
            </div>
            <div>
              <div className="num">∞</div>
              <div className="cap">Possibilities</div>
            </div>
          </div>

          <div className="bh-section">
            <h2>
              Latest <span className="num">§01</span>
            </h2>
            <div className="bh-posts">
              {posts.map((p: any, i: number) => (
                <article className="bh-post" key={p.id}>
                  <div className="bh-n">{String(i + 1).padStart(2, '0')}</div>
                  <div className="bh-cat">{p.category?.replace(/-/g, ' ')}</div>
                  <h3>
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <div className="bh-date">
                    {new Date(p.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="bh-section bh-type">
            <h2>
              Typography <span className="num">§02</span>
            </h2>
            <div className="row"><span className="label">Numerals</span><span style={{ fontSize: '4rem', fontWeight: 700, color: '#c25a3d', lineHeight: 1 }}>2026</span></div>
            <div className="row"><span className="label">Display</span><span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#1b3a2a', letterSpacing: '-0.03em' }}>Spatial / systems</span></div>
            <div className="row"><span className="label">Serif title</span><span style={{ fontFamily: 'var(--b-serif)', fontSize: '1.5rem' }}>A method of <em>spatial thought</em>.</span></div>
            <div className="row"><span className="label">Body</span><span style={{ fontFamily: 'var(--b-serif)', fontSize: '1rem', maxWidth: '50ch' }}>Geographic Information Science asks fundamental questions about space, place, and the digital representation of both.</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
