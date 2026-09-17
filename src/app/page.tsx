import HomePageClient from './HomePageClient';
import fs from 'fs';
import path from 'path';

// Bật bộ nhớ đệm 60 giây để máy chủ phản hồi trong chớp mắt
export const revalidate = 60;

let cachedData: any = null;
let lastCacheTime = 0;

export default async function Home() {
  const now = Date.now();
  if (cachedData && (now - lastCacheTime < 60000)) {
    return <HomePageClient initialSeries={cachedData} />;
  }

  let series: any[] = [];
  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      const all = JSON.parse(raw);
      
      // Tính tổng lượt xem của từng bộ phim và sắp xếp giảm dần
      all.forEach((s: any) => {
        const totalViews = s.episodes?.reduce((sum: number, ep: any) => sum + (ep.viewsCount || 0), 0) || 0;
        s.totalViews = totalViews;
      });
      
      all.sort((a: any, b: any) => b.totalViews - a.totalViews);

      // Tối ưu hóa dung lượng: Cắt gọt bớt các dữ liệu không cần thiết trên trang chủ
      series = all.map((s: any) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        description: s.description ? s.description.slice(0, 120) : '',
        thumbnail: s.thumbnail || s.coverImage || '',
        channelName: s.channelName,
        categories: s.categories || [],
        totalEpisodes: s.totalEpisodes || s.episodes?.length || 1,
        totalViews: s.totalViews,
        updatedAt: s.updatedAt,
        episodes: (s.episodes || []).slice(0, 1).map((ep: any) => ({
          id: ep.id,
          title: ep.title,
          partNumber: ep.partNumber,
          aspectRatio: ep.aspectRatio,
          viewsCount: ep.viewsCount,
          platform: ep.platform,
          originalUrl: ep.originalUrl,
          embedUrl: ep.embedUrl,
          thumbnail: ep.thumbnail
        }))
      }));

      cachedData = series;
      lastCacheTime = now;
    }
  } catch (err) {
    console.error('Failed to read db:', err);
  }

  return <HomePageClient initialSeries={series} />;
}
