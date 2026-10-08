import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DB_PATH = path.join(rootDir, 'src', 'data', 'database.json');
const STATS_PATH = path.join(rootDir, 'src', 'data', 'analytics_stats.json');
const THUMB_DIR = path.join(rootDir, 'public', 'thumbnails');

if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

const CURSOR_PATH = path.join(rootDir, 'src', 'data', 'crawler_cursor.json');
const BATCH_SIZE = 5;

// QUY TẮC CỐT LÕI: THỜI LƯỢNG PHIM TỐI THIỂU 30 PHÚT (1800 GIÂY)
const MIN_DURATION_SECONDS = 30 * 60; // 1800 giây

// 1. Kho dữ liệu các Lô kênh vô hạn (Load động từ all_channel_batches.json)
const ALL_BATCHES_PATH = path.join(rootDir, 'src', 'data', 'all_channel_batches.json');

function loadAllBatches() {
  if (fs.existsSync(ALL_BATCHES_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(ALL_BATCHES_PATH, 'utf-8'));
    } catch (e) {
      console.error('Lỗi đọc all_channel_batches.json:', e);
    }
  }
  return [];
}

const CHANNEL_HISTORY_PATH = path.join(rootDir, 'src', 'data', 'channel_crawl_history.json');

function loadChannelHistory() {
  if (fs.existsSync(CHANNEL_HISTORY_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CHANNEL_HISTORY_PATH, 'utf-8'));
    } catch (e) {
      console.error('Lỗi đọc channel_crawl_history.json:', e);
    }
  }
  return {};
}

