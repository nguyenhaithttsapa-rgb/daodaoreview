---
name: facebook-reels-engine
description: >-
  Chuyên gia xử lý, cào dữ liệu, tối ưu hóa nhúng video Facebook Reels và quản trị hệ thống DaoDaoReview.com.
  Kích hoạt kỹ năng này khi làm việc với video Reels Facebook, xử lý ảnh thumbnail, lỗi nhúng iframe,
  tối ưu xoay màn hình điện thoại (Landscape), kiểm tra quyền phát video, hoặc đồng bộ mã nguồn lên máy chủ VPS.
---

# Kỹ Năng Quản Trị & Vận Hành Web Phim Nhúng Reels Facebook (DaoDaoReview)

Kỹ năng này đúc kết toàn bộ quy trình chuẩn xác nhất để phát triển, bảo trì và mở rộng website xem phim tóm tắt nhúng video Reels từ Facebook và YouTube.

---

## 1. Nguyên Tắc Cốt Lõi Về Nhúng Video Facebook Reels

### Định Dạng Link Nhúng Chuẩn (Iframe Embed)
Mọi video Reels Facebook khi nhúng vào website phải sử dụng định dạng URL sau để đảm bảo không bị lỗi giao diện và bảo mật:
```text
https://www.facebook.com/plugins/video.php?href={encodeURIComponent(reelUrl)}&show_text=0&autoplay=0
```
* `show_text=0`: Ẩn toàn bộ văn bản và caption dài dòng của bài viết gốc, chỉ giữ lại trình phát video sạch sẽ.
* `autoplay=0`: Không tự ý bật âm thanh bất ngờ làm phiền người dùng.

### Phân Loại Tỷ Lệ Khung Hình (Aspect Ratio)
* **Reels / Shorts (Video Dọc):** Khóa cứng tỷ lệ `9:16` (dùng class Tailwind `aspect-[9/16]`).
* **Phim Ngang (Video Truyền Thống):** Khóa cứng tỷ lệ `16:9` (dùng class Tailwind `aspect-video`).

### Cơ Chế Tự Động Xoay Màn Hình Ngang Trên Điện Thoại (Mobile Landscape)
* Video dọc 9:16 khi xem trên điện thoại cần tính năng 1-chạm xoay ngang toàn màn hình (sử dụng API `screen.orientation.lock('landscape')` với fallback CSS transform xoay 90 độ khi trình duyệt di động hạn chế API).

---

## 2. Quy Trình Xử Lý Ảnh Đại Diện Gốc Của Video (Thumbnail) Chuẩn Tuyệt Đối

> [!CAUTION]
> **1. BẮT BUỘC DÙNG ẢNH GỐC CỦA VIDEO - CẤM GÁN ẢNH STOCK/UNSPLASH LUNG TUNG!**
> Người xem cần thấy chính xác hình ảnh trích xuất từ nội dung video. Tuyệt đối không được gán ảnh stock Unsplash hay ảnh ngoại luồng không liên quan. Nếu không tải được ảnh gốc từ video, tuyệt đối không được nạp video đó vào CSDL!
>
> **2. TUYỆT ĐỐI KHÔNG DÙNG TRỰC TIẾP LINK `fbcdn.net`!**
> Link ảnh CDN của Facebook (`*.fbcdn.net`) luôn có tham số hết hạn `oe=...` (tự động chết sau 24-48 giờ) và Facebook chặn truy cập ngoại trang (lỗi 403 Forbidden).

### Quy Trình Tải & Lưu Ảnh Thật Của Video:
1. Khi cào hoặc duyệt video từ link Facebook Reel:
   * Gửi request HTTP với User-Agent: `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`.
   * Trích xuất thẻ meta `<meta property="og:image" content="...">`.
   * Tải file ảnh thực tế về và lưu vĩnh viễn tại `public/thumbnails/{cleanId}.jpg`.
2. Lưu đường dẫn trong `database.json`:
   * `thumbnail`: `/thumbnails/{cleanId}.jpg`
   * `coverImage`: `/thumbnails/{cleanId}.jpg`
