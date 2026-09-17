import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // Chặn Google dò tìm trang quản trị
    },
    sitemap: 'https://daodaoreview.com/sitemap.xml',
  }
}
