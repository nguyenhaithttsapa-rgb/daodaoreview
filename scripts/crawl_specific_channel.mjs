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
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    } catch {
      resolve(null);
    }
  });
}

function fetchHtml(url) {
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
          return fetchHtml(res.headers.location).then(resolve);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(10000, () => { req.destroy(); resolve(''); });
    } catch {
      resolve('');
    }
  });
}

async function checkEmbeddable(url) {
  const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=0`;
  const html = await fetchHtml(embedUrl);
  const forbiddenKeywords = [
    '_3i0p', '_3i0o', '_2go0',
    'không nhúng được', 'Không khả dụng', 'thuộc sở hữu của người khác',
    'cannot be embedded', 'không thể phát', 'Video không hiển thị',
    'Video Unavailable', 'This video cannot be embedded'
  ];
  for (const kw of forbiddenKeywords) {
    if (html.includes(kw)) {
      return { ok: false, reason: kw };
    }
  }
  return { ok: true, htmlLength: html.length };
}

function parseDurationSeconds(durStr) {
  if (!durStr) return 0;
  const parts = durStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
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
  const targetId = '61578552603049';
  console.log('🚀 BẮT ĐẦU CÀO KÊNH/FANPAGE ID:', targetId);
  console.log('🔗 Link đầu vào:', `https://www.facebook.com/watch/${targetId}/`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  // Request interception
  await context.route('**/*', (route) => {
    const req = route.request();
    const rt = req.resourceType();
    if (['image', 'media', 'font'].includes(rt)) {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();

  // First discover page title/name
  console.log(`🌐 Đang mở fanpage để xác định tên kênh...`);
  let channelName = 'Review Phim Hay';
  try {
    await page.goto(`https://www.facebook.com/watch/${targetId}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const pTitle = await page.title();
    console.log(`📄 Page Title: ${pTitle}`);
    if (pTitle && !pTitle.includes('Facebook') && !pTitle.includes('Đăng nhập')) {
      channelName = pTitle.split('|')[0].trim();
    }
  } catch (e) {
    console.log(`⚠️ Lỗi mở watch: ${e.message}`);
  }

  const collectedVideos = new Map(); // id -> { url, title, duration, durationSec }

  const urlsToScan = [
    `https://www.facebook.com/watch/${targetId}/`,
    `https://www.facebook.com/${targetId}/videos/`,
    `https://www.facebook.com/${targetId}/`,
    `https://www.facebook.com/watch/search/?q=${targetId} trọn bộ`,
    `https://www.facebook.com/watch/search/?q=${encodeURIComponent(channelName)} trọn bộ`
  ];

  for (const scanUrl of urlsToScan) {
    console.log(`🌐 Đang quét nguồn: ${scanUrl}`);
    try {
      await page.goto(scanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Dismiss dialogs & unlock scroll
      await page.evaluate(() => {
        document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
        document.documentElement.style.overflow = 'auto';
        document.body.style.overflow = 'auto';
      });

      // Scroll 10 times to deep crawl all video entries
      for (let s = 1; s <= 10; s++) {
        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3500);
        await page.waitForTimeout(1800);

        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });
      }

      // Extract video entries from DOM
      const pageVideos = await page.evaluate(() => {
        const results = [];
        const anchors = Array.from(document.querySelectorAll('a[href*="/watch/"], a[href*="/videos/"], a[href*="/reel/"]'));

        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          let videoId = '';
          const watchMatch = href.match(/[?&]v=(\d+)/);
          const videosMatch = href.match(/\/videos\/(?:[^\/]+\/)?(\d+)/);
          const reelMatch = href.match(/\/reel\/(\d+)/);

          if (watchMatch) videoId = watchMatch[1];
          else if (videosMatch) videoId = videosMatch[1];
          else if (reelMatch) videoId = reelMatch[1];

          if (!videoId) continue;

          let card = a;
          for (let i = 0; i < 6; i++) {
            if (!card.parentElement) break;
            card = card.parentElement;
            if (card.innerText && card.innerText.length > 30) break;
          }

          const cardText = card ? card.innerText : a.innerText;

          // Find duration in card text
          let duration = '';
          const durMatch = cardText.match(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
          if (durMatch) {
            duration = durMatch[1];
          }

          // Extract title snippet
          const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
          let title = lines.find(l => !/^\d+[\sKkMmbB]+/.test(l) && !/^\d{1,2}:\d{2}/.test(l) && !l.includes('Thích') && !l.includes('Bình luận')) || a.innerText || `Video ${videoId}`;

          results.push({
            id: videoId,
            url: `https://www.facebook.com/watch/?v=${videoId}`,
            title,
            duration
          });
        }
        return results;
      });

      for (const v of pageVideos) {
        if (!collectedVideos.has(v.id)) {
          const durSec = parseDurationSeconds(v.duration);
          collectedVideos.set(v.id, {
            ...v,
            durationSec: durSec
          });
        }
      }

      console.log(`   -> Tổng video phát hiện tới hiện tại: ${collectedVideos.size}`);
    } catch (err) {
      console.log(`   ⚠️ Lỗi quét URL: ${err.message}`);
    }
  }

  await browser.close();

  console.log(`\n======================================================`);
  console.log(`📊 TỔNG HỢP TOÀN BỘ KHO VIDEO CỦA KÊNH (${collectedVideos.size} video):`);

  let db = [];
  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (e) {
      db = [];
    }
  }
  const existingIds = new Set();
  for (const item of db) {
    if (item.id) existingIds.add(item.id.replace('series-long-', ''));
    if (item.episodes) {
      for (const ep of item.episodes) {
        if (ep.id) existingIds.add(ep.id.replace('ep-long-', ''));
      }
    }
  }

  let addedCount = 0;
  let shortCount = 0;
  let blockedCount = 0;
  let duplicateCount = 0;
  const addedMovies = [];

  const forbiddenMusicWords = ['nhạc hoa', 'vietsub mv', 'nhạc phim', 'karaoke', 'bài hát', 'ost', 'remix', 'mv vietsub'];

  for (const [vidId, vid] of collectedVideos.entries()) {
    if (existingIds.has(vidId)) {
      duplicateCount++;
      continue;
    }

    // Check duration >= 30 mins (1800s)
    if (vid.durationSec > 0 && vid.durationSec < 1800) {
      shortCount++;
      console.log(`⛔ [LOẠI BỎ DO THỜI LƯỢNG < 30 PHÚT] (${vid.duration || 'N/A'}): "${vid.title.slice(0, 60)}..."`);
      continue;
    }

    // Check music words
    const lowerTitle = vid.title.toLowerCase();
    if (forbiddenMusicWords.some(w => lowerTitle.includes(w))) {
      blockedCount++;
      console.log(`⛔ [LOẠI BỎ DO CHỨA TỪ KHÓA NHẠC/OST]: "${vid.title.slice(0, 60)}"`);
      continue;
    }

    // If duration not detected in DOM, check DASH duration or page inspection
    let finalDuration = vid.duration;
    let finalDurSec = vid.durationSec;
    if (finalDurSec === 0) {
      console.log(`🔍 Đang kiểm tra thời lượng sâu cho video ID: ${vidId}...`);
      const htmlVid = await fetchHtml(vid.url);
      const durMatch = htmlVid.match(/"duration":\s*"?(\d+)"?/i) || htmlVid.match(/"playable_duration_in_ms":\s*(\d+)/i);
      if (durMatch) {
        let sec = parseInt(durMatch[1], 10);
        if (durMatch[0].includes('ms')) sec = Math.floor(sec / 1000);
        finalDurSec = sec;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        finalDuration = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
      }
    }

    if (finalDurSec > 0 && finalDurSec < 1800) {
      shortCount++;
      console.log(`⛔ [LOẠI BỎ DO THỜI LƯỢNG < 30 PHÚT] (${finalDuration}): "${vid.title.slice(0, 60)}..."`);
      continue;
    }

    // Embed Gatekeeper
    const embedStatus = await checkEmbeddable(vid.url);
    if (!embedStatus.ok) {
      blockedCount++;
      console.log(`🔒 [BỊ CHẶN NHÚNG FACEBOOK]: Video ID ${vidId} (Lý do: ${embedStatus.reason})`);
      continue;
    }

    // Fetch original thumbnail
    let thumbBuffer = null;
    const html = await fetchHtml(vid.url);
    const ogImgMatch = html.match(/<meta\s+property=[\"']og:image[\"']\s+content=[\"'](.*?)[\"']/i);
    if (ogImgMatch && ogImgMatch[1]) {
      const imgUrl = ogImgMatch[1].replace(/&amp;/g, '&');
      thumbBuffer = await fetchBuffer(imgUrl);
    }

    if (!thumbBuffer || thumbBuffer.length < 5000) {
      console.log(`⚠️ Không tải được ảnh bìa gốc của video ${vidId} -> Bỏ qua theo quy tắc sống còn.`);
      continue;
    }

    // Save thumbnail
    const thumbFilename = `${vidId}.jpg`;
    const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
    fs.writeFileSync(thumbPath, thumbBuffer);

    // Sanitize title
    let cleanTitle = sanitizeText(vid.title);
    if (cleanTitle.length < 15) {
      cleanTitle = `${channelName} - Video Trọn Bộ #${vidId.slice(-4)}`;
    }
    const cleanSlug = generateSlug(cleanTitle, vidId);

    const newSeries = {
      id: `series-long-${vidId}`,
      slug: cleanSlug,
      title: cleanTitle,
      description: `Phim hay review trọn bộ cốt truyện kịch tính từ kênh ${channelName}.`,
      thumbnail: `/thumbnails/${thumbFilename}`,
      coverImage: `/thumbnails/${thumbFilename}`,
      channelName: channelName,
      genres: ['Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt', 'Ngôn Tình - Tổng Tài'],
      categories: ['Phim Dài Full', 'Hoạt Hình 3D'],
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
          duration: finalDuration || '00:45:00',
          thumbnail: `/thumbnails/${thumbFilename}`,
          viewsCount: Math.floor(Math.random() * 40000) + 15000,
          publishedAt: new Date().toISOString().split('T')[0]
        }
      ]
    };

    db.unshift(newSeries);
    existingIds.add(vidId);
    addedMovies.push(newSeries);
    addedCount++;
    console.log(`🎉 [NẠP THÀNH CÔNG PHIM DÀI #${addedCount}] (${finalDuration}) - "${cleanTitle}"`);
  }

  if (addedCount > 0) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`💾 Đã cập nhật ${addedCount} phim mới vào database.json`);
  }

  console.log(`\n======================================================`);
  console.log(`📋 KẾT QUẢ CÀO KÊNH ID ${targetId} (${channelName}):`);
  console.log(`- Tổng video tìm thấy trên kênh: ${collectedVideos.size}`);
  console.log(`- Phim dài >= 30 phút nạp mới: ${addedCount}`);
  console.log(`- Video ngắn < 30 phút bị loại bỏ: ${shortCount}`);
  console.log(`- Video bị chặn nhúng hoặc nhạc/OST bị loại bỏ: ${blockedCount}`);
  console.log(`- Video đã tồn tại từ trước: ${duplicateCount}`);
  console.log(`- Tổng số phim trong CSDL hiện tại: ${db.length}`);
}

main().catch(console.error);
