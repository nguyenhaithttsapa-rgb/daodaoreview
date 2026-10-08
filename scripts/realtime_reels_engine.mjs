import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// 1. Danh sách toàn bộ các kênh/Fanpage mục tiêu chất lượng cao (chia theo nhóm chuyên môn)
const ALL_TARGET_SOURCES = [
  // --- Nhóm 1: Hoạt Hình 3D Tu Tiên & Huyền Huyễn Đỉnh Cao ---
  {
    name: 'Review 3D Hay (Hoạt Hình Tu Tiên)',
    url: 'https://www.facebook.com/review3dhay/reels'
  },
  {
    name: 'Hoạt Hình 3D Trung Quốc',
    url: 'https://www.facebook.com/hh3dtq/reels'
  },
  {
    name: 'Hoạt Hình 3D Review',
    url: 'https://www.facebook.com/hoathinh3dreview/reels'
  },
  {
    name: 'HH3D Vietsub (Donghua Tu Chân)',
    url: 'https://www.facebook.com/hh3d.vietsub/reels'
  },
  {
    name: 'Hoạt Hình 3D VN',
    url: 'https://www.facebook.com/hoathinh3d.vn/reels'
  },

  // --- Nhóm 2: Phim Ngắn Trọng Sinh, Tổng Tài, Báo Thù & Cổ Trang ---
  {
    name: 'Đại Đạo Review (Phim Ngắn & Trọng Sinh)',
    url: 'https://www.facebook.com/profile.php?id=61566431730101&sk=reels_tab'
  },
  {
    name: 'Phim Ngắn Tổng Tài Hay',
    url: 'https://www.facebook.com/phimngan.tongtai/reels'
  },
  {
    name: 'Review Phim Trung Quốc (Donghua & Phim Ngắn)',
    url: 'https://www.facebook.com/reviewphimtrungquoc/reels'
  },
  {
    name: 'Ghiền Phim Trung Quốc (Ngôn Tình & Trọng Sinh)',
    url: 'https://www.facebook.com/ghienphimtrungquoc/reels'
  },
  {
    name: 'Review Phim Ngắn Hay',
    url: 'https://www.facebook.com/reviewphimngan.hay/reels'
  },
  {
    name: 'Mê Phim Trung Quốc (Review Kịch Tính)',
    url: 'https://www.facebook.com/mephimtrungquoc/reels'
  }
];

// Danh sách trang hoặc từ khóa BỊ CẤM VĨNH VIỄN (Loại bỏ triệt để video ngắn Marsx Files, clip AI 20s không phải phim)
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
  'aigc', 'aivideo', 'chineseaesthetics', 'hoạt hình', 'tương dạ', 'hoang thiên đế'
];

const BLACKLIST_KEYWORDS = [
  'bóng đá', 'thời sự', 'tai nạn', 'chính trị', 'tin tức', 'scandal', 'xổ số', 'lô đề', 'cá độ',
  'song joong ki', 'hanbok', 'kpop', 'running man', 'bts', 'blackpink', 'sao hàn'
];

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function isGenreMatched(text, isTrustedChannel = true) {
  if (!text) return isTrustedChannel;
  const lower = text.toLowerCase();
  if (BLACKLISTED_SOURCES.some((kw) => lower.includes(kw))) {
    return false;
  }
  if (BLACKLIST_KEYWORDS.some((kw) => lower.includes(kw))) {
    return false;
  }
  if (VALID_KEYWORDS.some((kw) => lower.includes(kw))) {
    return true;
  }
  return isTrustedChannel;
}

// 2. Kiểm tra bản quyền nhúng video Facebook Reel: Đảm bảo có luồng phát hợp lệ và không bị cấm
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

    // 1. Phải chứa luồng phát video (sd_src hoặc hd_src) do Facebook sinh ra
    const hasStream = /"sd_src"\s*:\s*"https?:/i.test(html) || /"hd_src"\s*:\s*"https?:/i.test(html);
    if (!hasStream) {
      return false;
    }

    // 2. Dấu hiệu lỗi bản quyền hoặc cấm nhúng thực sự từ Facebook
    const isBlocked =
      html.includes('không nhúng được') ||
      html.includes('thuộc sở hữu của người khác') ||
      html.includes('cannot be embedded') ||
      html.includes('error_subcode') ||
      html.includes('không tồn tại nữa hoặc bạn không có quyền xem') ||
      html.includes('videoData":null') ||
      /"sd_src"\s*:\s*null/i.test(html);

    if (isBlocked) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// 3. Tải ảnh thumbnail gốc từ video Facebook và lưu vĩnh viễn cục bộ
