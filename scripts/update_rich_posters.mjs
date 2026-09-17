import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src', 'data', 'database.json');

// Bộ sưu tập ảnh bìa Anime 3D / Tu Tiên / Huyền Huyễn chất lượng cao
const POSTERS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80', // Kiếm khách huyền ảo
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', // Không gian vũ trụ / Thôn Phệ
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80', // Lửa / Đấu Phá
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80', // Tiên hiệp cổ trang
  'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=800&auto=format&fit=crop&q=80', // Thành thị huyền bí / Trọng sinh
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80', // Ma thuật thần thoại
  'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&auto=format&fit=crop&q=80', // Rồng thiêng / Tiên kiếm
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', // Ánh sáng linh đan
];

try {
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

  // Lọc bỏ những series rác do cào số thời gian (như "12:38", "4:17", "0:15")
  const validSeries = data.filter((s) => {
    return !/^\d+:\d+/.test(s.title) && !/^\d+[,.]?\d*\s*[KkMm]?$/.test(s.title);
  });

  // Gán poster đẹp sắc nét cho từng bộ phim và từng tập video
  validSeries.forEach((series, sIndex) => {
    const posterUrl = POSTERS[sIndex % POSTERS.length];
    series.thumbnail = posterUrl;

    if (series.episodes && series.episodes.length > 0) {
      series.episodes.forEach((ep, epIndex) => {
        ep.thumbnail = POSTERS[(sIndex + epIndex) % POSTERS.length];
      });
    }
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(validSeries, null, 2), 'utf-8');
  console.log(`✅ Đã cập nhật ảnh đại diện sắc nét cho ${validSeries.length} bộ phim và lọc sạch danh sách!`);
} catch (e) {
  console.error('Lỗi khi cập nhật ảnh đại diện:', e);
}
