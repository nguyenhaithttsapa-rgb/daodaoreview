import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

console.log('Tổng ban đầu:', db.length, 'phim');

const removeIds = new Set([
  'series-long-1261339199425481', // Duplicate 3 nhóc tỳ
  'series-long-2625083294495483', // Duplicate Cậu bé thông minh
  'series-long-2036837480149138', // Lời Vàng Phật Dạy (non-movie)
  'series-long-2188228862098695', // Duplicate Tro Tàn Cửu Châu Mùa 25
  'series-long-1077677161817955', // Duplicate Cao Vũ Mùa 6
  'series-long-1632604998429898', // Incomplete title Tập 133
  'series-long-1800243404555633', // 721K (invalid)
  'series-long-1571307363930534', // Mùa 2+3 xem thêm (invalid)
  'series-long-4476233582632098'  // Mùa 1: (invalid)
]);

db = db.filter(m => !removeIds.has(m.id));

const thumbsToRemove = [
  'public/thumbnails/1261339199425481.jpg',
  'public/thumbnails/2625083294495483.jpg',
  'public/thumbnails/2036837480149138.jpg',
  'public/thumbnails/2188228862098695.jpg',
  'public/thumbnails/1077677161817955.jpg',
  'public/thumbnails/1632604998429898.jpg',
  'public/thumbnails/1800243404555633.jpg',
  'public/thumbnails/1571307363930534.jpg',
  'public/thumbnails/4476233582632098.jpg'
];
thumbsToRemove.forEach(p => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// Polish titles of the 8 new movies
const polishMap = {
  'series-long-978609417085483': 'Cậu Bé 8 Tuổi Ra Điều Kiện Cho Ông Bố Tổng Tài Thất Lạc (Full Trọn Bộ 1 Giờ 50 Phút)',
  'series-long-1253958429130853': 'Tổng Tài Đi Tìm Lại Bố Mẹ Thất Lạc Từ Nhỏ (Full Trọn Bộ 1 Giờ 37 Phút)',
  'series-long-1767172271303741': 'Lâm Lạc: Phó Bản Lẫm Đông Tương Chí & Hệ Thống Tử Thần (Full Trọn Bộ 2 Giờ 17 Phút)',
  'series-long-1802552937063935': 'Sở Hữu Hệ Thống Từ Lời Mẹ Khoác Lác: Dẹp Tan Mọi Âm Mưu (Full Trọn Bộ 2 Giờ 20 Phút)',
  'series-long-1966591984744280': 'Mùa 6 | Vô Địch Tiêu Sư: Khai Cục Hộ Tống Diệt Thế Đế Nữ (Full Trọn Bộ 1 Giờ 07 Phút)',
  'series-long-3270283659816592': 'Vạn Cổ Chí Tôn: Chàng Trai Sắp Thành Chí Tôn Trọng Sinh (Full Trọn Bộ 1 Giờ 54 Phút)',
  'series-long-1072934761954654': 'Trọng Sinh Ngày Đại Hôn: Ta Không Cứu Phu Quân Nữa (Full Trọn Bộ 31 Phút)',
  'series-long-1118598666894334': 'Thẩm Ngư Lạc Yến: Trọn Bộ Thuyết Minh Cổ Trang Cực Phẩm (Full Trọn Bộ 2 Giờ 49 Phút)'
};

for (const m of db) {
  if (polishMap[m.id]) {
    m.title = polishMap[m.id];
    if (m.episodes && m.episodes[0]) {
      m.episodes[0].title = polishMap[m.id];
    }
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log('Tổng sau khi lọc sạch và chuẩn hóa tiêu đề:', db.length, 'phim dài chuẩn 100%');
