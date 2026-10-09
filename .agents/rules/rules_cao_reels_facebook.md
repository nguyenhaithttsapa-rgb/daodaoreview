# RULES CÀO REELS FACEBOOK
## (Bộ Quy Chuẩn & Quy Trình Thực Chiến Khai Thác Kênh Video Facebook Hoàn Chỉnh - Đúc Kết Từ Kênh Mễ Lạc Review)

Tài liệu này ghi lại toàn bộ quy trình, phương pháp kỹ thuật, kinh nghiệm thực chiến và các nguyên tắc cốt tử được đúc kết từ chiến dịch cào quét cạn kiệt thành công kênh **Mễ Lạc Review** (`ID: 61588732377311`), mang lại hơn **93 phim dài chuẩn** (từ 1h đến gần 16h) và đưa hệ thống DaoDaoReview.com cán mốc **300 phim dài chuẩn 100%**.

Mọi bot, crawler và agent khi thực hiện cào video từ Facebook BẮT BUỘC tuân thủ nghiêm ngặt bộ rules này.

---

### PHẦN 1: ĐẶC THÙ HỆ THỐNG VIDEO & REELS FACEBOOK (META ARCHITECTURE)

1. **Cấu trúc URL Kênh Facebook Hiện Đại (New Page Experience):**
   - URL kho video chính: `https://www.facebook.com/profile.php?id={channelId}&sk=videos` hoặc `https://www.facebook.com/watch/{channelId}/`.
   - Facebook áp dụng Virtual DOM và cơ chế phân trang động qua GraphQL cursor. Trình duyệt chỉ nạp tối đa 25-30 video đầu tiên trong kho lưu trữ trực tiếp.
   - Khi cuộn liên tục đến đáy (6 nhịp cuộn không ra thêm video), kho trực tiếp đã hết, nhưng **Meta phân tán các video dài khác vào mạng lưới Facebook Watch Search**.

2. **Chiến Lược Tìm Kiếm Mở Rộng Đa Tầng (Multi-Angle Watch Query Expansion):**
   - Không được dừng lại ở kho lưu trữ trực tiếp của Fanpage. Bắt buộc triển khai quét mở rộng đa góc truy vấn theo công thức:
     * `"{Tên Kênh} {Tên Series} Mùa {i}"` (quét từng mùa cụ thể).
     * `"{Tên Kênh} {Tên Series} Phần {i}"` (quét từng phần).
     * `"{Tên Kênh} {Tên Series} trọn bộ"` hoặc `"{Tên Kênh} {Tên Series} full tập"`.
     * `"{Tên Kênh} hoạt hình 3D"`, `"{Tên Kênh} tu tiên trọn bộ"`.
   - **Kỹ thuật Lấp Đầy Khoảng Trống (Gaps Filling):**
     * Sau mỗi đợt nạp, lập ma trận danh sách các mùa đã có (ví dụ: đã có Mùa 4, 6, 7, 8, 10...).
     * Tự động nhận diện các mùa còn thiếu trong chuỗi (Mùa 1, 2, 3, 5, 9, 11, 12, 13...).
     * Phát động các truy vấn chính xác vào từng mùa còn thiếu để vét sạch toàn bộ các mùa thất lạc.

---

### PHẦN 2: BỘ LỌC BẢN QUYỀN NHÚNG CHUẨN XÁC TUYỆT ĐỐI (ACCURATE EMBED GATEKEEPER)

1. **Lỗi Kinh Điển Gây Mất Dữ Liệu Cần Tránh:**
   - Tuyệt đối **KHÔNG ĐƯỢC** kiểm tra chuỗi `_3i0p`, `_3i0o`, hoặc từ khóa generic `Không khả dụng`.
   - Các chuỗi trên nằm trong từ điển i18n toàn cầu trong thẻ `<script>` của Facebook trên **MỌI video hợp lệ**, nếu lọc theo chuỗi này sẽ từ chối nhầm 90% video xem được.

2. **Quy Tắc Thẩm Định Nhúng Chuẩn Xác 100%:**
   - Gửi request đến iframe plugin:
     `https://www.facebook.com/plugins/video.php?href={encodeURIComponent(videoUrl)}&show_text=0&autoplay=0` với User-Agent máy tính chuẩn.
   - Video thực sự bị Meta khóa nhúng bản quyền chỉ khi mã HTML chứa đúng chuỗi cảnh báo sở hữu trí tuệ:
     ```javascript
     const isBlocked = html.includes('Video này không nhúng được do có thể chứa') || 
                       html.includes('This video cannot be embedded because it may contain content');
     if (isBlocked) {
       // BỎ QUA NGAY - Video bị khóa quyền phát ngoài trang Facebook
     }
     ```
   - Đồng thời yêu cầu độ dài phản hồi `html.length >= 30000` (đảm bảo iframe tải đủ DOM controls và trình phát video).

