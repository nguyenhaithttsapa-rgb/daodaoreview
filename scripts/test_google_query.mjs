import { chromium } from 'playwright';
import fs from 'fs';

const TARGET_URL = 'https://www.facebook.com/profile.php?id=61590438917651&sk=reels_tab';
const DB_PATH = 'src/data/database.json';

// Danh sách tên phim truyện AI Anime 3D / Hoạt hình / Huyền Huyễn / Ngôn Tình Cổ Trang theo phong cách của kênh "Khu Trú Ẩn 2AM"
const animeTitles = [
  {
    title: 'Mối Tình Học Đường Của Nữ Thần Thanh Xuân',
    category: 'Thanh Xuân',
    genre: 'Thanh Xuân, Học Đường, Ngôn Tình',
    desc: 'Hồi ức thanh xuân ngọt ngào nhưng đầy trắc trở của cô gái nhỏ nơi sân trường đầy kỷ niệm.'
  },
  {
    title: 'Nước Mắt Mỹ Nhân: Nỗi Đau Giấu Kín Sau Nụ Cười',
    category: 'Ngôn Tình',
    genre: 'Tình Cảm, Tâm Lý, Đô Thị',
    desc: 'Nỗi lòng của người con gái khi người thân yêu nhất quay lưng phản bội.'
  },
  {
    title: 'Cổ Trang Huyền Ảo: Nàng Y Nữ Tuyệt Sắc Chữa Lành Vết Thương Thiên Hạ',
    category: 'Cổ Trang',
    genre: 'Cổ Trang, Huyền Huyễn, Tu Tiên',
    desc: 'Hành trình hành y cứu người của nữ thần y bí ẩn giữa thời loạn lạc tranh đoạt giang hồ.'
  },
  {
    title: 'Tình Yêu Sau Bức Rèm Nhung: Bí Mật Chốn Hào Môn',
    category: 'Đô Thị',
    genre: 'Đô Thị, Ngôn Tình, Kịch Tính',
    desc: 'Khoảnh khắc ngọt ngào lẫn toan tính sau cánh cửa gia tộc tài phiệt quyền lực.'
  },
  {
    title: 'Chiến Thần Hắc Giáp: Ma Quân Tái Sinh Trấn Áp Tam Giới',
    category: 'Tu Tiên',
    genre: 'Tu Tiên, Huyền Huyễn, Nhiệt Huyết',
    desc: 'Thiếu niên khoác lên mình chiến giáp tử thần, một kiếm phá vỡ gông xiềng phong ấn ngàn năm.'
  },
  {
    title: 'Bé Con Đáng Yêu: Siêu Quậy Xuyên Không Gây Bão Gia Đình',
    category: 'Hài Hước',
    genre: 'Hoạt Hình 3D, Hài Hước, Gia Đình',
    desc: 'Những pha xử lý dở khóc dở cười của cô bé dễ thương khiến người lớn phải chào thua.'
  },
  {
    title: 'Nhan Sắc Khuynh Thành: Nữ Sát Thủ Bí Ẩn Dưới Ánh Đèn Đô Thị',
    category: 'Đô Thị',
    genre: 'Đô Thị, Kịch Tính, Hành Động',
    desc: 'Đằng sau vẻ đẹp kiêu sa là thân phận sát thủ ngầm chưa từng thất bại một nhiệm vụ nào.'
  },
  {
    title: 'Nữ Tổng Tài Quyền Lực: Một Tay Thao Túng Thị Trường Tài Chính',
    category: 'Đô Thị',
    genre: 'Đô Thị, Ngôn Tình, Thương Trường',
    desc: 'Bản lĩnh sắc lạnh của người phụ nữ đứng trên đỉnh cao quyền lực giới kinh doanh.'
  },
  {
    title: 'Ánh Mắt U Uất: Đoạn Tuyệt Duyên Nợ Kiếp Này',
    category: 'Ngôn Tình',
    genre: 'Tình Cảm, Bi Kịch, Đô Thị',
    desc: 'Khi tình cảm chân thành bị chà đạp, sự rời đi thanh thản là lời đáp trả đắt giá nhất.'
  },
  {
    title: 'Công Chúa Tiên Giới: Giáng Trần Tìm Lại Phong Ấn Ký Ức',
    category: 'Cổ Trang',
    genre: 'Cổ Trang, Tiên Hiệp, Huyền Huyễn',
    desc: 'Nàng tiên kiều diễm bước chân xuống nhân gian để giải mã bí mật thân thế kiếp trước.'
  },
  {
    title: 'Nỗi Buồn Sau Khung Cửa Sổ: Kỷ Niệm Không Thể Xóa Nhòa',
    category: 'Tâm Lý',
    genre: 'Ngôn Tình, Tâm Lý, Đời Sống',
    desc: 'Thước phim lắng đọng về những hoài niệm tình đầu không thành của cô gái trẻ.'
  },
  {
    title: 'Lãng Tử Hút Thuốc: Người Đàn Ông Mang Quá Khứ Bí Mật',
    category: 'Kịch Tính',
    genre: 'Kịch Tính, Đô Thị, Hành Động',
    desc: 'Ánh mắt lạnh lùng và khói thuốc trầm ngâm của người đàn ông từng trải qua vô số trận chiến sinh tử.'
  }
];

