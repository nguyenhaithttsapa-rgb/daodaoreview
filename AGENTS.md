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

## 2. Quy Tắc Sống Còn Về Ảnh Đại Diện Gốc Của Video (Thumbnail)
- **BẮT BUỘC DÙNG ẢNH GỐC CỦA VIDEO:** Mỗi video bắt buộc phải hiển thị ảnh bìa thật trích xuất từ chính video Reels Facebook đó. Tải qua User-Agent `facebookexternalhit/1.1` và lưu vĩnh viễn tại `public/thumbnails/{cleanId}.jpg`.
- **CẤM DÙNG ẢNH NGOẠI LUỒNG / UNSPLASH LUNG TUNG:** Tuyệt đối không được gán ảnh stock Unsplash hay ảnh ngẫu nhiên không liên quan vào phim. Nếu không tải được ảnh gốc từ video, tuyệt đối KHÔNG ĐƯỢC nạp video đó vào CSDL.
- **CẤM DÙNG TRỰC TIẾP LINK `fbcdn.net`:** Link CDN Facebook luôn có chữ ký hết hạn `oe=...` (chết sau 24-48 giờ) và bị chặn ngoại trang (403 Forbidden).
- **Cơ Chế Phục Hồi Ảnh Nội Bộ:** Mọi thẻ `<img>` hiển thị poster/thumbnail trên web phải bọc bằng `getSafeThumbnail()`. Nếu ảnh gốc gặp sự cố, ảnh dự phòng duy nhất được phép dùng là avatar thương hiệu chính thức `/avatar.jpg`. Tuyệt đối không để lộ biểu tượng ảnh vỡ (broken image icon) trên giao diện.

## 3. Quy Tắc Cơ Sở Dữ Liệu & Bộ Cào Dữ Liệu (Crawler)
- **Kiểm Tra Bản Quyền Nhúng Nghiêm Ngặt (Embed Gatekeeper):** Trước khi nạp bất kỳ video nào, bắt buộc gọi `checkEmbeddable(url)`. Nếu HTML trả về chứa bất kỳ dấu hiệu cấm nhúng: `_3i0p`, `_3i0o`, `_2go0`, `không nhúng được`, `Không khả dụng`, `thuộc sở hữu của người khác`, `cannot be embedded`, `không thể phát`, `Video không hiển thị`, `Video Unavailable` -> Lập tức BỎ QUA video đó. Tuyệt đối không để video lỗi lọt vào website.
- **Thứ Tự Sắp Xếp (Newest First):** Video mới thêm/duyệt phải luôn được `unshift` lên đầu mảng trong `src/data/database.json`. Mục Reels trên trang chủ phải hiển thị các video đăng mới nhất lên đầu danh sách.
- **Làm Sạch Caption:** Tự động loại bỏ hashtag spam, số điện thoại, link Shopee/Lazada affiliate, icon rác trước khi lưu tiêu đề và mô tả phim.
- **CẤM CÀO TỪ MARSX FILES / KHU TRÚ ẨN 2AM:** Nghiêm cấm cào video từ fanpage `Khu Trú Ẩn 2AM` (ID: `61590438917651`) hoặc bất kỳ nguồn nào đăng clip ngắn AI 20 giây đóng dấu `Marsx Files`. Website chỉ đăng tải phim ngắn drama, phim hoạt hình 3D review tóm tắt có diễn biến câu chuyện và lời thoại hoàn chỉnh, tuyệt đối không nhận clip demo cảnh AI ngắn vô nghĩa.
- **TIÊU CHUẨN THỜI LƯỢNG TỐI THIỂU: PHIM PHẢI TỪ 30 PHÚT TRỞ LÊN (>= 1800 GIÂY):**
  - Tuyệt đối LOẠI BỎ và NGHIÊM CẤM tất cả các video/clip ngắn chỉ vài phút (các clip Reels 1-3 phút).
  - Mọi phim và video nạp vào CSDL bắt buộc phải có thời lượng tối thiểu từ 30 phút trở lên (`duration >= 1800s`), ưu tiên hàng đầu các phim full trọn bộ 45 phút, 1h, 2h, 3h, 5h, 10h review tóm tắt cốt truyện hoàn chỉnh.
  - Bộ cào dữ liệu (Crawler) chuyển mục tiêu quét sang tab `/videos/` (Video dài) của các Fanpage, trích xuất thời lượng thật (`HH:MM:SS` hoặc `MM:SS`) và tính ra giây. Nếu thời lượng dưới 30 phút (< 30:00) -> LOẠI BỎ LẬP TỨC, không nạp vào website.
- **TUYỆT ĐỐI CẤM VIDEO CA NHẠC / MV / OST / KARAOKE / CLIP LỒNG NHẠC VU VƠ:** Hệ thống chỉ đăng tải phim dài full, phim hoạt hình 3D Donghua review tóm tắt có cốt truyện và lời thoại / thuyết minh hoàn chỉnh. ƯU TIÊN HÀNG ĐẦU các video phim full trọn bộ (Full tập, Full 5h, 8h, 9h, 10h, Trọn bộ). Nghiêm cấm cào các clip ngắn 1-3 phút chỉ ghép nhạc nền, MV ca khúc OST vietsub/karaoke (như OST phim, nhạc hoa vietsub), hoặc clip status tâm trạng vu vơ không có cốt truyện phim. Bất kỳ nguồn nào đăng clip ca nhạc/karaoke/status tình cảm phải bị loại bỏ vĩnh viễn khỏi danh sách kênh mục tiêu.

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
