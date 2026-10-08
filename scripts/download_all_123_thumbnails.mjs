import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DB_PATH = path.join(rootDir, 'src', 'data', 'database.json');
const THUMB_DIR = path.join(rootDir, 'public', 'thumbnails');

if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
console.log(`Bắt đầu tải ảnh đại diện gốc cho ${db.length} bộ phim...`);

async function fetchAndSaveThumb(url, cleanId) {
  const localFile = path.join(THUMB_DIR, `${cleanId}.jpg`);
  if (fs.existsSync(localFile) && fs.statSync(localFile).size > 500) {
    return true;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return false;
    const html = await res.text();
    const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (!match || !match[1]) return false;

    const imgUrl = match[1].replace(/&amp;/g, '&');
    const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) return false;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    if (buffer.length < 500) return false;

    fs.writeFileSync(localFile, buffer);
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < db.length; i++) {
    const s = db[i];
    const ep = s.episodes?.[0];
    const match = ep?.originalUrl?.match(/reel\/(\d+)/);

    if (match) {
      const cleanId = match[1];
      const ok = await fetchAndSaveThumb(ep.originalUrl, cleanId);
      if (ok) {
        success++;
        s.thumbnail = `/thumbnails/${cleanId}.jpg`;
        s.coverImage = `/thumbnails/${cleanId}.jpg`;
        if (ep) ep.thumbnail = `/thumbnails/${cleanId}.jpg`;
        console.log(`[${i + 1}/${db.length}] ✅ Tải ảnh gốc thành công: ${s.title.slice(0, 35)} (${cleanId}.jpg)`);
      } else {
        failed++;
        console.warn(`[${i + 1}/${db.length}] ❌ Không tải được ảnh gốc từ FB: ${ep.originalUrl}`);
        // Nếu không tải được ảnh gốc từ FB, dùng avatar thương hiệu chính thức
        s.thumbnail = '/avatar.jpg';
        s.coverImage = '/avatar.jpg';
        if (ep) ep.thumbnail = '/avatar.jpg';
      }
    } else {
      s.thumbnail = '/avatar.jpg';
      s.coverImage = '/avatar.jpg';
      if (ep) ep.thumbnail = '/avatar.jpg';
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  console.log(`\n🎉 KẾT QUẢ TẢI ẢNH GỐC:`);
  console.log(`- Thành công: ${success}/${db.length}`);
  console.log(`- Thất bại (fallback về /avatar.jpg): ${failed}`);
}

run();
