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
- **TIÊU CHUẨN THẨM ĐỊNH ẢNH BÌA: LOẠI BỎ HÌNH MÉO MÓ, MỜ, VỠ NÉT (IMAGE QUALITY GATEKEEPER):**
  - Mọi video nạp mới bắt buộc phải trải qua khâu kiểm duyệt kỹ thuật đối với ảnh bìa gốc (Thumbnail Quality Gatekeeper) trước khi đưa vào CSDL:
    * **Dung lượng tối thiểu:** File ảnh tải về bắt buộc $\ge 15$ KB (15.360 bytes). Loại bỏ thẳng tay các ảnh $< 15$ KB (ảnh bị nén quá mức, vỡ hạt pixel, thumbnail mờ nhạt hoặc placeholder rác).
    * **Độ phân giải tối thiểu:** Chiều rộng $\ge 400$px và chiều cao $\ge 250$px (hoặc $\ge 250 \times 400$px đối với ảnh dọc), tổng diện tích pixel $\ge 120.000$px. Tuyệt đối loại bỏ các video có ảnh mờ, độ phân giải thấp, không rõ chi tiết nhân vật.
    * **Khóa tỷ lệ chuẩn - Triệt tiêu hình méo mó:** Tỷ lệ khung hình $R = \text{width} / \text{height}$ bắt buộc phải nằm trong giới hạn chuẩn $0.50 \le R \le 2.10$ (tương thích $16:9 \approx 1.78$, $9:16 \approx 0.56$, $4:3 \approx 1.33$, $1:1 = 1.0$). Nếu $R < 0.50$ hoặc $R > 2.10$ (hình ảnh bị bóp méo, co giãn dị dạng) $\rightarrow$ LOẠI BỎ VIDEO NGAY LẬP TỨC.
    * **Quy tắc bảo tồn:** Quy chuẩn này áp dụng cho toàn bộ các lượt cào video mới kể từ thời điểm ban hành; toàn bộ các video đã cào trước đó được bảo lưu giữ nguyên trạng trong CSDL.

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
- **QUY CHUẨN XOAY VÒNG KÊNH KHÔNG TRÙNG LẶP (ZERO OVERLAP ROUND-ROBIN):**
  - Bot cào hoạt động định kỳ theo chu kỳ xoay vòng 5 phút/lần, mỗi lần quét đúng 5 kênh.
  - **5 trang cào trong đợt hiện tại TUYỆT ĐỐI KHÔNG ĐƯỢC TRÙNG với bất kỳ trang nào đã cào ở đợt liền trước đó (`Set(current) ∩ Set(previous) = ∅`).**
  - Danh sách nguồn được phân chia thành các lô độc lập (Lô 1, Lô 2, Lô 3...), mỗi lô gồm 5 kênh riêng biệt. Quét tuần tự theo từng lô, hoàn thành tất cả các lô mới xoay vòng lại từ đầu.
  - Lưu trạng thái và kiểm tra chéo qua `crawler_cursor.json` để bảo đảm 0% trùng lặp giữa 2 đợt quét liên tiếp.
  - Mọi rules khác (thời lượng >= 30 phút, cấm ca nhạc/OST, kiểm tra quyền nhúng `checkEmbeddable`, tải poster gốc) vẫn giữ nguyên hiệu lực nghiêm ngặt 100%.
- **QUY CHUẨN CÀO MỞ RỘNG VÔ HẠN LÔ KẾ TIẾP (LÔ n+1 = 6, 7, 8... ĐẾN VÔ HẠN):**
  - Hệ thống TUYỆT ĐỐI KHÔNG XOAY VÒNG LẶP LẠI các Lô kênh cũ.
  - Mỗi lượt cào kế tiếp, số thứ tự Lô BẮT BUỘC TĂNG THÊM 1 ($n \leftarrow n+1$). Hiện tại có 5 Lô đã cào (Lô 1 đến Lô 5), lượt tiếp theo sẽ cào Lô $n+1=6$, lượt kế tiếp là $n+1=7$, lượt sau nữa là $n+1=8$... cứ liên tục mở rộng đến vô hạn các kênh.
  - Toàn bộ 5 kênh trong Lô $(n+1)$ TUYỆT ĐỐI KHÔNG ĐƯỢC TRÙNG với bất kỳ kênh nào của tất cả các Lô trước đó (từ Lô 1 đến Lô $n$):
    $$\text{Lô}_{n+1} \cap \left( \bigcup_{i=1}^n \text{Lô}_i \right) = \emptyset$$
  - Toàn bộ danh sách tất cả các Lô và 5 kênh của từng Lô bắt buộc phải được tự động lưu trữ, đồng bộ và cập nhật thường xuyên vào file Word (`Danh_Sach_Kenh_Da_Cao.docx`) trong thư mục gốc của dự án để quản trị minh bạch.
  - Mọi rules khác (thời lượng >= 30 phút, cấm ca nhạc/OST, kiểm tra quyền nhúng `checkEmbeddable`, tải poster gốc) vẫn giữ nguyên hiệu lực nghiêm ngặt 100%.
