import { chromium } from 'playwright';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'scripts', 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Lỗi đọc file config:', e);
  }
  return { fanpages: [], checkIntervalMinutes: 30, headless: true };
}

async function scrapeFanpage(pageUrl, channelName, headless = true) {
  console.log(`\n🤖 [BOT] Bắt đầu quét Fanpage: "${channelName}" (${pageUrl})...`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Đi tới URL Fanpage Reels
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Cuộn trang nhiều lần để tải thêm Reels
    console.log(`📜 [BOT] Đang cuộn trang lấy tất cả Reels...`);
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(2000);
    }

    // Bóc tách danh sách Reels
    const extractedData = await page.evaluate(() => {
      const items = [];
      const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));

      for (const a of links) {
        const href = a.href.split('?')[0];
        // Tìm text mô tả chi tiết: lấy từ aria-label, img alt, hoặc các thẻ span/div lân cận
        const container = a.closest('[role="article"]') || a.parentElement?.parentElement || a.parentElement;
        const textElements = container ? Array.from(container.querySelectorAll('span, div')) : [];
        
        let bestCaption = '';
        for (const el of textElements) {
          const t = (el.innerText || '').trim();
          // Bỏ qua các text chỉ chứa lượt xem như "17K", "2,4K", "Phát"
          if (t && t.length > bestCaption.length && !/^\d+[,.]?\d*\s*[KkMm]?$/.test(t) && !/^\d+:\d+$/.test(t)) {
            bestCaption = t;
          }
        }

        const fallback = a.getAttribute('aria-label') || a.innerText || 'Phim Hoạt Hình 3D';
        const finalCaption = bestCaption || fallback;

        if (href && !items.some((it) => it.url === href)) {
          items.push({
            url: href,
            caption: finalCaption.replace(/\n+/g, ' ').trim(),
          });
        }
      }
      return items;
    });

    console.log(`🔍 [BOT] Phát hiện ${extractedData.length} video Reel từ "${channelName}".`);

    if (extractedData.length > 0) {
      const rawText = extractedData.map((r) => `${r.url}\n${r.caption}`).join('\n\n');

      // Gửi vào API Web của chúng ta
      const res = await fetch('http://localhost:3000/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          channelName,
        }),
      });

      const json = await res.json();
      console.log(`✅ [BOT] Đồng bộ thành công:`, {
        'Tổng số video': json.scrapedCount,
        'Bộ phim mới tạo': json.createdSeriesCount,
        'Tập mới thêm vào': json.addedEpisodesCount,
      });
    }
  } catch (error) {
    console.error(`❌ [BOT] Lỗi khi cào từ ${channelName}:`, error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function runAllJobs() {
  const config = loadConfig();
  console.log(`\n======================================================`);
  console.log(`⏰ [BOT] Bắt đầu phiên quét lúc: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`🎯 Số lượng Fanpage cần theo dõi: ${config.fanpages.length}`);

  for (const target of config.fanpages) {
    await scrapeFanpage(target.url, target.name, config.headless);
  }
  console.log(`🏁 [BOT] Hoàn tất phiên quét. Chờ phiên tiếp theo...`);
  console.log(`======================================================\n`);
}

// 1. Chạy ngay 1 lần khi khởi động bot
runAllJobs();

// 2. Lên lịch chạy định kỳ mỗi 30 phút (hoặc theo cấu hình cron)
// "*/30 * * * *" = Mỗi 30 phút chạy 1 lần
cron.schedule('*/30 * * * *', () => {
  runAllJobs();
});

console.log('🤖 BOT TỰ ĐỘNG CÀO FACEBOOK REELS ĐÃ BẬT!');
console.log('Bot đang chạy ngầm và sẽ tự động quét định kỳ mỗi 30 phút.');
