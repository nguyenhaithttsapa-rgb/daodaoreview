import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/','/api/series'],
      disallow: ['/admin/'], // Chỉ chặn trang quản trị, mở /api/series cho Googlebot & Bingbot render dữ liệu
    },
    sitemap: 'https://daodaoreview.com/sitemap.xml',
  }
}
