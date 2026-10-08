<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Quy Tắc Dự Án: DaoDaoReview.com (Web Phim Nhúng Facebook Reels & 3D Anime)

Tất cả các agent khi thao tác trên codebase này BẮT BUỘC tuân thủ nghiêm ngặt các quy tắc sau:

## 1. Quy Tắc Nhúng Video Facebook Reels & YouTube
- **Chuẩn hóa URL Iframe:** Luôn định dạng iframe Facebook là `https://www.facebook.com/plugins/video.php?href={encodeURIComponent(url)}&show_text=0&autoplay=0`.
- **Khóa Tỷ Lệ Khung Hình:** Video Reels dọc luôn khóa tỷ lệ `9:16` (`aspect-[9/16]`). Video ngang truyền thống khóa tỷ lệ `16:9` (`aspect-video`).
- **Tối Ưu Mobile Fullscreen:** Phải bảo tồn cơ chế tự động xoay ngang toàn màn hình (Landscape) trên điện thoại di động khi người dùng bấm xem toàn màn hình.
- **Lọc Sạch Tham Số YouTube:** Luôn giữ `rel=0&iv_load_policy=3&modestbranding=1` để triệt tiêu gợi ý video rác.

## 2. Quy Tắc Sống Còn Về Ảnh Đại Diện (Thumbnail)
- **CẤM DÙNG TRỰC TIẾP LINK `fbcdn.net`:** Link CDN Facebook luôn có chữ ký hết hạn `oe=...` (chết sau 24-48 giờ) và bị chặn ngoại trang (403 Forbidden).
- **Lưu Ảnh Thật Cục Bộ:** Ảnh của video Facebook Reels phải được tải qua User-Agent `facebookexternalhit/1.1` và lưu vĩnh viễn tại `public/thumbnails/{cleanId}.jpg`.
- **Bắt Buộc Có Cơ Chế Tự Phục Hồi (`onError`):** Mọi thẻ `<img>` hiển thị poster/thumbnail trên web phải bọc bằng `getSafeThumbnail()` và gắn `onError` tự động chuyển sang poster Cyberpunk dự phòng. Tuyệt đối không để lộ biểu tượng ảnh vỡ (broken image icon) trên giao diện.

## 3. Quy Tắc Cơ Sở Dữ Liệu & Bộ Cào Dữ Liệu (Crawler)
- **Thứ Tự Sắp Xếp (Newest First):** Video mới thêm/duyệt phải luôn được `unshift` lên đầu mảng trong `src/data/database.json`. Mục Reels trên trang chủ phải hiển thị các video đăng mới nhất lên đầu danh sách.
- **Kiểm Tra Bản Quyền Nhúng Trước:** Khi cào hoặc duyệt video, luôn gọi hàm `isReelEmbeddable(url)`. Bỏ qua video nếu chủ kênh bật chế độ riêng tư hoặc cấm nhúng ngoài trang.
- **Làm Sạch Caption:** Tự động loại bỏ hashtag spam, số điện thoại, icon rác trước khi lưu tiêu đề phim.

## 4. Quy Chuẩn SEO & Thương Hiệu
- **Thẻ SEO Cốt Lõi:** Phải luôn duy trì thẻ `<link rel="canonical" href="https://daodaoreview.com/">` và `<meta name="robots" content="index, follow, max-image-preview:large">` trong `layout.tsx`.
- **Thẻ H1 Chuẩn:** Luôn giữ `<h1 class="sr-only">Đao Đao Review Anime 3D - Tóm Tắt & Phân Tích Hoạt Hình Tiên Hiệp Trung Quốc</h1>` tại `src/app/page.tsx` phục vụ bot tìm kiếm Google/Bing.
- **Bộ Nhận Diện:** Giữ nguyên logo thương hiệu rồng neon tại `/avatar.jpg` và ảnh chia sẻ mạng xã hội tại `/og-image.jpg`.
- **Trải Nghiệm Sạch:** Giữ vững cam kết giao diện Cyberpunk sang trọng, không chèn các loại quảng cáo rác làm gián đoạn người xem.

## 5. Quy Chuẩn Đóng Gói & Triển Khai Máy Chủ (VPS)
- **Kiểm Thử Cục Bộ:** Trước khi commit/push, luôn chạy `cmd.exe /c "npm run build"` để đảm bảo 0 lỗi TypeScript.
- **Lệnh Triển Khai OneDash Chuẩn:** Khi hướng dẫn người dùng cập nhật VPS, luôn cung cấp lệnh 1-dòng chuẩn có `cd` và `git reset --hard` để tránh xung đột file `database.json`:
  ```bash
  cd /var/www/daodaoreview && git reset --hard && git pull && npm run build && pm2 restart all
  ```
