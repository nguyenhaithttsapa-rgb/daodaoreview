import { NextResponse } from 'next/server';
import { addEpisodeToSeries, getAllSeries } from '@/lib/store';
import { parseVideoUrl } from '@/lib/parser';
import { Episode } from '@/types/video';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { seriesId, originalUrl, title, partNumber, duration } = body;

    if (!seriesId || !originalUrl) {
      return NextResponse.json({ error: 'Thiếu seriesId hoặc originalUrl' }, { status: 400 });
    }

    const seriesList = getAllSeries();
    const targetSeries = seriesList.find((s) => s.id === seriesId);
    if (!targetSeries) {
      return NextResponse.json({ error: 'Không tìm thấy bộ phim' }, { status: 404 });
    }

    // Tự động phân tích link (Facebook, YouTube, TikTok...)
    const parsed = parseVideoUrl(originalUrl);
    const calculatedPart = partNumber ? Number(partNumber) : targetSeries.episodes.length + 1;

    const newEpisode: Episode = {
      id: 'ep-' + Date.now(),
      seriesId,
      partNumber: calculatedPart,
      title: title || `Tập ${calculatedPart}`,
      originalUrl,
      embedUrl: parsed.embedUrl,
      platform: parsed.platform,
      aspectRatio: parsed.aspectRatio,
      duration: duration || '02:00',
      viewsCount: 0,
      publishedAt: new Date().toISOString().split('T')[0],
    };

    const success = addEpisodeToSeries(seriesId, newEpisode);
    if (!success) {
      return NextResponse.json({ error: 'Không thể thêm tập' }, { status: 500 });
    }

    return NextResponse.json(newEpisode, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server khi thêm tập video' }, { status: 500 });
  }
}
