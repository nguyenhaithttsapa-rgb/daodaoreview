import fs from 'fs';
import path from 'path';

const CURSOR_PATH = path.resolve('src/data/deep_crawl_cursor.json');
const LOG_PATH = path.resolve('logs/deep_crawl.log');
const BATCHES_PATH = path.resolve('src/data/all_channel_batches.json');

function checkStatus() {
  console.log('================================================================');
  console.log('🤖 TRẠNG THÁI BỘ BOT CÀO SÂU NGẦM (DEEP CRAWLER MONITOR)');
  console.log('================================================================\n');

  if (!fs.existsSync(CURSOR_PATH)) {
    console.log('⏳ Bot chưa được khởi chạy hoặc cursor chưa tạo.');
    return;
  }

  const cursor = JSON.parse(fs.readFileSync(CURSOR_PATH, 'utf8'));
  const batches = JSON.parse(fs.readFileSync(BATCHES_PATH, 'utf8'));
  const channels = [];
  batches.forEach(b => {
    if (b.channels) channels.push(...b.channels);
  });

  const curIdx = cursor.currentChannelIndex || 0;
  const currentChan = channels[curIdx] || null;

  console.log(`📍 Tiến độ kênh: [${curIdx + 1}/${channels.length}] (${((curIdx / channels.length) * 100).toFixed(1)}%)`);
  if (currentChan) {
    console.log(`🎯 Kênh đang cào: ${currentChan.name}`);
    console.log(`🔗 Link: ${currentChan.url}`);
  }
  console.log(`⏱️ Thời điểm bắt đầu: ${cursor.startedAt}`);
  console.log(`🕒 Cập nhật lần cuối: ${cursor.lastUpdated}`);

  let totalAdded = 0;
  let totalFound = 0;
  let totalShort = 0;
  let totalEmbed = 0;
  let totalMusic = 0;

  if (cursor.channelsProcessed && cursor.channelsProcessed.length > 0) {
    cursor.channelsProcessed.forEach(s => {
      totalAdded += s.moviesAdded || 0;
      totalFound += s.videosFound || 0;
      totalShort += s.shortRejected || 0;
      totalEmbed += s.embedRejected || 0;
      totalMusic += s.musicRejected || 0;
    });

    console.log(`\n📊 TỔNG KẾT CÁC KÊNH ĐÃ CÀO XONG (${cursor.channelsProcessed.length} kênh):`);
    console.log(`- Phim dài hợp lệ nạp mới: ${totalAdded} phim`);
    console.log(`- Video tìm thấy: ${totalFound}`);
    console.log(`- Clip ngắn đã lọc bỏ (< 30m): ${totalShort}`);
    console.log(`- Video cấm nhúng: ${totalEmbed}`);
    console.log(`- Video ca nhạc/rác: ${totalMusic}`);
  }

  if (fs.existsSync(LOG_PATH)) {
    const lines = fs.readFileSync(LOG_PATH, 'utf8').trim().split('\n');
    console.log(`\n📝 10 DÒNG NHẬT KÝ GẦN NHẤT:`);
    lines.slice(-10).forEach(l => console.log('  ' + l));
  }
  console.log('\n================================================================');
}

checkStatus();