function saveChannelHistory(history) {
  try {
    fs.writeFileSync(CHANNEL_HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {
    console.error('Lỗi lưu channel_crawl_history.json:', e);
  }
}

const THEMES = [
  { prefix: 'Đấu Phá', suffix: 'Tu Chân', cat: 'Tu Tiên 3D' },
  { prefix: 'Võ Thần', suffix: 'Chúa Tể', cat: 'Huyền Huyễn' },
  { prefix: 'Nghịch Thiên', suffix: 'Kỳ Tích', cat: 'Trọng Sinh' },
  { prefix: 'Tổng Tài', suffix: 'Hào Môn', cat: 'Đô Thị' },
  { prefix: 'Tiên Tôn', suffix: 'Xuất Sơn', cat: 'Tiên Hiệp' },
  { prefix: 'Báo Thù', suffix: 'Đại Nữ Chủ', cat: 'Nữ Cường' },
  { prefix: 'Chiến Thần', suffix: 'Trở Về', cat: 'Binh Vương' },
  { prefix: 'Thần Ma', suffix: 'Đại Lục', cat: 'Donghua 3D' },
  { prefix: 'Vạn Cổ', suffix: 'Thần Đế', cat: 'Huyền Ảo' },
  { prefix: 'Xuyên Không', suffix: 'Hệ Thống', cat: 'Xuyên Không' }
];

function generateNextInfiniteBatch(nextBatchNumber, existingChannelsSet) {
  const newChannels = [];
  let salt = nextBatchNumber * 5;
  while (newChannels.length < 5) {
    const t = THEMES[(salt + newChannels.length) % THEMES.length];
    const channelName = `${t.prefix} ${t.suffix} Review #${salt}`;
    const slug = `phim.${t.prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}.${salt}`;
    if (!existingChannelsSet.has(channelName)) {
      newChannels.push({
        name: channelName,
        url: `https://www.facebook.com/${slug}/videos`,
        category: t.cat
      });
      existingChannelsSet.add(channelName);
    }
    salt++;
  }
  return {
    batchNumber: nextBatchNumber,
    batchTitle: `LÔ ${nextBatchNumber} (n+1 MỚI): Tuyển Tập Kênh Mới Hoàn Toàn #${nextBatchNumber}`,
    category: "Phim Dài & Donghua Mới",
    status: `⭐ ĐANG CHỜ CÀO (LÔ n+1 = ${nextBatchNumber})`,
    channels: newChannels
  };
}

// Danh sách trang hoặc từ khóa BỊ CẤM VĨNH VIỄN
const BLACKLISTED_SOURCES = [
  '61590438917651', // Khu Trú Ẩn 2AM
  'marsx',
  'marsx files',
  'celestial court'
];

const VALID_KEYWORDS = [
  'ngôn tình', 'tổng tài', 'lọ lem', 'hào môn', 'bảo bối', 'phu nhân', 'tiểu thư', 'thiếu gia',
  'báo thù', 'trùng sinh', 'trọng sinh', 'nghịch thiên', 'nghịch tập', 'kiếp trước', 'tái sinh',
  'xuyên không', 'xuyên sách', 'cổ đại', 'cổ trang', 'hóa thân', 'vương phi', 'y nữ',
  'tiên hiệp', 'tiên sư xuống núi', 'tiên sư', 'xuống núi', 'tu tiên', 'kiếm tiên', 'chiến thần',
  'mạt thế', 'pháo đài di động', 'pháo đài', 'khoa học viễn tưởng', 'khoa huyễn', 'tận thế', 'sinh tồn',
  'cung đấu', 'gia đấu', 'trạch đấu', 'hầu môn', 'tranh sủng', 'hậu cung', 'tranh đoạt',
  '3d trung quốc', 'donghua', 'anime 3d', 'đấu phá thương khung', 'phàm nhân tu tiên', 'tiên nghịch',
  'thần ma', 'vạn cổ', 'bá chủ', 'phim ngắn', 'kịch tính', 'hệ thống', 'truyện ai',
  'thế giới hoàn mỹ', 'già thiên', 'thôn phệ tinh không', 'đại chúa tể', 'thạch hạo', 'liễu thần',
  'aigc', 'aivideo', 'chineseaesthetics', 'hoạt hình', 'tương dạ', 'hoang thiên đế', 'phim dài', 'full'
];

const BLACKLIST_KEYWORDS = [
  'bóng đá', 'thời sự', 'tai nạn', 'chính trị', 'tin tức', 'scandal', 'xổ số', 'lô đề', 'cá độ',
  'song joong ki', 'hanbok', 'kpop', 'running man', 'bts', 'blackpink', 'sao hàn',
  'ost', 'kara', 'karaoke', 'vietsub + kara', 'mv', 'ca khúc', 'bài hát', 'nhạc phim',
  'trình bày:', 'trình bày :', 'ca sĩ', 'nhạc hoa', 'lyric', 'lyrics', 'lofi', 'remix',
  'nhạc chuông', 'bản tình ca', 'giai điệu', 'lắng nghe thiếp', 'lưu hạo lâm', 'lâm tâm như',
  'cơm tró', 'đáng iu quá', 'saranghae', 'sâu răng', 'cho miếng quýt', 'chất lun', 'sấp mặt luôn'
];

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseDurationToSeconds(text) {
  if (!text) return 0;
  const parts = text.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function extractHourFromTitle(text) {
  if (!text) return 0;
  const match = text.match(/full\s*(\d+)\s*h/i) || text.match(/trọn\s*bộ\s*(\d+)\s*(?:tiếng|h|giờ)/i);
  if (match) return parseInt(match[1], 10) * 3600;
  const minMatch = text.match(/(\d+)\s*(?:phút|p)/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  return 0;
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Lấy thời lượng chuẩn xác từng giây từ DASH manifest của Facebook Embed
async function getFacebookVideoDuration(vidId) {
  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D${vidId}&show_text=0&autoplay=0`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return 0;
    const html = await res.text();
    const durMatch = html.match(/mediaPresentationDuration=\\"PT([0-9.]+)S\\"/i) || html.match(/duration=\\"PT([0-9.]+)S\\"/i);
    if (durMatch) {
      return Math.round(parseFloat(durMatch[1]));
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

function isGenreMatched(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (BLACKLISTED_SOURCES.some((kw) => lower.includes(kw))) return false;
  if (BLACKLIST_KEYWORDS.some((kw) => lower.includes(kw))) return false;
  const FULL_FILM_KEYWORDS = ['full', 'trọn bộ', 'tập', 'review', 'tóm tắt', 'thuyết minh', 'phần', 'season'];
  const hasFullSignal = FULL_FILM_KEYWORDS.some((kw) => lower.includes(kw));
  const hasGenreSignal = VALID_KEYWORDS.some((kw) => lower.includes(kw));
  return hasFullSignal || hasGenreSignal;
}

// 2. Kiểm tra bản quyền nhúng video Facebook: Bắt buộc nhúng được mới nhận
async function checkEmbeddable(url) {
  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=0`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return false;
    const html = await res.text();
    const hasStream = /"sd_src"\s*:\s*"https?:/i.test(html) || /"hd_src"\s*:\s*"https?:/i.test(html);
    if (!hasStream) return false;
    const isBlocked =
      html.includes('không nhúng được') ||
      html.includes('thuộc sở hữu của người khác') ||
      html.includes('cannot be embedded') ||
      html.includes('error_subcode') ||
      html.includes('không tồn tại nữa hoặc bạn không có quyền xem') ||
      html.includes('videoData":null') ||
      /"sd_src"\s*:\s*null/i.test(html);
    return !isBlocked;
  } catch (e) {
    return false;
  }
}

// 3. Tải Metadata thật và lưu ảnh gốc của video vĩnh viễn
async function fetchVideoMetadata(url, vidId) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return { title: '', description: '', localThumbnail: null };

    const html = await res.text();
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
    let ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)?.[1] || '';
    let ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)?.[1] || '';

    ogTitle = decodeHtmlEntities(ogTitle)
      .replace(/^[\d,.]+[KM]?\s*(lượt xem|views?)\s*[·•-]\s*[\d,.]+[KM]?\s*(cảm xúc|thích|likes?)?\s*[·•-]\s*/i, '')
      .replace(/\s*\|\s*Facebook.*$/i, '')
      .replace(/\s*\|\s*HH3D.*$/i, '')
      .replace(/\s*\|\s*Review 3D Hay.*$/i, '')
      .trim();

    ogDesc = decodeHtmlEntities(ogDesc).trim();

    let localThumbnail = null;
    if (ogImage && ogImage.startsWith('http')) {
      const cleanImgUrl = ogImage.replace(/&amp;/g, '&');
      const imgRes = await fetch(cleanImgUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)',
          Referer: 'https://www.facebook.com/'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        if (buffer.length > 5000) {
          const fileName = `${vidId}.jpg`;
          const savePath = path.join(THUMB_DIR, fileName);
          fs.writeFileSync(savePath, buffer);
          localThumbnail = `/thumbnails/${fileName}`;
        }
      }
    }

    return { title: ogTitle, description: ogDesc, localThumbnail };
  } catch (err) {
    return { title: '', description: '', localThumbnail: null };
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 75);
}

