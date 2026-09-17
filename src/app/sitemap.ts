import { MetadataRoute } from 'next'
import fs from 'fs'
import path from 'path'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://daodaoreview.com'
  
  // Base URLs
  const sitemapUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }
  ]

  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json')
    const rawData = fs.readFileSync(dbPath, 'utf8')
    const db = JSON.parse(rawData)

    db.forEach((series: any) => {
      sitemapUrls.push({
        url: `${baseUrl}/watch/${series.slug}`,
        lastModified: new Date(series.updatedAt || new Date()),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
  }

  return sitemapUrls
}
