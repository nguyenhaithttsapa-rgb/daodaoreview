import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let isDeploying = false;

const CODE_CHANGE_PREFIXES = [
  'src/app/',
  'src/components/',
  'src/lib/',
  'src/hooks/',
  'src/types/',
  'src/middleware.ts',
  'next.config.ts',
  'package.json',
  'tsconfig.json',
];

function run(cmd, extraEnv = {}) {
  return execSync(cmd, {
    cwd: rootDir,
    encoding: 'utf-8',
    timeout: 300000,
    env: { ...process.env, ...extraEnv },
  });
}

function getChangedFiles(fromCommit, toCommit) {
  try {
    const out = run(`git diff --name-only ${fromCommit} ${toCommit}`);
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function checkForUpdates() {
  if (isDeploying) return;

  try {
    // 1. Lấy thông tin mới nhất từ GitHub
    run('git fetch origin main');

    const localCommit = run('git rev-parse HEAD').trim();
    const remoteCommit = run('git rev-parse origin/main').trim();

    if (localCommit !== remoteCommit) {
      isDeploying = true;
      const changedFiles = getChangedFiles(localCommit, remoteCommit);

      console.log(`\n========================================================`);
      console.log(`⚡ [AUTO DEPLOY] Phát hiện bản cập nhật mới trên GitHub!`);
      console.log(`- Bản hiện tại (Local):  ${localCommit.slice(0, 7)}`);
      console.log(`- Bản mới nhất (Remote): ${remoteCommit.slice(0, 7)}`);
      console.log(`- Số file thay đổi:      ${changedFiles.length}`);

      // 2. Kéo mã nguồn & dữ liệu mới nhất
      console.log(`📥 1/3. Đồng bộ mã nguồn (git reset --hard origin/main)...`);
      run('git reset --hard origin/main');

      const needsRebuild =
        changedFiles.length === 0 ||
        changedFiles.some((f) => CODE_CHANGE_PREFIXES.some((prefix) => f === prefix || f.startsWith(prefix)));

      if (needsRebuild) {
        console.log(`🔨 2/3. Phát hiện thay đổi mã nguồn Next.js -> Đóng gói (npm run build)...`);
        run('npm run build', { NODE_OPTIONS: '--max-old-space-size=1536' });

        console.log(`🔄 3/3. Khởi động lại dịch vụ web PM2 (daodaoreview-web)...`);
        try {
          run('pm2 restart daodaoreview-web || pm2 reload daodaoreview-web || pm2 reload all');
        } catch (pm2Err) {
          console.warn('Lưu ý PM2 web:', pm2Err.message);
        }
      } else {
        console.log(`⚡ 2/3. Chỉ thay đổi dữ liệu/ảnh (database.json / thumbnails) -> Bỏ qua npm run build để tiết kiệm RAM VPS!`);
      }

      const needsCrawlerRestart = changedFiles.some(
        (f) => f.startsWith('scripts/') || f === 'ecosystem.config.cjs'
      );
      if (needsCrawlerRestart) {
        console.log(`🤖 Khởi động lại daodaoreview-crawler theo script mới...`);
        try {
          run('pm2 restart daodaoreview-crawler || true');
        } catch (pm2Err) {
          console.warn('Lưu ý PM2 crawler:', pm2Err.message);
        }
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

console.log(`🤖 [AUTO DEPLOY WATCHER] Đã khởi động dịch vụ tự động triển khai.`);
console.log(`- Tần suất kiểm tra: Mỗi 60 giây / lần`);
console.log(`- Nhánh theo dõi: origin/main`);

checkForUpdates();
setInterval(checkForUpdates, 60 * 1000);
