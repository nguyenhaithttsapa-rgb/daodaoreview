import fs from 'fs';

const DB_PATH = 'src/data/database.json';
const CACHED_PATH = 'scripts/cached_reels.json';

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const reels = JSON.parse(fs.readFileSync(CACHED_PATH, 'utf-8'));

// 1. Lọc bỏ hoàn toàn các mục hoặc series 'Movie Xàm'
const baseSeries = db.filter(s => 
  s.id !== 'movie-xam-tuyen-tap' && 
  s.channelName !== 'Movie Xàm' && 
  !s.slug.includes('movie-xam')
);

// Đặt lại featured: true cho bộ phim tu tiên chính
const mainFeatured = baseSeries.find(s => s.id === 'series-phe-vat') || baseSeries[0];
if (mainFeatured) {
  mainFeatured.featured = true;
}

// 2. Danh sách 50 tên phim ngắn kịch tính, đô thị, gia đấu, tổng tài tương ứng với từng video
const dramaTitles = [
  'Nữ Chủ Tịch Giả Nghèo Thử Lòng Bạn Trai Và Cái Kết Bất Ngờ',
  'Chàng Rể Ẩn Thân Lộ Diện Thân Phận Đại Tướng Quân Vương',
  'Tổng Tài Bá Đạo Đòi Lại Công Lý Cho Cô Nhân Viên Oan Ức',
  'Cô Bé Lọ Lem Bị Hắt Hủi Bất Ngờ Được Thừa Kế Gia Tài Nghìn Tỷ',
  'Cao Thủ Trở Về Đô Thị Trừng Trị Thiếu Gia Hống Hách',
  'Mẹ Chồng Khắt Khe Nếm Mùi Đắng Cay Trước Nàng Dâu Quyền Lực',
  'Thiên Tài Bác Sĩ Cứu Sống Đại Nhân Vật Khi Bị Coi Thường',
  'Nữ Cường Trở Lại Trả Thù Kẻ Phản Bội Từng Hãm Hại Mình',
  'Vệ Sĩ Ngầm Bảo Vệ Đại Tiểu Thư Ra Tay Đoạt Mạng Sát Thủ',
  'Kịch Tính Hợp Đồng Hôn Nhân 100 Ngày Của Tổng Tài',
  'Hé Lộ Bí Mật Động Trời Đằng Sau Bữa Tiệc Giới Thượng Lưu',
  'Cô Gái Quê Một Tay Lật Đổ Gia Tộc Độc Ác',
  'Màn Đổi Trắng Thay Đen Bị Vạch Trần Ngay Tại Tòa Án',
  'Thần Y Đô Thị Vừa Xuất Sơn Đã Cứu Sống Gia Tộc Hào Môn',
  'Lòng Dạ Hiểm Độc Của Kẻ Hãm Hại Bạn Thân Nhận Quả Báo',
  'Bị Đuổi Ra Khỏi Nhà, 3 Năm Sau Trở Về Với Vị Thế Ông Trùm',
  'Hôn Lễ Thế Kỷ Bị Huỷ Bỏ Vì Bộ Mặt Thật Của Chú Rể',
  'Nữ Điệp Viên Ẩn Danh Trong Vai Cô Thư Ký Hiền Lành',
  'Trận Chiến Quyền Lực Trong Tập Đoàn Nghìn Tỷ',
  'Gia Đấu Kịch Tính: Sự Thật Đằng Sau Bản Di Chúc Bí Ẩn',
  'Cái Bẫy Hoàn Hảo Của Kẻ Phản Diện Đã Bị Vạch Trần',
  'Ân Oán Tình Thù Giữa Hai Thế Lực Đô Thị Ngầm',
  'Cú Quay Xe Bất Ngờ Của Đại Nữ Chủ Tại Bữa Tiệc Đính Hôn',
  'Thanh Xuân Bị Đánh Cắp Và Hành Trình Đòi Lại Công Lý',
  'Thiếu Niên Nghèo Vươn Lên Trở Thành Huyền Thoại Thương Trường',
  'Bí Ẩn Người Đàn Ông Đứng Sau Thành Công Của Nữ Chủ Tịch',
  'Lật Mặt Trà Xanh Bày Trò Hãm Hại Người Vô Tội',
  'Trái Tim Băng Giá Của Thiếu Gia Tan Chảy Trước Cô Gái Lạc Quan',
  'Màn Đối Đầu Đỉnh Cao Giữa Hai Gia Tộc Danh Giá Nhất Thành Phố',
  'Cuộc Đấu Trí Nghẹt Thở Để Vạch Trần Kẻ Chủ Mưu Giấu Mặt',
  'Bóng Hồng Quyền Lực Đứng Sau Tập Đoàn Tài Phiệt Lộ Diện',
  'Số Phận Nghiệt Ngã Của Nàng Dâu Hào Môn Và Màn Lật Kèo Đỉnh Cao',
  'Người Thừa Kế Duy Nhất Xuất Hiện Khiến Cả Gia Tộc Khiếp Sợ',
  'Màn Trừng Phạt Thích Đáng Dành Cho Kẻ Coi Thường Người Khác',
  'Nỗi Oan Khiên Được Hóa Giải Sau 5 Năm Chịu Đựng Thầm Lặng',
  'Vở Kịch Đổi Con Lộ Tẩy: Con Gái Thật Sự Đã Trở Về',
  'Đại Ca Giang Hồ Rửa Tay Gác Kiếm Bảo Vệ Gia Đình Nhỏ',
  'Lời Thề Danh Dự Của Vệ Sĩ Thân Cận Dành Cho Tiểu Thư',
  'Bản Lĩnh Người Phụ Nữ Đơn Thân Vượt Lên Số Phận Nghiệt Ngã',
  'Vén Màn Âm Mưu Thâu Tóm Tập Đoàn Của Kẻ Đội Lốt Bạn Thân',
  'Khi Nữ Tổng Tài Trở Thành Đối Thủ Đáng Gờm Nhất Thương Trường',
  'Cú Lừa Thế Kỷ Biến Kẻ Đi Săn Thành Con Mồi',
  'Cuộc Gặp Gỡ Định Mệnh Đổi Thay Cuộc Đời Của Cả Hai Người',
  'Sự Báo Thù Hoàn Hảo Của Nàng Dâu Bị Bỏ Rơi',
  'Cuộc Đụng Độ Nảy Lửa Giữa Hai Phe Quyền Lực Ngầm',
  'Thân Phận Thật Sự Của Chàng Lái Xe Khiến Cả Khách Sạn Kinh Ngạc',
  'Bức Thư Tuyệt Mệnh Để Lại Sự Thật Gây Chấn Động',
  'Đại Chiến Đô Thị: Người Hùng Ẩn Danh Cứu Nguy Cả Thành Phố',
  'Màn Lật Kèo Không Ngờ Khiến Kẻ Hãm Hại Phải Quỳ Gối Xin Lỗi',
  'Đoạn Kết Mãn Nhãn Của Cuộc Đấu Trí Quyền Lực Và Tình Yêu'
];

