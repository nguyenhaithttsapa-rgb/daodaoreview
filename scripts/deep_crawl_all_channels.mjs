import https from 'https';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { execSync } from 'child_process';

const DB_PATH = path.resolve('src/data/database.json');
const THUMBNAILS_DIR = path.resolve('public/thumbnails');
const HISTORY_PATH = path.resolve('src/data/channel_crawl_history.json');
const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');
const CURSOR_PATH = path.resolve('src/data/deep_crawl_cursor.json');
const LOG_DIR = path.resolve('logs');
const LOG_PATH = path.join(LOG_DIR, 'deep_crawl.log');

const CRAWL_DURATION_MS = 10 * 60 * 1000; // 10 phút cào sâu mỗi kênh
const REST_DURATION_MS = 2 * 60 * 1000;   // 2 phút nghỉ giữa các kênh

if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function log(msg) {
  const ts = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  } catch {}
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'");
}

function sanitizeText(str) {
  if (!str) return '';
  let clean = decodeHtmlEntities(str);
  return clean
    .replace(/(?:^|\s)#[a-zA-Z0-9_\p{L}]+/gu, ' ')
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
    'cafe sáng', 'dealshaker', 'nuôi dạy con', 'livestream bán hàng',
    'vietnam vs', 'thái lan vs', 'trực tiếp bóng đá', 'highlights bóng đá'
  ];
  return trashKeywords.some(kw => lower.includes(kw));
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

function getImageInfo(buffer) {
  if (!buffer || buffer.length < 32) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { type: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        if (offset + 8 < buffer.length) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { type: 'jpeg', width, height };
        }
      }
      if (offset + 3 >= buffer.length) break;
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }
  return null;
}

function validateImageQuality(buffer) {
  if (!buffer || buffer.length < 15360) {
    const sizeKb = buffer ? (buffer.length / 1024).toFixed(1) : 0;
    return { ok: false, reason: `Dung lượng quá nhỏ (${sizeKb} KB < 15 KB) - ảnh nén vỡ hạt / icon mờ` };
  }

  const info = getImageInfo(buffer);
  if (!info || !info.width || !info.height) {
    return { ok: false, reason: 'Không đọc được kích thước ảnh (buffer ảnh hỏng hoặc không đúng định dạng)' };
  }

  const { width, height } = info;
  const isLandscapeValid = width >= 400 && height >= 250;
  const isPortraitValid = width >= 250 && height >= 400;

  if (!isLandscapeValid && !isPortraitValid) {
    return { ok: false, reason: `Độ phân giải quá thấp (${width}x${height}px) - hình mờ, vỡ nét` };
  }

  if (width * height < 120000) {
    return { ok: false, reason: `Tổng số điểm ảnh quá nhỏ (${width * height} px < 120.000 px) - hình mờ` };
  }

  const ratio = width / height;
  if (ratio < 0.50 || ratio > 2.10) {
    return { ok: false, reason: `Tỷ lệ khung hình méo mó (Ratio: ${ratio.toFixed(2)} ngoài khoảng chuẩn 0.50 - 2.10)` };
  }

  return { ok: true, width, height, ratio, sizeKb: (buffer.length / 1024).toFixed(1) };
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

  let durationSec = 0;
  const dashMatch = html.match(/mediaPresentationDuration="PT([0-9.]+)S"/i);
  if (dashMatch) {
    durationSec = Math.round(parseFloat(dashMatch[1]));
  }

  return { ok: true, durationSec, htmlLength: html.length, rawHtml: html };
}

function loadAllChannels() {
  const batches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf8'));
  const channels = [];
  batches.forEach(b => {
    if (b.channels) {
      b.channels.forEach(c => {
        channels.push({
          batchNumber: b.batchNumber,
          batchTitle: b.batchTitle,
          name: c.name,
          url: c.url,
          category: c.category || b.category
        });
      });
    }
  });
  return channels;
}

function loadCursor(totalChannels) {
  if (fs.existsSync(CURSOR_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf8'));
      if (typeof data.currentChannelIndex === 'number') return data;
    } catch {}
  }
  return {
    currentChannelIndex: 0,
    totalChannels,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    channelsProcessed: []
  };
}

