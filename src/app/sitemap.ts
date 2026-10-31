import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 600

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://daodaoreview.com'
  
  const sitemapUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    }
  ]

  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json')
    const rawData = fs.readFileSync(dbPath, 'utf8')
    const db = JSON.parse(rawData)

    db.forEach((series: any) => {
      if (series && series.slug) {
        sitemapUrls.push({
          url: `${baseUrl}/watch/${series.slug}`,
          lastModified: new Date(series.updatedAt || new Date()),
          changeFrequency: 'daily',
          priority: 0.9,
        })
      }
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  return sitemapUrls
}
