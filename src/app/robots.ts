import type { MetadataRoute } from "next";

/**
 * A study corner for one person: nothing here is for a search engine. The page
 * metadata already says `noindex`; this keeps well-behaved crawlers from
 * fetching the pages at all.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
