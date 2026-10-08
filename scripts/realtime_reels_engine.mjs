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

// 1. Danh sách các LÔ KÊNH mục tiêu chất lượng cao (Mỗi lô đúng 5 kênh độc lập, ZERO TRÙNG LẶP)
const CHANNEL_BATCHES = [
  // --- LÔ 1: Hoạt Hình 3D Tu Tiên & Huyền Huyễn Đỉnh Cao (5 kênh) ---
  [
    { name: 'Hoạt Hình 3D Trung Quốc', url: 'https://www.facebook.com/hh3dtq/videos' },
    { name: 'Hoạt Hình 3D Review', url: 'https://www.facebook.com/hoathinh3dreview/videos' },
    { name: 'Review 3D Hay (Hoạt Hình Tu Tiên)', url: 'https://www.facebook.com/review3dhay/videos' },
    { name: 'HH3D Vietsub (Donghua Tu Chân)', url: 'https://www.facebook.com/hh3d.vietsub/videos' },
    { name: 'Hoạt Hình 3D VN', url: 'https://www.facebook.com/hoathinh3d.vn/videos' }
  ],

  // --- LÔ 2: Phim Ngắn Trọng Sinh, Tổng Tài, Báo Thù & Cổ Trang (5 kênh KHÔNG TRÙNG LÔ 1) ---
  [
    { name: 'Đại Đạo Review (Phim Ngắn & Trọng Sinh)', url: 'https://www.facebook.com/profile.php?id=61566431730101&sk=videos' },
    { name: 'Phim Ngắn Tổng Tài Hay', url: 'https://www.facebook.com/phimngan.tongtai/videos' },
    { name: 'Review Phim Trung Quốc (Donghua & Phim Ngắn)', url: 'https://www.facebook.com/reviewphimtrungquoc/videos' },
    { name: 'Review Phim Ngắn Hay', url: 'https://www.facebook.com/reviewphimngan.hay/videos' },
    { name: 'Phim Ngắn Trọng Sinh Kịch Tính', url: 'https://www.facebook.com/phimngan.trongsinh/videos' }
  ],

  // --- LÔ 3: Donghua 3D & Phim Ngắn Vietsub Tuyển Chọn (5 kênh KHÔNG TRÙNG LÔ 1 VÀ 2) ---
  [
    { name: 'Donghua 3D Hay', url: 'https://www.facebook.com/donghua3dhay/videos' },
    { name: 'Review Phim 3D Donghua', url: 'https://www.facebook.com/reviewphim3d.donghua/videos' },
    { name: 'Hoạt Hình 3D Hay', url: 'https://www.facebook.com/hoathinh3d.hay/videos' },
    { name: 'Phim Ngắn Vietsub Tuyển Chọn', url: 'https://www.facebook.com/phimngan.vietsub/videos' },
    { name: 'Review Phim Ngắn TQ', url: 'https://www.facebook.com/reviewphimngan.tq/videos' }
  ],

  // --- LÔ 4 (LÔ TIẾP THEO): 5 KÊNH MỚI HOÀN TOÀN (100% KHÔNG TRÙNG LÔ 1, 2, 3) ---
  [
    { name: 'Hoạt Hình 3D Thuyết Minh', url: 'https://www.facebook.com/hoathinh3df/videos' },
    { name: 'Mê Hoạt Hình 3D Trung Quốc', url: 'https://www.facebook.com/mehoathinh3dtq/videos' },
    { name: 'Review Phim Hay Mỗi Ngày', url: 'https://www.facebook.com/reviewphimhaymoingay/videos' },
    { name: 'Phim Hay Tuyển Chọn', url: 'https://www.facebook.com/phimhaytuyenchon.official/videos' },
    { name: 'Kho Phim Hoạt Hình 3D', url: 'https://www.facebook.com/khophimhoathinh3d/videos' }
  ]
];

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

// 4. Quét danh sách link Video dài từ Fanpage bằng Playwright
async function scrapeFanpageVideos(pageUrl, channelName, maxToExtract = 25) {
  console.log(`📡 [ENGINE] Bắt đầu quét video dài: "${channelName}"...`);
  let browser = null;
  const discovered = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(4000);

    // Cuộn tải trang
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 1800));
      await page.waitForTimeout(2000);
    }

    const items = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/videos/"], a[href*="/watch"]'));
      const seen = new Set();
      const res = [];
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
        res.push({
          id: vidId,
          url: `https://www.facebook.com/watch/?v=${vidId}`,
          duration,
          rawCaption: text
        });
      }
      return res;
    });

    console.log(`✅ [ENGINE] Tìm thấy ${items.length} link video từ "${channelName}".`);
    discovered.push(...items.slice(0, maxToExtract));
  } catch (err) {
    console.error(`❌ [ENGINE LỖI] Lỗi quét ${channelName}:`, err.message);
  } finally {
    if (browser) await browser.close();
  }

  return discovered;
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

  // 6. Cơ chế xoay vòng thông minh KHÔNG TRÙNG LẶP (Zero Overlap Round-Robin: Đúng 5 kênh/đợt)
  let cursor = { currentBatchIndex: 0, cycleCount: 1, lastRunChannels: [] };
  if (fs.existsSync(CURSOR_PATH)) {
    try {
      cursor = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf-8'));
    } catch (e) {}
  }

  let batchIdx = (cursor.currentBatchIndex || 0) % CHANNEL_BATCHES.length;
  let activeSources = CHANNEL_BATCHES[batchIdx];

  // KIỂM TRA BẢO VỆ TUYỆT ĐỐI (ZERO OVERLAP CHECK):
  // 5 trang cào hiện tại TUYỆT ĐỐI KHÔNG ĐƯỢC trùng với bất kỳ trang nào đã cào ở đợt liền trước đó!
  const lastChannels = cursor.lastRunChannels || [];
  const overlap = activeSources.filter((s) => lastChannels.includes(s.name));
  if (overlap.length > 0) {
    console.log(`⚠️ [ZERO OVERLAP GUARD] Phát hiện ${overlap.length} kênh trùng (${overlap.map((o) => o.name).join(', ')}), tự động chuyển sang Lô tiếp theo!`);
    batchIdx = (batchIdx + 1) % CHANNEL_BATCHES.length;
    activeSources = CHANNEL_BATCHES[batchIdx];
  }

  console.log(`\n🔄 [ZERO OVERLAP CRAWLER] Vòng #${cursor.cycleCount || 1} - Lô #${batchIdx + 1}/${CHANNEL_BATCHES.length} (5 kênh hoàn toàn mới so với đợt trước):`);
  activeSources.forEach((s, idx) => console.log(`   👉 ${idx + 1}. [${s.name}]`));

  const nextBatchIdx = (batchIdx + 1) % CHANNEL_BATCHES.length;
  const nextCycle = nextBatchIdx === 0 ? (cursor.cycleCount || 1) + 1 : (cursor.cycleCount || 1);
  fs.writeFileSync(
    CURSOR_PATH,
    JSON.stringify(
      {
        currentBatchIndex: nextBatchIdx,
        cycleCount: nextCycle,
        lastRunChannels: activeSources.map((s) => s.name),
        updatedAt: new Date().toISOString()
      },
      null,
      2
    ),
    'utf-8'
  );

  for (const source of activeSources) {
    const rawVideos = await scrapeFanpageVideos(source.url, source.name, 25);

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
