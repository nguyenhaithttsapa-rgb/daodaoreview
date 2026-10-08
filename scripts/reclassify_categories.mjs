import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const DB_PATH = path.join(rootDir, 'src', 'data', 'database.json');

export function detectCategory(title = '', desc = '', channel = '') {
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

function run() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  let updatedCount = 0;
  const stats = {};

  db.forEach((film) => {
    const oldCat = (film.categories && film.categories[0]) || '';
    const newCat = detectCategory(film.title, film.description, film.channelName);
    stats[newCat] = (stats[newCat] || 0) + 1;

    if (oldCat !== newCat) {
      updatedCount++;
      film.categories = [newCat, 'Hoạt Hình 3D', 'Reels'];
      film.genres = [newCat, 'Hoạt Hình 3D', 'Reels', 'Review Tóm Tắt'];
    }
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Đã cập nhật chuẩn hóa thể loại cho ${updatedCount} bộ phim!`);
  console.log('Thống kê phân bổ thể loại mới:', stats);
}

run();
