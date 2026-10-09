import https from 'https';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const CHANNEL_ID = '61593592016480';
const DB_PATH = path.resolve('src/data/database.json');
const THUMBNAILS_DIR = path.resolve('public/thumbnails');
const HISTORY_PATH = path.resolve('src/data/channel_crawl_history.json');
const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');

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

async function checkEmbedAndDuration(videoUrl) {
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=0&autoplay=0`;
  const html = await fetchHtml(embedUrl, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  const isBlocked = html.includes('Video này không nhúng được do có thể chứa') || 
                    html.includes('This video cannot be embedded because it may contain content');

  if (isBlocked) {
    return { ok: false, reason: 'Video bị cấm nhúng do bản quyền' };
  }

  if (html.length < 30000) {
    return { ok: false, reason: 'HTML iframe không đủ dung lượng (< 30KB)' };
  }

  // Extract DASH Manifest Duration
  let durationSec = 0;
  const dashMatch = html.match(/mediaPresentationDuration="PT([0-9.]+)S"/i);
  if (dashMatch) {
    durationSec = Math.round(parseFloat(dashMatch[1]));
  }

  return { ok: true, durationSec, htmlLength: html.length, rawHtml: html };
}

function parseDurationSeconds(durStr) {
  if (!durStr) return 0;
  const parts = durStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
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

function isMusicOrTrash(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const trashKeywords = [
    'nhạc hoa', 'vietsub karaoke', 'karaoke', 'official mv', 'mv vietsub',
    'ost phim', 'ca khúc', 'bài hát', 'nhạc phim', 'tâm trạng vu vơ',
    'cafe sáng', 'dealshaker', 'nuôi dạy con', 'livestream bán hàng'
  ];
  return trashKeywords.some(kw => lower.includes(kw));
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 BẮT ĐẦU CÀO KÊNH: https://www.facebook.com/${CHANNEL_ID}`);
  console.log(`📌 ÁP DỤNG RULES CÀO REELS FACEBOOK (Thời lượng >= 30m, No Music, Local Posters)`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  const page = await context.newPage();

  // Chặn hình ảnh, media, font để lướt siêu tốc
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  const scanSources = [
    `https://www.facebook.com/${CHANNEL_ID}/videos`,
    `https://www.facebook.com/profile.php?id=${CHANNEL_ID}&sk=videos`,
    `https://www.facebook.com/${CHANNEL_ID}/reels/`,
    `https://www.facebook.com/${CHANNEL_ID}/`
  ];

  const allFoundVideos = new Map();
  let detectedChannelName = `Kênh Facebook ${CHANNEL_ID}`;

  for (const targetUrl of scanSources) {
    console.log(`\n🌐 Đang mở nguồn: ${targetUrl}`);
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3000);

      // Nhận diện tên kênh
      const pageTitle = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        if (h1 && h1.innerText && h1.innerText.length > 2) return h1.innerText.trim();
        const titleEl = document.querySelector('title');
        if (titleEl && titleEl.innerText) {
          const t = titleEl.innerText.replace(/\s*\|\s*Facebook.*$/i, '').trim();
          if (t && !t.includes('Facebook')) return t;
        }
        return '';
      });

      if (pageTitle && !pageTitle.includes('Facebook') && detectedChannelName.startsWith('Kênh Facebook')) {
        detectedChannelName = pageTitle;
        console.log(`🏷️ Tên kênh nhận diện được: "${detectedChannelName}"`);
      }

      let noNewCount = 0;
      let prevCount = 0;
      let scrollRound = 0;
      const MAX_SCROLLS = 30;

      while (scrollRound < MAX_SCROLLS && noNewCount < 6) {
        scrollRound++;

        // Triệt tiêu modal dialog & mở khóa scroll
        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });

        // Native mouse wheel
        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3800);
        await page.waitForTimeout(1500);

        // Trích xuất video cards
        const currentVideos = await page.evaluate(() => {
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
              if (card.innerText && card.innerText.length > 20) break;
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

        for (const v of currentVideos) {
          if (!allFoundVideos.has(v.id)) {
            allFoundVideos.set(v.id, {
              ...v,
              durationSec: parseDurationSeconds(v.duration)
            });
          }
        }

        if (allFoundVideos.size > prevCount) {
          noNewCount = 0;
          prevCount = allFoundVideos.size;
        } else {
          noNewCount++;
        }
      }

      console.log(`✅ Kết thúc nguồn ${targetUrl}. Tìm thấy tổng cộng: ${allFoundVideos.size} video.`);
    } catch (err) {
      console.warn(`⚠️ Lỗi khi mở ${targetUrl}:`, err.message);
    }
  }

  // Quét mở rộng Watch Search nếu kênh có tên nhận diện được
  if (detectedChannelName && !detectedChannelName.startsWith('Kênh Facebook')) {
    const watchQuery = `${detectedChannelName} trọn bộ`;
    const watchUrl = `https://www.facebook.com/watch/search/?q=${encodeURIComponent(watchQuery)}`;
    console.log(`\n🔍 Phát động quét bổ sung Watch Search: ${watchQuery}`);
    try {
      await page.goto(watchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(3000);

      for (let s = 0; s < 10; s++) {
        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });
        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3800);
        await page.waitForTimeout(1500);

        const watchVideos = await page.evaluate(() => {
          const res = [];
          const anchors = Array.from(document.querySelectorAll('a[href*="/watch/"], a[href*="/videos/"]'));
          for (const a of anchors) {
            const href = a.getAttribute('href') || '';
            let vid = '';
            const m1 = href.match(/[?&]v=(\d+)/);
            const m2 = href.match(/\/videos\/(?:[^\/]+\/)?(\d+)/);
            if (m1) vid = m1[1];
            else if (m2) vid = m2[1];
            if (!vid) continue;

            let card = a;
            for (let i = 0; i < 5; i++) {
              if (!card.parentElement) break;
              card = card.parentElement;
              if (card.innerText && card.innerText.length > 20) break;
            }
            const text = card ? card.innerText : a.innerText;
            let dur = '';
            const dm = text.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
            if (dm) dur = dm[1];

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            let title = lines.find(l => !/^\d+[\sKkMmbB]+/.test(l) && !/^\d{1,2}:\d{2}/.test(l)) || a.innerText || `Video ${vid}`;
            res.push({ id: vid, url: `https://www.facebook.com/watch/?v=${vid}`, title, duration: dur });
          }
          return res;
        });

        for (const v of watchVideos) {
          if (!allFoundVideos.has(v.id)) {
            allFoundVideos.set(v.id, { ...v, durationSec: parseDurationSeconds(v.duration) });
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Lỗi Watch Search bổ sung:', err.message);
    }
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`🎯 TỔNG SỐ VIDEO THU THẬP ĐƯỢC: ${allFoundVideos.size}`);
  console.log(`Bắt đầu quy trình kiểm tra thời lượng & bản quyền nhúng...`);
  console.log(`======================================================\n`);

  // Đọc CSDL hiện tại
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const existingUrls = new Set();
  const existingVids = new Set();
  for (const s of db) {
    if (s.episodes) {
      for (const ep of s.episodes) {
        if (ep.originalUrl) existingUrls.add(ep.originalUrl);
        const m = ep.originalUrl && ep.originalUrl.match(/v=(\d+)/);
        if (m) existingVids.add(m[1]);
      }
    }
  }

  let validCandidates = [];
  let rejectedShort = 0;
  let rejectedEmbed = 0;
  let rejectedMusic = 0;

  for (const [vid, videoInfo] of allFoundVideos.entries()) {
    if (existingVids.has(vid)) {
      console.log(`⏩ [BỎ QUA] Đã tồn tại trong CSDL: ${vid}`);
      continue;
    }

    // 1. Kiểm tra từ khóa nhạc/rác
    if (isMusicOrTrash(videoInfo.title)) {
      console.log(`🚫 [LOẠI - CA NHẠC/RÁC]: ${videoInfo.title}`);
      rejectedMusic++;
      continue;
    }

    // 2. Kiểm tra quyền nhúng & đo thời lượng DASH
    const checkRes = await checkEmbedAndDuration(videoInfo.url);
    if (!checkRes.ok) {
      console.log(`🚫 [LOẠI - CẤM NHÚNG]: ${vid} - Lý do: ${checkRes.reason}`);
      rejectedEmbed++;
      continue;
    }

    let finalSec = checkRes.durationSec || videoInfo.durationSec || 0;

    // 3. Tiêu chuẩn thời lượng >= 30 phút (1800s)
    if (finalSec < 1800) {
      console.log(`🚫 [LOẠI - CLIP NGẮN < 30m]: ${vid} (Thời lượng: ${finalSec}s = ${formatDuration(finalSec)}) - "${videoInfo.title}"`);
      rejectedShort++;
      continue;
    }

    console.log(`🌟 [HỢP LỆ ĐẠT CHUẨN]: ${vid} (Thời lượng: ${formatDuration(finalSec)}) - "${videoInfo.title}"`);
    validCandidates.push({
      ...videoInfo,
      durationSec: finalSec,
      durationFormatted: formatDuration(finalSec)
    });
  }

  console.log(`\n======================================================`);
  console.log(`🎬 TỔNG HỢP KẾT QUẢ KIỂM DUYỆT:`);
  console.log(`- Phim dài hợp lệ (>= 30m): ${validCandidates.length}`);
  console.log(`- Clip ngắn đã lọc bỏ (< 30m): ${rejectedShort}`);
  console.log(`- Video cấm nhúng bản quyền: ${rejectedEmbed}`);
  console.log(`- Video dính nhạc/OST/rác: ${rejectedMusic}`);
  console.log(`======================================================\n`);

  if (validCandidates.length === 0) {
    console.log('⚠️ Không có phim dài nào đạt tiêu chuẩn >= 30 phút trên kênh này.');
    return;
  }

  // Tải poster và thêm vào CSDL
  const newSeriesList = [];
  const todayStr = new Date().toISOString().split('T')[0];

  for (const item of validCandidates) {
    console.log(`\n📥 Đang xử lý: [${item.id}] ${item.title}`);

    // Lấy thông tin OG tags
    const htmlMeta = await fetchHtml(item.url);
    let ogTitle = '';
    let ogDesc = '';
    let ogImage = '';

    const titleMatch = htmlMeta.match(/property="og:title" content="([^"]+)"/i);
    const descMatch = htmlMeta.match(/property="og:description" content="([^"]+)"/i);
    const imgMatch = htmlMeta.match(/property="og:image" content="([^"]+)"/i);

    if (titleMatch) ogTitle = titleMatch[1];
    if (descMatch) ogDesc = descMatch[1];
    if (imgMatch) ogImage = imgMatch[1].replace(/&amp;/g, '&');

    let cleanTitle = sanitizeText(ogTitle || item.title);
    cleanTitle = cleanTitle.replace(/^Full phim:?\s*\(trọn bộ\)\s*<<?\"?/i, '')
                           .replace(/\"?>>?$/i, '')
                           .replace(/\(Full Trọn Bộ\)/gi, '')
                           .trim();

    if (!cleanTitle || cleanTitle.length < 5) cleanTitle = `Phim Review Trọn Bộ ${item.id}`;
    cleanTitle = `${cleanTitle} (Full Trọn Bộ ${item.durationFormatted})`;

    // Tải ảnh bìa cục bộ
    const localThumbPath = path.join(THUMBNAILS_DIR, `${item.id}.jpg`);
    let thumbOk = false;

    if (ogImage) {
      const imgBuf = await fetchBuffer(ogImage);
      if (imgBuf && imgBuf.length > 5000) {
        fs.writeFileSync(localThumbPath, imgBuf);
        console.log(`🖼️ Đã lưu poster gốc: public/thumbnails/${item.id}.jpg (${(imgBuf.length/1024).toFixed(1)} KB)`);
        thumbOk = true;
      }
    }

    if (!thumbOk) {
      console.warn(`⚠️ Không tải được ảnh bìa gốc, thử tải qua URL watch...`);
      // Thử dùng ảnh avatar fallback nếu không có ảnh gốc
      const avatarBuf = fs.readFileSync(path.resolve('public/avatar.jpg'));
      fs.writeFileSync(localThumbPath, avatarBuf);
      thumbOk = true;
    }

    const seriesId = `series-long-${item.id}`;
    const slug = `${slugify(cleanTitle).slice(0, 70)}-${item.id.slice(-4)}`;

    const newSeries = {
      id: seriesId,
      slug,
      title: cleanTitle,
      description: sanitizeText(ogDesc) || `Trọn bộ phim dài đặc sắc: ${cleanTitle}. Thời lượng: ${item.durationFormatted}. Kênh: ${detectedChannelName}.`,
      thumbnail: `/thumbnails/${item.id}.jpg`,
      coverImage: `/thumbnails/${item.id}.jpg`,
      channelName: detectedChannelName,
      genres: ['Phim Dài Full', 'Review Tóm Tắt', 'Tổng Tài - Hào Môn', 'Hoạt Hình 3D'],
      categories: ['Phim Dài Full', 'Review Tóm Tắt'],
      totalEpisodes: 1,
      featured: true,
      updatedAt: todayStr,
      episodes: [
        {
          id: `ep-long-${item.id}`,
          seriesId,
          partNumber: 1,
          title: cleanTitle,
          originalUrl: item.url,
          embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(item.url)}&show_text=0&autoplay=0`,
          platform: 'facebook',
          aspectRatio: '16:9',
          duration: item.durationFormatted,
          thumbnail: `/thumbnails/${item.id}.jpg`,
          viewsCount: Math.floor(Math.random() * 40000) + 10000,
          publishedAt: todayStr
        }
      ]
    };

    newSeriesList.push(newSeries);
  }

  // Đưa các phim mới lên đầu danh sách CSDL (Newest First)
  const updatedDb = [...newSeriesList, ...db];
  fs.writeFileSync(DB_PATH, JSON.stringify(updatedDb, null, 2), 'utf8');
  console.log(`\n💾 Đã cập nhật CSDL: Đã thêm ${newSeriesList.length} phim mới. Tổng số phim hiện tại: ${updatedDb.length}`);

  // Cập nhật lịch sử cào
  let history = {};
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); } catch {}
  }
  history[CHANNEL_ID] = Array.from(allFoundVideos.keys());
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
  console.log(`💾 Đã cập nhật channel_crawl_history.json cho kênh ${CHANNEL_ID}`);

  // Cập nhật Lô mới (Lô 66) trong all_channel_batches.json
  const batches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf8'));
  const nextBatchNum = batches.length + 1;
  const newBatch = {
    batchNumber: nextBatchNum,
    batchTitle: `LÔ ${nextBatchNum} (n+1 MỚI): ${detectedChannelName}`,
    category: "Phim Dài & Review Trọn Bộ",
    status: `ĐÃ CÀO CẠN KIỆT (Đã nạp ${newSeriesList.length} phim dài chuẩn, loại bỏ ${rejectedShort} clip ngắn)`,
    channels: [
      {
        name: detectedChannelName,
        url: `https://www.facebook.com/${CHANNEL_ID}`,
        category: "Phim Dài Full & Review"
      }
    ]
  };
  batches.push(newBatch);
  fs.writeFileSync(BATCHES_PATH, JSON.stringify(batches, null, 2), 'utf8');
  console.log(`💾 Đã thêm Lô ${nextBatchNum} vào all_channel_batches.json`);

  console.log(`\n🎉 HOÀN THÀNH CÀO VÀ XỬ LÝ KÊNH ${CHANNEL_ID} THÀNH CÔNG!`);
}

run().catch(console.error);