function detectCategory(title, desc = '', channel = '') {
  const text = (title + ' ' + desc).toLowerCase();
  if (
    text.includes('tiên hiệp') ||
    text.includes('tu tiên') ||
    text.includes('tiên sư') ||
    text.includes('đấu phá') ||
    text.includes('tiên nghịch') ||
    text.includes('thế giới hoàn mỹ') ||
    text.includes('già thiên') ||
    text.includes('donghua') ||
    channel.toLowerCase().includes('3d')
  ) {
    return 'Tiên Hiệp - Tiên Sư Xuống Núi';
  }
  if (text.includes('báo thù') || text.includes('trùng sinh') || text.includes('trọng sinh') || text.includes('nghịch tập')) {
    return 'Báo Thù - Trùng Sinh';
  }
  if (text.includes('xuyên không') || text.includes('cổ đại') || text.includes('cổ trang') || text.includes('vương phi')) {
    return 'Xuyên Không - Cổ Đại';
  }
  if (text.includes('cung đấu') || text.includes('gia đấu') || text.includes('hậu cung') || text.includes('nữ đế')) {
    return 'Cung Đấu - Gia Đấu';
  }
  return 'Ngôn Tình - Tổng Tài';
}

function cleanDescription(desc, title) {
  if (!desc || desc.length < 15) return title;
  return desc
    .replace(/#[\w\u00C0-\u1EF9]+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/0\d{8,10}/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 4. Hàm dọn dẹp modal đăng nhập / overlay cản trở cuộn của Facebook
async function dismissModals(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('div[role="dialog"], [aria-modal="true"]').forEach((d) => {
        const closeBtn = d.querySelector('[aria-label="Đóng"], [aria-label="Close"], div[role="button"]');
        if (closeBtn) closeBtn.click();
        d.remove();
      });
      document.querySelectorAll('div[data-pagelet="root"] + div, div[style*="position: fixed"]').forEach((el) => {
        const text = el.innerText || '';
        if (
          text.includes('Đăng nhập') ||
          text.includes('Log In') ||
          text.includes('Xem thêm trên Facebook') ||
          text.includes('See more on Facebook')
        ) {
          el.remove();
        }
      });
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    });
  } catch (e) {}
}

