import Image from 'next/image'

type Media = { url?: string; alt?: string } | number | null | undefined

interface Props {
  photo: Media
  name: string
  size?: number
}

/**
 * Avatar for the Officers grid.
 *   - Renders the uploaded Media as a circular image when present.
 *   - Falls back to an elegant set of initials on a cream disc with a
 *     forest border when there is no photo yet.
 */
export function OfficerAvatar({ photo, name, size = 120 }: Props) {
  const url = photo && typeof photo === 'object' && photo.url ? photo.url : null
  const alt = (photo && typeof photo === 'object' && photo.alt) || name
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid var(--border)',
  }

  if (url) {
    return (
      <div style={common}>
        <Image
          src={url}
          alt={alt}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return (
    <div
      aria-label={`Initials placeholder for ${name}`}
      style={{
        ...common,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper-2)',
        color: 'var(--forest)',
        fontFamily: 'var(--serif)',
        fontWeight: 600,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}
    >
      {initials}
    </div>
  )
}
