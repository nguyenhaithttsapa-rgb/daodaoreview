import HomePageClient from './HomePageClient';
import fs from 'fs';
import path from 'path';

export const revalidate = 0; // Dynamic server rendering to always get latest videos

export default async function Home() {
  let series: any[] = [];
  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      series = JSON.parse(raw);
      
      // Tính tổng lượt xem của từng bộ phim và sắp xếp giảm dần
      series.forEach(s => {
        const totalViews = s.episodes?.reduce((sum: number, ep: any) => sum + (ep.viewsCount || 0), 0) || 0;
        s.totalViews = totalViews;
      });
      
      series.sort((a, b) => b.totalViews - a.totalViews);
    }
  } catch (err) {
    console.error('Failed to read db:', err);
  }

  return <HomePageClient initialSeries={series} />;
}
