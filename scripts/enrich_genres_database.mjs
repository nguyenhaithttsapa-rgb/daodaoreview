import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DB_PATH = path.join(rootDir, 'src', 'data', 'database.json');
const STATS_PATH = path.join(rootDir, 'src', 'data', 'analytics_stats.json');

const VERTICAL_FALLBACKS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'
];

function getFallback(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return VERTICAL_FALLBACKS[Math.abs(hash) % VERTICAL_FALLBACKS.length];
}

const CATEGORY_DEFINITIONS = [
  {
    name: 'Ngôn Tình - Tổng Tài',
    tags: ['Ngôn Tình - Tổng Tài', 'Lọ Lem', 'Tổng Tài', 'Hào Môn', 'Ngôn Tình'],
    keywords: [
      'tổng tài', 'lọ lem', 'hào môn', 'bảo bối', 'phu nhân', 'tiểu thư',
      'thiếu gia', 'ngôn tình', 'tình yêu', 'mỹ nhân', 'thanh xuân', 'hôn nhân',
      'bạn gái', 'người yêu', 'tổng giám đốc', 'cưới trước yêu sau', 'tình cảm',
      'bảo bối của tổng tài', 'nữ thần thanh xuân', 'ánh mắt u uất'
    ]
  },
  {
    name: 'Báo Thù - Trùng Sinh',
    tags: ['Báo Thù - Trùng Sinh', 'Trùng Sinh', 'Trọng Sinh', 'Báo Thù', 'Nghịch Thiên'],
    keywords: [
      'trùng sinh', 'trọng sinh', 'báo thù', 'trả thù', 'nghịch thiên', 'quay lại',
      'kiếp trước', 'tái sinh', 'sát phạt', 'nghèo thành thủ phú', 'bị hãm hại',
      'sống lại', 'nghịch tập', 'huyết hải', 'báo oán', 'biến chồng nghèo'
    ]
  },
  {
    name: 'Xuyên Không - Cổ Đại',
    tags: ['Xuyên Không - Cổ Đại', 'Xuyên Không', 'Cổ Đại Hóa Thân', 'Cổ Trang'],
    keywords: [
      'xuyên không', 'xuyên sách', 'cổ đại', 'cổ trang', 'hóa thân', 'giáng trần',
      'hoàng phi', 'vương phi', 'y nữ', 'hoàng đế', 'thái tử', 'công chúa tiên giới',
      'nữ hoàng', 'cổ trang huyền ảo', 'nàng y nữ'
    ]
  },
  {
    name: 'Tiên Hiệp - Tiên Sư Xuống Núi',
    tags: ['Tiên Hiệp - Tiên Sư Xuống Núi', 'Tiên Sư Xuống Núi', 'Tiên Hiệp', 'Tu Tiên'],
    keywords: [
      'tiên sư xuống núi', 'tiên sư', 'xuống núi', 'tu tiên', 'tiên hiệp', 'kiếm tiên',
      'chiến thần hắc giáp', 'thần ma', 'vạn cổ', 'ma quân', 'đạo sĩ', 'thần y',
      'thiên đạo', 'luân hồi', 'phong ấn', 'võ thần', 'chiến thần', 'chiến thần ma quân',
      'đấu phá', 'phàm nhân tu tiên', 'nghịch thiên chí tôn'
    ]
  },
  {
    name: 'Mạt Thế - Pháo Đài Di Động',
    tags: ['Mạt Thế - Pháo Đài Di Động', 'Pháo Đài Di Động', 'Khoa Học Viễn Tưởng', 'Mạt Thế', 'Sinh Tồn'],
    keywords: [
      'mạt thế', 'pháo đài di động', 'pháo đài', 'khoa học viễn tưởng', 'khoa huyễn',
      'tận thế', 'sinh tồn', 'hắc giáp', 'vũ trụ', 'căn cứ', 'robot', 'cơ giáp',
      'biến dị', 'thôn phệ tinh không', 'thôn phệ', 'tương lai', 'chiến hạm', 'khí tài'
    ]
  },
  {
    name: 'Cung Đấu - Gia Đấu',
    tags: ['Cung Đấu - Gia Đấu', 'Cung Đấu', 'Gia Đấu', 'Hầu Môn', 'Trạch Đấu'],
    keywords: [
      'cung đấu', 'gia đấu', 'trạch đấu', 'hầu môn', 'gia tộc', 'tranh đoạt',
      'bức rèm nhung', 'thị phi', 'quý phi', 'hoàng hậu', 'đích nữ', 'thứ nữ',
      'hậu cung', 'tranh sủng', 'hào môn', 'bí mật chốn hào môn'
    ]
  }
];