function saveCursor(cursor) {
  cursor.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CURSOR_PATH, JSON.stringify(cursor, null, 2), 'utf8');
}

function getHistoryIds(channelKey, history) {
  const val = history[channelKey];
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') {
    if (Array.isArray(val.knownVideoIds)) return val.knownVideoIds;
    if (Array.isArray(val.videos)) return val.videos;
    return Object.keys(val);
  }
  return [];
}

function saveHistoryIds(channelKey, history, idsSet) {
  const existing = history[channelKey];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    existing.knownVideoIds = Array.from(idsSet);
    existing.lastCrawled = new Date().toISOString();
  } else {
    history[channelKey] = {
      deepCrawled: true,
      knownVideoIds: Array.from(idsSet),
      lastCrawled: new Date().toISOString()
    };
  }
}

async function processChannelDeep(browser, channel, channelIndex, totalChannels) {
  log(`\n================================================================================`);
  log(`🎬 [KÊNH ${channelIndex + 1}/${totalChannels}] BẮT ĐẦU CÀO SÂU 10 PHÚT: "${channel.name}"`);
  log(`🔗 URL: ${channel.url} | Thể loại: ${channel.category}`);
  log(`================================================================================`);

  const startTime = Date.now();
  const channelStats = {
    index: channelIndex,
    name: channel.name,
    url: channel.url,
    startTime: new Date().toISOString(),
    videosFound: 0,
    moviesAdded: 0,
    shortRejected: 0,
    embedRejected: 0,
    musicRejected: 0
  };

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  const page = await context.newPage();

  // Chặn image, media, font để lướt siêu tốc
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  // Xác định các nguồn URL cần quét cho kênh này
  const targetUrls = [];
  if (channel.url.includes('/watch/search/')) {
    targetUrls.push(channel.url);
  } else {
    let cleanBase = channel.url
      .replace(/\/videos\/?$/, '')
      .replace(/\/reels\/?$/, '')
      .replace(/[?&]sk=videos/g, '')
      .replace(/[?&]sk=reels_tab/g, '');

    if (cleanBase.includes('profile.php?id=')) {
      targetUrls.push(`${cleanBase}&sk=videos`);
      targetUrls.push(`${cleanBase}`);
      targetUrls.push(`${cleanBase}&sk=reels_tab`);
    } else {
      targetUrls.push(`${cleanBase}/videos`);
      targetUrls.push(`${cleanBase}/`);
      targetUrls.push(`${cleanBase}/reels/`);
    }
  }

  // Thêm Watch Search cho kênh
  const watchSearchQuery = `${channel.name} trọn bộ`;
  targetUrls.push(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(watchSearchQuery)}`);

  const discoveredVids = new Map();
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const existingVids = new Set();
  for (const s of db) {
    if (s.episodes) {
      for (const ep of s.episodes) {
        const m = ep.originalUrl && ep.originalUrl.match(/v=(\d+)/);
        if (m) existingVids.add(m[1]);
      }
    }
  }

  let history = {};
  if (fs.existsSync(HISTORY_PATH)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); } catch {}
  }
  const channelHistorySet = new Set(getHistoryIds(channel.name, history));

  let sourceIdx = 0;

  while (Date.now() - startTime < CRAWL_DURATION_MS) {
    const currentUrl = targetUrls[sourceIdx % targetUrls.length];
    const timeLeftSec = Math.round((CRAWL_DURATION_MS - (Date.now() - startTime)) / 1000);
    log(`🌐 [Thời gian còn lại: ${Math.floor(timeLeftSec/60)}m ${timeLeftSec%60}s] Đang quét nguồn: ${currentUrl}`);

    try {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2500);

      let noNewStreak = 0;
      let prevCount = discoveredVids.size;

      while (Date.now() - startTime < CRAWL_DURATION_MS && noNewStreak < 8) {
        // Triệt tiêu modal dialog
        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });

        // Cuộn chuột thật
        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3600);
        await page.waitForTimeout(1600);

        // Trích xuất video
        const newBatch = await page.evaluate(() => {
          const list = [];
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
            list.push({ id: vid, url: `https://www.facebook.com/watch/?v=${vid}`, title, duration: dur });
          }
          return list;
        });

        for (const item of newBatch) {
          if (!discoveredVids.has(item.id)) {
            discoveredVids.set(item.id, {
              ...item,
              durationSec: parseDurationSeconds(item.duration)
            });
          }
        }

        if (discoveredVids.size > prevCount) {
          noNewStreak = 0;
          prevCount = discoveredVids.size;
        } else {
          noNewStreak++;
        }
      }
    } catch (err) {
      log(`⚠️ Lỗi khi mở nguồn ${currentUrl}: ${err.message}`);
    }

    sourceIdx++;
    if (sourceIdx >= targetUrls.length && Date.now() - startTime < CRAWL_DURATION_MS) {
      targetUrls.push(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(channel.name + ' full tập')}`);
      targetUrls.push(`https://www.facebook.com/watch/search/?q=${encodeURIComponent(channel.name + ' tập cuối')}`);
    }
  }

  await context.close();

  channelStats.videosFound = discoveredVids.size;
  log(`🎯 Kênh "${channel.name}" quét được tổng cộng: ${discoveredVids.size} video.`);
  log(`Bắt đầu quy trình thẩm định thời lượng (>= 30m), bản quyền nhúng và nạp CSDL...`);

  const newIngested = [];
  const todayStr = new Date().toISOString().split('T')[0];

  for (const [vid, videoInfo] of discoveredVids.entries()) {
    if (existingVids.has(vid)) continue;
    if (channelHistorySet.has(vid)) continue;

    channelHistorySet.add(vid);

    // 1. Kiểm tra từ khóa nhạc/rác
    if (isMusicOrTrash(videoInfo.title)) {
      channelStats.musicRejected++;
      continue;
    }

    // 2. Kiểm tra quyền nhúng & đo thời lượng DASH
    const checkRes = await checkEmbedAndDuration(videoInfo.url);
    if (!checkRes.ok) {
      channelStats.embedRejected++;
      continue;
    }

    let finalSec = checkRes.durationSec || videoInfo.durationSec || 0;

    // 3. Tiêu chuẩn thời lượng >= 30 phút (1800s)
    if (finalSec < 1800) {
      channelStats.shortRejected++;
      continue;
    }

    log(`🌟 [PHIM ĐẠT TIÊU CHUẨN]: ${vid} (${formatDuration(finalSec)}) - "${videoInfo.title}"`);

    // 4. Lấy metadata OG tags & tải thumbnail
    const htmlMeta = await fetchHtml(videoInfo.url);
    let ogTitle = '';
    let ogDesc = '';
    let ogImage = '';

    const titleMatch = htmlMeta.match(/property="og:title" content="([^"]+)"/i);
    const descMatch = htmlMeta.match(/property="og:description" content="([^"]+)"/i);
    const imgMatch = htmlMeta.match(/property="og:image" content="([^"]+)"/i);

    if (titleMatch) ogTitle = titleMatch[1];
    if (descMatch) ogDesc = descMatch[1];
    if (imgMatch) ogImage = imgMatch[1].replace(/&amp;/g, '&');

    let cleanTitle = sanitizeText(ogTitle || videoInfo.title);
    cleanTitle = cleanTitle.replace(/^\d+([,.]\d+)?\s*[KkMmbB]?\s*lượt xem\s*(·\s*\d+([,.]\d+)?\s*[KkMmbB]?\s*(cảm xúc|bình luận))?\s*[|·-]\s*/i, '');
    cleanTitle = cleanTitle.replace(/^\d+([,.]\d+)?\s*(cảm xúc|bình luận)\s*(·\s*\d+([,.]\d+)?\s*(cảm xúc|bình luận))?\s*[|·-]\s*/i, '');
    cleanTitle = cleanTitle.replace(/^\d+\s*bình luận\s*[|·-]\s*/i, '');
    cleanTitle = cleanTitle.replace(/^(\(COMBO\s*\d+\s*BỘ\s*\)|COMBO\s*\d+\s*BỘ\s*)[^:]*:\s*/i, '');
    cleanTitle = cleanTitle.replace(/^(Váy ngủ|Cốc nước|Quần áo|Áo thun)[^:]*:\s*/i, '');
    cleanTitle = cleanTitle.replace(/.*Xem Full bản nét căng:\s*/i, '');
    cleanTitle = cleanTitle.replace(/^Full phim:?\s*\(trọn bộ\)\s*<<?\"?/i, '')
                           .replace(/\"?>>?$/i, '')
                           .replace(/\(Full Trọn Bộ\)/gi, '')
                           .trim();

    if (!cleanTitle || cleanTitle.length < 5) cleanTitle = `Phim Review Trọn Bộ ${vid}`;
    cleanTitle = `${cleanTitle} (Full Trọn Bộ ${formatDuration(finalSec)})`;

    // 5. Thẩm định chất lượng ảnh bìa (Image Quality Gatekeeper)
    if (!ogImage) {
      log(`🚫 [LOẠI - KHÔNG TÌM THẤY ẢNH GỐC]: ${vid} - "${videoInfo.title}"`);
      channelStats.imageRejected = (channelStats.imageRejected || 0) + 1;
      continue;
    }

    const imgBuf = await fetchBuffer(ogImage);
    const qualityCheck = validateImageQuality(imgBuf);

    if (!qualityCheck.ok) {
      log(`🚫 [LOẠI - ẢNH BÌA MÉO MÓ / MỜ / VỠ NÉT]: ${vid} - ${qualityCheck.reason} - "${videoInfo.title}"`);
      channelStats.imageRejected = (channelStats.imageRejected || 0) + 1;
      continue;
    }

    const localThumbPath = path.join(THUMBNAILS_DIR, `${vid}.jpg`);
    fs.writeFileSync(localThumbPath, imgBuf);
    log(`🖼️ [POSTER ĐẠT CHUẨN]: ${vid}.jpg (${qualityCheck.width}x${qualityCheck.height}, ${qualityCheck.sizeKb} KB, tỷ lệ: ${qualityCheck.ratio.toFixed(2)})`);

    const seriesId = `series-long-${vid}`;
    const slug = `${slugify(cleanTitle).slice(0, 70)}-${vid.slice(-4)}`;

    const newSeries = {
      id: seriesId,
      slug,
      title: cleanTitle,
      description: sanitizeText(ogDesc) || `Trọn bộ phim dài đặc sắc: ${cleanTitle}. Thời lượng: ${formatDuration(finalSec)}. Kênh: ${channel.name}.`,
      thumbnail: `/thumbnails/${vid}.jpg`,
      coverImage: `/thumbnails/${vid}.jpg`,
      channelName: channel.name,
      genres: [channel.category || 'Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt'],
      categories: ['Phim Dài Full', 'Review Tóm Tắt'],
      totalEpisodes: 1,
      featured: true,
      updatedAt: todayStr,
      episodes: [
        {
          id: `ep-long-${vid}`,
          seriesId,
          partNumber: 1,
          title: cleanTitle,
          originalUrl: videoInfo.url,
          embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoInfo.url)}&show_text=0&autoplay=0`,
          platform: 'facebook',
          aspectRatio: '16:9',
          duration: formatDuration(finalSec),
          thumbnail: `/thumbnails/${vid}.jpg`,
          viewsCount: Math.floor(Math.random() * 40000) + 12000,
          publishedAt: todayStr
        }
      ]
    };

    newIngested.push(newSeries);
    existingVids.add(vid);
    channelStats.moviesAdded++;
  }

  // Cập nhật CSDL
  if (newIngested.length > 0) {
    const currentDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const updatedDb = [...newIngested, ...currentDb];
    fs.writeFileSync(DB_PATH, JSON.stringify(updatedDb, null, 2), 'utf8');
    log(`💾 Đã nạp thành công ${newIngested.length} phim dài mới từ kênh "${channel.name}" vào CSDL! (Tổng CSDL: ${updatedDb.length})`);

    // Tự động đẩy Git để VPS Auto Updater deploy
    try {
      execSync('git add src/data/database.json public/thumbnails/', { encoding: 'utf-8', timeout: 30000 });
      execSync(`git commit -m "feat(crawler): deep crawl channel ${channel.name} (+${newIngested.length} movies)"`, { encoding: 'utf-8', timeout: 30000 });
      execSync('git push origin main', { encoding: 'utf-8', timeout: 60000 });
      log(`🚀 Đã tự động git push bản cập nhật lên GitHub để VPS cập nhật trực tiếp!`);
    } catch (gitErr) {
      log(`⚠️ Lưu ý Git push: ${gitErr.message}`);
    }
  } else {
    log(`ℹ️ Kênh "${channel.name}" không có phim dài nào mới đạt chuẩn >= 30m trong phiên cào này.`);
  }

  // Cập nhật history
  saveHistoryIds(channel.name, history, channelHistorySet);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');

  channelStats.endTime = new Date().toISOString();
  log(`🏁 Hoàn tất phiên cào 10 phút kênh: "${channel.name}". Thống kê: [Tìm thấy: ${channelStats.videosFound}, Nạp mới: ${channelStats.moviesAdded}, Lọc clip ngắn: ${channelStats.shortRejected}, Cấm nhúng: ${channelStats.embedRejected}, Ca nhạc: ${channelStats.musicRejected}, Ảnh lỗi/mờ/vỡ: ${channelStats.imageRejected || 0}]`);

  return channelStats;
}

async function runDeepCrawlerBot() {
  log(`\n================================================================================`);
  log(`🤖 KHỞI ĐỘNG BỘ BOT NGẦM CÀO SÂU TUẦN TỰ TOÀN BỘ KÊNH TRONG FILE WORD / CSDL`);
  log(`⏱️ CẤU HÌNH: CÀO SÂU 10 PHÚT/KÊNH | NGHỈ 2 PHÚT | TỰ ĐỘNG CHUYỂN KÊNH TIẾP THEO`);
  log(`================================================================================\n`);

  const allChannels = loadAllChannels();
  log(`📋 Tổng số kênh đã nạp từ danh sách quản trị: ${allChannels.length} kênh.`);

  const cursor = loadCursor(allChannels.length);
  log(`📍 Điểm bắt đầu hiện tại: Kênh thứ ${cursor.currentChannelIndex + 1}/${allChannels.length} ("${allChannels[cursor.currentChannelIndex]?.name || 'N/A'}")`);

  let browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  let consecutiveChannels = 0;

  while (cursor.currentChannelIndex < allChannels.length) {
    const channel = allChannels[cursor.currentChannelIndex];

    consecutiveChannels++;
    if (consecutiveChannels > 5) {
      log(`🔄 Khởi động lại browser engine để tối ưu RAM...`);
      try { await browser.close(); } catch {}
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });
      consecutiveChannels = 1;
    }

    try {
      const stats = await processChannelDeep(browser, channel, cursor.currentChannelIndex, allChannels.length);
      cursor.channelsProcessed.push(stats);
    } catch (channelErr) {
      log(`❌ Lỗi ngoài ý muốn tại kênh "${channel.name}": ${channelErr.message}`);
    }

    cursor.currentChannelIndex++;
    saveCursor(cursor);

    if (cursor.currentChannelIndex < allChannels.length) {
      const nextChan = allChannels[cursor.currentChannelIndex];
      log(`\n😴 [NGHỈ 2 PHÚT THEO LỆNH] Đang nghỉ 2 phút trước khi bắt đầu cào kênh [${cursor.currentChannelIndex + 1}/${allChannels.length}]: "${nextChan.name}"...`);
      await new Promise(r => setTimeout(r, REST_DURATION_MS));
    }
  }

  log(`\n🎉🎉🎉 ĐÃ HOÀN TẤT CÀO SÂU TOÀN BỘ ${allChannels.length} KÊNH TRONG DANH SÁCH!`);
  try { await browser.close(); } catch {}
}

runDeepCrawlerBot().catch(err => {
  log(`🔥 FATAL BOT ERROR: ${err.message}`);
});
