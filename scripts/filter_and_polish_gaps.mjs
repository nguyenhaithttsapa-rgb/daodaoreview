import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

console.log('Tổng ban đầu:', db.length, 'phim');

const removeIds = new Set([
  'series-long-1402661358657529', // Duplicate Mùa 3+4 Ở Tu Tiên Giới Thu Gom Phế Phẩm
  'series-long-1293825396179493', // Non-movie Đào Thị Diệu
  'series-long-1104793438959774', // Duplicate Phần 39 Vô Linh Chứng Đạo
  'series-long-1399965375625104', // Duplicate Mùa 15 Tro Tàn Cửu Châu
  'series-long-1127939226478452', // Duplicate Mùa 1 Sơn Hải Ngự Linh Lục
  'series-long-3481989891966728', // Duplicate Mùa 5 Biệt đội số 0
  'series-long-1814153842915732', // Duplicate Mùa 7 Biệt đội số 0
  'series-long-1648192806918217', // Duplicate clip 30m of Thái Huyền Thai Châu Truyện
  'series-long-2188228862098695'  // Duplicate Mùa 25 Tro Tàn Cửu Châu
]);

db = db.filter(m => !removeIds.has(m.id));

const thumbsToRemove = [
  'public/thumbnails/1402661358657529.jpg',
  'public/thumbnails/1293825396179493.jpg',
  'public/thumbnails/1104793438959774.jpg',
  'public/thumbnails/1399965375625104.jpg',
  'public/thumbnails/1127939226478452.jpg',
  'public/thumbnails/3481989891966728.jpg',
  'public/thumbnails/1814153842915732.jpg',
  'public/thumbnails/1648192806918217.jpg',
  'public/thumbnails/2188228862098695.jpg'
];
thumbsToRemove.forEach(p => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// Polish titles of the 11 new movies
const polishMap = {
  'series-long-1806711723694430': 'Mùa 8 Đến Mùa 13 | Thái Huyền Thai Châu Truyện: Vạn Năm Tu Tiên (Full Trọn Bộ 11 Giờ 50 Phút)',
  'series-long-1102766905732088': 'Mùa 5 | Khởi Đầu Bằng Một Siêu Thị, Ta Sống Cực Sướng Ở Cổ Đại (Full Trọn Bộ 9 Giờ 14 Phút)',
  'series-long-4366911826972668': 'Mùa 1 - Mùa 3 | Tiên Tần Bất Hủ: Xuyên Không Đến Cổ Đại (Full Trọn Bộ 7 Giờ 50 Phút)',
  'series-long-1332529178779787': 'Mùa 8 | Kiếm Tiên Trở Về: Triệu Phi Phế Tài Nghịch Tập (Full Trọn Bộ 5 Giờ 12 Phút)',
  'series-long-1718858352743463': 'Mùa 1 + Mùa 2 | Xin Hãy Gọi Tôi Là Cung Thủ Roguelike (Full Trọn Bộ 4 Giờ 34 Phút)',
  'series-long-1319885013343447': 'Mùa 4 | Cao Vũ: Tôi Trở Thành Võ Giả Toàn Hệ (Full Trọn Bộ 3 Giờ 53 Phút)',
  'series-long-997146119876168': 'Mùa 3 (99 Tập) | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 31 Phút)',
  'series-long-1609135590663121': 'Mùa 27 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 26 Phút)',
  'series-long-38979435888308289': 'Mùa 32 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 17 Phút)',
  'series-long-1370749431630977': 'Mùa 4 | Thủ Tiết Ba Năm, Phu Quân Nguyên Anh Đã Trở Về (Full Trọn Bộ 2 Giờ 05 Phút)',
  'series-long-2985720525111459': 'Mùa 4 | Bạo Tiếu Tu Tiên: Pháp Bảo Của Sư Thúc Có Chút Kỳ Quái (Full Trọn Bộ 1 Giờ 58 Phút)'
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
