export interface ExtractedReel {
  originalUrl: string;
  seriesTitle: string;
  partNumber: number;
  rawCaption: string;
}

/**
 * Trích xuất số tập (part number) từ caption
 * Hỗ trợ các mẫu:
 * - "P1 6" -> tập 6 (hoặc P2 5)
 * - "Part 6", "Part6", "P.6", "P6"
 * - "Tập 6", "Tap 6", "Ep 6", "Episode 6", "T6"
 * - "#6"
 */
export function extractPartNumber(text: string): { part: number; cleanText: string } {
  let clean = text;

  // Pattern 1: Dạng "P1 6" hoặc "P2 10" (thường thấy trên page hoạt hình như Đại Đạo)
  const p1Pattern = /\b[Pp]\d+\s+(\d+)\b/;
  const m1 = clean.match(p1Pattern);
  if (m1) {
    clean = clean.replace(p1Pattern, '').trim();
    return { part: parseInt(m1[1], 10), cleanText: clean };
  }

  // Pattern 2: Dạng "Tập 6", "Tập: 6", "Tập-6", "Tap 6", "Ep 6", "Part 6", "P 6"
  const partPattern = /(?:tập|tap|part|episode|ep|p)\s*[:.-]?\s*(\d+)/i;
  const m2 = clean.match(partPattern);
  if (m2) {
    clean = clean.replace(partPattern, '').trim();
    return { part: parseInt(m2[1], 10), cleanText: clean };
  }

  // Pattern 3: Dạng "P.6" hoặc "P6"
  const pPattern = /\bP\.?(\d+)\b/i;
  const m3 = clean.match(pPattern);
  if (m3) {
    clean = clean.replace(pPattern, '').trim();
    return { part: parseInt(m3[1], 10), cleanText: clean };
  }

  // Mặc định không tìm thấy
  return { part: 1, cleanText: clean };
}

/**
 * Chuẩn hóa tên bộ phim: loại bỏ hashtag, ký tự đặc biệt, liên kết, v.v.
 */
export function cleanSeriesTitle(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '') // Bỏ link
    .replace(/#\w+/g, '') // Bỏ hashtag
    .replace(/\[.*?\]|\(.*?\)/g, '') // Bỏ ngoặc vuông hoặc tròn thừa
    .replace(/[-_–—|]/g, ' ') // Thay thế gạch ngang
    .replace(/\s+/g, ' ') // Xóa khoảng trắng thừa
    .trim();
}

/**
 * Phân tích khối văn bản lớn chứa nhiều link và tiêu đề/caption Facebook Reels
 * Hỗ trợ cả 2 thứ tự phổ biến:
 * Mẫu A: Link trước, Caption sau
 * Mẫu B: Caption trước, Link sau
 * Mẫu C: Caption và Link nằm cùng một dòng
 */
export function parseBatchReels(rawInput: string): ExtractedReel[] {
  const results: ExtractedReel[] = [];
  const lines = rawInput.split('\n').map((l) => l.trim()).filter(Boolean);

  let pendingUrl: string | null = null;
  let pendingCaption: string = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const urlMatch = line.match(/(https?:\/\/(?:www\.)?(?:facebook\.com\/(?:reel|reels|watch)\/[^\s]+|fb\.watch\/[^\s]+|youtube\.com\/[^\s]+|youtu\.be\/[^\s]+))/i);

    if (urlMatch) {
      const url = urlMatch[1];
      const remainingOnLine = line.replace(url, '').trim();

      // Nếu đã có pendingUrl từ dòng trước mà chưa có caption, lưu nó với caption mặc định
      if (pendingUrl && !remainingOnLine && !pendingCaption) {
        results.push({
          originalUrl: pendingUrl,
          seriesTitle: 'Phim Hoạt Hình Tu Tiên',
          partNumber: 1,
          rawCaption: 'Tập 1',
        });
        pendingUrl = null;
      }

      if (remainingOnLine) {
        // Cả URL và caption cùng dòng
        const { part, cleanText } = extractPartNumber(remainingOnLine);
        results.push({
          originalUrl: url,
          seriesTitle: cleanSeriesTitle(cleanText) || 'Phim Hoạt Hình Tu Tiên',
          partNumber: part,
          rawCaption: remainingOnLine,
        });
      } else if (pendingCaption) {
        // Caption ở dòng trước, URL ở dòng này
        const { part, cleanText } = extractPartNumber(pendingCaption);
        results.push({
          originalUrl: url,
          seriesTitle: cleanSeriesTitle(cleanText) || 'Phim Hoạt Hình Tu Tiên',
          partNumber: part,
          rawCaption: pendingCaption,
        });
        pendingCaption = '';
      } else {
        // URL ở trước, đang chờ caption ở dòng kế
        pendingUrl = url;
      }
    } else {
      // Dòng này là text/caption
      if (pendingUrl) {
        // URL nằm ở dòng trước, đây là caption đi kèm
        const { part, cleanText } = extractPartNumber(line);
        results.push({
          originalUrl: pendingUrl,
          seriesTitle: cleanSeriesTitle(cleanText) || 'Phim Hoạt Hình Tu Tiên',
          partNumber: part,
          rawCaption: line,
        });
        pendingUrl = null;
      } else {
        // Caption nằm trước, chờ URL ở dòng sau
        pendingCaption = pendingCaption ? `${pendingCaption} ${line}` : line;
      }
    }
  }

  // Nếu còn pendingUrl cuối cùng
  if (pendingUrl) {
    results.push({
      originalUrl: pendingUrl,
      seriesTitle: 'Phim Hoạt Hình Tu Tiên',
      partNumber: 1,
      rawCaption: 'Tập 1',
    });
  }
  return results;
}