// Danh sách các bộ phim Flagship đỉnh cao cho 6 thể loại theo yêu cầu của User
const FLAGSHIP_SERIES = [
  {
    id: 'series-flagship-tong-tai-01',
    slug: 'tong-tai-ba-dao-va-co-vo-lo-lem-bao-thu-2026',
    title: 'Tổng Tài Bá Đạo & Cô Vợ Lọ Lem Báo Thù',
    description: 'Tuyệt phẩm ngôn tình tổng tài đỉnh cao: Cô gái lọ lem từng bị gia tộc ruồng bỏ, sau khi trùng sinh kết duyên cùng vị Tổng tài quyền lực nhất thành phố, từng bước vạch trần âm mưu và báo thù những kẻ từng hãm hại mình.',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    channelName: 'Đao Đao Tuyển Chọn',
    categories: ['Ngôn Tình - Tổng Tài', 'Báo Thù - Trùng Sinh', 'Hoạt Hình 3D', 'Reels'],
    genres: ['Ngôn Tình - Tổng Tài', 'Lọ Lem', 'Báo Thù', 'Trùng Sinh', 'Hào Môn', 'Hoạt Hình 3D'],
    totalEpisodes: 1,
    featured: true,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: 'ep-flagship-tong-tai-01',
        seriesId: 'series-flagship-tong-tai-01',
        partNumber: 1,
        title: 'Tổng Tài Bá Đạo & Cô Vợ Lọ Lem Báo Thù - Trọn Bộ Thuyết Minh',
        originalUrl: 'https://www.facebook.com/reel/1192061736809109/',
        embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1192061736809109%2F&show_text=0&autoplay=0',
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '02:15',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        viewsCount: 198500,
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  },
  {
    id: 'series-flagship-trung-sinh-02',
    slug: 'trung-sinh-bao-thu-thien-kim-nghich-tap-de-bep-hao-mon-2026',
    title: 'Trùng Sinh Báo Thù: Thiên Kim Nghịch Tập Đè Bẹp Hào Môn',
    description: 'Kiếp trước ngây thơ tin lời kẻ xấu mà nhận lấy cái chết oan khuất. Sau khi trùng sinh sống lại ngày định mệnh, nàng thiên kim chân chính lật ngược thế cờ, trừng trị trà xanh và bắt những kẻ phản bội phải trả giá đắt.',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    channelName: 'Đao Đao Tuyển Chọn',
    categories: ['Báo Thù - Trùng Sinh', 'Ngôn Tình - Tổng Tài', 'Hoạt Hình 3D', 'Reels'],
    genres: ['Báo Thù - Trùng Sinh', 'Trùng Sinh', 'Báo Thù', 'Trọng Sinh', 'Nghịch Thiên', 'Hoạt Hình 3D'],
    totalEpisodes: 1,
    featured: true,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: 'ep-flagship-trung-sinh-02',
        seriesId: 'series-flagship-trung-sinh-02',
        partNumber: 1,
        title: 'Trùng Sinh Báo Thù: Thiên Kim Nghịch Tập Đè Bẹp Hào Môn - Bản Đầy Đủ',
        originalUrl: 'https://www.facebook.com/reel/1429672618526128/',
        embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1429672618526128%2F&show_text=0&autoplay=0',
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '02:30',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        viewsCount: 245000,
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  },
  {
    id: 'series-flagship-xuyen-khong-03',
    slug: 'xuyen-khong-co-dai-tuyet-sac-vuong-phi-hoa-than-tran-quoc-2026',
    title: 'Xuyên Không Cổ Đại: Tuyệt Sắc Vương Phi Hóa Thân Trấn Quốc',
    description: 'Nữ bác sĩ kiêm đặc công hiện đại xuyên không về vương triều cổ đại, hóa thân thành vương phi phế vật bị thất sủng. Bằng y thuật thần sầu và mưu trí hơn người, nàng cứu thái tử, bình định giang sơn và khiến toàn thể triều đình phải kính phục.',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    channelName: 'Đao Đao Tuyển Chọn',
    categories: ['Xuyên Không - Cổ Đại', 'Cung Đấu - Gia Đấu', 'Hoạt Hình 3D', 'Reels'],
    genres: ['Xuyên Không - Cổ Đại', 'Cổ Đại Hóa Thân', 'Xuyên Không', 'Cổ Trang', 'Y Nữ', 'Hoạt Hình 3D'],
    totalEpisodes: 1,
    featured: true,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: 'ep-flagship-xuyen-khong-03',
        seriesId: 'series-flagship-xuyen-khong-03',
        partNumber: 1,
        title: 'Xuyên Không Cổ Đại: Tuyệt Sắc Vương Phi Hóa Thân Trấn Quốc - Full HD',
        originalUrl: 'https://www.facebook.com/reel/1595448631988917/',
        embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1595448631988917%2F&show_text=0&autoplay=0',
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '01:50',
        thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
        viewsCount: 182300,
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  },
  {
    id: 'series-flagship-tien-su-04',
    slug: 'tien-su-xung-nui-tu-tien-van-co-vo-dich-thien-ha-2026',
    title: 'Tiên Sư Xuống Núi: Tu Tiên Vạn Cổ Vô Địch Thiên Hạ',
    description: 'Sau ngàn năm bế quan khổ tu trên đỉnh Côn Lôn, Tiên sư đệ nhất thiên hạ xuống núi giải quyết ân oán hồng trần. Một kiếm định càn khôn, dẹp yên các thế lực ngầm đô thị và bảo vệ người thân yêu.',
    thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    channelName: 'Đao Đao Tuyển Chọn',
    categories: ['Tiên Hiệp - Tiên Sư Xuống Núi', 'Báo Thù - Trùng Sinh', 'Hoạt Hình 3D', 'Reels'],
    genres: ['Tiên Hiệp - Tiên Sư Xuống Núi', 'Tiên Sư Xuống Núi', 'Tu Tiên', 'Tiên Hiệp', 'Chiến Thần', 'Hoạt Hình 3D'],
    totalEpisodes: 1,
    featured: true,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: 'ep-flagship-tien-su-04',
        seriesId: 'series-flagship-tien-su-04',
        partNumber: 1,
        title: 'Tiên Sư Xuống Núi: Tu Tiên Vạn Cổ Vô Địch Thiên Hạ - Thuyết Minh Trọn Bộ',
        originalUrl: 'https://www.facebook.com/reel/1746716223015494/',
        embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1746716223015494%2F&show_text=0&autoplay=0',
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '03:10',
        thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
        viewsCount: 310500,
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  },
  {
    id: 'series-flagship-mat-the-05',
    slug: 'mat-the-phao-dai-di-dong-khoa-hoc-vien-tuong-sinh-ton-2026',
    title: 'Mạt Thế Pháo Đài Di Động: Khoa Học Viễn Tưởng Sinh Tồn',
    description: 'Thế giới rơi vào kỷ băng hà và thảm họa quái vật đột biến. Nam chính thức tỉnh hệ thống cơ giới công nghệ cao, chế tạo và nâng cấp Pháo Đài Di Động bọc thép khổng lồ, dẫn dắt đội quân người sống sót sinh tồn nơi tận thế.',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    channelName: 'Đao Đao Tuyển Chọn',
    categories: ['Mạt Thế - Pháo Đài Di Động', 'Khoa Học Viễn Tưởng', 'Hoạt Hình 3D', 'Reels'],
    genres: ['Mạt Thế - Pháo Đài Di Động', 'Pháo Đài Di Động', 'Khoa Học Viễn Tưởng', 'Mạt Thế', 'Sinh Tồn', 'Hoạt Hình 3D'],
    totalEpisodes: 1,
    featured: true,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: 'ep-flagship-mat-the-05',
        seriesId: 'series-flagship-mat-the-05',
        partNumber: 1,
        title: 'Mạt Thế Pháo Đài Di Động: Nâng Cấp Căn Cứ Siêu Cấp - Trọn Bộ Review',
        originalUrl: 'https://www.facebook.com/reel/1393666508933202/',
        embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1393666508933202%2F&show_text=0&autoplay=0',
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '02:45',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        viewsCount: 289000,
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  },
  {
    id: 'series-flagship-cung-dau-06',
    slug: 'cung-dau-gia-dau-dich-nu-hau-mon-doat-lai-giang-son-2026',
    title: 'Cung Đấu - Gia Đấu: Đích Nữ Hầu Môn Đoạt Lại Giang Sơn',
    description: 'Chốn thâm cung hiểm ác và sự tranh đoạt khốc liệt giữa các gia tộc quyền quý. Đích nữ Hầu phủ từ một cô gái yếu đuối từng bước bày mưu tính kế, dẹp tan bè phái lộng quyền và bước lên đỉnh cao quyền lực hậu cung.',
    thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    coverImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
    channelName: 'Đao Đao Tuyển Chọn',
    categories: ['Cung Đấu - Gia Đấu', 'Xuyên Không - Cổ Đại', 'Hoạt Hình 3D', 'Reels'],
    genres: ['Cung Đấu - Gia Đấu', 'Cung Đấu', 'Gia Đấu', 'Hầu Môn', 'Trạch Đấu', 'Hoạt Hình 3D'],
    totalEpisodes: 1,
    featured: true,
    updatedAt: new Date().toISOString().split('T')[0],
    episodes: [
      {
        id: 'ep-flagship-cung-dau-06',
        seriesId: 'series-flagship-cung-dau-06',
        partNumber: 1,
        title: 'Cung Đấu - Gia Đấu: Đích Nữ Hầu Môn Đoạt Lại Giang Sơn - Full Bản Đẹp',
        originalUrl: 'https://www.facebook.com/reel/1010753372015797/',
        embedUrl: 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F1010753372015797%2F&show_text=0&autoplay=0',
        platform: 'facebook',
        aspectRatio: '9:16',
        duration: '02:20',
        thumbnail: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
        viewsCount: 215400,
        publishedAt: new Date().toISOString().split('T')[0]
      }
    ]
  }
];

