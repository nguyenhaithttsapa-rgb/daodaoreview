import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seriesId } = body;

    if (!seriesId) {
      return NextResponse.json({ error: 'Missing seriesId' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'src/data/database.json');
    const rawData = fs.readFileSync(dbPath, 'utf8');
    let db = JSON.parse(rawData);

    const initialLength = db.length;
    db = db.filter((s: any) => s.id !== seriesId);

    if (db.length === initialLength) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
