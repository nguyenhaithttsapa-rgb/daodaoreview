import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CURSOR_PATH = path.resolve('src/data/deep_crawl_cursor.json');
const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');

function isFinished() {
  if (!fs.existsSync(CURSOR_PATH) || !fs.existsSync(BATCHES_PATH)) return false;
  try {
    const cursor = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf8'));
    const batches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf8'));
    let total = 0;
    batches.forEach(b => total += (b.channels || []).length);
    return cursor.currentChannelIndex >= total;
  } catch {
    return false;
  }
}

async function loop() {
  console.log(`================================================================================`);
  console.log(`🛡️ [FOREVER SUPERVISOR ENGINE] GIÁM SÁT CÀO BẤT TỬ 1.000 KÊNH FACEBOOK`);
  console.log(`⏱️ TỰ ĐỘNG PHỤC HỒI NGAY LẬP TỨC NẾU CÓ BẤT KỲ SỰ CỐ NÀO TỪ FACEBOOK HOẶC TRÌNH DUYỆT`);
  console.log(`================================================================================\n`);

  while (!isFinished()) {
    console.log(`[FOREVER SUPERVISOR] Đang chạy engine cào sâu...`);
    const child = spawn(process.execPath, ['scripts/deep_crawl_all_channels.mjs'], {
      stdio: 'inherit'
    });

    await new Promise((resolve) => {
      child.on('exit', (code, signal) => {
        console.log(`[FOREVER SUPERVISOR] Phiên cào dừng (Code: ${code}, Signal: ${signal}).`);
        resolve();
      });
      child.on('error', (err) => {
        console.error(`[FOREVER SUPERVISOR] Lỗi khởi chạy: ${err.message}`);
        resolve();
      });
    });

    if (isFinished()) {
      console.log(`\n🎉🎉🎉 [FOREVER SUPERVISOR] ĐÃ HOÀN TẤT TRỌN VẸN TOÀN BỘ 1.000 KÊNH!`);
      break;
    }

    console.log(`[FOREVER SUPERVISOR] Tự động khởi động lại sau 5 giây để tiếp tục cào cạn kênh tiếp theo...\n`);
    await new Promise(r => setTimeout(r, 5000));
  }
}

loop();
