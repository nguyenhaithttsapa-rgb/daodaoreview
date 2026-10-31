import { spawn } from 'child_process';

process.on('uncaughtException', (err) => {
  console.log(`⚠️ [EXISTING UPDATER UNCAUGHT EXCEPTION]: ${err?.message || err}`);
});

process.on('unhandledRejection', (reason) => {
  console.log(`⚠️ [EXISTING UPDATER UNHANDLED REJECTION]: ${reason?.message || reason}`);
});

async function loop() {
  console.log(`================================================================================`);
  console.log(`🛡️ [EXISTING EPISODES & CHANNELS SUPERVISOR] CÀO TẬP MỚI CHO CÁC TẬP & KÊNH ĐÃ CÓ`);
  console.log(`================================================================================\n`);

  while (true) {
    console.log(`[SUPERVISOR] Đang chạy tiến trình cào tập mới (scripts/crawl_new_episodes_existing.mjs)...`);
    const child = spawn(process.execPath, ['scripts/crawl_new_episodes_existing.mjs'], {
      stdio: 'inherit'
    });

    await new Promise((resolve) => {
      child.on('exit', (code, signal) => {
        console.log(`[SUPERVISOR] Tiến trình kết thúc (Code: ${code}, Signal: ${signal}).`);
        resolve();
      });
      child.on('error', (err) => {
        console.error(`[SUPERVISOR] Lỗi khởi chạy: ${err.message}`);
        resolve();
      });
    });

    console.log(`[SUPERVISOR] Tự động tiếp tục sau 5 giây...\n`);
    await new Promise(r => setTimeout(r, 5000));
  }
}

loop();
