import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/series', '/api/thumbnail/'],
      disallow: ['/admin/'], // Chỉ chặn trang quản trị, mở /api/series & /api/thumbnail/ cho Googlebot & Bingbot render dữ liệu & ảnh bìa
    },
    sitemap: 'https://daodaoreview.com/sitemap.xml',
  }
}