- **QUY CHUẨN CÀO CẠN KÊNH LẦN ĐẦU (EXHAUSTIVE DEEP CRAWL) & CÀO NHẸ LỚP TRÊN (INCREMENTAL TOP-LAYER CRAWL):**
  - **Lần đầu cào kênh mới:** Sử dụng cơ chế cuộn chuột thật (Native Mouse Wheel `page.mouse.wheel`) kết hợp tự động triệt tiêu `[role="dialog"]` và mở khóa thanh cuộn. Cuộn liên tục đến khi kênh cạn kiệt toàn bộ video trong kho lưu trữ (không còn video cũ hơn xuất hiện sau 3-4 nhịp cuộn liên tiếp), tối đa hóa số video cào được trong 1 lần quét duy nhất.
  - **Lưu lịch sử video đã cào:** Toàn bộ ID video đã cào trên từng kênh được lưu bền vững vào `src/data/channel_crawl_history.json`.
  - **Các lần quét sau (Quét nhẹ lớp trên):** Khi quét lại một kênh đã cào cạn trước đó, bot chỉ cuộn nhẹ 1-3 nhịp ở lớp trên cùng. Ngay khi phát hiện gặp một ID video đã có trong lịch sử hoặc CSDL, bot **LẬP TỨC DỪNG CUỘN**, chỉ xử lý các video mới đăng phía trên, giúp tiết kiệm 90% tài nguyên CPU/RAM và tăng tốc độ quét vượt trội.
- **QUY CHUẨN BÁO CÁO ĐỊNH KỲ 5 PHÚT BẮT BUỘC KÈM KẾT QUẢ CÀO VIDEO:**
  - Trong mỗi lần kiểm tra và báo cáo định kỳ 5 phút/lần theo thời gian thực, agent BẮT BUỘC phải báo cáo rõ ràng, chi tiết toàn bộ kết quả cào video của phiên quét gần nhất:
    * Tên Lô vừa quét và danh sách 5 kênh mục tiêu.
    * Số video tìm thấy trên từng kênh.
    * Số phim dài >= 30 phút nạp mới thành công (kèm tiêu đề, thời lượng thực tế, link xem trên web).
    * Số video ngắn < 30 phút đã bị loại bỏ.
    * Số video bị chặn nhúng Facebook hoặc video dính nhạc/OST đã bị lọc bỏ.
    * Tổng số phim dài chuẩn hiện có trong CSDL website.
    * Số thứ tự Lô kế tiếp ($n+1$) chuẩn bị quét.
  - Tuyệt đối không báo cáo chung chung thiếu số liệu; mọi thông số phải được trích xuất chính xác từ log thực tế của bot cào.
- **KHO KINH NGHIỆM & QUY TẮC CÀO TỐI ƯU CỰC HẠN (PLAYWRIGHT ADVANCED CRAWLING RULES):**
  - **Chặn Tải Tài Nguyên Thừa (Request Interception):** Bắt buộc sử dụng `page.route` để chặn `['image', 'media', 'font']`. Tuyệt đối không để trình duyệt tải các hình ảnh và media rác của Facebook khi đang cuộn tìm link, giảm 85% tải RAM/băng thông và tăng tốc độ duyệt từ 15s xuống 3-4s. Ảnh bìa phim chỉ được tải 1 lần duy nhất qua `fetch` độc lập khi phim đã thỏa mãn tất cả tiêu chuẩn kiểm duyệt.
  - **Sử Dụng Cuộn Chuột Thật (Native Mouse Wheel):** Luôn dùng `page.mouse.move(640, 450)` và `page.mouse.wheel(0, 3200)` để kích hoạt cơ chế render ảo (Virtual DOM) và gọi GraphQL của Facebook. Tránh dựa dẫm vào `window.scrollBy` vốn thường bị Facebook vô hiệu hóa.
  - **Triệt Tiêu Modal & Mở Khóa Thanh Cuộn Tự Động:** Tự động xóa `[role="dialog"]`, `[aria-modal="true"]` và đặt lại `overflow: auto` cho `document.documentElement` và `document.body` ở mỗi nhịp cuộn, tránh tình trạng bị treo cuộn do popup Facebook.
  - **Tìm Kiếm Watch Dự Phòng Thông Minh (Watch Search Fallback):** Nếu một Fanpage bị lỗi, đổi link hoặc trả về 0 video, bot tự động kích hoạt tìm kiếm dự phòng trên Facebook Watch Search (`/watch/search/?q={tên kênh} full trọn bộ`) để thu thập trọn bộ các video dài chuẩn thay vì bỏ lỡ.
  - **Lọc Sớm Đa Tầng (Early Discard):** Lọc thời lượng `< 30 phút` và từ khóa nhạc/OST ngay từ bước trích xuất DOM, ngăn chặn lãng phí tài nguyên mạng vào các video không đạt chuẩn trước khi gọi kiểm tra nhúng.

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

