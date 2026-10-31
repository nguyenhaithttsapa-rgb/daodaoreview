import https from 'https';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { execSync } from 'child_process';

const DB_PATH = path.resolve('src/data/database.json');
const THUMBNAILS_DIR = path.resolve('public/thumbnails');
const HISTORY_PATH = path.resolve('src/data/channel_crawl_history.json');
const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');
const DEEP_CURSOR_PATH = path.resolve('src/data/deep_crawl_cursor.json');
const UPDATE_CURSOR_PATH = path.resolve('src/data/existing_update_cursor.json');
const LOG_DIR = path.resolve('logs');
const LOG_PATH = path.join(LOG_DIR, 'existing_update.log');

if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function log(msg) {
  const ts = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
    fs.appendFileSync(path.join(LOG_DIR, 'deep_crawl.log'), line + '\n', 'utf8');
  } catch {}
}

process.on('uncaughtException', (err) => {
  log(`⚠️ [UNCAUGHT EXCEPTION PREVENTED]: ${err?.message || err}`);
});

process.on('unhandledRejection', (reason) => {
  log(`⚠️ [UNHANDLED REJECTION PREVENTED]: ${reason?.message || reason}`);
});

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

function cleanAffiliateSpam(str) {
  if (!str) return '';
  return str
    .replace(/-{3,}\s*Đây có thể không phải sản phẩm bạn cần.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Đây có thể không phải sản phẩm bạn cần.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Trợ thủ đắc lực làm việc nhà.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Trợ thủ đặc lực làm việc nhà.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Cây chà sàn 3 trong 1.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Cây lau nhà tự vắt 2 ngăn/gi, ' ')
    .replace(/Kệ Để Đồ Nhà Bếp\s*/gi, '')
    .replace(/^.*?Xem Full Tại Đây\s*:\s*/gi, '')
    .replace(/Quý vị đi ngang cho em xin 1 lượt click Shopee.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeText(str) {
  if (!str) return '';
  let clean = cleanAffiliateSpam(decodeHtmlEntities(str));
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
    'cafe sáng', 'dealshaker', 'nuôi dạy con', 'livestream bán hàng', 'livestream',
    'takashi ocean', 'ocean suite', 'chơi cùng lego', 'lego city', 'mykingdom',
    'thử thách sinh tồn', 'trái đất của chúng ta', 'bất động sản', 'khu đô thị biển',
    'bán đất', 'căn hộ', 'chung cư', 'dự án biển', 'hội thảo',
    'vietnam vs', 'thái lan vs', 'trực tiếp bóng đá', 'highlights bóng đá',
    'lễ đăng điện', 'cầu siêu cố đạo hữu', 'hưởng hạ thọ', 'tang lễ',
    'thiết kế kiến trúc', 'thi công xây dựng trọn gói', 'chìa khóa trao tay'
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
        res.on('error', () => resolve(null));
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
  try {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { type: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
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
        if (length <= 0) break;
        offset += 2 + length;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function validateImageQuality(buffer) {
  if (!buffer || buffer.length < 15360) {
    const sizeKb = buffer ? (buffer.length / 1024).toFixed(1) : 0;
    return { ok: false, reason: `Dung lượng quá nhỏ (${sizeKb} KB < 15 KB)` };
  }
  const info = getImageInfo(buffer);
  if (!info || !info.width || !info.height) {
    return { ok: false, reason: 'Không đọc được kích thước ảnh' };
  }
  const { width, height } = info;
  const isLandscapeValid = width >= 400 && height >= 250;
  const isPortraitValid = width >= 250 && height >= 400;
  if (!isLandscapeValid && !isPortraitValid) {
    return { ok: false, reason: `Độ phân giải quá thấp (${width}x${height}px)` };
  }
  if (width * height < 120000) {
    return { ok: false, reason: `Tổng số điểm ảnh quá nhỏ (${width * height} px < 120.000 px)` };
  }
  const ratio = width / height;
  if (ratio < 0.50 || ratio > 2.10) {
    return { ok: false, reason: `Tỷ lệ khung hình méo mó (Ratio: ${ratio.toFixed(2)})` };
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
        res.on('error', () => resolve(''));
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
  return { ok: true, durationSec, htmlLength: html.length };
}

const INVALID_BASE_NAMES = new Set([
  'full', 'review', 'phim', 'tron bo', 'tom tat', 'phim hay', 'phim ngan',
  'tap 1', 'tap 2', 'tap 3', 'phan 1', 'phan 2', 'mua 1', 'mua 2',
  'mua 3', 'mua 4', 'mua 5', 'full phim', 'review phim', 'hoat hinh 3d',
  'phim hay tron bo', 'thuyet minh', 'vietsub'
]);

function extractCoreSeriesName(title) {
  if (!title) return null;
  let t = cleanAffiliateSpam(title)
    .replace(/\(Full Trọn Bộ[^)]*\)/gi, '')
    .replace(/\(Nội dung giải trí[^)]*\)/gi, '')
    .replace(/\|[^|]+$/g, '')
    .replace(/^\s*\[[^\]]+\]\s*/g, '')
    .replace(/^[🔥🎬📺💥⚡✨\s*]+/u, '')
    .replace(/[*_~`]+/g, '')
    .trim();

  // Mẫu 1: "Mùa 1 - Mùa 3 | Tiên Nhãn ..."
  const prefixSeasonMatch = t.match(/^(?:Mùa|Phần|Tập|Part|Ep)\s*(\d+)(?:\s*[-+–]\s*(?:Mùa|Phần|Tập|P)?\s*\d+)?(?:\s*\([^)]*\))?\s*\|\s*([^|(:\n]{6,60})/i);
  if (prefixSeasonMatch) {
    const partNum = parseInt(prefixSeasonMatch[1], 10);
    let base = prefixSeasonMatch[2].trim();
    const words = base.split(/\s+/);
    if (words.length > 8) base = words.slice(0, 6).join(' ');
    const baseKey = base.toLowerCase();
    if (base.length >= 6 && !INVALID_BASE_NAMES.has(baseKey) && !/^(mùa|phần|tập)\s*\d+/i.test(base)) {
      return { baseKey, baseName: base, partNum };
    }
  }

  // Mẫu 2: "Vạn Yêu Đồ Lục Truyện - Trọn Bộ Mùa 7 ..."
  const suffixSeasonMatch = t.match(/^([^|(\n]{6,60}?)\s*[-–—:|]\s*(?:Trọn Bộ\s*)?(?:Mùa|Phần|Tập|Part|Ep|P)\s*(\d+)/i);
  if (suffixSeasonMatch) {
    let base = suffixSeasonMatch[1]
      .replace(/^(?:FULL\s+|REVIEW\s+|PHIM\s+)/i, '')
      .trim();
    const partNum = parseInt(suffixSeasonMatch[2], 10);
    const baseKey = base.toLowerCase();
    if (
      base.length >= 6 &&
      base.length <= 55 &&
      !INVALID_BASE_NAMES.has(baseKey) &&
      !/^(?:mùa|phần|tập|part|ep|p)\s*\d+/i.test(base)
    ) {
      return { baseKey, baseName: base, partNum };
    }
  }
  return null;
}

function buildExistingTargets() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const batches = fs.existsSync(BATCHES_PATH) ? JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf8')) : [];
  const deepCursor = fs.existsSync(DEEP_CURSOR_PATH) ? JSON.parse(fs.readFileSync(DEEP_CURSOR_PATH, 'utf8')) : { currentChannelIndex: 1417 };

  const batchChannelMap = new Map();
  let flatIdx = 0;
  for (const b of batches) {
    for (const c of (b.channels || [])) {
      batchChannelMap.set(c.name, {
        name: c.name,
        url: c.url,
        category: c.category || b.category || 'Hoạt Hình 3D',
        batchNumber: b.batchNumber,
        wasCrawled: flatIdx <= (deepCursor.currentChannelIndex || 1417)
      });
      flatIdx++;
    }
  }

  const pageStats = new Map();

  pageStats.set('Mễ Lạc Review', {
    name: 'Mễ Lạc Review',
    directUrl: 'https://www.facebook.com/profile.php?id=61588732377311&sk=videos',
    category: 'Hoạt Hình 3D',
    count: 120,
    seriesNames: new Set([
      'Vô Linh Chứng Đạo',
      'Kiếm Tiên Trở Về',
      'Thái Huyền Thai Châu Truyện',
      'Bạo Tiếu Tu Tiên',
      'Ở Tu Tiên Giới Thu Gom Phế Phẩm',
      'Biệt Đội Số 0',
      'Vừa Bắt Đầu Đã Là Đại Đế',
      'Cao Vũ'
    ])
  });

  for (const s of db) {
    let realPage = '';
    const m = (s.title || '').match(/\|\s*([^|(]+?)\s*\(Full Trọn Bộ/i);
    if (m && m[1].trim().length >= 3 && m[1].trim().length <= 45) {
      realPage = m[1].trim();
    }
    const chName = s.channelName || 'Đại Đạo Review';
    const cat = (s.genres && s.genres[0]) || (s.categories && s.categories[0]) || 'Hoạt Hình 3D';
    const coreSeries = extractCoreSeriesName(s.title);

    if (realPage && !/^(facebook|watch|video)$/i.test(realPage)) {
      if (!pageStats.has(realPage)) {
        const bInfo = batchChannelMap.get(realPage);
        pageStats.set(realPage, {
          name: realPage,
          directUrl: bInfo ? bInfo.url : null,
          category: cat,
          count: 0,
          seriesNames: new Set()
        });
      }
      const st = pageStats.get(realPage);
      st.count++;
      if (coreSeries && st.seriesNames.size < 6) {
        st.seriesNames.add(coreSeries.baseName);
      }
    }

    const cleanChName = chName.replace(/\s*#\d+(\.\d+)?$/, '').trim();
    if (!pageStats.has(chName)) {
      const bInfo = batchChannelMap.get(chName);
      pageStats.set(chName, {
        name: chName,
        cleanQueryName: cleanChName,
        directUrl: bInfo ? bInfo.url : null,
        category: cat,
        count: 0,
        seriesNames: new Set()
      });
    }
    const chSt = pageStats.get(chName);
    chSt.count++;
    if (coreSeries && chSt.seriesNames.size < 6) {
      chSt.seriesNames.add(coreSeries.baseName);
    }
  }

  for (const [cName, bInfo] of batchChannelMap.entries()) {
    if (bInfo.wasCrawled && !pageStats.has(cName)) {
      pageStats.set(cName, {
        name: cName,
        cleanQueryName: cName.replace(/\s*#\d+(\.\d+)?$/, '').trim(),
        directUrl: bInfo.url,
        category: bInfo.category,
        count: 1,
        seriesNames: new Set()
      });
    }
  }

  const sortedTargets = Array.from(pageStats.values()).sort((a, b) => {
    if (b.seriesNames.size !== a.seriesNames.size) return b.seriesNames.size - a.seriesNames.size;
    return b.count - a.count;
  });

  return sortedTargets.map((t, idx) => ({
    index: idx,
    name: t.name,
    cleanQueryName: t.cleanQueryName || t.name.replace(/\s*#\d+(\.\d+)?$/, '').trim(),
    directUrl: t.directUrl,
    category: t.category,
    existingMoviesCount: t.count,
    seriesList: Array.from(t.seriesNames)
  }));
}

function loadUpdateCursor(totalTargets) {
  if (fs.existsSync(UPDATE_CURSOR_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(UPDATE_CURSOR_PATH, 'utf8'));
      if (typeof data.currentTargetIndex === 'number') {
        data.totalTargets = totalTargets;
        return data;
      }
    } catch {}
  }
  return {
    mode: 'CRAWL_NEW_EPISODES_FOR_EXISTING_SERIES_AND_CHANNELS',
    currentTargetIndex: 0,
    totalTargets,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalNewEpisodesAdded: 0,
    totalSeriesUpdated: 0,
    targetsProcessed: []
  };
}

function saveUpdateCursor(cursor) {
  cursor.lastUpdated = new Date().toISOString();
  fs.writeFileSync(UPDATE_CURSOR_PATH, JSON.stringify(cursor, null, 2), 'utf8');
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

async function processExistingTarget(browser, target, targetIndex, totalTargets) {
  log(`\n================================================================================`);
  log(`🔄 [CẬP NHẬT TẬP MỚI ${targetIndex + 1}/${totalTargets}] KÊNH & BỘ PHIM ĐÃ CÓ: "${target.name}"`);
  log(`📊 Số phim đã có từ nguồn này: ${target.existingMoviesCount} | Bộ phim theo dõi: ${target.seriesList.length > 0 ? target.seriesList.join(', ') : 'Toàn bộ phim mới trên kênh'}`);
  log(`================================================================================`);

  const stats = {
    index: targetIndex,
    name: target.name,
    startTime: new Date().toISOString(),
    videosFound: 0,
    newEpisodesAdded: 0,
    existingSeriesLinked: 0,
    shortRejected: 0,
    embedRejected: 0,
    musicRejected: 0,
    imageRejected: 0
  };

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'vi-VN'
  });

  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      return route.abort();
    }
    return route.continue();
  });

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const existingVids = new Set();
  for (const s of db) {
    const mId = (s.id || '').replace('series-long-', '');
    if (mId) existingVids.add(mId);
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
  const channelHistorySet = new Set(getHistoryIds(target.name, history));

  const urlsToScan = [];

  if (target.directUrl && !target.directUrl.includes('/watch/search/')) {
    let cleanBase = target.directUrl
      .replace(/\/videos\/?$/, '')
      .replace(/\/reels\/?$/, '')
      .replace(/[?&]sk=videos/g, '');
    if (cleanBase.includes('profile.php?id=')) {
      urlsToScan.push({ url: `${cleanBase}&sk=videos`, mode: 'TOP_LAYER_PAGE', maxScrolls: 4 });
    } else {
      urlsToScan.push({ url: `${cleanBase}/videos`, mode: 'TOP_LAYER_PAGE', maxScrolls: 4 });
    }
  }

  for (const seriesName of target.seriesList.slice(0, 4)) {
    urlsToScan.push({
      url: `https://www.facebook.com/watch/search/?q=${encodeURIComponent(target.cleanQueryName + ' ' + seriesName + ' trọn bộ')}`,
      mode: 'SERIES_EPISODE_SEARCH',
      seriesHint: seriesName,
      maxScrolls: 5
    });
    urlsToScan.push({
      url: `https://www.facebook.com/watch/search/?q=${encodeURIComponent(seriesName + ' phần mới full')}`,
      mode: 'SERIES_EPISODE_SEARCH',
      seriesHint: seriesName,
      maxScrolls: 4
    });
  }

  urlsToScan.push({
    url: `https://www.facebook.com/watch/search/?q=${encodeURIComponent(target.cleanQueryName + ' tập mới nhất trọn bộ')}`,
    mode: 'CHANNEL_NEWEST_SEARCH',
    maxScrolls: 6
  });
  urlsToScan.push({
    url: `https://www.facebook.com/watch/search/?q=${encodeURIComponent(target.cleanQueryName + ' full trọn bộ mới nhất')}`,
    mode: 'CHANNEL_NEWEST_SEARCH',
    maxScrolls: 6
  });

  const discoveredVids = new Map();

  for (const scanItem of urlsToScan) {
    log(`🌐 [${scanItem.mode}] Đang quét tập mới: ${scanItem.url}`);
    try {
      await page.goto(scanItem.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2200);

      let scrollCount = 0;
      let noNewStreak = 0;
      let prevSize = discoveredVids.size;

      while (scrollCount < scanItem.maxScrolls && noNewStreak < 3) {
        if (page.isClosed()) break;
        scrollCount++;

        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
          document.documentElement.style.overflow = 'auto';
          document.body.style.overflow = 'auto';
        });

        await page.mouse.move(640, 450);
        await page.mouse.wheel(0, 3500);
        await page.waitForTimeout(1500);

        const batch = await page.evaluate(() => {
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

            let views = 0;
            const vm = text.match(/([\d.,]+)\s*([KkMmbB]?)\s*(?:lượt xem|views)/i);
            if (vm) {
              let num = parseFloat(vm[1].replace(',', '.'));
              const unit = (vm[2] || '').toUpperCase();
              if (unit === 'K') num *= 1000;
              else if (unit === 'M') num *= 1000000;
              else if (unit === 'B') num *= 1000000000;
              views = Math.round(num);
            }

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
            let title = lines.find(l => !/^\d+[\sKkMmbB]+/.test(l) && !/^\d{1,2}:\d{2}/.test(l) && !l.includes('Thích') && !l.includes('Bình luận')) || a.innerText || `Video ${vid}`;
            list.push({ id: vid, url: `https://www.facebook.com/watch/?v=${vid}`, title, duration: dur, viewsCount: views });
          }
          return list;
        });

        let hitKnownBoundaryOnPage = false;
        for (const item of batch) {
          if (scanItem.mode === 'TOP_LAYER_PAGE' && existingVids.has(item.id) && scrollCount >= 2) {
            hitKnownBoundaryOnPage = true;
            break;
          }
          if (!discoveredVids.has(item.id)) {
            discoveredVids.set(item.id, {
              ...item,
              seriesHint: scanItem.seriesHint || null,
              durationSec: parseDurationSeconds(item.duration)
            });
          }
        }

        if (hitKnownBoundaryOnPage) {
          log(`🛑 [BOUNDARY CHECKPOINT]: Đã chạm mốc video cũ trên trang "${target.name}" -> Dừng cuộn trang trực tiếp.`);
          break;
        }

        if (discoveredVids.size > prevSize) {
          noNewStreak = 0;
          prevSize = discoveredVids.size;
        } else {
          noNewStreak++;
        }
      }
    } catch (err) {
      log(`⚠️ Lỗi khi quét URL ${scanItem.url}: ${err.message}`);
    }
  }

  try { await context.close(); } catch {}

  stats.videosFound = discoveredVids.size;
  log(`🎯 Tìm thấy ${discoveredVids.size} video từ "${target.name}". Bắt đầu lọc tập mới (>= 30 phút)...`);

  const prioritizedVids = Array.from(discoveredVids.entries()).sort((a, b) => {
    const aItem = a[1];
    const bItem = b[1];
    const aLong = (aItem.durationSec || 0) >= 1800 ? 1 : 0;
    const bLong = (bItem.durationSec || 0) >= 1800 ? 1 : 0;
    if (bLong !== aLong) return bLong - aLong;
    return (bItem.viewsCount || 0) - (aItem.viewsCount || 0);
  });

  const newIngested = [];
  let updatedExistingSeries = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

  for (const [vid, videoInfo] of prioritizedVids) {
    try {
      if (existingVids.has(vid)) continue;
      if (channelHistorySet.has(vid)) continue;
      channelHistorySet.add(vid);

      if (isMusicOrTrash(videoInfo.title)) {
        stats.musicRejected++;
        continue;
      }

      const checkRes = await checkEmbedAndDuration(videoInfo.url);
      if (!checkRes.ok) {
        stats.embedRejected++;
        continue;
      }

      const finalSec = checkRes.durationSec || videoInfo.durationSec || 0;
      if (finalSec < 1800) {
        stats.shortRejected++;
        continue;
      }

      const htmlMeta = await fetchHtml(videoInfo.url);
      const titleMatch = htmlMeta.match(/property="og:title" content="([^"]+)"/i);
      const descMatch = htmlMeta.match(/property="og:description" content="([^"]+)"/i);
      const imgMatch = htmlMeta.match(/property="og:image" content="([^"]+)"/i);

      const ogTitle = titleMatch ? titleMatch[1] : '';
      const ogDesc = descMatch ? descMatch[1] : '';
      const ogImage = imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : '';

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

      if (isMusicOrTrash(cleanTitle) || isMusicOrTrash(ogDesc)) {
        stats.musicRejected++;
        continue;
      }

      if (!cleanTitle || cleanTitle.length < 5) cleanTitle = `Phim Review Trọn Bộ ${vid}`;
      cleanTitle = `${cleanTitle} (Full Trọn Bộ ${formatDuration(finalSec)})`;

      if (!ogImage) {
        stats.imageRejected++;
        continue;
      }

      const imgBuf = await fetchBuffer(ogImage);
      const qualityCheck = validateImageQuality(imgBuf);
      if (!qualityCheck.ok) {
        log(`🚫 [LOẠI - ẢNH BÌA KÉM CHẤT LƯỢNG]: ${vid} - ${qualityCheck.reason}`);
        stats.imageRejected++;
        continue;
      }

      const localThumbPath = path.join(THUMBNAILS_DIR, `${vid}.jpg`);
      fs.writeFileSync(localThumbPath, imgBuf);

      const seriesId = `series-long-${vid}`;
      const slug = `${slugify(cleanTitle).slice(0, 70)}-${vid.slice(-4)}`;
      const epViews = (videoInfo.viewsCount && videoInfo.viewsCount > 1000) ? videoInfo.viewsCount : (Math.floor(Math.random() * 40000) + 18000);

      const newEpisodeObj = {
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
        viewsCount: epViews,
        publishedAt: todayStr
      };

      // Chỉ ghép vào bộ phim sẵn có khi TIÊU ĐỀ THỰC TẾ của video mới trùng khớp tên bộ phim (coreInfo.baseKey)
      const coreInfo = extractCoreSeriesName(cleanTitle);
      let matchHint = coreInfo ? coreInfo.baseKey : null;
      if (!matchHint && videoInfo.seriesHint && cleanTitle.toLowerCase().includes(videoInfo.seriesHint.toLowerCase())) {
        matchHint = videoInfo.seriesHint.toLowerCase();
      }

      let matchedExistingSeriesList = [];
      if (matchHint && matchHint.length >= 6 && !INVALID_BASE_NAMES.has(matchHint)) {
        matchedExistingSeriesList = currentDb.filter(s => {
          const sCore = extractCoreSeriesName(s.title);
          if (sCore && sCore.baseKey === matchHint) return true;
          return false;
        });
      }

      let combinedEpisodesForNewSeries = [newEpisodeObj];

      if (matchedExistingSeriesList.length > 0) {
        const allEpsMap = new Map();
        for (const ms of matchedExistingSeriesList) {
          for (const ep of (ms.episodes || [])) {
            if (ep.originalUrl && !allEpsMap.has(ep.originalUrl)) {
              allEpsMap.set(ep.originalUrl, ep);
            }
          }
        }
        allEpsMap.set(newEpisodeObj.originalUrl, newEpisodeObj);

        const mergedEps = Array.from(allEpsMap.values()).map((ep, idx) => ({
          ...ep,
          partNumber: idx + 1
        }));

        for (const ms of matchedExistingSeriesList) {
          ms.episodes = mergedEps.map(ep => ({ ...ep, seriesId: ms.id }));
          ms.totalEpisodes = mergedEps.length;
          ms.updatedAt = todayStr;
        }
        combinedEpisodesForNewSeries = mergedEps.map(ep => ({ ...ep, seriesId }));
        updatedExistingSeries++;
        stats.existingSeriesLinked++;
        log(`🔗 [GHÉP TẬP MỚI VÀO BỘ ĐÃ CÓ]: Đã thêm Tập ${mergedEps.length} vào bộ "${matchHint}" (${matchedExistingSeriesList.length} mục liên kết)!`);
      }

      const newSeries = {
        id: seriesId,
        slug,
        title: cleanTitle,
        description: sanitizeText(ogDesc) || `Trọn bộ phim dài đặc sắc: ${cleanTitle}. Thời lượng: ${formatDuration(finalSec)}. Kênh: ${target.name}.`,
        thumbnail: `/thumbnails/${vid}.jpg`,
        coverImage: `/thumbnails/${vid}.jpg`,
        channelName: target.name,
        genres: [target.category || 'Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt'],
        categories: ['Phim Dài Full', 'Review Tóm Tắt'],
        totalEpisodes: combinedEpisodesForNewSeries.length,
        featured: true,
        updatedAt: todayStr,
        episodes: combinedEpisodesForNewSeries
      };

      newIngested.push(newSeries);
      existingVids.add(vid);
      stats.newEpisodesAdded++;
      log(`🌟 [NẠP TẬP MỚI THÀNH CÔNG]: ${vid} (${formatDuration(finalSec)}) - "${cleanTitle}"`);
    } catch (vidErr) {
      log(`⚠️ [LỖI XỬ LÝ VIDEO ${vid}]: ${vidErr.message}`);
    }
  }

  if (newIngested.length > 0) {
    const updatedDb = [...newIngested, ...currentDb];
    fs.writeFileSync(DB_PATH, JSON.stringify(updatedDb, null, 2), 'utf8');
    log(`💾 Đã nạp ${newIngested.length} tập phim dài mới (cập nhật ${updatedExistingSeries} bộ phim sẵn có) từ "${target.name}"! Tổng CSDL: ${updatedDb.length}`);

    try {
      execSync('node scripts/link_existing_episodes.mjs', { encoding: 'utf-8', timeout: 30000 });
      execSync('git add src/data/database.json public/thumbnails/', { encoding: 'utf-8', timeout: 30000 });
      execSync(`git commit -m "feat(episodes): crawl new episodes for existing channel ${target.name} (+${newIngested.length} eps)"`, { encoding: 'utf-8', timeout: 30000 });
      execSync('git push origin main', { encoding: 'utf-8', timeout: 60000 });
      execSync('node scripts/ping_bing_indexnow.mjs', { encoding: 'utf-8', timeout: 30000 });
      log(`🚀 Đã tự động git push tập mới lên GitHub (VPS auto-deploy) & Ping Bing IndexNow!`);
    } catch (gitErr) {
      log(`⚠️ Lưu ý Git push / IndexNow: ${gitErr.message}`);
    }
  } else {
    log(`ℹ️ Kênh/Bộ phim "${target.name}" chưa có thêm tập dài >= 30m mới nào ngoài các tập đã có trong CSDL.`);
  }

  saveHistoryIds(target.name, history, channelHistorySet);
  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
  } catch (histErr) {
    log(`⚠️ Lưu ý ghi lịch sử: ${histErr.message}`);
  }

  stats.endTime = new Date().toISOString();
  log(`🏁 Hoàn tất kiểm tra & cào tập mới cho "${target.name}": [Quét: ${stats.videosFound}, Tập mới nạp: ${stats.newEpisodesAdded}, Ghép vào bộ cũ: ${stats.existingSeriesLinked}, Loại <30m: ${stats.shortRejected}, Cấm nhúng: ${stats.embedRejected}, Nhạc/Rác: ${stats.musicRejected}, Ảnh lỗi: ${stats.imageRejected}]`);
  return stats;
}

