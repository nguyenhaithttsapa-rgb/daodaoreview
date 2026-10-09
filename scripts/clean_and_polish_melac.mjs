import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

console.log('Ban đầu:', db.length, 'phim');

// 1. Remove non-movie / duplicates
const idsToRemove = new Set([
  'series-long-576102626702152', // Mẹ ấm bụng con no sữa (parenting)
  'series-long-1261339199425481', // Duplicate of 3 nhóc tỳ
  'series-long-2188228862098695'  // Duplicate of Tro Tàn Cửu Châu Mùa 25
]);

db = db.filter(m => !idsToRemove.has(m.id));

// 2. Polish titles of recently added movies
for (const m of db) {
  let title = m.title;

  // Fix 1625210685877119
  if (m.id === 'series-long-1625210685877119') {
    title = 'Tu Tiên Truyện: Chiến Thuật Luyện Kim & Y Học Cổ Đại (Full Trọn Bộ)';
  }

  // Remove [16+], [13+] prefixes
  title = title.replace(/^\[(?:16\+|13\+)\]\s*/i, '');

  // Fix [ Phần 4 ] -> Phần 4 |
  title = title.replace(/^\[\s*Phần\s*(\d+)\s*\]\s*/i, 'Phần $1 | ');

  // Fix cut off titles
  if (m.id === 'series-long-1378007420989753') {
    title = 'Mùa 6 | Cao Vũ: Tôi Trở Thành Võ Giả Toàn Hệ (Full Trọn Bộ 8 Giờ 47 Phút)';
  } else if (m.id === 'series-long-2453133051887655') {
    title = 'Mùa 7 | Ở Tu Tiên Giới Thu Gom Phế Phẩm Bắt Đầu Vô Địch (Full Trọn Bộ 4 Giờ 13 Phút)';
  } else if (m.id === 'series-long-1714415949766390') {
    title = 'Mùa 3 - Phần 1 | Tiểu Sư Muội Được Cả Kiếm Tông Sủng Ái (Full Trọn Bộ 2 Giờ 34 Phút)';
  } else if (m.id === 'series-long-1382480053828507') {
    title = 'Mùa 3 - Phần 2 | Tiểu Sư Muội Được Cả Kiếm Tông Sủng Ái (Full Trọn Bộ 1 Giờ 28 Phút)';
  } else if (m.id === 'series-long-1380234217422423') {
    title = 'Mùa 7 | Bạo Tiếu Tu Tiên: Pháp Bảo Của Sư Thúc Có Chút Kỳ Quái (Full Trọn Bộ 2 Giờ 44 Phút)';
  } else if (m.id === 'series-long-1082146431218296') {
    title = 'Mùa 38 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 23 Phút)';
  } else if (m.id === 'series-long-1630186538499652') {
    title = 'Mùa 39 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 43 Phút)';
  } else if (m.id === 'series-long-1118754513944169') {
    title = 'Mùa 5 | Nhất Mộng Thanh Huyền: Tiểu Sư Muội Đoàn Sủng, Nhất Kiếm Phá Cửu Thiên (Full Trọn Bộ)';
  } else if (m.id === 'series-long-37787277250915542') {
    title = 'Mùa 4 | Nhất Mộng Thanh Huyền: Tiểu Sư Muội Đoàn Sủng, Nhất Kiếm Phá Cửu Thiên (Full Trọn Bộ)';
  } else if (m.id === 'series-long-1808069363546389') {
    title = 'Mùa 1 | Sơn Hải Ngự Linh Lục: Khế Ước Thần Thú Đại Càn (Full Trọn Bộ 5 Giờ 06 Phút)';
  } else if (m.id === 'series-long-1118036964515241') {
    title = 'Mùa 15 | Tro Tàn Cửu Châu: Xuyên Không Dùng Kiến Thức Hiện Đại Xoay Chuyển Càn Khôn (Full Trọn Bộ)';
  } else if (m.id === 'series-long-1103486358911535') {
    title = 'Mùa 1 - Mùa 3 | Y Nữ Phong Hoa: Lưu Đày Bắc Cương (Full Trọn Bộ 7 Giờ 44 Phút)';
  } else if (m.id === 'series-long-2290708425174855') {
    title = 'Phần 4 | Nữ Đặc Công Xuyên Sách Mang Cả Kho Vật Tư Đi Lưu Đày (Full Trọn Bộ 2 Giờ 09 Phút)';
  }

  m.title = title;
  if (m.episodes && m.episodes[0]) {
    m.episodes[0].title = title;
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('Sau khi chuẩn hóa & lọc sạch:', db.length, 'phim dài chuẩn 100%');
