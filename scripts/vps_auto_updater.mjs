import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let isDeploying = false;

function run(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf-8', timeout: 300000 });
}

async function checkForUpdates() {
  if (isDeploying) return;

  try {
    // 1. Lấy thông tin mới nhất từ GitHub
    run('git fetch origin main');

    const localCommit = run('git rev-parse HEAD').trim();
    const remoteCommit = run('git rev-parse origin/main').trim();

    if (localCommit !== remoteCommit) {
      console.log(`\n========================================================`);
      console.log(`⚡ [AUTO DEPLOY] Phát hiện bản cập nhật mới trên GitHub!`);
      console.log(`- Bản hiện tại (Local):  ${localCommit.slice(0, 7)}`);
      console.log(`- Bản mới nhất (Remote): ${remoteCommit.slice(0, 7)}`);
      console.log(`🚀 Bắt đầu quá trình tự động cập nhật...`);

      isDeploying = true;

      // 2. Kéo mã nguồn mới nhất
      console.log(`📥 1/3. Đồng bộ mã nguồn (git reset & pull)...`);
      run('git reset --hard origin/main');

      // 3. Đóng gói ứng dụng Next.js
      console.log(`🔨 2/3. Đóng gói dự án (npm run build)...`);
      run('npm run build');

      // 4. Khởi động lại ứng dụng web trên PM2
      console.log(`🔄 3/3. Khởi động lại dịch vụ web PM2...`);
      // Thử reload/restart app web (trừ updater để không gián đoạn)
      try {
        run('pm2 reload daodaoreview-web || pm2 restart daodaoreview-web || pm2 reload all');
      } catch (pm2Err) {
        console.warn('Lưu ý PM2:', pm2Err.message);
      }

      console.log(`🎉 [AUTO DEPLOY THÀNH CÔNG] Đã cập nhật lên commit: ${remoteCommit.slice(0, 7)}!`);
      console.log(`========================================================\n`);
    }
  } catch (err) {
    console.error(`❌ [AUTO DEPLOY LỖI]:`, err.message);
  } finally {
    isDeploying = false;
  }
}

// Khởi chạy vòng lặp kiểm tra mỗi 60 giây
console.log(`🤖 [AUTO DEPLOY WATCHER] Đã khởi động dịch vụ tự động triển khai.`);
console.log(`- Tần suất kiểm tra: Mỗi 60 giây / lần`);
console.log(`- Nhánh theo dõi: origin/main`);

// Chạy kiểm tra ngay khi khởi động
checkForUpdates();

// Kiểm tra định kỳ
setInterval(checkForUpdates, 60 * 1000);