3. Luôn bảo vệ thẻ `<img>` ở giao diện bằng helper an toàn `getSafeThumbnail()`. Nếu gặp sự cố, ảnh dự phòng duy nhất là logo thương hiệu `/avatar.jpg`.
4. API On-Demand Cứu Cánh: Route `/api/thumbnail/[id]` tự động bắt và tải ảnh gốc lưu vào `public/thumbnails/` nếu chưa có sẵn trên đĩa.

---

## 3. Quy Trình Kiểm Tra Quyền Nhúng Nghiêm Ngặt (Embed Gatekeeper)

> [!IMPORTANT]
> Nhiều video Reels Facebook bị chủ kênh tắt quyền nhúng ngoài trang hoặc bị giới hạn bản quyền âm nhạc/nội dung.
> Facebook sẽ hiển thị lỗi: *"Không khả dụng - Video này không nhúng được do có thể chứa nội dung thuộc sở hữu của người khác."*

### Thuật Toán Kiểm Tra Nhúng Chuẩn Xác 100%:
Khi kiểm tra link nhúng `https://www.facebook.com/plugins/video.php?href=...`:
Bắt buộc quét HTML trả về để phát hiện các dấu hiệu lỗi cấm nhúng:
```javascript
const isBlocked =
  html.includes('_3i0p') ||
  html.includes('_3i0o') ||
  html.includes('_2go0') ||
  html.includes('không nhúng được') ||
  html.includes('Không khả dụng') ||
  html.includes('không thể phát') ||
  html.includes('cannot be embedded') ||
  html.includes('cannot be played') ||
  html.includes('error_subcode') ||
  html.includes('thuộc sở hữu của người khác') ||
  html.includes('Video không hiển thị') ||
  html.includes('Video Unavailable') ||
  html.includes('không tồn tại nữa hoặc bạn không có quyền xem');
```
* **Nếu `isBlocked === true`:** LẬP TỨC LOẠI BỎ VIDEO, KHÔNG NẠP VÀO CSDL.
* **CẤM CÀO NGUỒN MARSX FILES / KHU TRÚ ẨN 2AM:** Tuyệt đối không cào từ fanpage `Khu Trú Ẩn 2AM` (ID: `61590438917651`) hoặc bất kỳ nguồn clip demo cảnh AI ngắn 20 giây đóng dấu `Marsx Files`. Chỉ nhận phim review, phim ngắn có kịch bản, lời thoại rõ ràng.

---

## 4. Quy Chuẩn SEO & Nhận Diện Thương Hiệu

1. **Các Thẻ SEO Bắt Buộc Tại `layout.tsx`:**
   * Canonical: `<link rel="canonical" href="https://daodaoreview.com/">`
   * Meta Robots: `<meta name="robots" content="index, follow, max-image-preview:large">`
   * Bing Webmaster: `<meta name="msvalidate.01" content="5D1A03A3348433D435E89B34514DE8F0">`
   * OpenGraph Share Banner: `/og-image.jpg` (kích thước chuẩn 1200x630).
   * Logo & Favicon: `/avatar.jpg` và `/icon.png`.
2. **Thẻ H1 Ẩn Chuẩn SEO Tại `page.tsx`:**
   ```html
   <h1 class="sr-only">Đao Đao Review Anime 3D - Tóm Tắt & Phân Tích Hoạt Hình Tiên Hiệp Trung Quốc</h1>
   ```

---

## 5. Quy Trình Kiểm Thử & Triển Khai Lên VPS (OneDash)

### Bước 1: Kiểm thử cục bộ trước khi push
Luôn chạy lệnh build kiểm tra lỗi biên dịch TypeScript:
```powershell
cmd.exe /c "npm run build"
```

### Bước 2: Lệnh triển khai 1-dòng chuẩn trên VPS
```bash
cd /var/www/daodaoreview && git reset --hard && git pull && npm run build && pm2 restart all
```
