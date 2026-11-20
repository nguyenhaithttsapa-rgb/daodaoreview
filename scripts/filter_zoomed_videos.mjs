import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
const THUMB_DIR = path.resolve('public/thumbnails');

function getJpegDimensions(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let offset = 2;
    while (offset < buf.length - 9) {
      if (buf[offset] !== 0xFF) { offset++; continue; }
      const marker = buf[offset + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) return { width, height };
      }
      if (marker === 0xD9 || marker === 0xDA) break;
      const segLen = buf.readUInt16BE(offset + 2);
      if (segLen < 2) break;
      offset += 2 + segLen;
    }
  }
  return null;
}

const ZOOM_REUP_OR_SPAM_CHANNELS = [
  'sun media 3.0',
  'rồng con chiến thần',
  'rồng con tổng hợp',
  'rồng bự tổng hợp',
  'mr sujan',
  'thông gaming aov',
  'homestay ocean park',
  '超老闆',
  'tm shop',
  'tutu shop',
  'beautiful dress rivew',
  'vua cafe79',
  'snaplogistics',
  'order phụ tùng xe cẩu',
  'ancarat jewelry',
  'kiến trúc kisato',
  'kt food stories',
  'luxuo vietnam',
  'maira’s cleaning services',
  'cao trang optical',
  'adamhdzir xgaming'
];

const SPAM_TITLE_KEYWORDS = [
  'đi mua trang sức',
  'mẫu toà nhà building',
  'tiến độ thi công trụ sở',
  'chợ giá rẻ $1.25 dollar tree',
  'tiệm sale rẻ nhất',
  '[minigame] đoán nhà vô địch',
  'ngồi nghệ ep.'
];

const KNOWN_ZOOMED_VIDS = new Set([
  '1897450161502051' // Zoomed face with black border + red HUD bars
]);

// Nhận diện tiêu đề reup lách bản quyền chèn gạch ngang/dấu bằng giữa âm tiết (vd: đ-ộ-c á-c, Ph-ư-ợ-ng, h=ắt h=ủi)
function hasObfuscatedReupTitle(title) {
  if (!title) return false;
  return /[a-zA-ZÀ-ỹ]-[a-zA-ZÀ-ỹ]-[a-zA-ZÀ-ỹ]/u.test(title) || /[a-zA-ZÀ-ỹ]=[a-zA-ZÀ-ỹ]/u.test(title);
}

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log(`🔍 Quét lọc bổ sung các video bị Center-Crop (608x1080, 406x720, 675x1200...) trên ${db.length} bộ phim...`);

  let removedCenterCropVertical = 0;
  let removedObfuscatedReup = 0;
  let updatedAspect916 = 0;
  let kept169 = 0;

  const cleanedDb = [];

  for (const s of db) {
    const chLower = (s.channelName || '').toLowerCase();
    const titleLower = (s.title || '').toLowerCase();
    const vid = (s.thumbnail || '').split('/').pop().replace('.jpg', '');

    if (
      KNOWN_ZOOMED_VIDS.has(vid) ||
      ZOOM_REUP_OR_SPAM_CHANNELS.some(k => chLower.includes(k)) ||
      SPAM_TITLE_KEYWORDS.some(k => titleLower.includes(k)) ||
      hasObfuscatedReupTitle(s.title)
    ) {
      removedObfuscatedReup++;
      continue;
    }

    const thumbPath = path.join(THUMB_DIR, `${vid}.jpg`);
    if (!fs.existsSync(thumbPath)) continue;

    const buf = fs.readFileSync(thumbPath);
    const dim = getJpegDimensions(buf);
    if (!dim) continue;

    const r = dim.width / dim.height;

    // Lọc tỷ lệ 3:4, 4:5, 1:1, 4:3
    if (r >= 0.62 && r < 1.48) {
      removedCenterCropVertical++;
      continue;
    }

    const isDonghua3D =
      chLower.includes('3d') ||
      chLower.includes('đấu phá') ||
      chLower.includes('tiên nghịch') ||
      chLower.includes('mễ lạc') ||
      chLower.includes('sóc tu tiên') ||
      chLower.includes('sammi') ||
      titleLower.includes('hoạt hình 3d') ||
      titleLower.includes('đấu phá thương khung') ||
      titleLower.includes('tiên nghịch');

    // Với video dọc (R < 0.62) không phải poster fan-art Donghua 3D:
    // Loại bỏ các kích thước bị cắt dọc từ phim ngang hoặc cắt viền lách bản quyền:
    // 608x1080 (cắt giữa từ 1920x1080), 406x720 (cắt giữa từ 1280x720), 675x1200, 360x640, 480x854, 540x960, 716x1276 (< 720px chiều ngang)
    if (r < 0.62 && !isDonghua3D) {
      if (dim.width < 720 || dim.height < 1280) {
        removedCenterCropVertical++;
        continue;
      }
    }

    const trueAspect = (r < 0.62 && !isDonghua3D) ? '9:16' : '16:9';
    if (trueAspect === '9:16') updatedAspect916++;
    else kept169++;

    if (s.episodes && Array.isArray(s.episodes)) {
      s.episodes.forEach(ep => {
        ep.aspectRatio = trueAspect;
      });
    }

    cleanedDb.push(s);
  }

  if (cleanedDb.length > 0 && !cleanedDb.some(s => s.featured)) {
    cleanedDb[0].featured = true;
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(cleanedDb, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`✅ KẾT QUẢ LỌC TẦNG 2 (CENTER-CROP 608x1080 / 406x720 / 716x1276 & REUP OBFUSCATED):`);
  console.log(`- Đã loại bỏ thêm video cắt dọc Center-Crop / cắt viền (< 720x1280): ${removedCenterCropVertical} video`);
  console.log(`- Đã loại bỏ thêm kênh/video reup lách chữ (đ-ộ-c á-c, Ph-ư-ợ-ng...): ${removedObfuscatedReup} video`);
  console.log(`- Tổng số bộ phim chuẩn chất lượng cao còn lại trong CSDL: ${cleanedDb.length} bộ phim`);
  console.log(`  + Phim màn ảnh rộng 16:9 chuẩn: ${kept169} bộ`);
  console.log(`  + Phim ngắn dọc 9:16 chuẩn HD (720x1280 / 1080x1920): ${updatedAspect916} bộ`);
  console.log(`======================================================\n`);
}

main();
