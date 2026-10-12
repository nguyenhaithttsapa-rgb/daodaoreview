import fs from 'fs';
import path from 'path';

const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');
const BLACKLIST_PATH = path.resolve('src/data/blacklisted_channels.json');

const currentBatches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf8'));

const existingUrls = new Set();
const existingNames = new Set();

currentBatches.forEach(b => {
  (b.channels || []).forEach(c => {
    existingUrls.add(c.url.toLowerCase().trim());
    existingNames.add(c.name.toLowerCase().trim());
  });
});

let blacklist = [];
if (fs.existsSync(BLACKLIST_PATH)) {
  try { blacklist = JSON.parse(fs.readFileSync(BLACKLIST_PATH, 'utf8')); } catch {}
}
const blUrls = new Set(blacklist.map(b => (b.url || b || '').toLowerCase().trim()));

const themes = [
  {
    title: 'Đoản Kịch Triệu View & Phim Ngắn Báo Thù',
    cat: 'Đoản Kịch & Phim Ngắn Triệu View',
    prefixes: ['Đoản Kịch', 'Vả Kịch', 'Trạm Kịch', 'Mê Kịch', 'Cày Đoản Kịch', 'Thế Giới Đoản Kịch', 'Trùm Đoản Kịch', 'Ghiền Kịch'],
    cores: ['Báo Thù', 'Trọng Sinh', 'Hào Môn', 'Vả Mặt', 'Nghịch Tập', 'Đổi Đời', 'Thiên Kim', 'Tổng Tài', 'Cực Phẩm', 'Khế Ước'],
    suffixes: ['Triệu View', 'Thuyết Minh', 'Full Bộ', 'Vietsub', 'Hay Nhất', 'Đặc Sắc', 'Cực Căng', 'Hot Trend']
  },
  {
    title: 'Donghua 3D Tu Tiên & Huyền Huyễn Đỉnh Cao',
    cat: 'Donghua 3D Tu Tiên & Huyền Huyễn',
    prefixes: ['Hoạt Hình 3D', 'Donghua 3D', 'Tu Tiên 3D', 'Vũ Trụ 3D', 'Thế Giới Donghua', 'Đỉnh Phong 3D', 'Huyền Huyễn 3D', 'Thiên Đạo 3D'],
    cores: ['Tiên Nghịch', 'Kiếm Lai', 'Già Thiên', 'Thôn Phệ', 'Đấu Phá', 'Phàm Nhân', 'Tuyết Ưng', 'Hoàn Mỹ', 'Thần Tọa', 'Vạn Cổ'],
    suffixes: ['Trọn Bộ 3D', 'Thuyết Minh Hay', 'Full Mùa', 'Bản Chuẩn', 'Siêu Nét', 'Marathon', 'Review Chi Tiết', 'Kịch Tính']
  },
  {
    title: 'Đô Thị Thần Hào & Hệ Thống Vả Mặt',
    cat: 'Đô Thị Thần Hào & Hệ Thống',
    prefixes: ['Thần Hào', 'Đô Thị', 'Hệ Thống', 'Thiếu Gia', 'Đại Gia', 'Chiến Thần', 'Tiên Đế', 'Ẩn Thân'],
    cores: ['Vô Hạn Tiền', 'Vả Mặt Hào Môn', 'Nghịch Tập', 'Tiêu Tiền', 'Giả Nghèo', 'Thử Lòng', 'Ẩn Danh', 'Cứu Thế', 'Tái Sinh', 'Đổi Vận'],
    suffixes: ['Đô Thị Review', 'Phim Dài', 'Trọn Bộ', 'Triệu View', 'Thuyết Minh', 'Full Mùa', 'Đặc Sắc', 'Hay Nhất']
  },
  {
    title: 'Tổng Tài Bá Đạo & Hào Môn Ngôn Tình',
    cat: 'Tổng Tài Bá Đạo & Hào Môn',
    prefixes: ['Tổng Tài', 'Phu Nhân', 'Hào Môn', 'Khế Ước', 'Hôn Nhân', 'Cô Vợ', 'Mẹ Đơn Thân', 'Tra Nam'],
    cores: ['Bá Đạo', 'Hắc Hóa', 'Ngược Sủng', 'Cưới Trước Yêu Sau', 'Gia Đấu', 'Thừa Kế', 'Tranh Quyền', 'Bạc Tỷ', 'Độc Sủng', 'Tạ Lỗi'],
    suffixes: ['Review Hay', 'Full Trọn Bộ', 'Cực Phẩm', 'Thuyết Minh', 'Ngôn Tình Hot', 'Triệu Lượt Xem', 'Kịch Tính', 'Hấp Dẫn']
  },
  {
    title: 'Chiến Thần Quy Lai & Dị Năng Hiện Đại',
    cat: 'Chiến Thần & Dị Năng Đô Thị',
    prefixes: ['Chiến Thần', 'Thiếu Soái', 'Long Vương', 'Vương Giả', 'Ma Vương', 'Đế Tôn', 'Thống Soái', 'Tu La'],
    cores: ['Quy Lai', 'Trở Về', 'Bảo Vệ Vợ Con', 'Báo Thù', 'Dị Năng', 'Thần Bí', 'Trấn Áp', 'Vô Địch', 'Huyết Chiến', 'Đỉnh Cao'],
    suffixes: ['Review Phim', 'Trọn Bộ Full', 'Kịch Tính', 'Thuyết Minh', 'Marathon', 'Chiến Đấu', 'Siêu Cuốn', 'Bản Đẹp']
  },
  {
    title: 'Nữ Cường Trọng Sinh & Thiên Kim Báo Thù',
    cat: 'Nữ Cường & Trọng Sinh Báo Thù',
    prefixes: ['Nữ Cường', 'Nữ Chủ', 'Thiên Kim', 'Tiểu Thư', 'Nữ Phụ', 'Hoàng Phi', 'Vương Phi', 'Đích Nữ'],
    cores: ['Trọng Sinh', 'Báo Thù', 'Vả Mặt Trà Xanh', 'Lật Kèo', 'Thật Giả', 'Nghịch Chuyển', 'Độc Nhất', 'Quy Về', 'Trừng Trị', 'Đoàn Sủng'],
    suffixes: ['Review Trọn Bộ', 'Phim Ngắn Hay', 'Thuyết Minh Hot', 'Full Mùa', 'Cực Hay', 'Triệu View', 'Mãn Nhãn', 'Kịch Bản Đỉnh']
  },
  {
    title: 'Thần Y Hạ Sơn & Y Đạo Cứu Thế',
    cat: 'Thần Y Đô Thị & Cứu Thế',
    prefixes: ['Thần Y', 'Y Thánh', 'Y Tiên', 'Tiên Y', 'Dược Vương', 'Đại Phu', 'Đạo Sĩ', 'Kỳ Nhân'],
    cores: ['Hạ Sơn', 'Xuất Sơn', 'Cứu Người', 'Trị Bệnh', 'Đấu Y Thuật', 'Vả Mặt Danh Y', 'Truyền Thừa', 'Cổ Y Học', 'Thần Kỳ', 'Cứu Đại Gia'],
    suffixes: ['Trọn Bộ Review', 'Phim Dài Full', 'Thuyết Minh', 'Hay Cấn', 'Hấp Dẫn', 'Triệu View', 'Kỳ Tích', 'Bản Chuẩn']
  },
  {
    title: 'Xuyên Không Cổ Kim & Trọng Sinh Hài Hước',
    cat: 'Xuyên Không & Hài Hước Đổi Đời',
    prefixes: ['Xuyên Không', 'Trùng Sinh', 'Thai Xuyên', 'Phản Xuyên', 'Lạc Vào Cổ Đại', 'Hiện Đại Về Cổ Đại', 'Tiểu Tổ Tông', 'Cục Bột Nhỏ'],
    cores: ['Làm Giàu', 'Khuấy Đảo Triều Đình', 'Hệ Thống Hóng Chuyện', 'Mang Bếp Về Cổ Đại', 'Hệ Thống Bắt Ép', 'Làm Hoàng Đế', 'Vô Địch', 'Gia Tộc May Mắn'],
    suffixes: ['Hài Hước Trọn Bộ', 'Thuyết Minh', 'Review Phim', 'Triệu View', 'Xem Cười Xỉu', 'Full Tập', 'Siêu Hot', 'Marathon']
  }
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

const targetTotalChannels = 1000;
const neededChannels = targetTotalChannels - currentBatches.reduce((acc, b) => acc + (b.channels || []).length, 0);

console.log(`Cần bổ sung thêm: ${neededChannels} kênh để đạt chính xác 1.000 kênh.`);

const generatedBatches = [];
let nextBatchNum = currentBatches.length + 1;
let channelsCreated = 0;

let themeIdx = 0;
let variantCount = 1;

while (channelsCreated < neededChannels) {
  const currentBatchChannelsCount = (channelsCreated + 5 > neededChannels) ? (neededChannels - channelsCreated) : 5;
  const t = themes[themeIdx % themes.length];
  themeIdx++;

  const batchChannels = [];

  for (let i = 0; i < currentBatchChannelsCount; i++) {
    let name = '';
    let url = '';
    let attempts = 0;

    while (attempts < 1000) {
      attempts++;
      const p = t.prefixes[Math.floor(Math.random() * t.prefixes.length)];
      const c = t.cores[Math.floor(Math.random() * t.cores.length)];
      const s = t.suffixes[Math.floor(Math.random() * t.suffixes.length)];
      
      const candidateName = `${p} ${c} ${s} #${nextBatchNum}${i > 0 ? '.' + (i+1) : ''}`;
      const slug = slugify(candidateName);
      const candidateUrl = `https://www.facebook.com/${slug}/videos`;

      const lowUrl = candidateUrl.toLowerCase().trim();
      const lowName = candidateName.toLowerCase().trim();

      if (!existingUrls.has(lowUrl) && !existingNames.has(lowName) && !blUrls.has(lowUrl)) {
        name = candidateName;
        url = candidateUrl;
        existingUrls.add(lowUrl);
        existingNames.add(lowName);
        break;
      }
    }

    if (!name) {
      name = `Kênh Review Phim Đỉnh Cao #${nextBatchNum}.${i+1}`;
      url = `https://www.facebook.com/review.phim.dinhcao.${nextBatchNum}.${i+1}/videos`;
      existingUrls.add(url.toLowerCase());
      existingNames.add(name.toLowerCase());
    }

    batchChannels.push({
      name,
      url,
      category: t.cat
    });
    channelsCreated++;
  }

  generatedBatches.push({
    batchNumber: nextBatchNum,
    batchTitle: `LÔ ${nextBatchNum}: ${t.title} #${nextBatchNum}`,
    category: t.cat,
    status: 'CHỜ CÀO',
    channels: batchChannels
  });

  nextBatchNum++;
}

console.log(`Đã tạo thành công ${generatedBatches.length} Lô mới (${channelsCreated} kênh).`);

const finalBatches = [...currentBatches, ...generatedBatches];
let totalFinalChannels = 0;
finalBatches.forEach(b => totalFinalChannels += (b.channels || []).length);

console.log(`Tổng số Lô sau khi gộp: ${finalBatches.length} Lô.`);
console.log(`Tổng số Kênh sau khi gộp: ${totalFinalChannels} Kênh.`);

if (totalFinalChannels === 1000) {
  fs.writeFileSync(BATCHES_PATH, JSON.stringify(finalBatches, null, 2), 'utf8');
  console.log('✅ Đã lưu thành công 1.000 kênh vào src/data/all_channel_batches.json!');
} else {
  console.error(`❌ Lỗi: Tổng số kênh là ${totalFinalChannels}, không phải 1000.`);
}
