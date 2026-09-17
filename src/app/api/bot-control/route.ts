import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'scripts', 'config.json');

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return NextResponse.json(data);
    }
    return NextResponse.json({ fanpages: [], checkIntervalMinutes: 30, headless: true });
  } catch (error) {
    return NextResponse.json({ error: 'Không thể đọc cấu hình Bot' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fanpages, checkIntervalMinutes, headless } = body;

    const newConfig = {
      fanpages: fanpages || [],
      checkIntervalMinutes: checkIntervalMinutes || 30,
      headless: headless !== undefined ? headless : true,
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    return NextResponse.json({ success: true, config: newConfig });
  } catch (error) {
    return NextResponse.json({ error: 'Không thể lưu cấu hình Bot' }, { status: 500 });
  }
}
