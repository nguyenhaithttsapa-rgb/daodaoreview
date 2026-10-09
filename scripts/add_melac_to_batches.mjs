import fs from 'fs';
import path from 'path';

const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');
let batches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf-8'));

// Check if Mễ Lạc is already in
const hasMeLac = batches.some(b => JSON.stringify(b).includes('61588732377311') || JSON.stringify(b).includes('Mễ Lạc Review'));

if (!hasMeLac) {
  const newBatch = {
    batchNumber: batches.length + 1,
    batchTitle: `LÔ ${batches.length + 1} (ĐẶC BIỆT): Đại Bản Doanh Mễ Lạc Review (Đã Cào Cạn Kiệt)`,
    category: 'Donghua 3D Tu Tiên Trọn Bộ',
    status: 'ĐÃ CÀO CẠN KIỆT (Đã nạp 52 phim dài từ 1h đến 17h)',
    channels: [
      {
        name: 'Mễ Lạc Review (Kênh Chính)',
        url: 'https://www.facebook.com/profile.php?id=61588732377311&sk=videos',
        category: 'Donghua 3D & Tu Tiên Full'
      },
      {
        name: 'Mễ Lạc Review (Watch Archive)',
        url: 'https://www.facebook.com/watch/61588732377311/',
        category: 'Trọn Bộ Tu Tiên'
      },
      {
        name: 'Mễ Lạc Review (Vô Linh Chứng Đạo Series)',
        url: 'https://www.facebook.com/watch/search/?q=Mễ Lạc Review Vô Linh Chứng Đạo',
        category: 'Hoạt Hình Tu Tiên'
      },
      {
        name: 'Mễ Lạc Review (Nhất Mộng Thanh Huyền Series)',
        url: 'https://www.facebook.com/watch/search/?q=Mễ Lạc Review Nhất Mộng Thanh Huyền',
        category: 'Kiếm Hiệp Tu Chân'
      },
      {
        name: 'Mễ Lạc Review (Tụ Bảo Tiên Bồn Series)',
        url: 'https://www.facebook.com/watch/search/?q=Mễ Lạc Review Tụ Bảo Tiên Bồn',
        category: 'Huyền Huyễn Trọng Sinh'
      }
    ]
  };

  batches.push(newBatch);
  fs.writeFileSync(BATCHES_PATH, JSON.stringify(batches, null, 2), 'utf-8');
  console.log(`Đã thêm Lô ${newBatch.batchNumber} (Mễ Lạc Review) vào all_channel_batches.json!`);
} else {
  console.log('Mễ Lạc Review đã tồn tại trong batches.');
}
