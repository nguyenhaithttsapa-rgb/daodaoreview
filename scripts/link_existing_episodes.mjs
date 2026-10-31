import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');

function extractCoreSeriesName(title) {
  if (!title) return '';
  let t = title
    .replace(/\(Full Trọn Bộ[^)]*\)/gi, '')
    .replace(/\|[^|]+$/g, '')
    .replace(/^\[[^\]]+\]\s*/g, '')
    .trim();

  const seasonMatch = t.match(/^(.+?)\s*[-–—:|]?\s*(?:Mùa|Phần|Tập|Part|Ep|P)\s*(\d+)/i);
  if (seasonMatch && seasonMatch[1].trim().length >= 6) {
    let base = seasonMatch[1]
      .replace(/^[🔥🎬📺💥⚡✨\s*]+/u, '')
      .replace(/[*_~`]+/g, '')
      .trim();
    const num = parseInt(seasonMatch[2], 10);
    if (base.length >= 6 && base.length <= 65 && !/^(full|review|phim|trọn bộ|tóm tắt)$/i.test(base)) {
      return { baseKey: base.toLowerCase(), baseName: base, partNum: num };
    }
  }
  return null;
}

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log(`Initial DB series count: ${db.length}`);

  // 1. Chỉ lọc bỏ đúng video tang lễ / cầu siêu cố đạo hữu không phải phim
  const filteredDb = db.filter(s => {
    const lower = (s.title || '').toLowerCase();
    if (lower.includes('lễ đăng điện') || lower.includes('cầu siêu cố đạo hữu')) {
      console.log(`🗑️ Loại bỏ video phi phim (tang lễ/cầu siêu): ${s.id} - ${s.title.slice(0, 80)}`);
      return false;
    }
    return true;
  });

  // 2. Gom nhóm các tập của cùng bộ phim để liên kết danh sách tập (episodes playlist)
  const groups = new Map();
  for (const s of filteredDb) {
    const info = extractCoreSeriesName(s.title);
    if (info && info.baseKey) {
      if (!groups.has(info.baseKey)) {
        groups.set(info.baseKey, []);
      }
      groups.get(info.baseKey).push({ series: s, partNum: info.partNum, baseName: info.baseName });
    }
  }

  let linkedSeriesCount = 0;
  for (const [baseKey, items] of groups.entries()) {
    if (items.length > 1) {
      items.sort((a, b) => a.partNum - b.partNum);
      const combinedEpisodes = [];
      const seenUrls = new Set();
      items.forEach((item, idx) => {
        const ep0 = item.series.episodes && item.series.episodes[0];
        if (ep0 && !seenUrls.has(ep0.originalUrl)) {
          seenUrls.add(ep0.originalUrl);
          combinedEpisodes.push({
            ...ep0,
            partNumber: idx + 1
          });
        }
      });

      if (combinedEpisodes.length > 1) {
        for (const item of items) {
          item.series.episodes = combinedEpisodes.map(ep => ({
            ...ep,
            seriesId: item.series.id
          }));
          item.series.totalEpisodes = combinedEpisodes.length;
        }
        linkedSeriesCount++;
      }
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(filteredDb, null, 2), 'utf8');
  console.log(`✅ Đã làm sạch và liên kết ${linkedSeriesCount} bộ phim nhiều tập/mùa! Tổng số phim trong CSDL: ${filteredDb.length}`);
}

main();
