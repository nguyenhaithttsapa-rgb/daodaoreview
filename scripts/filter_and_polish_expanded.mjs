import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

console.log('Tổng ban đầu:', db.length, 'phim');

// 1. Remove non-movie and duplicate IDs
const removeIds = new Set([
  'series-long-1380034377448090', // Cafe sáng & dealshaker
  'series-long-2188228862098695', // Duplicate Tro Tàn Cửu Châu Mùa 25
  'series-long-1077677161817955', // Duplicate Cao Vũ Mùa 6
  'series-long-1814153842915732', // Duplicate Biệt đội số 0 Mùa 7
  'series-long-3481989891966728', // Duplicate Biệt đội số 0 Mùa 5
  'series-long-1399965375625104'  // Duplicate Tro Tàn Cửu Châu Mùa 15
]);

db = db.filter(m => !removeIds.has(m.id));

// Remove unused thumbnails
const thumbsToRemove = [
  'public/thumbnails/1380034377448090.jpg',
  'public/thumbnails/2188228862098695.jpg',
  'public/thumbnails/1077677161817955.jpg',
  'public/thumbnails/1814153842915732.jpg',
  'public/thumbnails/3481989891966728.jpg',
  'public/thumbnails/1399965375625104.jpg'
];
thumbsToRemove.forEach(p => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

// 2. Polish titles of the 16 new movies
const polishMap = {
  'series-long-1860278648292800': 'Mùa 13 | Thái Huyền Thai Châu Truyện: Vạn Năm Tu Tiên (Full Trọn Bộ 2 Giờ 08 Phút)',
  'series-long-1632106505010928': 'Mùa 4 - Mùa 6 | Thái Huyền Thai Châu Truyện: Vạn Năm Tu Tiên (Full Trọn Bộ 6 Giờ 28 Phút)',
  'series-long-2554354841692477': 'Mùa 12 | Tro Tàn Cửu Châu: Xuyên Không Dùng Kiến Thức Hiện Đại Xoay Chuyển Càn Khôn (Full Trọn Bộ)',
  'series-long-2658877981229031': 'Mùa 6 | Kiếm Tiên Trở Về: Triệu Phi Phế Tài Nghịch Tập (Full Trọn Bộ 5 Giờ 41 Phút)',
  'series-long-1082005464325915': 'Mùa 2 | Kiếm Tiên Trở Về: Triệu Phi Phế Tài Nghịch Tập (Full Trọn Bộ 6 Giờ 36 Phút)',
  'series-long-1823408089017156': 'Mùa 7 | Kiếm Tiên Trở Về: Triệu Phi Phế Tài Nghịch Tập (Full Trọn Bộ 10 Giờ 40 Phút)',
  'series-long-1546148877162194': 'Mùa 1 - Mùa 3 (8 Tiếng) | Vừa Bắt Đầu Đã Là Đại Đế: Đệ Tử Toàn Thể Chất Nghịch Thiên (Full Trọn Bộ)',
  'series-long-3569312339912257': 'Mùa 5 | Biệt Đội Số 0: Bắc Thần Lãm Tinh Hà (Full Trọn Bộ 2 Giờ 23 Phút)',
  'series-long-1782275709439104': 'Mùa 3 | Bạo Tiếu Tu Tiên: Pháp Bảo Của Sư Thúc Có Chút Kỳ Quái (Full Trọn Bộ 1 Giờ 51 Phút)',
  'series-long-1044078895067848': 'Mùa 30 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 11 Phút)',
  'series-long-1623930875886244': 'Mùa 25 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 31 Phút)',
  'series-long-921929723810448': 'Mùa 24 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 38 Phút)',
  'series-long-1039180988990463': 'Mùa 22 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 17 Phút)',
  'series-long-2185231962023235': 'Mùa 17 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 39 Phút)',
  'series-long-1436465701665955': 'Mùa 15 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 31 Phút)',
  'series-long-1626843049007862': 'Mùa 11 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 16 Phút)'
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