## 6. Rules Cào Reels Facebook (Quy Chuẩn Toàn Diện Đúc Kết Từ Kênh Mễ Lạc Review)
Tất cả các bot và agent khi thực hiện cào video từ Facebook Reels / Watch BẮT BUỘC tuân thủ chi tiết tại `.agents/rules/rules_cao_reels_facebook.md` với các nguyên tắc cốt lõi:
1. **Kiến Trúc Kênh & Vét Sâu Watch Search (Multi-Angle Watch Query Expansion):**
   - Không dừng lại ở kho trực tiếp của Page (`/sk=videos`). Khi kho trực tiếp chạm đáy (sau 6 nhịp cuộn không ra video mới), Meta đã phân tán các video dài còn lại vào Facebook Watch.
   - Bắt buộc triển khai quét mở rộng đa góc truy vấn theo công thức: `"{Tên Kênh} {Tên Series} Mùa {i}"`, `"{Tên Kênh} {Tên Series} Phần {i}"`, `"{Tên Kênh} {Tên Series} trọn bộ"`, `"{Tên Kênh} {Tên Series} full tập"`.
   - **Kỹ thuật Lấp Đầy Khoảng Trống (Gaps Filling):** Lập ma trận các mùa đã có, tự động nhận diện các mùa còn thiếu và phát động truy vấn chính xác để vét sạch toàn bộ các mùa thất lạc.
2. **Quy Tắc Thẩm Định Nhúng Chuẩn Xác 100% (Accurate Embed Gatekeeper):**
   - **Tuyệt đối KHÔNG lọc chuỗi `_3i0p`, `_3i0o` hoặc `Không khả dụng`** vì chúng nằm trong từ điển i18n của Facebook trên MỌI video hợp lệ (gây loại bỏ nhầm 90% video xem được).
   - Chỉ từ chối khi HTML plugin nhúng (`https://www.facebook.com/plugins/video.php?href=...`) thực sự chứa chuỗi:
     `Video này không nhúng được do có thể chứa` hoặc `This video cannot be embedded because it may contain content`.
   - Yêu cầu độ dài mã nguồn iframe `html.length >= 30000` (đảm bảo tải đủ player).
3. **Tối Ưu Trình Duyệt Cực Hạn (Playwright Interception & Native Events):**
   - Chặn toàn bộ `['image', 'media', 'font']` qua `page.route` khi cuộn trang, giảm 85% RAM và tăng tốc độ 5x-10x. Ảnh bìa chỉ tải 1 lần duy nhất bằng `fetch` khi video đã đạt chuẩn.
   - Luôn dùng sự kiện chuột thật `page.mouse.move(640, 450)` và `page.mouse.wheel(0, 3600-4000)`.
   - Tự động xóa `[role="dialog"]`, `[aria-modal="true"]` và mở khóa `overflow: auto` ở mọi nhịp cuộn để vượt modal ép đăng nhập.
4. **Tiêu Chuẩn Thời Lượng & Lọc Sạch Nội Dung:**
   - Thời lượng tối thiểu $\ge 30$ phút (`duration >= 1800s`), loại bỏ 100% video ngắn.
   - Triệt tiêu 100% video ca nhạc, OST, MV vietsub, karaoke.
   - Triệt tiêu 100% video rác không phải phim (như talkshow Cafe Sáng, Dealshaker, video nuôi dạy con, livestream cá nhân...).
   - **Ưu tiên bản siêu dài (Marathon Priority):** Ưu tiên các bản trọn bộ gộp nhiều mùa (8h, 11h, 15h) để đem lại trải nghiệm xem liên tục tốt nhất.
5. **Lưu Bền Vững Poster Gốc & Chuẩn Hóa Tiêu Đề:**
   - Trích xuất `og:image` bằng UA `facebookexternalhit/1.1`, lưu file vào `public/thumbnails/{cleanId}.jpg` (kích thước $\ge 50$ KB).
   - Làm sạch tiêu đề: Bỏ nhãn tuổi `[16+]`, `[13+]`, bỏ hashtag, link affiliate, số điện thoại, cắt gọn đoạn mô tả dính vào tiêu đề, thêm hậu tố `(Full Trọn Bộ)`.
6. **Đồng Bộ Dữ Liệu & Tự Động Triển Khai:**
   - Cập nhật `database.json`, `channel_crawl_history.json`, `all_channel_batches.json` và file Word `Danh_Sach_Kenh_Da_Cao.docx`.
   - Kiểm thử `npm run build` đạt 0 lỗi TypeScript trước khi commit.
   - Git push nhánh `main` để kích hoạt `scripts/vps_auto_updater.mjs` trên VPS tự động cập nhật sản phẩm lên [https://daodaoreview.com](https://daodaoreview.com).