function enrichAllSeries() {
  console.log('🚀 Bắt đầu tối ưu hóa và phân loại toàn bộ kho phim theo 6 chủ đề thịnh hành...');

  let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  console.log(`- Tổng số phim ban đầu: ${db.length}`);

  let retaggedCount = 0;
  let fixedThumbCount = 0;

  // 1. Phân loại lại 1321 phim hiện có
  db.forEach((s) => {
    const text = (
      (s.title || '') + ' ' +
      (s.description || '') + ' ' +
      (s.categories || []).join(' ') + ' ' +
      (s.genres || []).join(' ') + ' ' +
      (s.channelName || '')
    ).toLowerCase();

    const matchedCategories = [];
    const matchedGenres = [...(s.genres || [])];

    CATEGORY_DEFINITIONS.forEach((def) => {
      const isMatched = def.keywords.some((kw) => text.includes(kw));
      if (isMatched) {
        matchedCategories.push(def.name);
        def.tags.forEach((tag) => {
          if (!matchedGenres.includes(tag)) matchedGenres.push(tag);
        });
      }
    });

    // Nếu không khớp từ khóa chuyên biệt, giữ thể loại hiện có hoặc phân bổ theo ngữ cảnh
    if (matchedCategories.length === 0) {
      if (text.includes('tu tiên') || text.includes('hoạt hình 3d')) {
        matchedCategories.push('Tiên Hiệp - Tiên Sư Xuống Núi');
      } else if (text.includes('đô thị') || text.includes('tổng tài')) {
        matchedCategories.push('Ngôn Tình - Tổng Tài');
      } else if (text.includes('cổ trang')) {
        matchedCategories.push('Xuyên Không - Cổ Đại');
      } else {
        matchedCategories.push('Báo Thù - Trùng Sinh');
      }
    }

    // Kết hợp và làm sạch danh sách thể loại
    const finalCategories = Array.from(new Set([...matchedCategories, 'Hoạt Hình 3D', 'Reels']));
    s.categories = finalCategories;
    s.genres = Array.from(new Set([...matchedGenres, ...finalCategories]));
    retaggedCount++;

    // Thay thế triệt để các thumbnail fbcdn.net còn sót
    if (s.thumbnail && s.thumbnail.includes('fbcdn.net')) {
      s.thumbnail = getFallback(s.id);
      s.coverImage = s.thumbnail;
      if (s.episodes?.[0]) s.episodes[0].thumbnail = s.thumbnail;
      fixedThumbCount++;
    }
  });

  // 2. Nạp thêm 6 bộ phim Flagship đỉnh cao lên đầu bảng (Newest First)
  for (const flagship of FLAGSHIP_SERIES.reverse()) {
    const exists = db.some((item) => item.id === flagship.id);
    if (!exists) {
      db.unshift(flagship);
      console.log(`✨ Đã nạp phim Flagship: "${flagship.title}" [${flagship.categories[0]}]`);
    }
  }

  // 3. Tính toán lại tổng lượt xem và tập phim
  let totalEpisodes = 0;
  let totalViews = 0;
  db.forEach((s) => {
    (s.episodes || []).forEach((ep) => {
      totalEpisodes++;
      totalViews += ep.viewsCount || 0;
    });
  });

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

  const stats = {
    timestamp: new Date().toISOString(),
    formattedTime: new Date().toLocaleString('vi-VN'),
    totalSeries: db.length,
    totalEpisodes,
    totalViews,
    newlyAddedFlagships: FLAGSHIP_SERIES.length,
    retaggedSeries: retaggedCount,
    fixedExpiredThumbnails: fixedThumbCount,
    googleAnalyticsId: 'G-HYVH98WXZN',
    status: 'ACTIVE_REALTIME'
  };

  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), 'utf-8');

  console.log(`\n🎉 HOÀN THÀNH PHÂN LOẠI & BỔ SUNG:`);
  console.log(`- Tổng số phim hiện có: ${db.length}`);
  console.log(`- Số phim đã gắn nhãn 6 chủ đề mới: ${retaggedCount}`);
  console.log(`- Thumbnail fbcdn.net đã làm sạch: ${fixedThumbCount}`);
  console.log(`- Tổng lượt xem tích lũy: ${totalViews.toLocaleString('vi-VN')}`);
}

enrichAllSeries();
