import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { chromium } from 'playwright';

const CHANNEL_ID = '61588732377311';
const CHANNEL_NAME = 'Mễ Lạc Review';
const DB_PATH = path.resolve('src/data/database.json');
const THUMBNAILS_DIR = path.resolve('public/thumbnails');
const HISTORY_PATH = path.resolve('src/data/channel_crawl_history.json');

function log(msg) {
  const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  console.log(`[${time}] ${msg}`);
}

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

export async function runTopLayerScan() {
  log(`======================================================`);
  log(`⚡ [QUÉT NHẸ LỚP TRÊN 24H] KÊNH: ${CHANNEL_NAME} (ID: ${CHANNEL_ID})`);
  log(`🎯 Thao tác: 1 nhịp cuộn kiểm tra video mới đăng (Boundary Checkpoint)`);
  log(`======================================================`);

  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const existingIds = new Set(db.map(m => m.id.replace('series-long-', '')));

  let history = {};
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')); } catch {}
  }
  const knownHistory = new Set(history[CHANNEL_ID] || []);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  // Resource interception (Chặn tài nguyên nặng)
  await context.route('**/*', (route) => {
    const rt = route.request().resourceType();
    if (['image', 'media', 'font'].includes(rt)) return route.abort();
    return route.continue();
  });

  const page = await context.newPage();
  const targetUrl = `https://www.facebook.com/profile.php?id=${CHANNEL_ID}&sk=videos`;
  log(`🌐 Đang mở trang: ${targetUrl}`);

  const newlyDiscovered = [];

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Mở khóa thanh cuộn và gỡ bỏ dialog
    await page.evaluate(() => {
      document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    });

    // Thực hiện đúng 1 nhịp cuộn nhẹ (Single Scroll Pulse)
    log(`🖱️ Thực hiện đúng 1 nhịp cuộn nhẹ lớp trên...`);
    await page.mouse.move(640, 450);
    await page.mouse.wheel(0, 3200);
    await page.waitForTimeout(2000);

    // Trích xuất video xuất hiện ở lớp trên cùng
    const topVideos = await page.evaluate(() => {
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

    log(`🔎 Phát hiện ${topVideos.length} video ở lớp trên cùng.`);

    for (const v of topVideos) {
      if (existingIds.has(v.id) || knownHistory.has(v.id)) {
        log(`🛑 [RANH GIỚI VIDEO CŨ - BOUNDARY CHECKPOINT]: Gặp video ID ${v.id} đã có trong kho $\\rightarrow$ DỪNG QUÉT NGAY!`);
        break;
      }
      newlyDiscovered.push({
        ...v,
        durationSec: parseDurationSeconds(v.duration)
      });
    }

  } catch (err) {
    log(`⚠️ Lỗi khi mở trang: ${err.message}`);
  } finally {
    await browser.close();
  }

  if (newlyDiscovered.length === 0) {
    log(`✅ [KẾT QUẢ 24H]: Kênh Mễ Lạc Review chưa đăng thêm video dài mới.`);
    log(`💤 Chuyển sang trạng thái nghỉ, sẵn sàng cho phiên quét kế tiếp sau 24 giờ.`);
    return { added: 0, total: db.length };
  }

  log(`🎉 PHÁT HIỆN ${newlyDiscovered.length} VIDEO MỚI ĐĂNG! Bắt đầu kiểm duyệt chuẩn mực...`);

  let addedCount = 0;

  for (const vid of newlyDiscovered) {
    if (vid.durationSec > 0 && vid.durationSec < 1800) {
      log(`⛔ [LOẠI BỎ DO THỜI LƯỢNG < 30 PHÚT] (${vid.duration}): "${vid.title.slice(0, 50)}..."`);
      continue;
    }

    const lowerTitle = vid.title.toLowerCase();
    if (lowerTitle.includes('nhạc hoa') || lowerTitle.includes('karaoke') || lowerTitle.includes('mv vietsub') || lowerTitle.includes('ost') || lowerTitle.includes('sữa') || lowerTitle.includes('mẹ con') || lowerTitle.includes('cafe sáng') || lowerTitle.includes('dealshaker')) {
      log(`⛔ [LOẠI BỎ DO RÁC/PHI HOẠT HÌNH]: "${vid.title.slice(0, 50)}..."`);
      continue;
    }

    log(`🔍 Thẩm định: "${vid.title.slice(0, 60)}" (${vid.duration || 'Kiểm tra sâu'})...`);

    const embedStatus = await checkEmbeddableAccurate(vid.url);
    if (!embedStatus.ok) {
      log(`   ❌ Quyền nhúng không hợp lệ: ${embedStatus.reason}`);
      continue;
    }
    log(`   ✅ Quyền nhúng: HỢP LỆ (Cho phép phát trên web)`);

    let thumbBuffer = null;
    const htmlVid = await fetchHtml(vid.url);
    const ogImg = htmlVid.match(/<meta\s+property=[\"']og:image[\"']\s+content=[\"'](.*?)[\"']/i);
    if (ogImg && ogImg[1]) {
      const imgUrl = ogImg[1].replace(/&amp;/g, '&');
      thumbBuffer = await fetchBuffer(imgUrl);
    }

    if (!thumbBuffer || thumbBuffer.length < 5000) {
      log(`   ⚠️ Không tải được ảnh bìa gốc -> Bỏ qua.`);
      continue;
    }

    const thumbFilename = `${vid.id}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
    fs.writeFileSync(thumbPath, thumbBuffer);
    log(`   🖼️ Đã lưu ảnh bìa gốc: public/thumbnails/${thumbFilename}`);

    let cleanTitle = sanitizeText(vid.title);
    cleanTitle = cleanTitle.replace(/\(Nội dung giải trí.*?\)/gi, '');
    cleanTitle = cleanTitle.replace(/\[16\+\]/gi, '').replace(/\[13\+\]/gi, '');
    cleanTitle = cleanTitle.replace(/Giới thiệu:.*$/gi, '');
    cleanTitle = cleanTitle.replace(/\(Full Trọn Bộ\)/gi, '').trim();
    cleanTitle = cleanTitle.split('\n')[0].trim();
    if (cleanTitle.length > 90) cleanTitle = cleanTitle.slice(0, 90).trim();
    cleanTitle = `${cleanTitle} (Full Trọn Bộ)`;

    const cleanSlug = generateSlug(cleanTitle, vid.id);

    const newSeries = {
      id: `series-long-${vid.id}`,
      slug: cleanSlug,
      title: cleanTitle,
      description: `Trọn bộ phim hoạt hình 3D tu tiên, huyền huyễn review tóm tắt đặc sắc: ${cleanTitle}. Thời lượng: ${vid.duration || 'Trọn bộ'}.`,
      thumbnail: `/thumbnails/${thumbFilename}`,
      coverImage: `/thumbnails/${thumbFilename}`,
      channelName: CHANNEL_NAME,
      genres: ['Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt', 'Tu Tiên - Huyền Huyễn'],
      categories: ['Hoạt Hình 3D', 'Phim Dài Full', 'Tu Tiên - Huyền Huyễn'],
      totalEpisodes: 1,
      featured: true,
      updatedAt: new Date().toISOString().split('T')[0],
      episodes: [
        {
          id: `ep-long-${vid.id}`,
          seriesId: `series-long-${vid.id}`,
          partNumber: 1,
          title: cleanTitle,
          originalUrl: vid.url,
          embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(vid.url)}&show_text=0&autoplay=0`,
          platform: 'facebook',
          aspectRatio: '16:9',
          duration: vid.duration || '02:00:00',
          thumbnail: `/thumbnails/${thumbFilename}`,
          viewsCount: Math.floor(Math.random() * 50000) + 25000,
          publishedAt: new Date().toISOString().split('T')[0]
        }
      ]
    };

    db.unshift(newSeries);
    existingIds.add(vid.id);
    knownHistory.add(vid.id);
    addedCount++;
    log(`   🎉 [NẠP MỚI THÀNH CÔNG #${addedCount}] (${vid.duration}) - "${cleanTitle}"`);
  }

  if (addedCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    history[CHANNEL_ID] = Array.from(knownHistory);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
    log(`💾 Đã nạp thêm ${addedCount} phim dài mới vào database.json!`);

    // Đồng bộ file Word
    try {
      execSync('python scripts/export_channel_list_docx.py', { encoding: 'utf-8' });
      log(`📄 Đã cập nhật file Word Danh_Sach_Kenh_Da_Cao.docx.`);
    } catch {}

    // Kiểm thử build & push
    try {
      log(`🔨 Kiểm thử npm run build...`);
      execSync('cmd.exe /c "npm run build"', { encoding: 'utf-8' });
      log(`🚀 Tự động commit và push lên GitHub origin/main...`);
      execSync('git add .', { encoding: 'utf-8' });
      execSync(`git commit -m "feat(crawler): 24h top-layer scan added ${addedCount} new movies from Me Lac Review"`, { encoding: 'utf-8' });
      execSync('git push origin main', { encoding: 'utf-8' });
      log(`✅ Đã đẩy lên GitHub -> VPS tự động cập nhật lên https://daodaoreview.com!`);
    } catch (deployErr) {
      log(`⚠️ Lỗi build/push: ${deployErr.message}`);
    }
  }

  return { added: addedCount, total: db.length };
}

// Chạy trực tiếp nếu file được gọi từ CLI
if (process.argv[1] && process.argv[1].endsWith('top_layer_scan_melac.mjs')) {
  runTopLayerScan().catch(console.error);
}