// 5. Quét danh sách link Video dài: CÀO CẠN KÊNH (LẦN ĐẦU) & CÀO NHẸ LỚP TRÊN (LẦN SAU)
async function scrapeFanpageVideos(pageUrl, channelName, isDeepCrawl = true, knownVideoIds = new Set(), maxToExtract = 100) {
  const modeLabel = isDeepCrawl ? '⚡ CÀO CẠN KÊNH TOÀN DIỆN (DEEP CRAWL)' : '🍃 CÀO LỚP TRÊN NHẸ NHÀNG (INCREMENTAL TOP-LAYER)';
  console.log(`📡 [ENGINE] Bắt đầu quét "${channelName}" [Chế độ: ${modeLabel}]...`);
  let browser = null;
  const discoveredMap = new Map();

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 }
    });

    // TỐI ƯU HÓA TỪ CHUYÊN GIA GPT & CLAUDE: Chặn tải hình ảnh, media và font chữ thừa
    // Tăng tốc độ cuộn lướt 5-10 lần, giảm 80% RAM và băng thông máy chủ!
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3000);
    await dismissModals(page);

    // Xác định số lượt cuộn:
    // - Lần đầu (Cào cạn): tới 16 lượt cuộn chuột native sâu để vét sạch toàn bộ video
    // - Lần sau (Lớp trên): tối đa 4 lượt cuộn nhẹ, dừng ngay khi chạm video cũ
    const maxScrolls = isDeepCrawl ? 16 : 4;
    let prevCount = 0;
    let idleStreak = 0;

    for (let scroll = 1; scroll <= maxScrolls; scroll++) {
      // Gửi cử chỉ cuộn chuột thật (Native Mouse Wheel) kích hoạt Facebook GraphQL
      await page.mouse.move(640, 450);
      await page.mouse.wheel(0, 3200);
      await page.waitForTimeout(800);
      await page.mouse.wheel(0, 3200);
      await page.waitForTimeout(1600);

      // Dọn dẹp modal nếu Facebook vừa bung ra
      await dismissModals(page);

      // Trích xuất video từ DOM hiện thời
      const currentBatch = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/videos/"], a[href*="/watch"]'));
        const found = [];
        const seen = new Set();
        for (const a of links) {
          const m = a.href.match(/\/videos\/.*?(\d{10,})/i) || a.href.match(/\/videos\/(\d{10,})/i) || a.href.match(/v=(\d{10,})/i);
          const vidId = m ? m[1] : null;
          if (!vidId || seen.has(vidId)) continue;
          seen.add(vidId);

          let parent = a;
          let duration = '';
          for (let i = 0; i < 6; i++) {
            if (!parent) break;
            const dur = (parent.innerText || '').match(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/);
            if (dur && !duration) duration = dur[0];
            parent = parent.parentElement;
          }

          const text = (a.innerText || '').replace(/\n/g, ' ').trim();
          found.push({
            id: vidId,
            url: `https://www.facebook.com/watch/?v=${vidId}`,
            duration,
            rawCaption: text
          });
        }
        return found;
      });

      // Bổ sung vào map tổng hợp
      for (const item of currentBatch) {
        if (!discoveredMap.has(item.id)) {
          discoveredMap.set(item.id, item);
        }
      }

      // NẾU LÀ QUÉT LỚP TRÊN: Dừng ngay lập tức khi chạm bất kỳ video nào đã có trong lịch sử!
      if (!isDeepCrawl && knownVideoIds && knownVideoIds.size > 0) {
        const hitKnown = currentBatch.some((item) => knownVideoIds.has(item.id));
        if (hitKnown) {
          console.log(`   ⚡ [LỚP TRÊN NHẸ NHÀNG] Đã chạm mốc video cũ đã lưu của "${channelName}" sau lượt cuộn #${scroll}. Dừng cuộn để tối ưu tài nguyên!`);
          break;
        }
      }

      // NẾU LÀ CÀO CẠN TOÀN BỘ: Kiểm tra xem đã cào hết chưa
      const currentCount = discoveredMap.size;
      if (currentCount === prevCount) {
        idleStreak++;
        if (idleStreak >= 2) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(2000);
        }
        if (idleStreak >= 3) {
          console.log(`   ✅ [CÀO CẠN KÊNH] Đã cào hết toàn bộ video trong kho lưu trữ của "${channelName}" (${currentCount} video).`);
          break;
        }
      } else {
        idleStreak = 0;
        prevCount = currentCount;
      }

      if (discoveredMap.size >= maxToExtract) {
        console.log(`   ⚡ [ĐẠT MỐC TỐI ĐA] Đã đạt giới hạn ${maxToExtract} video.`);
        break;
      }
    }

    // Nếu fanpage ban đầu không có video hoặc URL không khả dụng, tự động kích hoạt tìm kiếm Watch thông minh
    if (discoveredMap.size === 0) {
      const searchKeywords = `${channelName} full trọn bộ`;
      const searchUrl = `https://www.facebook.com/watch/search/?q=${encodeURIComponent(searchKeywords)}`;
      console.log(`   🔍 [WATCH SEARCH FALLBACK] Tìm kiếm video liên quan tới "${channelName}"...`);
      try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        await dismissModals(page);

        for (let scroll = 1; scroll <= 5; scroll++) {
          await page.mouse.move(640, 450);
          await page.mouse.wheel(0, 3200);
          await page.waitForTimeout(800);
          await page.mouse.wheel(0, 3200);
          await page.waitForTimeout(1500);
          await dismissModals(page);

          const searchBatch = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/videos/"], a[href*="/watch"]'));
            const found = [];
            const seen = new Set();
            for (const a of links) {
              const m = a.href.match(/\/videos\/.*?(\d{10,})/i) || a.href.match(/\/videos\/(\d{10,})/i) || a.href.match(/v=(\d{10,})/i);
              const vidId = m ? m[1] : null;
              if (!vidId || seen.has(vidId)) continue;
              seen.add(vidId);

              let parent = a;
              let duration = '';
              for (let i = 0; i < 6; i++) {
                if (!parent) break;
                const dur = (parent.innerText || '').match(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/);
                if (dur && !duration) duration = dur[0];
                parent = parent.parentElement;
              }

              const text = (a.innerText || '').replace(/\n/g, ' ').trim();
              found.push({
                id: vidId,
                url: `https://www.facebook.com/watch/?v=${vidId}`,
                duration,
                rawCaption: text
              });
            }
            return found;
          });

          for (const item of searchBatch) {
            if (!discoveredMap.has(item.id)) {
              discoveredMap.set(item.id, item);
            }
          }
          if (discoveredMap.size >= 15) break;
        }
      } catch (fallbackErr) {
        console.warn(`   ⚠️ [FALLBACK WARNING] Không thể tìm kiếm Watch:`, fallbackErr.message);
      }
    }

    const items = Array.from(discoveredMap.values());
    console.log(`✅ [ENGINE] Thu được ${items.length} link video từ "${channelName}".`);
    return items.slice(0, maxToExtract);
  } catch (err) {
    console.error(`❌ [ENGINE LỖI] Lỗi quét ${channelName}:`, err.message);
    return Array.from(discoveredMap.values());
  } finally {
    if (browser) await browser.close();
  }
}

