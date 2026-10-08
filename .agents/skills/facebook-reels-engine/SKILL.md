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

## 2. Quy Trình Xử Lý Ảnh Đại Diện (Thumbnail) Vĩnh Viễn Không Bị Lỗi

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG DÙNG TRỰC TIẾP LINK `fbcdn.net`!**
> Link ảnh CDN của Facebook (`*.fbcdn.net`) luôn có tham số hết hạn `oe=...` (tự động chết sau 24-48 giờ) và Facebook chặn truy cập ngoại trang (lỗi 403 Forbidden).

### Quy Trình Tải & Lưu Ảnh Thật Của Video:
1. Khi cào hoặc duyệt video từ link Facebook Reel:
   * Gửi request HTTP với User-Agent: `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`.
   * Trích xuất thẻ meta `<meta property="og:image" content="...">`.
   * Tải file ảnh thực tế về và lưu cục bộ tại `public/thumbnails/{cleanId}.jpg`.
2. Lưu đường dẫn trong `database.json`:
   * `thumbnail`: `/thumbnails/{cleanId}.jpg`
   * `coverImage`: `/thumbnails/{cleanId}.jpg`
3. Luôn bảo vệ thẻ `<img>` ở giao diện bằng helper an toàn:
   ```tsx
   <img
     src={getSafeThumbnail(ep.thumbnail, ep.id || ep.title)}
     alt={ep.title}
     loading="lazy"
     onError={(e) => {
       const target = e.currentTarget;
       target.onerror = null;
       target.src = getFallbackPoster(ep.id || ep.title);
     }}
   />
   ```
4. API On-Demand Cứu Cánh: Route `/api/thumbnail/[id]` tự động bắt và tải ảnh gốc lưu vào `public/thumbnails/` nếu chưa có sẵn.

---

## 3. Quy Trình Cào & Duyệt Video Tự Động (Crawler Runbook)

1. **Kiểm Tra Quyền Nhúng Trước Khi Lưu (`isReelEmbeddable`):**
   * Nhiều video Reels bị chủ kênh đặt ở chế độ riêng tư hoặc tắt tính năng nhúng ngoài trang.
   * Phải kiểm tra trước qua API `src/lib/videoChecker.ts`. Nếu video không cho nhúng -> Tự động bỏ qua, không đưa vào database.
2. **Làm Sạch Tiêu Đề & Phân Loại Thông Minh:**
   * Dùng `cleanCaption` để loại bỏ hashtag (`#xuhuong`, `#reviewphim`), số điện thoại, link rác, icon phản cảm.
   * Tự động gán thể loại theo từ khóa: Tu Tiên, Đô Thị, Huyền Huyễn, Trọng Sinh, Cổ Trang, Kịch Tính.
3. **Thứ Tự Sắp Xếp (Newest First):**
   * Luôn dùng `db.unshift(newFilm)` để video mới nhất nằm ở đầu danh sách.
   * Trang chủ sắp xếp mục Reels theo thời gian cập nhật mới nhất, không chỉ dựa vào lượt xem.

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
Đảm bảo 100% không có lỗi type trước khi commit git.

### Bước 2: Commit & Push lên GitHub
```bash
git add .
git commit -m "feat/fix: mô tả ngắn gọn thay đổi"
git push origin main
```

### Bước 3: Cập nhật lên VPS máy chủ (iNET OneDash)
Do file `database.json` trên VPS có thể được ghi thêm số lượt xem thực tế khi có người truy cập, lệnh `git pull` thông thường sẽ báo lỗi conflict. **Luôn sử dụng lệnh chuẩn 1-dòng sau trên OneDash Terminal:**

```bash
cd /var/www/daodaoreview && git reset --hard && git pull && npm run build && pm2 restart all
```
Lệnh trên đảm bảo:
* Chuyển đúng vào thư mục dự án `/var/www/daodaoreview`.
* Reset sạch xung đột database tạm.
* Kéo mã nguồn mới nhất từ GitHub.
* Build Next.js tối ưu và khởi động lại PM2 tức thì.
