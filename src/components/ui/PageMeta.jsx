// PageMeta.jsx — SEO meta tags via react-helmet-async
// Used by: all page components
// Depends on: react-helmet-async (HelmetProvider must wrap app root)

import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'StreamVex Live'
const DEFAULT_DESC = 'Watch live sports streaming — cricket, football, and Bangladesh TV channels. Free HD streaming.'
const DEFAULT_OG_IMAGE = '/og-default.png'
const BASE_URL = 'https://streamvex-live.vercel.app'

export default function PageMeta({
  title,
  description = DEFAULT_DESC,
  image       = DEFAULT_OG_IMAGE,
  url,
  noIndex     = false,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  const fullUrl   = url ? `${BASE_URL}${url}` : BASE_URL
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={fullImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url"         content={fullUrl} />
      <meta property="og:type"        content="website" />

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@streamvex" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={fullImage} />
    </Helmet>
  )
}