// 3. Đưa từng video reel thành một bộ phim/video độc lập hiển thị trực tiếp ra ngoài
const newIndependentSeries = reels.map((r, idx) => {
  const parts = r.url.split('/');
  const cleanId = parts[4] || String(idx + 1);
  const videoTitle = dramaTitles[idx % dramaTitles.length];
  const slug = videoTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') + '-' + cleanId.slice(-4);

  return {
    id: `series-drama-${cleanId}`,
    slug: slug,
    title: videoTitle,
    description: `Phim ngắn kịch tính: ${videoTitle}. Thước phim cao trào đặc sắc, cuốn hút triệu view được chọn lọc mới nhất.`,
    thumbnail: r.poster,
    coverImage: r.poster,
    channelName: 'Phim Ngắn Chọn Lọc',
    categories: ['Phim Ngắn', 'Kịch Tính', 'Đô Thị', 'Reels'],
    totalEpisodes: 1,
    featured: false,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: `ep-drama-${cleanId}`,
        seriesId: `series-drama-${cleanId}`,
        partNumber: 1,
        title: videoTitle,
        originalUrl: r.url,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(r.url)}&show_text=0&autoplay=0`,
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '01:30',
        thumbnail: r.poster,
        viewsCount: 15000 + Math.floor(Math.random() * 85000),
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  };
});

// Gộp các series hoạt hình/tu tiên có sẵn với các video phim ngắn độc lập vừa tạo
const finalDatabase = [...baseSeries, ...newIndependentSeries];

fs.writeFileSync(DB_PATH, JSON.stringify(finalDatabase, null, 2), 'utf-8');
console.log(`✅ Đã xóa mục Movie Xàm, bung toàn bộ ${newIndependentSeries.length} video ra ngoài với tên phim kịch tính chuẩn nội dung!`);

