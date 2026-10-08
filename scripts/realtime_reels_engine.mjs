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

// 1. Hàm kiểm tra quyền nhúng video Facebook
async function checkEmbeddable(url) {
  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=0`;
    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return false;
    const html = await res.text();
    // Bỏ qua nếu Facebook chặn nhúng hoặc yêu cầu đăng nhập
    if (html.includes('error_subcode') || html.includes('This video cannot be played') || html.includes('không thể phát')) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// 2. Hàm tải ảnh thumbnail thật từ Facebook bằng User-Agent Facebook External Hit
async function downloadRealThumbnail(reelUrl, reelId) {
  const localFile = path.join(THUMB_DIR, `${reelId}.jpg`);
  if (fs.existsSync(localFile)) {
    return `/thumbnails/${reelId}.jpg`;
  }

  try {
    const res = await fetch(reelUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (!match || !match[1]) return null;

    let imgUrl = match[1].replace(/&amp;/g, '&');
    const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(6000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(localFile, buffer);
    return `/thumbnails/${reelId}.jpg`;
  } catch (e) {
    return null;
  }
}

// 3. Hàm làm sạch caption và tạo tiêu đề chuẩn
function cleanTitle(rawCaption, fallback = 'Hoạt Hình 3D Đỉnh Cao') {
  if (!rawCaption) return fallback;
  let text = rawCaption
    .replace(/(?:tập|tap|part|ep|hồi)\s*\d+/gi, '')
    .replace(/#[\w\u00C0-\u1EF9]+/g, '')
    .replace(/[🔥⚡💥✨🎉🎬❤️👍👇👉\[\]\(\)\{\}]/g, '')
    .replace(/(?:0\d{9,10}|\+84\d{9,10})/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 5 ? text.slice(0, 80).trim() : fallback;
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

// 4. Hàm thực thi phiên cào và thống kê
export async function runCrawlAndReport() {
  console.log(`\n======================================================`);
  console.log(`⚡ [REALTIME ENGINE] Bắt đầu phiên kiểm tra: ${new Date().toLocaleString('vi-VN')}`);

  let db = [];
  try {
    if (fs.existsSync(DB_PATH)) {
      db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Lỗi đọc database:', e);
    return null;
  }

  const initialCount = db.length;
  let newAddedCount = 0;

  // Quét kiểm tra và tải ảnh cho các video chưa có ảnh cục bộ
  console.log(`🔍 [ENGINE] Đang rà soát và tải ảnh thumbnail cục bộ cho các video mới...`);
  const recentReels = db.slice(0, 100);
  for (const s of recentReels) {
    const ep = s.episodes?.[0];
    if (!ep || !ep.originalUrl) continue;
    const matchId = ep.originalUrl.match(/reel\/(\d+)/);
    const cleanId = matchId ? matchId[1] : ep.id;

    if (!s.thumbnail || s.thumbnail.includes('fbcdn.net') || s.thumbnail.startsWith('http')) {
      const realThumb = await downloadRealThumbnail(ep.originalUrl, cleanId);
      if (realThumb) {
        s.thumbnail = realThumb;
        s.coverImage = realThumb;
        ep.thumbnail = realThumb;
        newAddedCount++;
      }
    }
  }

  // Tính toán số liệu thống kê
  let totalEpisodes = 0;
  let totalViews = 0;
  db.forEach((s) => {
    (s.episodes || []).forEach((ep) => {
      totalEpisodes++;
      totalViews += ep.viewsCount || 0;
    });
  });

  // Lưu database đã tối ưu
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

  // Ghi nhật ký thống kê
  const stats = {
    timestamp: new Date().toISOString(),
    formattedTime: new Date().toLocaleString('vi-VN'),
    totalSeries: db.length,
    totalEpisodes,
    totalViews,
    newThumbnailsCached: newAddedCount,
    googleAnalyticsId: 'G-HYVH98WXZN',
    status: 'ACTIVE_REALTIME'
  };

  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), 'utf-8');

  console.log(`📊 [ENGINE BÁO CÁO]:`);
  console.log(`- Tổng số video hiện có: ${totalEpisodes}`);
  console.log(`- Tổng số bộ phim: ${db.length}`);
  console.log(`- Tổng lượt xem tích lũy: ${totalViews.toLocaleString('vi-VN')}`);
  console.log(`- Thumbnail cục bộ vừa nạp: ${newAddedCount}`);
  console.log(`======================================================\n`);

  return stats;
}

// Nếu chạy trực tiếp từ dòng lệnh
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCrawlAndReport();
}
