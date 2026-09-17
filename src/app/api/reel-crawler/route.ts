import { NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

import { isReelEmbeddable } from '@/lib/videoChecker';
import { cleanCaption } from '@/lib/captionCleaner';

const DB_PATH = path.join(process.cwd(), 'src/data/database.json');

const TITLE_TEMPLATES = [
  { film: 'Chiến Thần Hắc Giáp', category: 'Tu Tiên', genre: 'Tu Tiên, Huyền Huyễn, Nhiệt Huyết', desc: 'Thiếu niên khoác lên mình chiến giáp tử thần, một kiếm phá vỡ gông xiềng phong ấn ngàn năm.' },
  { film: 'Vạn Cổ Đệ Nhất Thần', category: 'Huyền Huyễn', genre: 'Huyền Huyễn, Tu Tiên, Hành Động', desc: 'Thiếu niên thức tỉnh thần mạch thượng cổ, trấn áp vạn giới thần ma đỉnh phong.' },
  { film: 'Phàm Nhân Tu Tiên Chi Lộ', category: 'Tu Tiên', genre: 'Tu Tiên, Huyền Huyễn, Cổ Trang', desc: 'Hành trình từ một thiếu niên bình phàm bước từng bước lên đỉnh cao tiên giới huyền ảo.' },
  { film: 'Đại Chiến Đô Thị 3D', category: 'Hành Động', genre: 'Hành Động, Đô Thị, Kịch Tính', desc: 'Khi bóng tối bao trùm, người hùng ẩn danh thức tỉnh sức mạnh siêu nhiên lập lại trật tự.' },
  { film: 'Trọng Sinh Thành Bá Chủ', category: 'Trọng Sinh', genre: 'Trọng Sinh, Huyền Huyễn, Nghịch Thiên', desc: 'Trọng sinh quay lại thời khắc khởi nguyên, nắm rõ tương lai trả thù tất cả kẻ thù kiếp trước.' },
  { film: 'Nữ Tổng Tài Quyền Lực', category: 'Đô Thị', genre: 'Đô Thị, Kịch Tính, Thương Trường', desc: 'Bản lĩnh sắc lạnh của nữ cường nhân đứng trên đỉnh cao giới tài chính thương trường.' },
  { film: 'Thần Y Rể Quý Xuất Sơn', category: 'Kịch Tính', genre: 'Kịch Tính, Đô Thị, Hành Động', desc: 'Ẩn nhẫn suốt 3 năm làm người bình thường, ngày thân phận bại lộ chấn động toàn bộ giới thượng lưu.' },
  { film: 'Cổ Trang Tuyệt Sắc Y Nữ', category: 'Cổ Trang', genre: 'Cổ Trang, Huyền Huyễn, Tu Tiên', desc: 'Hành trình hành y cứu người của nữ thần y bí ẩn giữa thời loạn lạc tranh đoạt giang hồ.' },
  { film: 'Nghịch Thiên Chí Tôn', category: 'Nghịch Thiên', genre: 'Nghịch Thiên, Tu Tiên, Huyền Huyễn', desc: 'Thiên đạo bất công, một mình một kiếm nghịch thiên sửa mệnh chém tan cấm chế.' },
  { film: 'Màn Lật Kèo Kinh Điển', category: 'Kịch Tính', genre: 'Kịch Tính, Đô Thị, Hành Động', desc: 'Kẻ mưu mô tưởng chừng nắm chắc chiến thắng, ngờ đâu tất cả chỉ là cái bẫy giăng sẵn.' },
  { film: 'Công Chúa Tiên Giới', category: 'Cổ Trang', genre: 'Cổ Trang, Tiên Hiệp, Huyền Huyễn', desc: 'Nàng tiên kiều diễm bước chân xuống nhân gian để giải mã bí mật thân thế kiếp trước.' },
  { film: 'Đoạn Kết Mãn Nhãn', category: 'Kịch Tính', genre: 'Kịch Tính, Tâm Lý, Đô Thị', desc: 'Trải qua muôn vàn sóng gió trắc trở, chân tướng sự thật rốt cuộc cũng được đưa ra ánh sáng.' }
];

export async function POST(req: Request) {
  let browser = null;
  try {
    const { 
      url, 
      channelName, 
      filmName, 
      category, 
      uploadedImage, 
      maxVideos = 50 
    } = await req.json();

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

    let allReels: any[] = [];
    const currentUrl = page.url();
    const isSingleReel = (
      (targetUrl.includes('/reel/') || targetUrl.includes('/share/') || targetUrl.includes('/watch') || targetUrl.includes('/videos/')) &&
      !targetUrl.includes('sk=reels_tab')
    ) || (
      (currentUrl.includes('/reel/') || currentUrl.includes('/watch') || currentUrl.includes('/videos/')) &&
      !currentUrl.includes('sk=reels_tab')
    );

    if (isSingleReel) {
      // 1. Chế độ bóc tách chính xác Reel / Video đơn lẻ (hỗ trợ cả link rút gọn share/v/)
      const effectiveUrl = currentUrl.includes('/reel/') || currentUrl.includes('/watch') ? currentUrl : targetUrl;
      const reelMatch = effectiveUrl.match(/(?:reel|videos|v)[/=]([0-9]+)/) || targetUrl.match(/(?:reel|videos|v)[/=]([0-9]+)/);
      const reelId = reelMatch ? reelMatch[1] : (effectiveUrl.match(/\/([a-zA-Z0-9_-]+)(?:\/|\?|$)/)?.[1] || Date.now().toString());
      const reelUrl = reelMatch ? `https://www.facebook.com/reel/${reelId}/` : effectiveUrl.split('?')[0];

      const singleData = await page.evaluate(() => {
        const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const desc = document.querySelector('meta[name="description"]')?.getAttribute('content');
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');

        // Tìm caption từ DOM
        const elements = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
        const texts = elements.map(el => (el as HTMLElement).innerText?.trim()).filter(Boolean);
        const validCaption = texts.find(t => t.length > 15 && !t.includes('Đăng nhập') && !t.includes('người theo dõi') && !t.includes('Facebook'));

        return {
          rawCaption: ogDesc || desc || validCaption || ogTitle || '',
          poster: ogImage || ''
        };
      });

      const extractedTitle = cleanCaption(singleData.rawCaption);

      allReels = [{
        id: reelId,
        url: reelUrl,
        poster: singleData.poster,
        rawCaption: extractedTitle || singleData.rawCaption
      }];
    } else {
      // 2. Chế độ cào hàng loạt theo mục Reels của Fanpage
      let noChangeCount = 0;
      let previousCount = 0;

      for (let i = 0; i < 100; i++) {
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

        for (const reel of currentBatch) {
          if (!allReels.some(r => r.id === reel.id)) {
            allReels.push(reel);
          }
        }

        if (allReels.length === previousCount) {
          noChangeCount++;
          if (noChangeCount >= 4) {
            break;
          }
        } else {
          noChangeCount = 0;
          previousCount = allReels.length;
        }

        await page.evaluate(() => {
          document.body.style.overflow = 'auto';
          document.documentElement.style.overflow = 'auto';
          document.querySelectorAll('div[role="dialog"]').forEach(d => d.remove());
        });

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        for (let j = 0; j < 5; j++) {
          await page.mouse.wheel(0, 2000);
          await page.waitForTimeout(500);
          await page.keyboard.press('PageDown');
          await page.waitForTimeout(500);
        }

        await page.waitForTimeout(2000);
      }
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
    let blockedCount = 0;
    const addedItems: any[] = [];
    const effectiveChannelName = channelName?.trim() || 'Khu Trú Ẩn 2AM';

    // 1. Nạp video mới vào cơ sở dữ liệu (Có kiểm tra quyền nhúng trước khi lưu)
    for (let idx = 0; idx < reels.length; idx++) {
      const r = reels[idx];
      const cleanId = r.id;
      const exists = db.some((s: any) => s.episodes?.some((ep: any) => 
        (ep.originalUrl && (ep.originalUrl === r.url || ep.originalUrl.includes(cleanId)))
      ));
      if (exists) continue;

      // KIỂM TRA QUYỀN NHÚNG: Bỏ qua video nếu Facebook chặn nhúng ngoại trang
      const canEmbed = await isReelEmbeddable(r.url);
      if (!canEmbed) {
        console.log(`[ReelCrawler] ❌ Bỏ qua video bị chặn nhúng hoặc riêng tư: ${r.url}`);
        blockedCount++;
        continue;
      }

      const template = TITLE_TEMPLATES[idx % TITLE_TEMPLATES.length];

      // Lấy Tên Phim và Thể Loại
      let baseFilm = filmName?.trim();
      let cat = category?.trim();

      if (!baseFilm) {
        if (r.rawCaption && r.rawCaption.length >= 6 && !r.rawCaption.startsWith('http')) {
          let firstLine = r.rawCaption.split('\n')[0].replace(/#\w+/g, '').replace(/[🔥⚡💥✨🎉🎬❤️👍👇👉\[\]\(\)]/g, '').trim();
          if (firstLine.length > 100) firstLine = firstLine.slice(0, 100).trim();
          baseFilm = firstLine || template.film;
        } else {
          baseFilm = template.film;
        }
      }

      if (!cat) {
        cat = template.category;
      }

      // Làm sạch các chữ tập/part trong baseFilm nếu có
      baseFilm = baseFilm
        .replace(/(?:tập|tap|part|ep|hồi)\s*\d+/gi, '')
        .replace(/#\d+/g, '')
        .replace(/\s*-\s*$/, '')
        .replace(/\s*:\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();

      // CẤU TRÚC CHUẨN SEO: [Tên Phim] - Review Tóm Tắt - [Thể loại] - Full Thuyết Minh
      const videoTitle = `${baseFilm} - Review Tóm Tắt - ${cat} - Full Thuyết Minh`;

      const slug = (baseFilm + '-' + (idx + 1))
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + cleanId.slice(-4);

      const posterImg = r.poster || uploadedImage || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';

      addedItems.push({
        id: cleanId,
        url: r.url,
        title: videoTitle,
        category: cat,
        poster: posterImg,
        channelName: effectiveChannelName
      });
    }

    const resultMessage = addedItems.length > 0
      ? `🎉 Bot đã cào xong! Tìm thấy ${addedItems.length} video hợp lệ (Đã lọc ${blockedCount} video lỗi/chặn). Bạn hãy kiểm tra, chỉnh sửa tiêu đề/thể loại bên dưới rồi bấm 'Duyệt Vào Web'! 🚀`
      : `✅ Kênh ${effectiveChannelName}: Đã quét ${reels.length} video (Bỏ qua ${blockedCount} video không hợp lệ), không có video mới nào cần thêm!`;

    return NextResponse.json({
      success: true,
      foundCount: reels.length,
      blockedCount,
      channelName: effectiveChannelName,
      message: resultMessage,
      stagedItems: addedItems
    });

  } catch (error: any) {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    console.error('Reel Crawler Bot Error:', error);
    return NextResponse.json({ error: 'Lỗi khi Bot cào video: ' + (error?.message || error) }, { status: 500 });
  }
}
