---
name: facebook-reels-engine
description: >-
  Chuyên gia tối thượng về cào video phim dài Facebook, lọc sạch clip ngắn và nhạc OST, vận hành thuật toán mở rộng vô hạn Lô kênh (n+1) Zero-Overlap, đồng bộ file Word quản trị, và tự động hóa toàn diện hệ thống DaoDaoReview.com.
---

# Kỹ Năng Đỉnh Cao Cào Video Phim Dài Facebook & Quản Trị Hệ Thống (DaoDaoReview Engine)

Kỹ năng này đúc kết toàn bộ kiến thức chuyên sâu và quy trình chuẩn mực nhất để xây dựng, vận hành bộ bot cào ngầm tự động, lọc phim dài full chất lượng cao, đồng bộ file Word và triển khai tự động lên website xem phim [DaoDaoReview.com](https://daodaoreview.com).

---

## 1. Tiêu Chuẩn Phim Dài Cốt Lõi: Thời Lượng Tối Thiểu 30 Phút (>= 1800s)

> [!IMPORTANT]
> **TIÊU CHUẨN THỜI LƯỢNG NGHIÊM NGẶT:**
> Website chỉ đăng tải phim dài full, phim hoạt hình 3D Donghua và phim ngắn kịch tính có cốt truyện hoàn chỉnh (từ 30 phút, 45 phút, 1h, 2h, 5h đến 17 tiếng).
> **Tuyệt đối LOẠI BỎ và NGHIÊM CẤM tất cả các clip ngắn 1-3 phút (Reels ngắn cắt vụn).**

### Thuật Toán Đo Thời Lượng Thật Chính Xác 100% Bằng DASH Manifest:
Facebook nhúng thông tin ISO 8601 về thời lượng video vào manifest DASH trong mã nguồn iframe:
```javascript
// Trích xuất mediaPresentationDuration="PT...S" từ Facebook Embed HTML:
const dashMatch = html.match(/mediaPresentationDuration="PT([0-9.]+)S"/);
if (dashMatch) {
  const totalSeconds = Math.round(parseFloat(dashMatch[1]));
  // Ví dụ: PT63291.957031S => 17 giờ 34 phút (17.58 tiếng)
  // Nếu totalSeconds < 1800 => LẬP TỨC LOẠI BỎ!
}
```
* **Quy tắc bỏ qua:** Bất kỳ video nào có thời lượng $< 1800$ giây hoặc không chứng thực được $\ge 30$ phút (`finalSec < 1800`) phải bị **loại bỏ thẳng tay**, không nạp vào CSDL.
* **Cấm Tuyệt Đối Video Ca Nhạc / OST / MV / Karaoke:** Bất kỳ video nào chứa từ khóa âm nhạc, nhạc hoa vietsub, OST phim, hoặc clip tâm trạng không có lời thoại cốt truyện phải bị lọc bỏ 100%.

---

## 2. Quy Chuẩn Cào Mở Rộng Vô Hạn Lô Kế Tiếp ($n \to n+1 \to \infty$)

> [!CAUTION]
> **TUYỆT ĐỐI KHÔNG XOAY VÒNG LẶP LẠI LÔ CŨ:**
> Mỗi phiên quét mới, hệ thống tự động tăng số thứ tự Lô thêm 1: $n \leftarrow n+1$ (Lô 6, Lô 7, Lô 8, Lô 9... đến vô hạn).
> Không bao giờ cào lại các Lô cũ để liên tục mở rộng kho nội dung mới.

### Công Thức Toán Học Không Trùng Lặp Tuyệt Đối (Zero Overlap):
$$\text{Lô}_{n+1} \cap \left( \bigcup_{i=1}^n \text{Lô}_i \right) = \emptyset$$

* **Cơ chế vận hành:**
  1. Quản lý danh sách các Lô độc lập trong `src/data/all_channel_batches.json`.
  2. Mỗi Lô gồm đúng **5 kênh hoàn toàn mới**, chưa từng xuất hiện ở bất kỳ Lô nào trước đó.
  3. Lưu vết toàn bộ lịch sử các kênh đã quét vào `allPreviousScannedChannels` trong `src/data/crawler_cursor.json`.
  4. Nếu số thứ tự Lô vượt quá số Lô có sẵn, hàm `generateNextInfiniteBatch(nextBatchNumber, existingChannelsSet)` tự động sinh Lô mới với 5 kênh mới tinh, đảm bảo không bao giờ cạn nguồn.

---

## 2.1. Cơ Chế Cào Cạn Kênh (Deep Exhaustive Crawl) & Quét Nhẹ Lớp Trên (Incremental Top-Layer)

Nhằm tối ưu hóa hiệu năng và cào tối đa số lượng video trên từng kênh:
1. **Lần đầu cào một kênh mới (Cào cạn toàn diện):**
   - Áp dụng cử chỉ cuộn chuột thực tế (Native Mouse Wheel: `page.mouse.move(640, 450)` & `page.mouse.wheel(0, 3200)`) kết hợp tự động bẻ khóa và gỡ bỏ các modal đăng nhập / overlay cản trở (`aria-modal="true"`, `div[role="dialog"]`).
   - Bot thực hiện cuộn sâu liên tục (tối đa 16-20 lượt) cho tới khi kênh cạn kiệt toàn bộ video trong kho lưu trữ (khi số lượng video không tăng sau 3 lượt cuộn liên tiếp).
   - Tối đa hóa số lượng video cào được trong 1 lần duy nhất, vét sạch toàn bộ lịch sử video dài của kênh.
2. **Lưu trữ lịch sử cào của từng kênh:**
   - Mọi ID video đã phát hiện được lưu bền vững vào `src/data/channel_crawl_history.json`.
3. **Các lần quét sau (Quét nhẹ lớp trên):**
   - Khi quét lại bất kỳ kênh nào đã từng cào cạn, bot chuyển sang chế độ **Lớp trên nhẹ nhàng (Incremental Top-Layer)**.
   - Bot chỉ cuộn nhẹ 1-3 nhịp ở phần đầu trang. Ngay khi phát hiện video trùng với ID đã lưu trong lịch sử, bot **LẬP TỨC DỪNG CUỘN**.
   - Chỉ xử lý các video mới đăng nằm ở lớp trên cùng, tiết kiệm 90% tài nguyên CPU/RAM và giảm thời gian quét kênh xuống chỉ còn 5-10 giây!

---

## 2.2. Kho Kinh Nghiệm Thực Chiến & Nguyên Tắc Tối Ưu Cực Hạn (Playwright Advanced Rules)

Từ các phân tích chuyên sâu của Claude & GPT cùng kiểm thử thực tế trên hệ thống:
1. **Chặn Tải Tài Nguyên Nặng (Request Interception):**
   - Cài đặt `page.route('**/*', (route) => ...)` chặn hoàn toàn `image`, `media`, `font`.
   - Giúp Facebook load trong 3-4 giây thay vì 15-20 giây, giảm 85% tiêu hao RAM và CPU. Ảnh poster gốc chỉ được tải 1 lần duy nhất bằng `fetch` khi video đã qua mọi bước kiểm duyệt.
2. **Kích Hoạt Cuộn Chuột Thực (Native Mouse Wheel):**
   - Facebook sử dụng danh sách ảo hóa (Virtual List) chỉ phản hồi với cử chỉ chuột hệ thống. Áp dụng `page.mouse.move(640, 450)` và `page.mouse.wheel(0, 3200)` để kích hoạt nạp GraphQL liên tục mà không bị nghẽn.
3. **Triệt Tiêu Modal & Khôi Phục Thanh Cuộn Tự Động:**
   - Liên tục dọn dẹp các modal đăng nhập (`div[role="dialog"]`, `[aria-modal="true"]`) và gỡ bỏ thuộc tính khóa cuộn `overflow: hidden` trên `document.documentElement` và `document.body` ở mỗi nhịp cuộn.
4. **Tìm Kiếm Dự Phòng Facebook Watch Thông Minh (Watch Search Fallback):**
   - Nếu đường dẫn Fanpage bị lỗi 404, đổi tên hoặc không có video dài, bot tự động kích hoạt tìm kiếm dự phòng: `https://www.facebook.com/watch/search/?q={tên kênh} full trọn bộ` để quét các video dài chuẩn thay vì chịu thất thoát dữ liệu.
5. **Lọc Sớm Đa Tầng (Early Discarding):**
   - Đọc thời lượng từ badge giao diện ngay khi vừa phát hiện; nếu `< 30 phút` lập tức bỏ qua, không lãng phí tài nguyên gọi `checkEmbeddable` hay tải metadata.

---

## 3. Hệ Thống Đồng Bộ & Quản Trị Bằng File Word (.docx)

* **Tự Động Hóa Xuất File Word:** Script Python `scripts/export_channel_list_docx.py` đọc dữ liệu động từ `all_channel_batches.json` và tự động cập nhật vào:
  - `Danh_Sach_Kenh_Da_Cao.docx` (File quản trị chính thức).
  - `New Microsoft Word Document.docx` (File đồng bộ song song).
* **Nội dung hiển thị trong File Word:**
  - Bảng tổng hợp 7 quy chuẩn dự án bắt buộc.
  - Bảng chi tiết từng Lô: STT, Tên kênh, Link URL Fanpage tab `/videos`, Thể loại phim, Trạng thái cào (`ĐÃ CÀO`, `ĐANG CÀO`, `CHỜ CÀO`).
* **Kích hoạt tự động:** Sau mỗi phiên cào hoàn tất, bot tự động chạy lệnh cập nhật file Word để người dùng mở file là thấy dữ liệu mới nhất.

---

## 4. Quy Chuẩn Báo Cáo Định Kỳ 5 Phút Bắt Buộc Kèm Kết Quả Cào Video

Trong mỗi lần kiểm tra và báo cáo định kỳ 5 phút/lần theo thời gian thực, agent **BẮT BUỘC** phải báo cáo rõ ràng, chi tiết toàn bộ số liệu thực tế:
1. **Tên Lô vừa quét:** Số thứ tự Lô và danh sách 5 kênh mục tiêu.
2. **Số video tìm thấy trên từng kênh.**
3. **Số phim dài $\ge$ 30 phút nạp mới thành công:** Kèm tiêu đề phim, thời lượng thực tế (`HH:MM:SS`), và link xem trên website.
4. **Số video ngắn $< 30$ phút bị loại bỏ:** Liệt kê các mốc thời lượng bị chặn đứng.
5. **Số video bị chặn nhúng Facebook hoặc dính nhạc/OST bị lọc bỏ.**
6. **Tổng số phim dài chuẩn hiện có trong CSDL website.**
7. **Số thứ tự Lô kế tiếp ($n+1$) chuẩn bị quét.**

---

## 5. Quy Trình Kiểm Tra Quyền Nhúng (Embed Gatekeeper) & Poster Gốc

### 1. Kiểm Tra Nhúng Tuyệt Đối (Embed Gatekeeper):
Trước khi nạp bất kỳ video nào vào CSDL, gọi `checkEmbeddable(url)`. Nếu HTML trả về chứa các dấu hiệu lỗi cấm nhúng:
```javascript
const isBlocked =
  html.includes('_3i0p') ||
  html.includes('_3i0o') ||
  html.includes('_2go0') ||
  html.includes('không nhúng được') ||
  html.includes('Không khả dụng') ||
  html.includes('không thể phát') ||
  html.includes('cannot be embedded') ||
  html.includes('thuộc sở hữu của người khác') ||
  html.includes('Video không hiển thị') ||
  html.includes('Video Unavailable');
```
$\rightarrow$ **BỎ QUA NGAY LẬP TỨC**, tuyệt đối không để video lỗi lọt vào website.

### 2. Tải & Lưu Ảnh Bìa Gốc Vĩnh Viễn:
* Dùng User-Agent `facebookexternalhit/1.1` cào thẻ meta `og:image`.
* Lưu ảnh trực tiếp về ổ cứng tại `public/thumbnails/{cleanId}.jpg`.
* **CẤM DÙNG LINK `fbcdn.net`:** Link CDN Facebook chết sau 24-48 giờ do tham số `oe=...`.
* **CẤM DÙNG ẢNH STOCK/UNSPLASH LUNG TUNG:** Không tải được ảnh gốc từ video thì KHÔNG NẠP video đó.
* Helper giao diện `getSafeThumbnail()` chỉ fallback về `/avatar.jpg`, tuyệt đối không để lộ biểu tượng ảnh vỡ.

---

## 6. Định Dạng Iframe & Trải Nghiệm Giao Diện Xem Phim

1. **Chuẩn hóa URL Iframe:**
   `https://www.facebook.com/plugins/video.php?href={encodeURIComponent(url)}&show_text=0&autoplay=0`
2. **Khóa Tỷ Lệ Chuẩn:**
   - Phim Dài Full: Luôn dùng tỷ lệ điện ảnh `16:9` (`aspect-video`).
   - Phim Ngắn Dọc: Tỷ lệ `9:16` (`aspect-[9/16]`).
3. **Thông Thoáng Khung Video:**
   - Các nút điều hướng (*Phim trước*, *Phim sau*, *Vuốt đổi phim*) luôn đặt **bên dưới khung phát**, không để đè lên dưới video làm che mất thanh tua thời gian (timeline seekbar) và đồng hồ thời lượng của Facebook.
   - Bỏ hoàn toàn dòng text fallback rác *"Nếu video không hiển thị mở trên Facebook"*.

---

## 7. Quy Trình Tự Động Triển Khai Máy Chủ VPS (Zero-Touch Auto-Deploy)

* **Cơ chế Watcher Tự Động:** Script `scripts/vps_auto_updater.mjs` thường trực trên VPS quét nhánh `origin/main` mỗi 60 giây.
* **Quy trình tự động hóa khép kín:**
  1. Bot ngầm cào phim $\ge$ 30 phút $\rightarrow$ Tải thumbnail $\rightarrow$ Cập nhật database và file Word.
  2. Commit và push lên GitHub `origin/main`.
  3. VPS Watcher phát hiện commit mới $\rightarrow$ Tự động `git reset --hard` $\rightarrow$ Tự động `npm run build` $\rightarrow$ Tự động `pm2 reload`.
  4. Người dùng hoàn toàn không cần gõ hay gửi bất kỳ lệnh nào cho VPS!
