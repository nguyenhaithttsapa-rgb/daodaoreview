import { NextResponse } from 'next/server';
import { getAllSeries, addSeries, addEpisodeToSeries } from '@/lib/store';
import { parseBatchReels } from '@/lib/smartParser';
import { parseVideoUrl, slugify } from '@/lib/parser';
import { Series, Episode } from '@/types/video';

export async function POST(req: Request) {
  try {
    const { rawText, channelName } = await req.json();

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'Nội dung dán vào không được để trống' }, { status: 400 });
    }

    // 1. Phân tích văn bản bóc tách danh sách các Reel
    const extractedList = parseBatchReels(rawText);

    if (extractedList.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy link Facebook Reel hoặc YouTube nào trong văn bản' },
        { status: 400 }
      );
    }

    const currentSeriesList = getAllSeries();
    let newlyCreatedSeriesCount = 0;
    let newlyAddedEpisodesCount = 0;

    // 2. Gom nhóm và thêm vào CSDL
    for (const item of extractedList) {
      const parsedVideo = parseVideoUrl(item.originalUrl);

      // Tìm bộ phim tương ứng dựa trên tên tương đồng
      let matchedSeries = currentSeriesList.find((s) => {
        const sClean = s.title.toLowerCase().trim();
        const itemClean = item.seriesTitle.toLowerCase().trim();
        return sClean.includes(itemClean) || itemClean.includes(sClean);
      });

      // Nếu chưa có bộ phim này trong DB -> Tự động tạo bộ mới
      if (!matchedSeries) {
        const newSeries: Series = {
          id: 'series-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          slug: slugify(item.seriesTitle) + '-' + Math.floor(Math.random() * 1000),
          title: item.seriesTitle,
          description: `Tổng hợp trọn bộ các tập ${item.seriesTitle} review hoạt hình 3D tu tiên mới nhất.`,
          thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
          channelName: channelName || 'Đại Đạo Review',
          categories: ['Tu Tiên', 'Huyền Huyễn', 'Reels'],
          totalEpisodes: 0,
          featured: false,
          updatedAt: new Date().toISOString().split('T')[0],
          episodes: [],
        };

        matchedSeries = addSeries(newSeries);
        newlyCreatedSeriesCount++;
      }

      // Kiểm tra xem tập này đã tồn tại trong bộ phim chưa (tránh trùng lặp URL hoặc Part)
      const existingEp = matchedSeries.episodes.find(
        (ep) => ep.partNumber === item.partNumber || ep.originalUrl === item.originalUrl
      );

      if (!existingEp) {
        const newEp: Episode = {
          id: 'ep-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          seriesId: matchedSeries.id,
          partNumber: item.partNumber,
          title: `Tập ${item.partNumber}: ${item.rawCaption.slice(0, 70)}...`,
          originalUrl: item.originalUrl,
          embedUrl: parsedVideo.embedUrl,
          platform: parsedVideo.platform,
          aspectRatio: parsedVideo.aspectRatio,
          duration: '01:30',
          viewsCount: Math.floor(Math.random() * 15000) + 1200,
          publishedAt: new Date().toISOString().split('T')[0],
        };

        addEpisodeToSeries(matchedSeries.id, newEp);
        newlyAddedEpisodesCount++;
      }
    }

    return NextResponse.json({
      success: true,
      scrapedCount: extractedList.length,
      createdSeriesCount: newlyCreatedSeriesCount,
      addedEpisodesCount: newlyAddedEpisodesCount,
      items: extractedList,
    });
  } catch (error) {
    console.error('Batch import error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý dữ liệu hàng loạt' }, { status: 500 });
  }
}
