import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

console.log('Tổng ban đầu:', db.length, 'phim');

// 1. Remove duplicate series IDs
const duplicates = new Set([
  'series-long-2064836954133902', // Duplicate Giác Tỉnh Thập Điện Diêm La Mùa 1-3
  'series-long-1077677161817955', // Duplicate Cao Vũ Mùa 6
  'series-long-2188228862098695', // Duplicate Tro Tàn Cửu Châu Mùa 25
  'series-long-2315291899307827', // Duplicate Vô Linh Chứng Đạo Mùa 39
  'series-long-1104793438959774'  // Duplicate Vô Linh Chứng Đạo Phần 39
]);

db = db.filter(m => !duplicates.has(m.id));

// Remove duplicate thumbnails from disk
const thumbsToRemove = [
  'public/thumbnails/2064836954133902.jpg',
  'public/thumbnails/1077677161817955.jpg',
  'public/thumbnails/2188228862098695.jpg',
  'public/thumbnails/2315291899307827.jpg',
  'public/thumbnails/1104793438959774.jpg'
];
thumbsToRemove.forEach(p => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// 2. Polish titles of the 14 new movies
const polishMap = {
  'series-long-945044888655829': 'Mùa 8 | Giác Tỉnh Thập Điện Diêm La: Ta Chính Là Hồng Tán Quỷ Tiên (Full Trọn Bộ 3 Giờ 03 Phút)',
  'series-long-1090526773469129': 'Mùa 4 + Mùa 5 | Giác Tỉnh Thập Điện Diêm La: Ta Chính Là Hồng Tán Quỷ Tiên (Full Trọn Bộ 5 Giờ 33 Phút)',
  'series-long-1855940212038130': 'Mùa 9 | Giác Tỉnh Thập Điện Diêm La: Ta Chính Là Hồng Tán Quỷ Tiên (Full Trọn Bộ 2 Giờ 34 Phút)',
  'series-long-1029798076764760': 'Mùa 12 | Thái Huyền Thai Châu Truyện: Vạn Năm Tu Tiên (Full Trọn Bộ 2 Giờ 06 Phút)',
  'series-long-1619132903107748': 'Mùa 14 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 41 Phút)',
  'series-long-960051249820236': 'Phần 1 Đến Phần 5 | Nhất Mộng Thanh Huyền: Tiểu Sư Muội Đoàn Sủng, Nhất Kiếm Phá Cửu Thiên (Full Trọn Bộ 15 Giờ 48 Phút)',
  'series-long-1061626273358145': 'Mùa 4 | Ai Nói Công Tử Ăn Chơi Không Thể Làm Trạng Nguyên (Full Trọn Bộ 2 Giờ 17 Phút)',
  'series-long-1873744100274716': 'Mùa 7 | Biệt Đội Số 0: Bắc Thần Lãm Tinh Hà (Full Trọn Bộ 2 Giờ 29 Phút)',
  'series-long-1393583916002823': 'Mùa 8 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 06 Phút)',
  'series-long-2269109063870036': 'Mùa 3 + Mùa 4 | Ở Tu Tiên Giới Thu Gom Phế Phẩm, Ta Âm Thầm Vô Địch (Full Trọn Bộ 11 Giờ 11 Phút)',
  'series-long-3150006655200057': 'Mùa 7 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 11 Phút)',
  'series-long-1684976299442586': 'Mùa 5 (99 Tập) | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 30 Phút)',
  'series-long-1763360498243292': 'Mùa 23 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 45 Phút)',
  'series-long-990274797416908': 'Mùa 28 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 57 Phút)'
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
console.log('Tổng sau khi lọc trùng và tối ưu hóa tiêu đề:', db.length, 'phim dài chuẩn 100%');
