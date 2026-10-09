import https from 'https';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const DB_PATH = path.resolve('src/data/database.json');
const THUMBNAILS_DIR = path.resolve('public/thumbnails');

function fetchBuffer(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept-Language': 'vi,en;q=0.9'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve);
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(12000, () => { req.destroy(); resolve(null); });
    } catch {
      resolve(null);
    }
  });
}

function fetchHtml(url, ua = 'facebookexternalhit/1.1') {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = https.get({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': ua,
          'Accept-Language': 'vi,en;q=0.9'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchHtml(res.headers.location, ua).then(resolve);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(12000, () => { req.destroy(); resolve(''); });
    } catch {
      resolve('');
    }
  });
}

async function checkEmbeddableAccurate(videoUrl) {
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=0&autoplay=0`;
  const html = await fetchHtml(embedUrl, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  const isBlocked = html.includes('Video này không nhúng được do có thể chứa') || 
                    html.includes('This video cannot be embedded because it may contain content');

  if (isBlocked) {
    return { ok: false, reason: 'Video này không nhúng được do có thể chứa nội dung thuộc sở hữu của người khác' };
  }

  if (html.length < 30000) {
    return { ok: false, reason: 'Page too short' };
  }

  return { ok: true, htmlLength: html.length };
}

function parseDurationSeconds(durStr) {
  if (!durStr) return 0;
  const parts = durStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/#[\w\d_]+/g, '')
    .replace(/(https?:\/\/[^\s]+)/g, '')
    .replace(/(0\d{9,10})/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateSlug(title, id) {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  const shortId = cleanId.slice(-4) || 'video';
  const cleanTitle = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70)
    .replace(/^-|-$/g, '');
  return `${cleanTitle}-${shortId}`;
}

async function main() {
  const targetId = '61588732377311';
  console.log(`🚀 BẮT ĐẦU CÀO TOÀN BỘ PHIM DÀI TỪ KÊNH: Mễ Lạc Review (ID: ${targetId})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  await context.route('**/*', (route) => {
    const rt = route.request().resourceType();
    if (['image', 'media', 'font'].includes(rt)) return route.abort();
    return route.continue();
  });

  const page = await context.newPage();
  const targetUrl = `https://www.facebook.com/profile.php?id=${targetId}&sk=videos`;

  console.log(`🌐 Đang mở: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Dismiss dialogs
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
  });

  // Scroll 12 times to load full archive
  console.log('📜 Đang cuộn chuột thật để tải toàn bộ kho video của Mễ Lạc Review...');
  for (let s = 1; s <= 12; s++) {
    await page.mouse.move(640, 450);
    await page.mouse.wheel(0, 3500);
    await page.waitForTimeout(1600);
    await page.evaluate(() => {
      document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    });
  }

  const rawVideos = await page.evaluate(() => {
    const results = [];
    const anchors = Array.from(document.querySelectorAll('a[href*="/watch/"], a[href*="/videos/"], a[href*="/reel/"]'));

    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      let vid = '';
      const m1 = href.match(/[?&]v=(\d+)/);
      const m2 = href.match(/\/videos\/(?:[^\/]+\/)?(\d+)/);
      const m3 = href.match(/\/reel\/(\d+)/);
      if (m1) vid = m1[1];
      else if (m2) vid = m2[1];
      else if (m3) vid = m3[1];
      if (!vid) continue;

      let card = a;
      for (let i = 0; i < 5; i++) {
        if (!card.parentElement) break;
        card = card.parentElement;
        if (card.innerText && card.innerText.length > 25) break;
      }
      const text = card ? card.innerText : a.innerText;
      let dur = '';
      const dm = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
      if (dm) dur = dm[1];

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
      let title = lines.find(l => !/^\d+[\sKkMmbB]+/.test(l) && !/^\d{1,2}:\d{2}/.test(l) && !l.includes('Thích') && !l.includes('Bình luận')) || a.innerText || `Video ${vid}`;

      results.push({
        id: vid,
        url: `https://www.facebook.com/watch/?v=${vid}`,
        title,
        duration: dur
      });
    }
    return results;
  });

  await browser.close();

  const collectedVideos = new Map();
  for (const v of rawVideos) {
    if (!collectedVideos.has(v.id)) {
      collectedVideos.set(v.id, {
        ...v,
        durationSec: parseDurationSeconds(v.duration)
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 PHÁT HIỆN TỔNG CỘNG ${collectedVideos.size} VIDEO TRÊN KÊNH:`);

  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const existingIds = new Set(db.map(m => m.id.replace('series-long-', '')));

  let addedCount = 0;
  let skippedCount = 0;

  for (const [vidId, vid] of collectedVideos.entries()) {
    if (existingIds.has(vidId)) {
      console.log(`⏩ Video ${vidId} đã tồn tại trong CSDL -> Bỏ qua.`);
      continue;
    }

    // Must be >= 30 mins
    if (vid.durationSec > 0 && vid.durationSec < 1800) {
      console.log(`⛔ [LOẠI BỎ < 30 PHÚT] (${vid.duration}): "${vid.title.slice(0, 50)}..."`);
      continue;
    }

    console.log(`\n🔍 Đang xử lý: "${vid.title.slice(0, 60)}" (Thời lượng: ${vid.duration || 'Kiểm tra sâu'})...`);

    // Verify accurate embeddability
    const embedStatus = await checkEmbeddableAccurate(vid.url);
    if (!embedStatus.ok) {
      console.log(`   ❌ Bị chặn nhúng thật: ${embedStatus.reason}`);
      skippedCount++;
      continue;
    }
    console.log(`   ✅ Quyền nhúng: HỢP LỆ (Không có lỗi bản quyền)`);

    // Fetch original thumbnail
    let thumbBuffer = null;
    const htmlVid = await fetchHtml(vid.url);
    const ogImg = htmlVid.match(/<meta\s+property=[\"']og:image[\"']\s+content=[\"'](.*?)[\"']/i);
    if (ogImg && ogImg[1]) {
      const imgUrl = ogImg[1].replace(/&amp;/g, '&');
      thumbBuffer = await fetchBuffer(imgUrl);
    }

    if (!thumbBuffer || thumbBuffer.length < 5000) {
      console.log(`   ⚠️ Không tải được ảnh bìa gốc -> Bỏ qua.`);
      continue;
    }

    // Save thumbnail
    const thumbFilename = `${vidId}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
    fs.writeFileSync(thumbPath, thumbBuffer);
    console.log(`   🖼️ Đã lưu ảnh bìa gốc: public/thumbnails/${thumbFilename}`);

    // Sanitize title
    let cleanTitle = sanitizeText(vid.title);
    // Remove spam intro/outro
    cleanTitle = cleanTitle.split('\n')[0].trim();
    if (cleanTitle.length > 90) cleanTitle = cleanTitle.slice(0, 90).trim();
    if (!cleanTitle.toLowerCase().includes('trọn bộ') && !cleanTitle.toLowerCase().includes('full')) {
      cleanTitle = `${cleanTitle} (Full Trọn Bộ)`;
    }
    const cleanSlug = generateSlug(cleanTitle, vidId);

    const newSeries = {
      id: `series-long-${vidId}`,
      slug: cleanSlug,
      title: cleanTitle,
      description: `Phim hoạt hình 3D review trọn bộ cốt truyện hoàn chỉnh đặc sắc từ kênh Mễ Lạc Review.`,
      thumbnail: `/thumbnails/${thumbFilename}`,
      coverImage: `/thumbnails/${thumbFilename}`,
      channelName: 'Mễ Lạc Review',
      genres: ['Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt', 'Tu Tiên - Huyền Huyễn'],
      categories: ['Hoạt Hình 3D', 'Phim Dài Full', 'Tu Tiên - Huyền Huyễn'],
      totalEpisodes: 1,
      featured: true,
      updatedAt: new Date().toISOString().split('T')[0],
      episodes: [
        {
          id: `ep-long-${vidId}`,
          seriesId: `series-long-${vidId}`,
          partNumber: 1,
          title: cleanTitle,
          originalUrl: vid.url,
          embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(vid.url)}&show_text=0&autoplay=0`,
          platform: 'facebook',
          aspectRatio: '16:9',
          duration: vid.duration || '02:00:00',
          thumbnail: `/thumbnails/${thumbFilename}`,
          viewsCount: Math.floor(Math.random() * 50000) + 20000,
          publishedAt: new Date().toISOString().split('T')[0]
        }
      ]
    };

    db.unshift(newSeries);
    existingIds.add(vidId);
    addedCount++;
    console.log(`   🎉 [NẠP THÀNH CÔNG #${addedCount}] (${vid.duration}) - "${cleanTitle}"`);
  }

  if (addedCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`\n💾 ĐÃ CẬP NHẬT THÀNH CÔNG ${addedCount} PHIM DÀI MỚI VÀO database.json!`);
  }

  console.log(`\n======================================================`);
  console.log(`📋 KẾT QUẢ CÀO KÊNH Mễ Lạc Review:`);
  console.log(`- Phim dài nạp mới thành công: ${addedCount}`);
  console.log(`- Video bị chặn nhúng hoặc lỗi: ${skippedCount}`);
  console.log(`- Tổng số phim trong CSDL hiện tại: ${db.length}`);
}

main().catch(console.error);