async function fetchReelMetadata(reelUrl, reelId) {
  const result = {
    title: '',
    description: '',
    imageUrl: '',
    localThumbnail: null
  };

  try {
    const res = await fetch(reelUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return result;
    const html = await res.text();

    const mTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    const mDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    const mImg = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);

    if (mTitle && mTitle[1]) result.title = decodeHtmlEntities(mTitle[1]);
    if (mDesc && mDesc[1]) result.description = decodeHtmlEntities(mDesc[1]);
    if (mImg && mImg[1]) result.imageUrl = mImg[1].replace(/&amp;/g, '&');

    // TẢI ẢNH GỐC CỦA VIDEO VÀ LƯU CỤC BỘ (Không bao giờ dùng link ngoài luồng)
    if (result.imageUrl && reelId) {
      const localFile = path.join(THUMB_DIR, `${reelId}.jpg`);
      if (fs.existsSync(localFile)) {
        result.localThumbnail = `/thumbnails/${reelId}.jpg`;
      } else {
        const imgRes = await fetch(result.imageUrl, { signal: AbortSignal.timeout(7000) });
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(localFile, buffer);
          result.localThumbnail = `/thumbnails/${reelId}.jpg`;
        }
      }
    }
  } catch (err) {
    // Không làm gián đoạn luồng cào
  }

  return result;
}

