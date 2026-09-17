import { NextResponse } from 'next/server';
import { getAllSeries, updateAllSeries } from '@/lib/store';
import { Series, Episode } from '@/types/video';

export async function POST(req: Request) {
  try {
    const allSeries = getAllSeries();

    const seenUrls = new Set();
    let removedEmptyEmbeds = 0;
    let removedDuplicates = 0;
    let emptySeriesRemoved = 0;

    const cleanedSeries = [];

    for (const s of allSeries) {
      const validEpisodes = [];

      for (const ep of (s.episodes || [])) {
        const anyEp = ep as any;
        const rawUrl = (anyEp.originalUrl || anyEp.videoUrl || '').trim();
        const embedUrl = (anyEp.embedUrl || '').trim();

        // 1. Lọc video không có nội dung nhúng hoặc thiếu link gốc
        if (!embedUrl || !rawUrl || embedUrl.includes('about:blank')) {
          removedEmptyEmbeds++;
          continue;
        }

        // 2. Chuẩn hóa link để kiểm tra trùng lặp (bỏ query params và trailing slash)
        const normalizedUrl = rawUrl.split('?')[0].replace(/\/$/, '');

        if (seenUrls.has(normalizedUrl)) {
          removedDuplicates++;
          continue;
        }

        seenUrls.add(normalizedUrl);
        validEpisodes.push(ep);
      }

      // Chỉ giữ lại các series còn ít nhất 1 video hợp lệ
      if (validEpisodes.length > 0) {
        s.episodes = validEpisodes;
        s.totalEpisodes = validEpisodes.length;
        cleanedSeries.push(s);
      } else {
        emptySeriesRemoved++;
      }
    }

    // Đảm bảo luôn có 1 bộ phim featured
    if (cleanedSeries.length > 0 && !cleanedSeries.some(s => s.featured)) {
      cleanedSeries[0].featured = true;
    }

    // Cập nhật CSDL
    updateAllSeries(cleanedSeries);

    return NextResponse.json({
      success: true,
      totalRemainingSeries: cleanedSeries.length,
      totalRemainingEpisodes: seenUrls.size,
      removedDuplicates,
      removedEmptyEmbeds,
      emptySeriesRemoved,
      message: `Bot đã quét xong: Đã loại bỏ ${removedDuplicates} video trùng lặp và ${removedEmptyEmbeds} video không có nhúng hợp lệ!`
    });
  } catch (error: any) {
    console.error('Cleaner bot error:', error);
    return NextResponse.json({ error: 'Lỗi khi bot làm sạch: ' + (error?.message || error) }, { status: 500 });
  }
}