---

### PHẦN 3: TỐI ƯU HÓA TRÌNH DUYỆT & CUỘN CHUỘT (PLAYWRIGHT OPTIMIZATION)

1. **Chặn Toàn Bộ Tài Nguyên Thừa (Request Interception):**
   - Bắt buộc cấu hình `page.route` chặn:
     ```javascript
     await context.route('**/*', (route) => {
       const rt = route.request().resourceType();
       if (['image', 'media', 'font'].includes(rt)) return route.abort();
       return route.continue();
     });
     ```
   - Giúp giảm 85% tiêu thụ RAM/CPU, tăng tốc độ cuộn trang từ 15 giây xuống 2-3 giây.
   - Ảnh bìa phim chỉ được tải 1 lần duy nhất bằng `fetch` độc lập khi phim đã vượt qua mọi tiêu chuẩn kiểm duyệt.

2. **Triệt Tiêu Modal & Mở Khóa Thanh Cuộn Tự Động:**
   - Tại mỗi nhịp cuộn, tự động xóa popup ép đăng nhập và cưỡng chế mở khóa cuộn:
     ```javascript
     await page.evaluate(() => {
       document.querySelectorAll('[role="dialog"], [aria-modal="true"]').forEach(el => el.remove());
       document.documentElement.style.overflow = 'auto';
       document.body.style.overflow = 'auto';
     });
     ```

3. **Sử Dụng Native Mouse Wheel:**
   - Tránh dựa vào `window.scrollBy` vì Facebook thường vô hiệu hóa sự kiện cuộn Javascript của cửa sổ.
   - Luôn sử dụng chuột thật:
     ```javascript
     await page.mouse.move(640, 450);
     await page.mouse.wheel(0, 3600);
     await page.waitForTimeout(1400);
     ```

---

### PHẦN 4: TIÊU CHUẨN NỘI DUNG, THỜI LƯỢNG & LÀM SẠCH DỮ LIỆU

1. **Tiêu Chuẩn Thời Lượng Tối Thiểu: $\ge 30$ Phút (1800 Giây):**
   - Loại bỏ 100% video ngắn, clip cắt vụn 1-3 phút.
   - Bóc tách thời lượng thật từ DOM (`HH:MM:SS` hoặc `MM:SS`) và tính ra giây:
     ```javascript
     function parseDurationSeconds(durStr) {
       if (!durStr) return 0;
       const parts = durStr.trim().split(':').map(Number);
       if (parts.some(isNaN)) return 0;
       if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
       if (parts.length === 2) return parts[0] * 60 + parts[1];
       return 0;
     }
     ```
   - Bất kỳ video nào có `durationSec < 1800` -> LOẠI BỎ LẬP TỨC.

2. **Triệt Tiêu Tuyệt Đối Video Ca Nhạc & Nội Dung Rác Ngoại Luồng:**
   - **Ca nhạc / OST:** Bỏ qua video có từ khóa `nhạc hoa`, `karaoke`, `mv vietsub`, `ost`, `nhạc nền vietsub`.
   - **Nội dung đời sống / bán hàng / phi hoạt hình:** Tự động loại bỏ các video không thuộc thể loại phim (như talkshow truyền hình "Cafe Sáng", chương trình đầu tư "Dealshaker", video nuôi con "Mẹ ấm bụng con no sữa", video livestream cá nhân...).

3. **Xử Lý Trùng Lặp & Ưu Tiên Bản Siêu Dài (Long Marathon Priority):**
   - Nếu một mùa được đăng tải dưới nhiều ID video khác nhau, bot chỉ giữ 1 bản có thời lượng và chất lượng tốt nhất.
   - **Ưu tiên hàng đầu các bản trọn bộ nhiều mùa liền mạch:** Ví dụ bản *Phần 1 Đến Phần 5 (15h48m)*, *Mùa 8 Đến Mùa 13 (11h50m)*, *Mùa 3+4 (11h11m)*, *Mùa 1-3 (8h08m)*... Những bản này tạo trải nghiệm xem phim liên tục tốt nhất cho người dùng.

