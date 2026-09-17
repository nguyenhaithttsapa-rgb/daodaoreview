import { NextResponse } from 'next/server';
import { searchReelsByKeyword } from '../../../../scripts/search_and_crawl.mjs';

export async function POST(req: Request) {
  try {
    const { keyword, channelName } = await req.json();

    if (!keyword || !keyword.trim()) {
      return NextResponse.json({ error: 'Từ khóa tìm kiếm không được để trống' }, { status: 400 });
    }

    // 1. Bot tìm kiếm danh sách link Reels liên quan
    const searchResults = await searchReelsByKeyword(keyword.trim(), 10);

    if (!searchResults || searchResults.length === 0) {
      // Dữ liệu dự phòng thông minh nếu IP bị rate-limit
      return NextResponse.json({
        success: false,
        message: `Chưa tìm thấy Reels mới cho từ khóa "${keyword}". Bạn có thể dán link trực tiếp vào khung Bóc Tách bên dưới.`,
      });
    }

    // 2. Chuyển thành văn bản batch để gọi bộ bóc tách thông minh
    const rawText = searchResults.map((item: any) => `${item.url}\n${item.title}`).join('\n\n');

    const internalRes = await fetch('http://localhost:3000/api/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText,
        channelName: channelName || 'Kênh Tìm Kiếm Tự Động',
      }),
    });

    const batchData = await internalRes.json();

    return NextResponse.json({
      success: true,
      foundCount: searchResults.length,
      batchData,
      keyword,
    });
  } catch (error: any) {
    console.error('Auto search crawl error:', error);
    return NextResponse.json({ error: 'Lỗi khi bot tìm kiếm và cào: ' + error.message }, { status: 500 });
  }
}
