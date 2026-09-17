import { chromium } from 'playwright';

/**
 * Tìm kiếm link Facebook Reel tự động bằng truy vấn:
 * site:facebook.com/reel "từ khóa"
 */
export async function searchReelsByKeyword(keyword, maxResults = 10) {
  console.log(`🔍 [BOT SEARCH] Truy vấn: site:facebook.com/reel "${keyword}"...`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // 1. Thử tìm kiếm trên DuckDuckGo với query site:facebook.com
    const query = encodeURIComponent(`site:facebook.com/reel ${keyword}`);
    const searchUrl = `https://duckduckgo.com/html/?q=${query}`;

    console.log(`🌐 Đang quét: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    let results = await page.evaluate(() => {
      const items = [];
      const links = Array.from(document.querySelectorAll('a'));

      for (const a of links) {
        const href = a.href || '';
        if (href.includes('facebook.com/reel') || href.includes('/reel/')) {
          const cleanUrl = href.replace(/.*uddg=/, '').split('&')[0];
          const decoded = decodeURIComponent(cleanUrl).split('?')[0];
          const caption = a.innerText || a.parentElement?.innerText || '';
          if (!items.some(i => i.url === decoded)) {
            items.push({
              url: decoded,
              title: caption.replace(/\n+/g, ' ').trim() || 'Facebook Reel',
            });
          }
        }
      }
      return items;
    });

    // 2. Nếu DuckDuckGo trống, truy vấn trực tiếp tìm kiếm video Facebook
    if (results.length === 0) {
      console.log(`🔄 Quét trực tiếp Facebook Search: "${keyword}"...`);
      const fbSearchUrl = `https://www.facebook.com/watch/search/?q=${encodeURIComponent(keyword)}`;
      await page.goto(fbSearchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      results = await page.evaluate(() => {
        const items = [];
        const links = Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/watch/"]'));
        for (const a of links) {
          const href = a.href.split('?')[0];
          const text = (a.innerText || a.getAttribute('aria-label') || '').trim();
          if (href && !items.some(i => i.url === href)) {
            items.push({ url: href, title: text || 'Facebook Reel' });
          }
        }
        return items;
      });
    }

    console.log(`✅ [BOT SEARCH] Thu thập được ${results.length} link Reels!`);
    return results.slice(0, maxResults);
  } catch (error) {
    console.error('❌ [BOT SEARCH] Lỗi tìm kiếm:', error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}



