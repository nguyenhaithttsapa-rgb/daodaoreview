/**
 * Script cào tự động video Facebook Reels từ Fanpage
 * Cách chạy: node scripts/scrape_page_reels.mjs "https://www.facebook.com/ten_page/reels"
 */
import { chromium } from 'playwright';

import fs from 'fs';

const config = JSON.parse(fs.readFileSync('scripts/config.json', 'utf-8'));
const pageUrl = config.fanpages?.[0]?.url || 'https://www.facebook.com/profile.php?id=61566431730101&sk=reels_tab';

async function crawl() {
  console.log(`🚀 Bắt đầu mở trình duyệt cào dữ liệu từ: ${pageUrl}...`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Nhấp vào vùng nội dung và mô phỏng cuộn bằng chuột để kích hoạt Facebook lazy load
    console.log('📜 Đang kích hoạt tải dữ liệu cuộn sâu Facebook...');
    // Thử đóng pop-up nếu có (close button / Esc)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    for (let i = 0; i < 15; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(1800);
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1000);
    }

    // Bóc tách tất cả link chứa /reel/ và các đoạn text caption xung quanh
    const reelsData = await page.evaluate(() => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));

      for (const a of links) {
        const href = a.href;
        const match = href.match(/reel\/(\d+)/);
        if (!match) continue;
        const reelUrl = `https://www.facebook.com/reel/${match[1]}/`;
        
        // Poster image
        const img = a.querySelector('img') || a.parentElement?.querySelector('img');
        const poster = img ? img.src : '';

        // Caption
        let caption = a.innerText || a.getAttribute('aria-label') || '';
        if (!caption && a.parentElement) {
          caption = a.parentElement.innerText || '';
        }

        if (!results.some(r => r.url === reelUrl)) {
          results.push({
            url: reelUrl,
            poster: poster,
            caption: caption.replace(/\n+/g, ' ').trim()
          });
        }
      }
      return results;
    });

    console.log(`✅ Đã tìm thấy ${reelsData.length} video Reel!`);
    console.log(JSON.stringify(reelsData, null, 2));

    // Đẩy trực tiếp vào API batch-import của hệ thống
    if (reelsData.length > 0) {
      const rawText = reelsData.map(r => `${r.url}\n${r.caption}`).join('\n\n');
      const response = await fetch('http://localhost:3000/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          channelName: 'Movie Xàm',
        }),
      });
      const result = await response.json();
      console.log('🎉 Kết quả nhập vào hệ thống web:', result);

      // Cập nhật lại poster ảnh thật và nhóm đúng thể loại Phim Ngắn Đô Thị cho Movie Xàm
      try {
        const dbPath = 'src/data/database.json';
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        
        // Tạo hoặc gộp thành một series chuẩn "Movie Xàm - Tuyển Tập Phim Ngắn Đô Thị"
        const seriesList = Array.isArray(db) ? db : db.series || [];
        
        // Tìm các series tạm vừa sinh bởi batch import có channelName là Movie Xàm
        const tempXam = seriesList.filter(s => s.channelName === 'Movie Xàm' && s.id !== 'movie-xam-tuyen-tap');
        
        let mainSeries = seriesList.find(s => s.id === 'movie-xam-tuyen-tap');
        if (!mainSeries) {
          mainSeries = {
            id: 'movie-xam-tuyen-tap',
            slug: 'movie-xam-tuyen-tap-phim-ngan-kich-tinh',
            title: 'Movie Xàm - Phim Ngắn Đô Thị & Kịch Tính',
            description: 'Tổng hợp trọn bộ các thước phim ngắn, drama kịch tính triệu view đặc sắc nhất từ kênh Movie Xàm.',
            thumbnail: reelsData[0]?.poster || '',
            coverImage: reelsData[0]?.poster || '',
            channelName: 'Movie Xàm',
            categories: ['Phim Ngắn', 'Đô Thị', 'Kịch Tính', 'Reels'],
            totalEpisodes: 0,
            featured: true,
            updatedAt: new Date().toISOString().split('T')[0],
            episodes: []
          };
          seriesList.unshift(mainSeries);
        }

        // Đổ toàn bộ episodes từ reelsData vào mainSeries
        reelsData.forEach((r, idx) => {
          const epIndex = reelsData.length - idx;
          const matchedEp = mainSeries.episodes.find(e => e.originalUrl === r.url || e.originalUrl.includes(r.url.split('/')[4]));
          if (!matchedEp) {
            mainSeries.episodes.push({
              id: `ep-movie-xam-${r.url.split('/')[4]}`,
              seriesId: mainSeries.id,
              partNumber: epIndex,
              title: `Tập ${epIndex}: Kịch Tính Triệu View #${epIndex}`,
              originalUrl: r.url,
              embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(r.url)}&show_text=0&autoplay=0`,
              platform: 'facebook',
              aspectRatio: '9:16',
              duration: '01:30',
              thumbnail: r.poster,
              viewsCount: 3500 + Math.floor(Math.random() * 8500),
              publishedAt: new Date().toISOString().split('T')[0]
            });
          } else if (r.poster) {
            matchedEp.thumbnail = r.poster;
          }
        });

        mainSeries.totalEpisodes = mainSeries.episodes.length;
        if (reelsData[0]?.poster) {
          mainSeries.thumbnail = reelsData[0].poster;
          mainSeries.coverImage = reelsData[0].poster;
        }

        // Xóa bớt các series rác phân mảnh do view count làm tên
        const cleanedList = seriesList.filter(s => !(s.channelName === 'Movie Xàm' && s.id !== 'movie-xam-tuyen-tap'));

        fs.writeFileSync(dbPath, JSON.stringify(cleanedList, null, 2), 'utf-8');
        console.log(`🖼️ Đã gộp và cập nhật ảnh bìa thật chuẩn xác cho ${mainSeries.episodes.length} tập phim Movie Xàm!`);
      } catch (e) {
        console.error('Lỗi khi cập nhật poster:', e);
      }
    }
  } catch (err) {
    console.error('❌ Lỗi khi cào dữ liệu:', err);
  } finally {
    await browser.close();
  }
}

crawl();