4. **Lưu Trữ Bền Vững & Thẩm Định Chất Lượng Ảnh Bìa (Image Quality Gatekeeper):**
   - Cấm dùng trực tiếp link `fbcdn.net` trên web vì dính chữ ký hết hạn `oe=...` và bị chặn ngoại trang.
   - Lấy `og:image` bằng User-Agent `facebookexternalhit/1.1`, tải buffer và kiểm duyệt kỹ thuật nghiêm ngặt trước khi lưu vào `public/thumbnails/{cleanId}.jpg`:
     * **Loại bỏ hình ảnh méo mó (Distortion Check):** Tỷ lệ khung hình $R = \text{width} / \text{height}$ bắt buộc phải nằm trong giới hạn chuẩn $0.50 \le R \le 2.10$ (tương thích $16:9$, $9:16$, $4:3$, $1:1$). Tuyệt đối loại bỏ các video có ảnh bìa bị bóp méo, co dãn dị dạng ($R < 0.50$ hoặc $R > 2.10$).
     * **Loại bỏ hình ảnh mờ, vỡ nét (Resolution & File Size Check):** Chiều rộng $\ge 400$px và chiều cao $\ge 250$px (hoặc $\ge 250 \times 400$px với ảnh dọc), tổng diện tích $\ge 120.000$ pixel, dung lượng file bắt buộc $\ge 15$ KB. Loại bỏ thẳng tay các ảnh mờ nhạt, vỡ hạt pixel, icon nhỏ hoặc placeholder rác.
     * **Xử lý nghiêm ngặt:** Nếu ảnh bìa gốc không đạt đủ 3 tiêu chuẩn trên $\rightarrow$ **LOẠI BỎ VIDEO ĐÓ NGAY LẬP TỨC**, tuyệt đối không nạp vào CSDL.
     * **Quy tắc bảo tồn:** Áp dụng cho toàn bộ các lượt cào video mới; các video đã cào trước đây được giữ nguyên vẹn trong CSDL.

5. **Chuẩn Hóa Tiêu Đề Phim (Title Sanitization):**
   - Bỏ toàn bộ hashtag `#...`, link Shopee/Lazada, số điện thoại, icon emoji.
   - Bỏ các nhãn tuổi tác rườm rà: `[16+]`, `[13+]`, `[Nội dung giải trí...]`.
   - Cắt bỏ đoạn mô tả tóm tắt thừa thãi bị dính vào tiêu đề, đưa về dạng ngắn gọn:
     `Mùa {x} | {Tên Phim}: {Phụ Đề Ngắn} (Full Trọn Bộ {Thời Lượng})`

---

### PHẦN 5: ĐỒNG BỘ DỮ LIỆU & QUY TRÌNH TRIỂN KHAI MÁY CHỦ (DEPLOYMENT PIPELINE)

1. **Lưu Trạng Thái Bền Vững:**
   - Cập nhật danh sách ID video của kênh vào `src/data/channel_crawl_history.json`.
   - Unshift các phim mới vào đầu mảng `src/data/database.json`.
   - Bổ sung kênh vào `src/data/all_channel_batches.json` và chạy script `scripts/export_channel_list_docx.py` để cập nhật file quản trị Word [Danh_Sach_Kenh_Da_Cao.docx](file:///g:/web%20bao%20dien%20tu/Danh_Sach_Kenh_Da_Cao.docx).

2. **Quy Trình Kiểm Thử & Tự Động Triển Khai (CI/CD):**
   - Bắt buộc chạy kiểm thử cục bộ:
     ```bash
     cmd.exe /c "npm run build"
     ```
     Đảm bảo đạt **0 lỗi TypeScript, 0 lỗi cú pháp**.
   - Commit và push lên GitHub nhánh `main`:
     ```bash
     git add . && git commit -m "feat(crawler): ..." && git push origin main
     ```
   - **Tự động cập nhật VPS:** Máy chủ VPS vận hành `scripts/vps_auto_updater.mjs` dưới PM2 sẽ tự động nhận diện commit mới trong vòng 60 giây, thực hiện `git reset --hard origin/main`, đóng gói lại ứng dụng và tải lại PM2 mà không cần can thiệp thủ công.
   - Xác thực sau triển khai: Kiểm tra URL trang chủ, trang xem phim và đường truyền ảnh bìa `HTTP 200 OK` trên [https://daodaoreview.com](https://daodaoreview.com).
