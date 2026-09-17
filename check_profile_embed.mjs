import { chromium } from 'playwright';

const targetUrl = 'https://www.facebook.com/profile.php?id=61593854181537&sk=reels_tab';

async function check() {
  console.log('Đang mở trình duyệt kiểm tra profile:', targetUrl);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    const reels = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));
      return links.map(a => {
        const m = a.href.match(/reel\/(\d+)/);
        return m ? `https://www.facebook.com/reel/${m[1]}/` : null;
      }).filter(Boolean);
    });

    const uniqueReels = Array.from(new Set(reels));
    console.log(`Tìm thấy ${uniqueReels.length} reels trên trang:`, uniqueReels.slice(0, 5));

    if (uniqueReels.length === 0) {
      console.log('Không tìm thấy link reel nào trực tiếp.');
    } else {
      for (const reelUrl of uniqueReels.slice(0, 3)) {
        const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(reelUrl)}&show_text=0`;
        console.log('\nKiểm tra nhúng video:', reelUrl);
        
        const testPage = await context.newPage();
        await testPage.goto(embedUrl, { waitUntil: 'networkidle', timeout: 15000 });
        await testPage.waitForTimeout(2000);
        
        const bodyText = await testPage.evaluate(() => document.body.innerText);
        const hasError = bodyText.includes('Video Unavailable') || bodyText.includes('không khả dụng') || bodyText.includes('may no longer exist') || bodyText.includes('chưa sẵn sàng');

        if (hasError) {
          console.log(`❌ KHÔNG CHO NHÚNG hoặc LỖI: ${bodyText.replace(/\n+/g, ' ').slice(0, 100)}`);
        } else {
          console.log('✅ CHO PHÉP NHÚNG THÀNH CÔNG!');
        }
        await testPage.close();
      }
    }
  } catch (err) {
    console.error('Lỗi khi kiểm tra:', err);
  } finally {
    await browser.close();
  }
}

check();
