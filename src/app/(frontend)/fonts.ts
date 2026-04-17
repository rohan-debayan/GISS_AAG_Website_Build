import { Fraunces, Inter } from 'next/font/google'

/**
 * Display / headings — Fraunces. Variable weight + optical size give us
 * a wide range without shipping many files. Italic is available (used
 * for terracotta accents in article titles and eyebrows).
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--f-serif',
  display: 'swap',
})

/**
 * Body / UI — Inter. Wide weight range, excellent legibility at all sizes.
 */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--f-sans',
  display: 'swap',
})
