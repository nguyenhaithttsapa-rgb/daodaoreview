import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seriesId, episodeId } = body;

    if (!seriesId || !episodeId) {
      return NextResponse.json({ error: 'Missing seriesId or episodeId' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    const rawData = fs.readFileSync(dbPath, 'utf8');
    let db = JSON.parse(rawData);

    const seriesIndex = db.findIndex((s: any) => s.id === seriesId);
    if (seriesIndex === -1) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const eps = db[seriesIndex].episodes || [];
    const initialLen = eps.length;
    
    db[seriesIndex].episodes = eps.filter((e: any) => e.id !== episodeId);

    if (db[seriesIndex].episodes.length === initialLen) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }
    
    // Update totalEpisodes count
    db[seriesIndex].totalEpisodes = db[seriesIndex].episodes.length;

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, message: 'Deleted episode successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
