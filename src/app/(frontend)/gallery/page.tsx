import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

function groupByAlbum(items: any[]): Array<{ album: string; items: any[] }> {
  const map = new Map<string, any[]>()
  for (const it of items) {
    const key = (it.album || 'General').trim() || 'General'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  return Array.from(map.entries()).map(([album, items]) => ({ album, items }))
}

export default async function GalleryPage() {
  const payload = await getPayload({ config: await config })
  const { docs: items } = await payload.find({
    collection: 'gallery',
    sort: ['album', 'sortOrder', '-takenAt'],
    limit: 500,
    depth: 1,
  })

  const albums = groupByAlbum(items as any[])

  return (
    <>
      <div className="hero hero-topo-shallow">
        <div className="container">
          <span className="eyebrow">Image archive</span>
          <h1 style={{ maxWidth: '24ch' }}>
            Moments from the <em>meeting</em> hall.
          </h1>
          <p className="lede">
            A visual record of GISS-SG gatherings: annual meeting sessions, distinguished
            lectures, receptions, and the people who make the group what it is.
          </p>
        </div>
      </div>

      <section>
        <div className="container">
          {albums.length === 0 ? (
            <>
              <p style={{ color: 'var(--ink-soft)', maxWidth: '60ch', fontSize: '1.05rem' }}>
                The gallery is empty for now. Board members can add photos through the
                admin panel: Gallery → Create New → upload an image and add a caption.
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '2rem' }}>
                Photos are grouped by album (e.g. "AAG 2026 San Francisco"). Each entry is
                a single image with an optional caption, credit, and date.
              </p>
            </>
          ) : (
            albums.map(({ album, items }) => (
              <div key={album} style={{ marginBottom: '4rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>{album}</h2>
                <div className="gallery-grid">
                  {items.map((it: any) => {
                    const img = it.image
                    const src =
                      img && typeof img === 'object' && img.url ? img.url : null
                    const alt =
                      (img && typeof img === 'object' && img.alt) || it.caption || ''
                    const w = img?.width || 1200
                    const h = img?.height || 800
                    if (!src) return null
                    return (
                      <figure className="gallery-item" key={it.id}>
                        <div className="gallery-media">
                          <Image
                            src={src}
                            alt={alt}
                            width={w}
                            height={h}
                            sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                          />
                        </div>
                        {it.caption ? (
                          <figcaption>
                            <div className="caption-main">{it.caption}</div>
                            {it.credit ? (
                              <div className="caption-credit">Photo: {it.credit}</div>
                            ) : null}
                          </figcaption>
                        ) : null}
                      </figure>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}
