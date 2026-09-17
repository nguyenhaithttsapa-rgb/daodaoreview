import HomePageClient from './HomePageClient';
import fs from 'fs';
import path from 'path';

export const revalidate = 0; // Dynamic server rendering to always get latest videos

export default async function Home() {
  let series = [];
  try {
    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf8');
      series = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read db:', err);
  }

  return <HomePageClient initialSeries={series} />;
}