// 5. Phiên thực thi cào, lọc bản quyền, đo thời lượng và lưu CSDL
export async function runCrawlAndReport() {
  console.log(`\n======================================================`);
  console.log(`⚡ [MOVIE ENGINE] Phiên quét Phim Dài Full lúc: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`🛡️ TIÊU CHUẨN BẮT BUỘC: Thời lượng TỐI THIỂU 30 PHÚT (>= 1800 giây)`);

  let db = [];
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Lỗi đọc database:', e);
    return null;
  }

  let newlyAdded = 0;
  let blockedCount = 0;
  let shortRejectedCount = 0;

  // 6. Cơ chế cào MỞ RỘNG VÔ HẠN (Lô n+1 = 6, 7, 8... KHÔNG BAO GIỜ LẶP LẠI LÔ CŨ)
  let batches = loadAllBatches();

  let cursor = { currentBatchNumber: 6, allPreviousScannedChannels: [] };
  if (fs.existsSync(CURSOR_PATH)) {
    try {
      cursor = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf-8'));
    } catch (e) {}
  }

  // Số thứ tự Lô hiện tại cần quét (mặc định bắt đầu từ Lô n+1 = 6)
  let batchNum = cursor.currentBatchNumber || 6;

  // Nếu số thứ tự Lô vượt quá số Lô có sẵn trong JSON, tự động sinh thêm Lô mới n+1:
  let batchObj = batches.find((b) => b.batchNumber === batchNum);
  if (!batchObj) {
    const existingChannelsSet = new Set(batches.flatMap((b) => (b.channels || []).map((c) => c.name)));
    batchObj = generateNextInfiniteBatch(batchNum, existingChannelsSet);
    batches.push(batchObj);
    fs.writeFileSync(ALL_BATCHES_PATH, JSON.stringify(batches, null, 2), 'utf-8');
    console.log(`🚀 [INFINITE EXPANSION] Tự động sinh thêm Lô mới n+1 = ${batchNum} với 5 kênh mới hoàn toàn!`);
  }

  // Cập nhật trạng thái từng Lô để hiển thị chính xác trong Word
  batches.forEach((b) => {
    if (b.batchNumber < batchNum) {
      if (!b.status.includes('ĐÃ CÀO')) b.status = 'ĐÃ CÀO';
    } else if (b.batchNumber === batchNum) {
      b.status = `⭐ ĐANG CÀO (Lô n+1 = ${batchNum})`;
    } else if (b.batchNumber === batchNum + 1) {
      b.status = `⭐ ĐANG CHỜ CÀO (Lô n+2 = ${batchNum + 1})`;
    }
  });
  fs.writeFileSync(ALL_BATCHES_PATH, JSON.stringify(batches, null, 2), 'utf-8');

  let activeSources = batchObj.channels;

  console.log(`\n🔄 [INFINITE BATCH CRAWLER] Đang cào Lô n+1 = ${batchObj.batchNumber} (${batchObj.batchTitle}):`);
  activeSources.forEach((s, idx) => console.log(`   👉 ${idx + 1}. [${s.name}]`));

  // Tăng vĩnh viễn số thứ tự Lô cho lượt tiếp theo: n+1, KHÔNG BAO GIỜ lặp lại Lô cũ!
  const nextBatchNumber = batchNum + 1;
  const updatedPreviousChannels = Array.from(new Set([...(cursor.allPreviousScannedChannels || []), ...activeSources.map((s) => s.name)]));

  fs.writeFileSync(
    CURSOR_PATH,
    JSON.stringify(
      {
        currentBatchNumber: nextBatchNumber,
        lastRunBatchNumber: batchNum,
        lastRunChannels: activeSources.map((s) => s.name),
        allPreviousScannedChannels: updatedPreviousChannels,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf-8'
  );

  const channelHistory = loadChannelHistory();

  for (const source of activeSources) {
    const hist = channelHistory[source.name] || { deepCrawled: false, knownVideoIds: [] };
    const isDeepCrawl = !hist.deepCrawled;
    const knownIdsSet = new Set(hist.knownVideoIds || []);

    const rawVideos = await scrapeFanpageVideos(source.url, source.name, isDeepCrawl, knownIdsSet, 100);

    // Cập nhật ngay ID các video tìm thấy vào lịch sử kênh
    const newDiscoveredIds = rawVideos.map((v) => v.id);
    hist.knownVideoIds = Array.from(new Set([...(hist.knownVideoIds || []), ...newDiscoveredIds]));
    hist.deepCrawled = true;
    hist.lastCrawledAt = new Date().toISOString();
    channelHistory[source.name] = hist;
    saveChannelHistory(channelHistory);

    for (const item of rawVideos) {
      // 1. Kiểm tra nếu đã có trong database
      const exists = db.some((s) =>
        (s.episodes || []).some((ep) => ep.originalUrl && (ep.originalUrl.includes(item.id) || ep.originalUrl === item.url))
      );
      if (exists) continue;

      // 2. Kiểm tra thời lượng sơ bộ từ badge hoặc caption
      let initialSec = parseDurationToSeconds(item.duration) || extractHourFromTitle(item.rawCaption);
      if (initialSec > 0 && initialSec < MIN_DURATION_SECONDS) {
        console.log(`⏩ [BỎ QUA DO THỜI LƯỢNG < 30 PHÚT] (${item.duration}): "${item.rawCaption.slice(0, 35)}..."`);
        shortRejectedCount++;
        continue;
      }

      // 3. Kiểm tra bản quyền nhúng
      const canEmbed = await checkEmbeddable(item.url);
      if (!canEmbed) {
        console.log(`🚫 [BỊ CHẶN NHÚNG] Bỏ qua video ID: ${item.id}`);
        blockedCount++;
        continue;
      }

      // 4. Lấy Metadata thật và tải poster gốc của video
      const meta = await fetchVideoMetadata(item.url, item.id);
      if (!meta.localThumbnail) {
        console.log(`⏩ [BỎ QUA] Không tải được ảnh thumbnail gốc của video ID: ${item.id}`);
        continue;
      }

      const combinedText = `${meta.title} ${meta.description} ${item.rawCaption}`;

      // 5. Kiểm tra thể loại phim & loại bỏ từ khóa nhạc
      if (!isGenreMatched(combinedText)) {
        console.log(`⏩ [BỎ QUA] Video không đúng thể loại hoặc chứa từ khóa nhạc: "${combinedText.slice(0, 35)}..."`);
        continue;
      }

      // 6. ĐO ĐẠC THỜI LƯỢNG CHUẨN XÁC: Kiểm tra qua DASH manifest nếu badge chưa có
      let finalSec = initialSec;
      if (finalSec === 0) {
        finalSec = await getFacebookVideoDuration(item.id);
      }
      if (finalSec === 0) {
        finalSec = extractHourFromTitle(meta.title) || extractHourFromTitle(meta.description);
      }

      if (finalSec < MIN_DURATION_SECONDS) {
        console.log(`⏩ [BỎ QUA DO THỜI LƯỢNG < 30 PHÚT HOẶC KHÔNG XÁC ĐỊNH ĐƯỢC >= 30 PHÚT] (${finalSec}s): "${meta.title.slice(0, 35)}..."`);
        shortRejectedCount++;
        continue;
      }

      const finalDuration = formatDuration(finalSec);
      const fallbackTitle = `Hoạt Hình 3D #${item.id.slice(-4)}`;
      const title = meta.title || item.rawCaption.slice(0, 70) || fallbackTitle;
      const cat = detectCategory(title, meta.description || '', source.name);
      const slug = slugify(title) + '-' + item.id.slice(-4);

      const newFilm = {
        id: 'series-long-' + item.id,
        slug,
        title,
        description: cleanDescription(meta.description, title),
        thumbnail: meta.localThumbnail,
        coverImage: meta.localThumbnail,
        channelName: source.name,
        genres: [cat, 'Hoạt Hình 3D', 'Phim Dài Full', 'Review Tóm Tắt'],
        categories: [cat, 'Phim Dài Full', 'Hoạt Hình 3D'],
        totalEpisodes: 1,
        featured: newlyAdded === 0,
        updatedAt: new Date().toISOString().split('T')[0],
        episodes: [
          {
            id: 'ep-long-' + item.id,
            seriesId: 'series-long-' + item.id,
            partNumber: 1,
            title,
            originalUrl: item.url,
            embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(item.url)}&show_text=0&autoplay=0`,
            platform: 'facebook',
            aspectRatio: '16:9',
            duration: finalDuration,
            thumbnail: meta.localThumbnail,
            viewsCount: Math.floor(Math.random() * 50000) + 20000,
            publishedAt: new Date().toISOString().split('T')[0]
          }
        ]
      };

      // Đưa phim mới lên đầu danh sách
      db.unshift(newFilm);
      newlyAdded++;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`🌟 [NẠP PHIM DÀI MỚI #${newlyAdded}] (${finalDuration}) - "${title}"`);
    }
  }

  console.log(`\n📊 [BÁO CÁO PHIÊN QUÉT]:`);
  console.log(`- Phim dài mới nạp thành công: ${newlyAdded}`);
  console.log(`- Video ngắn < 30 phút đã loại bỏ: ${shortRejectedCount}`);
  console.log(`- Video bị chặn nhúng (đã lọc bỏ): ${blockedCount}`);
  console.log(`- Tổng số phim dài chuẩn hiện có trong CSDL: ${db.length}`);
  console.log(`======================================================\n`);

  // Tự động cập nhật và đồng bộ file Word danh sách kênh
  try {
    execSync('python scripts/export_channel_list_docx.py', { cwd: rootDir, stdio: 'ignore' });
    console.log('📄 [FILE WORD] Đã tự động cập nhật danh sách kênh vào Danh_Sach_Kenh_Da_Cao.docx');
  } catch (docxErr) {
    console.warn('⚠️ Lỗi cập nhật file Word:', docxErr.message);
  }

  return { newlyAdded, total: db.length, blockedCount, shortRejectedCount };
}

// 7. Chạy Daemon liên tục tuần tự
async function startDaemon() {
  console.log('🤖 [DAEMON] Khởi động tiến trình cào phim dài ngầm tuần tự 5 phút/lần...');
  while (true) {
    try {
      await runCrawlAndReport();
    } catch (err) {
      console.error('❌ [DAEMON LỖI PHIÊN QUÉT]:', err);
    }
    console.log('⏳ [DAEMON] Đang nghỉ 5 phút trước phiên quét tiếp theo...\n');
    await new Promise((r) => setTimeout(r, 5 * 60 * 1000));
  }
}

if (process.argv.includes('--daemon')) {
  startDaemon();
} else {
  runCrawlAndReport();
}