async function main() {
  log(`\n================================================================================`);
  log(`🚀 KHỞI ĐỘNG BOT CÀO TẬP MỚI CHO CÁC TẬP PHIM & KÊNH ĐÃ CÓ SẴN TRONG CSDL`);
  log(`================================================================================\n`);

  const targets = buildExistingTargets();
  log(`📋 Tổng số Kênh & Cụm Bộ Phim đã có sẵn cần quét tập mới: ${targets.length} mục tiêu.`);

  const cursor = loadUpdateCursor(targets.length);
  if (cursor.currentTargetIndex >= targets.length) {
    cursor.currentTargetIndex = 0;
  }

  let browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  let consecutive = 0;
  while (cursor.currentTargetIndex < targets.length) {
    const target = targets[cursor.currentTargetIndex];
    consecutive++;

    if (consecutive > 3 || !browser || !browser.isConnected()) {
      try { await browser.close(); } catch {}
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--js-flags=--max-old-space-size=512']
      });
      consecutive = 1;
    }

    try {
      const stats = await processExistingTarget(browser, target, cursor.currentTargetIndex, targets.length);
      cursor.totalNewEpisodesAdded = (cursor.totalNewEpisodesAdded || 0) + stats.newEpisodesAdded;
      cursor.totalSeriesUpdated = (cursor.totalSeriesUpdated || 0) + stats.existingSeriesLinked;
      cursor.targetsProcessed.push(stats);
      if (cursor.targetsProcessed.length > 100) {
        cursor.targetsProcessed = cursor.targetsProcessed.slice(-100);
      }
    } catch (err) {
      log(`❌ Lỗi khi quét mục tiêu "${target.name}": ${err.message}`);
    }

    cursor.currentTargetIndex++;
    saveUpdateCursor(cursor);

    await new Promise(r => setTimeout(r, 10000));
  }

  try { await browser.close(); } catch {}
  log(`🎉 Đã hoàn thành chu kỳ quét tập mới cho toàn bộ ${targets.length} kênh & bộ phim đã có sẵn!`);
}

main().catch(err => {
  log(`🔥 Lỗi: ${err.message}`);
});
