import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { RichText } from '@payloadcms/richtext-lexical/react'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  news: 'News',
  award: 'Award',
  meeting: 'Meeting',
  event: 'Event',
  'call-for-papers': 'Call for Papers',
  newsletter: 'Newsletter',
  'board-nomination': 'Board Nomination',
  jobs: 'Jobs',
  'website-update': 'Website Update',
}

function formatDate(d?: string | null): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default async function PostDetail({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    depth: 2,
  })
  const post: any = docs[0]
  if (!post) notFound()

  const authorName =
    post.author && typeof post.author === 'object'
      ? post.author.name || post.author.email
      : ''

  return (
    <article className="article">
      <Link href="/blog" className="back-link">
        ← Back to news
      </Link>
      <span className="eyebrow article-eyebrow">
        {CATEGORY_LABELS[post.category] ?? post.category}
      </span>
      <h1>{post.title}</h1>
      <div className="article-meta">
        {formatDate(post.publishedAt)}
        {authorName ? ` \u00b7 ${authorName}` : ''}
      </div>
      <RichText data={post.content} />
    </article>
  )
}
