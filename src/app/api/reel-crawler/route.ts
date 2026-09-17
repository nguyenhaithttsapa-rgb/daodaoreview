import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/data/database.json');

const TITLE_TEMPLATES = [
  { title: 'Mối Tình Học Đường Của Nữ Thần Thanh Xuân', category: 'Thanh Xuân', genre: 'Thanh Xuân, Học Đường, Ngôn Tình', desc: 'Hồi ức thanh xuân ngọt ngào nhưng đầy trắc trở của cô gái nhỏ nơi sân trường đầy kỷ niệm.' },
  { title: 'Nước Mắt Mỹ Nhân: Nỗi Đau Giấu Kín Sau Nụ Cười', category: 'Ngôn Tình', genre: 'Tình Cảm, Tâm Lý, Đô Thị', desc: 'Nỗi lòng của người con gái khi người thân yêu nhất quay lưng phản bội.' },
  { title: 'Cổ Trang Huyền Ảo: Nàng Y Nữ Tuyệt Sắc Chữa Lành Vết Thương Thiên Hạ', category: 'Cổ Trang', genre: 'Cổ Trang, Huyền Huyễn, Tu Tiên', desc: 'Hành trình hành y cứu người của nữ thần y bí ẩn giữa thời loạn lạc tranh đoạt giang hồ.' },
  { title: 'Tình Yêu Sau Bức Rèm Nhung: Bí Mật Chốn Hào Môn', category: 'Đô Thị', genre: 'Đô Thị, Ngôn Tình, Kịch Tính', desc: 'Khoảnh khắc ngọt ngào lẫn toan tính sau cánh cửa gia tộc tài phiệt quyền lực.' },
  { title: 'Chiến Thần Hắc Giáp: Ma Quân Tái Sinh Trấn Áp Tam Giới', category: 'Tu Tiên', genre: 'Tu Tiên, Huyền Huyễn, Nhiệt Huyết', desc: 'Thiếu niên khoác lên mình chiến giáp tử thần, một kiếm phá vỡ gông xiềng phong ấn ngàn năm.' },
  { title: 'Bé Con Đáng Yêu: Siêu Quậy Xuyên Không Gây Bão Gia Đình', category: 'Hài Hước', genre: 'Hoạt Hình 3D, Hài Hước, Gia Đình', desc: 'Những pha xử lý dở khóc dở cười của cô bé dễ thương khiến người lớn phải chào thua.' },
  { title: 'Nhan Sắc Khuynh Thành: Nữ Sát Thủ Bí Ẩn Dưới Ánh Đèn Đô Thị', category: 'Đô Thị', genre: 'Đô Thị, Kịch Tính, Hành Động', desc: 'Đằng sau vẻ đẹp kiêu sa là thân phận sát thủ ngầm chưa từng thất bại một nhiệm vụ nào.' },
  { title: 'Nữ Tổng Tài Quyền Lực: Một Tay Thao Túng Thị Trường Tài Chính', category: 'Đô Thị', genre: 'Đô Thị, Ngôn Tình, Thương Trường', desc: 'Bản lĩnh sắc lạnh của người phụ nữ đứng trên đỉnh cao quyền lực giới kinh doanh.' },
  { title: 'Ánh Mắt U Uất: Đoạn Tuyệt Duyên Nợ Kiếp Này', category: 'Ngôn Tình', genre: 'Tình Cảm, Bi Kịch, Đô Thị', desc: 'Khi tình cảm chân thành bị chà đạp, sự rời đi thanh thản là lời đáp trả đắt giá nhất.' },
  { title: 'Công Chúa Tiên Giới: Giáng Trần Tìm Lại Phong Ấn Ký Ức', category: 'Cổ Trang', genre: 'Cổ Trang, Tiên Hiệp, Huyền Huyễn', desc: 'Nàng tiên kiều diễm bước chân xuống nhân gian để giải mã bí mật thân thế kiếp trước.' },
  { title: 'Thân Phận Thật Sự Của Chàng Lái Xe Khiến Cả Khách Sạn Kinh Ngạc', category: 'Đô Thị', genre: 'Đô Thị, Huyền Huyễn, Kịch Tính', desc: 'Ẩn nhẫn suốt 3 năm làm người bình thường, ngày thân phận bại lộ chấn động toàn bộ giới thượng lưu.' },
  { title: 'Màn Lật Kèo Không Ngờ Khiến Kẻ Hãm Hại Phải Quỳ Gối Xin Lỗi', category: 'Kịch Tính', genre: 'Kịch Tính, Đô Thị, Hành Động', desc: 'Kẻ mưu mô tưởng chừng nắm chắc chiến thắng, ngờ đâu tất cả chỉ là cái bẫy giăng sẵn.' },
  { title: 'Đoạn Kết Mãn Nhãn Của Cuộc Đấu Trí Quyền Lực Và Tình Yêu', category: 'Ngôn Tình', genre: 'Ngôn Tình, Tâm Lý, Đô Thị', desc: 'Trải qua muôn vàn sóng gió trắc trở, chân tướng sự thật rốt cuộc cũng được đưa ra ánh sáng.' },
  { title: 'Đại Chiến Đô Thị: Người Hùng Ẩn Danh Cứu Nguy Cả Thành Phố', category: 'Hành Động', genre: 'Hành Động, Siêu Nhiên, Kịch Tính', desc: 'Khi bóng tối bao trùm, một bóng hình bí ẩn xuất hiện lập lại trật tự công lý.' }
];