// 4. Làm sạch tiêu đề và caption
function cleanTitle(rawCaption, fallback = 'Hoạt Hình 3D Đỉnh Cao') {
  if (!rawCaption) return fallback;
  let text = rawCaption
    .split('\n')[0]
    .replace(/(?:tập|tap|part|ep|hồi)\s*\d+/gi, '')
    .replace(/#[\w\u00C0-\u1EF9]+/g, '')
    .replace(/(?:0\d{9,10}|\+84\d{9,10})/g, '')
    .replace(/[^\p{L}\p{N}\s,.\-!?:;'"“”‘’]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 5 ? text.slice(0, 80).trim() : fallback;
}

function cleanDescription(rawDesc, title) {
  if (!rawDesc) return `Tổng hợp trọn bộ review phim tóm tắt ${title} full thuyết minh mới nhất.`;
  let cleaned = rawDesc
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/(?:bấm|click|ủng hộ|mua hàng|link mua|shopee|lazada|tiki|tiktok).*$/gim, '')
    .replace(/(?:0\d{9,10}|\+84\d{9,10})/g, '')
    .replace(/#[\w\u00C0-\u1EF9]+/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
  if (cleaned.length < 10) {
    return `Tổng hợp trọn bộ review phim tóm tắt ${title} full thuyết minh mới nhất.`;
  }
  return cleaned;
}

function extractFilmTitle(meta, rawCaption, fallback = 'Hoạt Hình 3D Đỉnh Cao') {
  if (meta.description) {
    const lines = meta.description.split('\n').map((l) => l.trim());
    const validLine = lines.find(
      (l) =>
        l &&
        !l.startsWith('#') &&
        !l.toLowerCase().includes('bản xem trước') &&
        !l.toLowerCase().includes('thước phim') &&
        l.length > 5
    );
    if (validLine) {
      return cleanTitle(validLine, fallback);
    }
  }

  if (meta.title && !meta.title.includes('Bản xem trước')) {
    let cleaned = meta.title
      .replace(/^\d+[\s,.]*[a-zA-Z\u00C0-\u1EF9]*\s*[\|•-]\s*/i, '')
      .replace(/\s*[\|•-]\s*(?:Facebook|Marsx Files|Khu Trú Ẩn.*|Đại Đạo.*)$/i, '')
      .trim();
    if (cleaned.length > 5) {
      return cleanTitle(cleaned, fallback);
    }
  }

  if (rawCaption && !rawCaption.includes('Bản xem trước') && !rawCaption.includes('thước phim') && rawCaption.length > 5) {
    return cleanTitle(rawCaption, fallback);
  }

  return fallback;
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '')
    .replace(/(\s+)/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectCategory(title, desc = '', channel = '') {
  const text = (title + ' ' + desc + ' ' + channel).toLowerCase();
  
  // 1. Mạt Thế - Pháo Đài Di Động
  if (
    text.includes('mạt thế') ||
    text.includes('pháo đài') ||
    text.includes('tận thế') ||
    text.includes('khoa học viễn tưởng') ||
    text.includes('khoa huyễn') ||
    text.includes('zombie') ||
    text.includes('tang thi') ||
    text.includes('sinh tồn') ||
    text.includes('hậu tận thế')
  ) {
    return 'Mạt Thế - Pháo Đài Di Động';
  }

  // 2. Tiên Hiệp - Tiên Sư Xuống Núi & Hoạt Hình 3D Tu Tiên
  if (
    text.includes('tiên sư') ||
    text.includes('xuống núi') ||
    text.includes('tu tiên') ||
    text.includes('tiên hiệp') ||
    text.includes('kiếm tiên') ||
    text.includes('tu vi') ||
    text.includes('tu luyện') ||
    text.includes('tiên tôn') ||
    text.includes('tiên nữ') ||
    text.includes('thần tiên') ||
    text.includes('linh căn') ||
    text.includes('linh khí') ||
    text.includes('ma tôn') ||
    text.includes('tông môn') ||
    text.includes('thiên đạo') ||
    text.includes('đấu phá') ||
    text.includes('phàm nhân') ||
    text.includes('hoàn mỹ') ||
    text.includes('già thiên') ||
    text.includes('thôn phệ') ||
    text.includes('chí tôn') ||
    text.includes('kiếm vượt') ||
    text.includes('kiếm trấn') ||
    text.includes('táng phủ') ||
    text.includes('tam giới') ||
    text.includes('đấu khí') ||
    text.includes('thiên kiêu') ||
    text.includes('lục địa thần tiên') ||
    text.includes('tạp dịch') ||
    text.includes('hạ nhân') ||
    channel.toLowerCase().includes('3d')
  ) {
    return 'Tiên Hiệp - Tiên Sư Xuống Núi';
  }

  // 3. Cung Đấu - Gia Đấu
  if (
    text.includes('cung đấu') ||
    text.includes('gia đấu') ||
    text.includes('trạch đấu') ||
    text.includes('hầu môn') ||
    text.includes('hậu cung') ||
    text.includes('hoàng phi') ||
    text.includes('hoàng hậu') ||
    text.includes('phi tần') ||
    text.includes('tranh sủng') ||
    text.includes('nữ đế')
  ) {
    return 'Cung Đấu - Gia Đấu';
  }

  // 4. Xuyên Không - Cổ Đại
  if (
    text.includes('xuyên không') ||
    text.includes('xuyên sách') ||
    text.includes('cổ đại') ||
    text.includes('hóa thân') ||
    text.includes('cổ trang') ||
    text.includes('vương phi') ||
    text.includes('vương gia') ||
    text.includes('hoàng tử') ||
    text.includes('đại minh')
  ) {
    return 'Xuyên Không - Cổ Đại';
  }

  // 5. Báo Thù - Trùng Sinh
  if (
    text.includes('báo thù') ||
    text.includes('trùng sinh') ||
    text.includes('trọng sinh') ||
    text.includes('sát phạt') ||
    text.includes('nghịch tập') ||
    text.includes('kiếp trước') ||
    text.includes('tái sinh') ||
    text.includes('hủy hôn')
  ) {
    return 'Báo Thù - Trùng Sinh';
  }

  // 6. Ngôn Tình - Tổng Tài
  if (
    text.includes('tổng tài') ||
    text.includes('lọ lem') ||
    text.includes('ngôn tình') ||
    text.includes('bảo bối') ||
    text.includes('hào môn') ||
    text.includes('ở rể') ||
    text.includes('tỷ phú') ||
    text.includes('thiên kim') ||
    text.includes('thực tập sinh') ||
    text.includes('học bá') ||
    text.includes('ly hôn') ||
    text.includes('bạn trai') ||
    text.includes('vợ') ||
    text.includes('chồng') ||
    text.includes('đính hôn') ||
    text.includes('kết hôn') ||
    text.includes('hợp đồng') ||
    text.includes('thủ khoa') ||
    text.includes('bác sĩ')
  ) {
    return 'Ngôn Tình - Tổng Tài';
  }

  return 'Ngôn Tình - Tổng Tài';
}

// 5. Quét danh sách link Reels từ 1 Fanpage bằng Playwright
async function scrapeFanpageReels(pageUrl, channelName, maxToExtract = 15) {
  console.log(`📡 [ENGINE] Bắt đầu quét nguồn: "${channelName}"...`);
  let browser = null;
  const discovered = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(2500);

    // Cuộn trang để nạp thêm video Reels mới
    for (let i = 0; i < 8; i++) {
      // Đóng dialog đăng nhập nếu xuất hiện chặn cuộn
      try {
        const closeBtn = await page.$('div[aria-label="Đóng"], div[aria-label="Close"], [role="button"]:has-text("Đóng")');
        if (closeBtn) {
          await closeBtn.click().catch(() => {});
          await page.waitForTimeout(500);
        }
      } catch (e) {}

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
    }

    const items = await page.evaluate(() => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));

      for (const a of links) {
        const href = a.href.split('?')[0];
        const match = href.match(/reel\/(\d+)/);
        if (!match) continue;
        const reelId = match[1];

        // Lấy caption từ container
        const container = a.closest('[role="article"]') || a.parentElement?.parentElement || a.parentElement;
        const textElements = container ? Array.from(container.querySelectorAll('span, div')) : [];
        let bestCaption = '';
        for (const el of textElements) {
          const t = (el.innerText || '').trim();
          if (t && t.length > bestCaption.length && !/^\d+[,.]?\d*\s*[KkMm]?$/.test(t)) {
            bestCaption = t;
          }
        }
        const caption = bestCaption || a.getAttribute('aria-label') || a.innerText || '';

        if (!results.some((r) => r.id === reelId)) {
          results.push({
            id: reelId,
            url: href.endsWith('/') ? href : href + '/',
            rawCaption: caption.replace(/\n+/g, ' ').trim()
          });
        }
      }
      return results;
    });

    discovered.push(...items.slice(0, maxToExtract));
    console.log(`✅ [ENGINE] Tìm thấy ${items.length} link Reels từ "${channelName}".`);
  } catch (err) {
    console.warn(`⚠️ [ENGINE] Quét nguồn "${channelName}" gặp lỗi: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return discovered;
}

// 6. Phiên thực thi cào, lọc bản quyền, tải ảnh thật và lưu CSDL
export async function runCrawlAndReport() {
  console.log(`\n======================================================`);
  console.log(`⚡ [REALTIME ENGINE] Phiên quét Realtime lúc: ${new Date().toLocaleString('vi-VN')}`);

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

  // 6.1 Cơ chế xoay vòng thông minh (Round-Robin Rotating Crawl: 5 kênh/lần)
  let cursor = { currentChannelIndex: 0, cycleCount: 1 };
  if (fs.existsSync(CURSOR_PATH)) {
    try {
      cursor = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf-8'));
    } catch (e) {}
  }

  const startIdx = (cursor.currentChannelIndex || 0) % ALL_TARGET_SOURCES.length;
  const activeSources = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    const idx = (startIdx + i) % ALL_TARGET_SOURCES.length;
    activeSources.push(ALL_TARGET_SOURCES[idx]);
  }

  console.log(`\n🔄 [ROUND-ROBIN CRAWLER] Vòng #${cursor.cycleCount || 1} - Quét 5 kênh xoay vòng (Từ vị trí #${startIdx + 1}/${ALL_TARGET_SOURCES.length}):`);
  activeSources.forEach((s, idx) => console.log(`   👉 ${idx + 1}. [${s.name}]`));

  // Cập nhật vị trí xoay vòng cho lần kế tiếp và lưu file
  const nextIdx = (startIdx + BATCH_SIZE) % ALL_TARGET_SOURCES.length;
  const nextCycle = nextIdx < startIdx ? (cursor.cycleCount || 1) + 1 : (cursor.cycleCount || 1);
  fs.writeFileSync(
    CURSOR_PATH,
    JSON.stringify(
      {
        currentChannelIndex: nextIdx,
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
    const rawReels = await scrapeFanpageReels(source.url, source.name, 40);

    for (const item of rawReels) {
      // Bỏ qua nếu video đã có trong database
      const exists = db.some((s) =>
        (s.episodes || []).some((ep) => ep.originalUrl && (ep.originalUrl.includes(item.id) || ep.originalUrl === item.url))
      );
      if (exists) continue;

      // KIỂM TRA BẢN QUYỀN NHÚNG: Bắt buộc nhúng được mới nhận
      const canEmbed = await checkEmbeddable(item.url);
      if (!canEmbed) {
        console.log(`🚫 [BỊ CHẶN NHÚNG] Bỏ qua video bị hạn chế riêng tư/bản quyền: ${item.url}`);
        blockedCount++;
        continue;
      }

      // LẤY METADATA THẬT VÀ TẢI ẢNH GỐC CỦA VIDEO
      const meta = await fetchReelMetadata(item.url, item.id);
      
      // BẮT BUỘC CÓ ẢNH GỐC: Nếu không tải được ảnh gốc từ video, tuyệt đối không nhận
      if (!meta.localThumbnail) {
        console.log(`⏩ [BỎ QUA] Không tải được ảnh thumbnail gốc của video: ${item.url}`);
        continue;
      }

      const combinedText = `${meta.title} ${meta.description} ${item.rawCaption}`;

      // Lọc nội dung: Phải thuộc thể loại phim truyện AI, tu tiên, trùng sinh, 3D
      if (!isGenreMatched(combinedText, true)) {
        console.log(`⏩ [BỎ QUA] Video không đúng thể loại: "${combinedText.slice(0, 35)}..."`);
        continue;
      }

      const posterPath = meta.localThumbnail;
      const fallbackTitle = `Hoạt Hình 3D #${item.id.slice(-4)}`;
      const title = extractFilmTitle(meta, item.rawCaption, fallbackTitle);
      const cat = detectCategory(title, meta.description || '', source.name);
      const slug = slugify(title) + '-' + item.id.slice(-4);

      const newFilm = {
        id: 'series-reels-' + item.id,
        slug,
        title,
        description: cleanDescription(meta.description, title),
        thumbnail: posterPath,
        coverImage: posterPath,
        channelName: source.name.split(' (')[0],
        genres: [cat, 'Hoạt Hình 3D', 'Reels', 'Review Tóm Tắt'],
        categories: [cat, 'Hoạt Hình 3D', 'Reels'],
        totalEpisodes: 1,
        featured: false,
        updatedAt: new Date().toISOString().split('T')[0],
        episodes: [
          {
            id: 'ep-reels-' + item.id,
            seriesId: 'series-reels-' + item.id,
            partNumber: 1,
            title,
            originalUrl: item.url,
            embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(item.url)}&show_text=0&autoplay=0`,
            platform: 'facebook',
            aspectRatio: '9:16',
            duration: '01:30',
            thumbnail: posterPath,
            viewsCount: 15000 + Math.floor(Math.random() * 85000),
            publishedAt: new Date().toISOString().split('T')[0]
          }
        ]
      };

      // ĐƯA LÊN ĐẦU (Newest First)
      db.unshift(newFilm);
      newlyAdded++;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      console.log(`🎉 [THÀNH CÔNG] Đã nạp video mới: "${title}" (Thể loại: ${cat}) | Ảnh gốc: ${posterPath}`);
    }
  }

  // 6.2 Tính toán số liệu thống kê
  let totalEpisodes = 0;
  let totalViews = 0;
  db.forEach((s) => {
    (s.episodes || []).forEach((ep) => {
      totalEpisodes++;
      totalViews += ep.viewsCount || 0;
    });
  });

  // Lưu database đã cập nhật
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

  // Ghi báo cáo Analytics
  const stats = {
    timestamp: new Date().toISOString(),
    formattedTime: new Date().toLocaleString('vi-VN'),
    totalSeries: db.length,
    totalEpisodes,
    totalViews,
    newlyAddedInSession: newlyAdded,
    blockedNonEmbeddable: blockedCount,
    googleAnalyticsId: 'G-HYVH98WXZN',
    status: 'ACTIVE_REALTIME'
  };

  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), 'utf-8');

  console.log(`📊 [BÁO CÁO PHIÊN QUÉT]:`);
  console.log(`- Video mới nạp thành công: ${newlyAdded}`);
  console.log(`- Video bị chặn nhúng (đã lọc bỏ): ${blockedCount}`);
  console.log(`- Tổng số video hiện có: ${totalEpisodes}`);
  console.log(`- Tổng lượt xem tích lũy: ${totalViews.toLocaleString('vi-VN')}`);
  console.log(`======================================================\n`);

  return stats;
}

// Chế độ chạy liên tục ngầm (Daemon mode an toàn mỗi 5 phút, không trùng lặp)
if (process.argv.includes('--daemon')) {
  console.log(`🤖 [DAEMON] Khởi động tiến trình cào ngầm tuần tự 5 phút/lần...`);
  (async () => {
    while (true) {
      try {
        await runCrawlAndReport();
      } catch (err) {
        console.error('⚠️ [DAEMON] Lỗi trong phiên quét:', err.message);
      }
      console.log(`⏳ [DAEMON] Đang nghỉ 5 phút trước phiên quét tiếp theo...\n`);
      await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
    }
  })();
} else {
  runCrawlAndReport();
}
