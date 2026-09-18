import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { slugify } from '@/lib/parser';

const DB_PATH = path.join(process.cwd(), 'src/data/database.json');

export async function POST(req: Request) {
  try {
    const { items, channelName } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Không có video nào được chọn để duyệt' }, { status: 400 });
    }

    const fileData = fs.readFileSync(DB_PATH, 'utf-8');
    let db = JSON.parse(fileData);
    let addedCount = 0;
    const effectiveChannelName = channelName?.trim() || 'Đại Đạo Review';

    for (const item of items) {
      const cleanId = item.id || Date.now().toString().slice(-6);
      
      // Kiểm tra trùng lặp URL
      const exists = db.some((s: any) => s.episodes?.some((ep: any) => 
        (ep.originalUrl && (ep.originalUrl === item.url || ep.originalUrl.includes(cleanId)))
      ));
      if (exists) continue;

      const cat = item.category || 'Tu Tiên';
      const title = item.title.trim();
      const slug = slugify(title) + '-' + cleanId.slice(-4);
      const posterImg = item.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';

      const newFilm = {
        id: 'series-2am-' + cleanId,
        slug,
        title,
        description: `Tổng hợp trọn bộ review phim tóm tắt ${title} full thuyết minh mới nhất.`,
        thumbnail: posterImg,
        coverImage: posterImg,
        channelName: effectiveChannelName,
        genres: [cat, 'Hoạt Hình 3D', 'Reels', 'Review Tóm Tắt', 'Full Thuyết Minh'],
        categories: [cat, 'Hoạt Hình 3D', 'Reels'],
        totalEpisodes: 1,
        featured: false,
        updatedAt: new Date().toISOString().split('T')[0],
        episodes: [
          {
            id: 'ep-2am-' + cleanId,
            seriesId: 'series-2am-' + cleanId,
            partNumber: 1,
            title,
            originalUrl: item.url,
            embedUrl: item.embedUrl || (item.url.includes('youtube.com') || item.url.includes('youtu.be')
              ? `https://www.youtube.com/embed/${cleanId}`
              : 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(item.url) + '&show_text=0&autoplay=0'),
            platform: item.platform || (item.url.includes('youtube.com') || item.url.includes('youtu.be') ? 'youtube' : 'facebook'),
            aspectRatio: (item.url.includes('youtube.com') || item.url.includes('youtu.be')) ? '16:9' : '9:16',
            duration: '01:30',
            thumbnail: posterImg,
            viewsCount: 15000 + Math.floor(Math.random() * 85000),
            publishedAt: new Date().toISOString().split('T')[0]
          }
        ]
      };

      db.unshift(newFilm);
      addedCount++;
    }

    if (addedCount > 0) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }

    return NextResponse.json({
      success: true,
      addedCount,
      message: `🎉 Đã duyệt và đưa thành công ${addedCount} video lên trang chính website!`
    });
  } catch (error: any) {
    console.error('Lỗi khi duyệt video:', error);
    return NextResponse.json({ error: 'Lỗi khi lưu video duyệt: ' + error?.message }, { status: 500 });
  }
}