export async function POST(req: Request) {
  let browser = null;
  try {
    const { url, channelName, uploadedImage, maxVideos = 50 } = await req.json();

    const targetUrl = (url && url.trim()) ? (url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim()) : 'https://www.facebook.com/profile.php?id=61590438917651&sk=reels_tab';

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.keyboard.press('Escape');

    let noChangeCount = 0;
    let previousCount = 0;
    
    // Lưu danh sách reels thu thập được qua các lần cuộn (chống DOM ảo của FB)
    let allReels: any[] = [];

    // Scroll liên tục cho đến khi không còn video mới (không giới hạn)
    for (let i = 0; i < 100; i++) { // Giới hạn tối đa 100 lần cuộn để tránh vô hạn
      const currentBatch = await page.evaluate(() => {
        const results: any[] = [];
        const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));
        for (const a of links) {
          const href = (a as HTMLAnchorElement).href;
          const match = href.match(/reel\/(\d+)/);
          if (!match) continue;
          const reelId = match[1];
          const reelUrl = 'https://www.facebook.com/reel/' + reelId + '/';
          const img = a.querySelector('img') || a.parentElement?.querySelector('img');
          const poster = img ? (img as HTMLImageElement).src : '';
          let text = (a as HTMLElement).innerText || a.getAttribute('aria-label') || '';
          if (!text && a.parentElement) {
            text = (a.parentElement as HTMLElement).innerText || '';
          }
          results.push({
            id: reelId,
            url: reelUrl,
            poster,
            rawCaption: text.replace(/\n+/g, ' ').trim()
          });
        }
        return results;
      });

      // Thêm các video chưa có vào mảng tổng
      for (const reel of currentBatch) {
        if (!allReels.some(r => r.id === reel.id)) {
          allReels.push(reel);
        }
      }

      if (allReels.length === previousCount) {
        noChangeCount++;
        if (noChangeCount >= 4) {
          break; // Đã cuộn 4 lần mà không thêm được video nào
        }
      } else {
        noChangeCount = 0;
        previousCount = allReels.length;
      }

      // Xóa các block ẩn bằng JS để đề phòng
      await page.evaluate(() => {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.querySelectorAll('div[role="dialog"]').forEach(d => d.remove());
      });

      // Bắt buộc dùng phím và chuột thật của Playwright để kích hoạt sự kiện React
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      for (let j = 0; j < 5; j++) {
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(500);
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(2000); // Chờ 2s để API Facebook trả data
    }

    const reels = allReels;

    await browser.close();
    browser = null;

    if (!reels || reels.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Không tìm thấy video Reels nào tại link này. Hãy đảm bảo Fanpage hoặc mục Reels ở chế độ công khai.'
      });
    }

    const fileData = fs.readFileSync(DB_PATH, 'utf-8');
    let db = JSON.parse(fileData);
    let addedCount = 0;
    const addedItems: any[] = [];
    const effectiveChannelName = channelName?.trim() || 'Khu Trú Ẩn 2AM';

    // 1. Nạp video mới vào cơ sở dữ liệu
    reels.forEach((r, idx) => {
      const cleanId = r.id;
      const exists = db.some((s: any) => s.episodes?.some((ep: any) => 
        (ep.originalUrl && (ep.originalUrl === r.url || ep.originalUrl.includes(cleanId)))
      ));
      if (exists) return;

      const template = TITLE_TEMPLATES[idx % TITLE_TEMPLATES.length];
      const videoTitle = template.title + ' #' + (idx + 1);
      const slug = template.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + cleanId.slice(-4);

      const posterImg = r.poster || uploadedImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';

      const newFilm = {
        id: 'series-2am-' + cleanId,
        slug,
        title: videoTitle,
        description: template.desc,
        thumbnail: posterImg,
        coverImage: posterImg,
        channelName: effectiveChannelName,
        genres: [template.category, 'Hoạt Hình 3D', 'Reels', template.genre.split(', ')[0]],
        categories: [template.category, 'Hoạt Hình 3D', 'Reels'],
        totalEpisodes: 1,
        featured: false,
        updatedAt: new Date().toISOString().split('T')[0],
        episodes: [
          {
            id: 'ep-2am-' + cleanId,
            seriesId: 'series-2am-' + cleanId,
            partNumber: 1,
            title: videoTitle,
            originalUrl: r.url,
            embedUrl: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(r.url) + '&show_text=0&autoplay=0',
            platform: 'facebook',
            aspectRatio: '9:16',
            duration: '01:30',
            thumbnail: posterImg,
            viewsCount: 15000 + Math.floor(Math.random() * 85000),
            publishedAt: new Date().toISOString().split('T')[0]
          }
        ]
      };

      db.unshift(newFilm);
      addedCount++;
      addedItems.push({
        title: videoTitle,
        url: r.url,
        poster: posterImg,
        genre: template.category
      });
    });

    // Lưu trực tiếp từng video là 1 tác phẩm độc lập (không gom ép các video khác nhau vào cùng 1 bộ)
    if (addedCount > 0) {
      db.forEach((s: any) => s.featured = false);
      db[0].featured = true;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }

    const channelVideos = db.filter((s: any) => s.channelName === effectiveChannelName || s.id.startsWith('series-2am-') || s.id.startsWith('series-'));
    const previewList = addedItems.length > 0 
      ? addedItems 
      : channelVideos.slice(0, 10).map((s: any) => ({
          title: s.title,
          url: s.episodes[0]?.originalUrl,
          poster: s.thumbnail,
          genre: s.genres?.[0] || 'Hoạt Hình 3D'
        }));

    const resultMessage = addedCount > 0
      ? '🎉 Bot đã cào thành công! Tìm thấy ' + reels.length + ' video, nạp mới ' + addedCount + ' video độc lập ra trang chính!'
      : '✅ Kênh ' + effectiveChannelName + ': Tất cả ' + reels.length + ' video Reels đã hiển thị đầy đủ thành từng tác phẩm độc lập trên web!';

    return NextResponse.json({
      success: true,
      foundCount: reels.length,
      addedCount,
      channelName: effectiveChannelName,
      message: resultMessage,
      previewItems: previewList
    });

  } catch (error: any) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    console.error('Reel Crawler Bot Error:', error);
    return NextResponse.json({ error: 'Lỗi khi Bot cào video: ' + (error?.message || error) }, { status: 500 });
  }
}
