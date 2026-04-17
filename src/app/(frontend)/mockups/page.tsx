import Link from 'next/link'

export default function MockupsIndex() {
  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <h1 style={{ marginTop: 0 }}>Visual direction mockups</h1>
      <p style={{ color: 'var(--muted)', maxWidth: '65ch' }}>
        Three directions for the bold GISS-SG visual identity. All use a shared
        forest-green and terracotta palette but differ in typography, density, and
        container width strategy. Same content in each so you can compare.
      </p>
      <ol style={{ lineHeight: 2, fontSize: '1.05rem' }}>
        <li>
          <Link href="/mockups/a-editorial">A. Editorial / academic serif</Link>
          <span style={{ color: 'var(--muted)' }}> · Fraunces headlines, wide cap</span>
        </li>
        <li>
          <Link href="/mockups/b-geotech">B. Modern geospatial tech</Link>
          <span style={{ color: 'var(--muted)' }}> · Geometric sans, full-bleed hero</span>
        </li>
        <li>
          <Link href="/mockups/c-bauhaus">C. Bauhaus / academic journal</Link>
          <span style={{ color: 'var(--muted)' }}> · Oversized numerals, strict grid</span>
        </li>
      </ol>
      <p style={{ marginTop: '3rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Each mockup is a dead-end route at /mockups/*. None of these styles affect the
        live site at /, /blog, etc. Once you pick one, I&apos;ll apply it globally.
      </p>
    </div>
  )
}
