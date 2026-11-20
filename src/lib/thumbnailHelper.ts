// Quản lý và chuẩn hóa ảnh đại diện Video: BẮT BUỘC dùng ảnh gốc của video, cấm dùng ảnh ngoài luồng
export const BRAND_POSTER = '/avatar.jpg';
export const BRAND_OG_IMAGE = '/og-image.jpg';

/** Chuẩn hóa ID thumbnail, xóa dấu gạch dưới trong các ID số ghép (vd: 15186157_26763542 -> 1518615726763542). */
function normalizeThumbnailId(rawId: string): string {
  const cleaned = rawId.trim();
  return /^\d+(?:_\d+)+$/.test(cleaned) ? cleaned.replace(/_/g, '') : cleaned;
}

/** Khôi phục đường dẫn /api/thumbnail/{id} từ seed nếu chứa ID video Facebook (10-25 chữ số). */
function extractThumbnailFromSeed(seed: string): string | null {
  if (!seed) return null;
  const compactSeed = seed.replace(/_/g, '');
  const matchId = compactSeed.match(/(\d{10,25})/);
  return matchId ? `/api/thumbnail/${matchId[1]}` : null;
}

export function getFallbackPoster(_seed: string = ''): string {
  // Ảnh dự phòng duy nhất khi ảnh gốc gặp sự cố là logo thương hiệu chính thức /avatar.jpg
  return BRAND_POSTER;
}

export function getSafeThumbnail(url?: string | null, seed: string = ''): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return extractThumbnailFromSeed(seed) || getFallbackPoster(seed);
  }

  const cleanUrl = url.trim();

  // Nếu là ảnh thương hiệu nội bộ, trả về ngay
  if (cleanUrl === BRAND_POSTER || cleanUrl === BRAND_OG_IMAGE) {
    return cleanUrl;
  }

  // Chuyển mọi đường dẫn /thumbnails/{id}.jpg sang /api/thumbnail/{id}
  // Vì Next.js production (next start) trả 404 với các file mới thêm vào public/thumbnails/ sau khi build,
  // trong khi /api/thumbnail/{id} đọc trực tiếp từ ổ đĩa hoặc tự động tải lại từ Facebook nếu thiếu!
  const localThumbMatch = cleanUrl.match(/^\/thumbnails\/([^/.?]+)(?:\.[a-zA-Z0-9]+)?/);
  if (localThumbMatch) {
    return `/api/thumbnail/${normalizeThumbnailId(localThumbMatch[1])}`;
  }

  const apiThumbMatch = cleanUrl.match(/^\/api\/thumbnail\/([^/.?]+)(?:\.[a-zA-Z0-9]+)?/);
  if (apiThumbMatch) {
    return `/api/thumbnail/${normalizeThumbnailId(apiThumbMatch[1])}`;
  }

  // Nếu là link video/CDN Facebook, chuyển sang endpoint lấy ảnh gốc nội bộ
  const matchUrlId = cleanUrl.match(/reel\/(\d+)/) || cleanUrl.match(/[?&]v=(\d+)/);
  if (matchUrlId) {
    return `/api/thumbnail/${matchUrlId[1]}`;
  }

  const seedThumb = extractThumbnailFromSeed(seed);
  if (seedThumb && (cleanUrl.includes('fbcdn.net') || cleanUrl.includes('unsplash.com') || cleanUrl.includes('facebook.com'))) {
    return seedThumb;
  }

  // Tuyệt đối loại bỏ các đường dẫn Unsplash hoặc ảnh rác không khôi phục được ID
  if (cleanUrl.includes('unsplash.com') || cleanUrl.includes('fbcdn.net') || cleanUrl.includes('facebook.com/rsrc.php')) {
    return getFallbackPoster(seed);
  }

  return cleanUrl;
}