async function scrapeKhuTruAn() {
  console.log('🚀 Đang mở trình duyệt để cào video từ "Khu Trú Ẩn 2AM"...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);
    await page.keyboard.press('Escape');

    // Cuộn trang để tải tất cả video Reels
    console.log('📜 Cuộn trang lấy danh sách video...');
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(1500);
    }

    const reels = await page.evaluate(() => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));

      for (const a of links) {
        const match = a.href.match(/reel\/(\d+)/);
        if (!match) continue;
        const reelId = match[1];
        const reelUrl = `https://www.facebook.com/reel/${reelId}/`;

        const img = a.querySelector('img') || a.parentElement?.querySelector('img');
        const poster = img ? img.src : '';

        let text = a.innerText || a.getAttribute('aria-label') || '';
        if (!text && a.parentElement) {
          text = a.parentElement.innerText || '';
        }

        if (!results.some(r => r.url === reelUrl)) {
          results.push({
            id: reelId,
            url: reelUrl,
            poster,
            rawCaption: text.replace(/\n+/g, ' ').trim()
          });
        }
      }
      return results;
    });

    console.log(`✅ Tìm thấy ${reels.length} video Reels trên kênh Khu Trú Ẩn 2AM!`);

    // Đọc cơ sở dữ liệu hiện tại
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    let addedCount = 0;

    reels.forEach((r, idx) => {
      const cleanId = r.id;
      // Kiểm tra xem video này đã có trên web chưa
      const exists = db.some(s => s.episodes?.some(ep => ep.originalUrl === r.url || ep.originalUrl.includes(cleanId)));
      if (exists) return;

      const template = animeTitles[idx % animeTitles.length];
      const videoTitle = `${template.title} #${idx + 1}`;
      const slug = template.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + cleanId.slice(-4);

      const newFilm = {
        id: `series-2am-${cleanId}`,
        slug,
        title: videoTitle,
        description: template.desc,
        thumbnail: r.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        coverImage: r.poster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        channelName: 'Khu Trú Ẩn 2AM',
        categories: [template.category, 'Hoạt Hình 3D', 'Reels', template.genre.split(', ')[0]],
        totalEpisodes: 1,
        featured: false,
        updatedAt: new Date().toISOString().split('T')[0],
        episodes: [
          {
            id: `ep-2am-${cleanId}`,
            seriesId: `series-2am-${cleanId}`,
            partNumber: 1,
            title: videoTitle,
            originalUrl: r.url,
            embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(r.url)}&show_text=0&autoplay=0`,
            platform: 'facebook',
            aspectRatio: '9:16',
            duration: '01:30',
            thumbnail: r.poster,
            viewsCount: 12000 + Math.floor(Math.random() * 88000),
            publishedAt: new Date().toISOString().split('T')[0]
          }
        ]
      };

      // Thêm ngay ra danh sách video ngoài trang chính
      db.unshift(newFilm);
      addedCount++;
    });

    // Cập nhật bộ phim đầu tiên làm bộ phim mới cập nhật nhất
    if (db.length > 0) {
      db.forEach(s => s.featured = false);
      db[0].featured = true;
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`🎉 BÁO CÁO: Đã cào và cập nhật thành công ${addedCount} video mới từ "Khu Trú Ẩn 2AM" lên website!`);

  } catch (err) {
    console.error('❌ Lỗi khi cào:', err);
  } finally {
    await browser.close();
  }
}

scrapeKhuTruAn();


