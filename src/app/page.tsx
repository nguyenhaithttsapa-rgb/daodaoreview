import HomePageClient from './HomePageClient';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { getSafeThumbnail } from '@/lib/thumbnailHelper';

// Bật bộ nhớ đệm 60 giây để máy chủ phản hồi trong chớp mắt
export const revalidate = 60;

let cachedInitialSeries: any = null;
let cachedSeoLinks: { slug: string; title: string }[] = [];
let lastCacheTime = 0;

export default async function Home() {
  const now = Date.now();
  if (cachedInitialSeries && (now - lastCacheTime < 60000)) {
    return (
      <>
        <h1 className="sr-only">Đao Đao Review Anime 3D - Tóm Tắt & Phân Tích Hoạt Hình Tiên Hiệp Trung Quốc</h1>
        <HomePageClient initialSeries={cachedInitialSeries} />
        <nav aria-label="Danh mục phim mới cập nhật" className="sr-only">
          <ul>
            {cachedSeoLinks.map((item) => (
              <li key={item.slug}>
                <Link href={`/watch/${item.slug}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </>
    );
  }

  let initialSeries: any[] = [];
  let seoLinks: { slug: string; title: string }[] = [];

  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      const all = JSON.parse(raw);

      // Tính tổng lượt xem của từng bộ phim để hiển thị số liệu
      all.forEach((s: any) => {
        const totalViews = s.episodes?.reduce((sum: number, ep: any) => sum + (ep.viewsCount || 0), 0) || 0;
        s.totalViews = totalViews;
      });

      // Tối ưu kích thước HTML trang chủ (< 250KB thay vì 2.8MB) để vượt giới hạn 2MB của Bingbot & Googlebot:
      // SSR 48 bộ phim mới nhất cho lần tải đầu tiên, phần còn lại tự động nạp ngầm qua /api/series
      initialSeries = all.slice(0, 48).map((s: any) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description ? s.description.slice(0, 120) : '',
        thumbnail: getSafeThumbnail(s.thumbnail || s.coverImage, s.id || s.title),
        channelName: s.channelName,
        categories: s.categories || [],
        genres: s.genres || [],
        totalEpisodes: s.totalEpisodes || s.episodes?.length || 1,
        totalViews: s.totalViews,
        updatedAt: s.updatedAt,
        episodes: (s.episodes || []).slice(0, 1).map((ep: any) => ({
          id: ep.id,
          title: ep.title,
          partNumber: ep.partNumber,
          aspectRatio: ep.aspectRatio,
          duration: ep.duration,
          viewsCount: ep.viewsCount,
          platform: ep.platform,
          originalUrl: ep.originalUrl,
          embedUrl: ep.embedUrl,
          thumbnail: getSafeThumbnail(ep.thumbnail, ep.id || ep.title)
        }))
      }));

      // Danh sách liên kết nội bộ giúp Bingbot/Googlebot khám phá nhanh các trang /watch/[slug]
      seoLinks = all.slice(0, 300).map((s: any) => ({
        slug: s.slug,
        title: (s.title || '').slice(0, 90)
      }));

      cachedInitialSeries = initialSeries;
      cachedSeoLinks = seoLinks;
      lastCacheTime = now;
    }
  } catch (err) {
    console.error('Failed to read db:', err);
  }

  return (
    <>
      <h1 className="sr-only">Đao Đao Review Anime 3D - Tóm Tắt & Phân Tích Hoạt Hình Tiên Hiệp Trung Quốc</h1>
      <HomePageClient initialSeries={initialSeries} />
      <nav aria-label="Danh mục phim mới cập nhật" className="sr-only">
        <ul>
          {seoLinks.map((item) => (
            <li key={item.slug}>
              <Link href={`/watch/${item.slug}`}>{item.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
