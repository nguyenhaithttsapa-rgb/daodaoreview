import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');
let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const polishMap = {
  'series-long-1043266485335258': 'Mùa 2 | Nữ Phụ Độc Nhất, Nghịch Chuyển Tiên Đồ (Full Trọn Bộ 2 Giờ 11 Phút)',
  'series-long-826228193790009': 'Mùa 4 | Vừa Bắt Đầu Đã Là Đại Đế: Đệ Tử Của Ta Toàn Mang Thể Chất Nghịch Thiên (Full Trọn Bộ 2 Giờ 13 Phút)',
  'series-long-4013666102102650': 'Mùa 3 (Tập 1 - 171) | Ai Nói Công Tử Ăn Chơi Không Thể Làm Trạng Nguyên (Full Trọn Bộ 2 Giờ 24 Phút)',
  'series-long-1299626352090131': 'Mùa 1 - Mùa 3 | Thái Huyền Thai Châu Truyện: Vạn Năm Tu Tiên (Full Trọn Bộ 6 Giờ 20 Phút)',
  'series-long-2202953580556524': 'Mùa 4 (120 Tập) | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 3 Giờ 10 Phút)',
  'series-long-1869410400696248': 'Mùa 21 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 40 Phút)',
  'series-long-2487173891792217': 'Mùa 6 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 25 Phút)',
  'series-long-2118230972460492': 'Mùa 10 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 16 Phút)',
  'series-long-28966582416274983': 'Mùa 13 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 3 Giờ 02 Phút)',
  'series-long-1050213880959550': 'Mùa 16 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 32 Phút)',
  'series-long-1117265093967873': 'Mùa 4 - Mùa 6 | Y Nữ Phong Hoa: Lưu Đày Bắc Cương (Full Trọn Bộ 9 Giờ 19 Phút)',
  'series-long-2028977241823923': 'Mùa 20 | Vô Linh Chứng Đạo: Không Có Linh Căn Vẫn Tu Tiên (Full Trọn Bộ 2 Giờ 15 Phút)',
  'series-long-1971902203486634': 'Mùa 3 | Nữ Phụ Độc Nhất, Nghịch Chuyển Tiên Đồ (Full Trọn Bộ 2 Giờ 33 Phút)',
  'series-long-1963946387652993': 'Mùa 1 - Mùa 3 | Nữ Ma Đầu Tấu Hài, Một Kiếm Hám Tiên Đồ (Full Trọn Bộ 6 Giờ 06 Phút)',
  'series-long-1372524898250749': 'Mùa 1 - Mùa 3 | Giác Tỉnh Thập Điện Diêm La, Ta Chính Là Hồng Tán Quỷ Tiên (Full Trọn Bộ 11 Giờ 01 Phút)',
  'series-long-2273381313489016': 'Mùa 3 | Nhất Mộng Thanh Huyền: Tiểu Sư Muội Đoàn Sủng, Nhất Kiếm Phá Cửu Thiên (Full Trọn Bộ 3 Giờ 09 Phút)'
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
console.log('Đã cập nhật tiêu đề chuẩn chỉ cho 16 phim mới!');
