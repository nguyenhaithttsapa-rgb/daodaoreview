import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('src/data/database.json');

const INVALID_BASE_NAMES = new Set([
  'full', 'review', 'phim', 'tron bo', 'tom tat', 'phim hay', 'phim ngan',
  ' tap', 'tap 1', 'tap 2', 'tap 3', 'phan 1', 'phan 2', 'mua 1', 'mua 2',
  'mua 3', 'mua 4', 'mua 5', 'full phim', 'review phim', 'hoat hinh 3d',
  'phim hay tron bo', 'thuyet minh', 'vietsub'
]);

function cleanAffiliateSpam(str) {
  if (!str) return '';
  return str
    .replace(/-{3,}\s*Đây có thể không phải sản phẩm bạn cần.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Đây có thể không phải sản phẩm bạn cần.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Trợ thủ đắc lực làm việc nhà.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Trợ thủ đặc lực làm việc nhà.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Cây chà sàn 3 trong 1.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/Cây lau nhà tự vắt 2 ngăn/gi, ' ')
    .replace(/Kệ Để Đồ Nhà Bếp\s*/gi, '')
    .replace(/^.*?Xem Full Tại Đây\s*:\s*/gi, '')
    .replace(/Quý vị đi ngang cho em xin 1 lượt click Shopee.*?(?=\||\(Full|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractStrictSeriesInfo(title) {
  if (!title) return null;
  let t = cleanAffiliateSpam(title)
    .replace(/\(Full Trọn Bộ[^)]*\)/gi, '')
    .replace(/\(Nội dung giải trí[^)]*\)/gi, '')
    .replace(/\|[^|]+$/g, '')
    .replace(/^\s*\[[^\]]+\]\s*/g, '')
    .replace(/^[🔥🎬📺💥⚡✨\s*]+/u, '')
    .replace(/[*_~`]+/g, '')
    .trim();

  // Mẫu 1: "Mùa 1 - Mùa 3 | Tiên Nhãn ..." hoặc "Mùa 19 | Thái Huyền Thai Châu Truyện ..."
  const prefixSeasonMatch = t.match(/^(?:Mùa|Phần|Tập|Part|Ep)\s*(\d+)(?:\s*[-+–]\s*(?:Mùa|Phần|Tập|P)?\s*\d+)?(?:\s*\([^)]*\))?\s*\|\s*([^|(:\n]{6,60})/i);
  if (prefixSeasonMatch) {
    const partNum = parseInt(prefixSeasonMatch[1], 10);
    let base = prefixSeasonMatch[2].trim();
    // Cắt phần mô tả dài phía sau nếu chỉ có 1 dòng không dấu chấm
    const words = base.split(/\s+/);
    if (words.length > 8) {
      base = words.slice(0, 6).join(' ');
    }
    const baseKey = base.toLowerCase();
    if (base.length >= 6 && !INVALID_BASE_NAMES.has(baseKey) && !/^(mùa|phần|tập)\s*\d+/i.test(base)) {
      return { baseKey, baseName: base, partNum };
    }
  }

  // Mẫu 2: "Vạn Yêu Đồ Lục Truyện - Trọn Bộ Mùa 7 ..." hoặc "TIỂU SƯ MUỘI ... - MÙA 2 ep1"
  const suffixSeasonMatch = t.match(/^([^|(\n]{6,60}?)\s*[-–—:|]\s*(?:Trọn Bộ\s*)?(?:Mùa|Phần|Tập|Part|Ep|P)\s*(\d+)/i);
  if (suffixSeasonMatch) {
    let base = suffixSeasonMatch[1]
      .replace(/^(?:FULL\s+|REVIEW\s+|PHIM\s+)/i, '')
      .trim();
    const partNum = parseInt(suffixSeasonMatch[2], 10);
    const baseKey = base.toLowerCase();
    if (
      base.length >= 6 &&
      base.length <= 55 &&
      !INVALID_BASE_NAMES.has(baseKey) &&
      !/^(?:mùa|phần|tập|part|ep|p)\s*\d+/i.test(base)
    ) {
      return { baseKey, baseName: base, partNum };
    }
  }

  return null;
}

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log(`Initial DB series count: ${db.length}`);

  // 1. Lọc bỏ video phi phim & làm sạch affiliate spam, khôi phục mỗi mục về đúng tập gốc của chính nó trước khi gom nhóm chuẩn
  const cleanedDb = [];
  for (const s of db) {
    const lower = (s.title || '').toLowerCase();
    if (
      lower.includes('lễ đăng điện') ||
      lower.includes('cầu siêu cố đạo hữu') ||
      lower.includes('thi công xây dựng trọn gói') ||
      lower.includes('thiết kế kiến trúc & thi công')
    ) {
      continue;
    }

    s.title = cleanAffiliateSpam(s.title);
    s.description = cleanAffiliateSpam(s.description);

    const ownVid = (s.id || '').replace('series-long-', '');
    // Tìm đúng episode gốc của chính series này
    let ownEp = (s.episodes || []).find(ep => (ep.id && ep.id.includes(ownVid)) || (ep.originalUrl && ep.originalUrl.includes(ownVid)));
    if (!ownEp && s.episodes && s.episodes.length > 0) {
      ownEp = s.episodes[s.episodes.length - 1];
    }
    if (ownEp) {
      ownEp = {
        ...ownEp,
        id: `ep-long-${ownVid}`,
        seriesId: s.id,
        partNumber: 1,
        title: s.title
      };
      s.episodes = [ownEp];
      s.totalEpisodes = 1;
    }
    cleanedDb.push(s);
  }

  // 2. Gom nhóm chính xác tuyệt đối các tập thuộc cùng 1 bộ phim
  const groups = new Map();
  for (const s of cleanedDb) {
    const info = extractStrictSeriesInfo(s.title);
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

  fs.writeFileSync(DB_PATH, JSON.stringify(cleanedDb, null, 2), 'utf8');
  console.log(`✅ Đã chuẩn hóa và liên kết chính xác ${linkedSeriesCount} bộ phim nhiều tập! Tổng số phim trong CSDL: ${cleanedDb.length}`);
}

main();
