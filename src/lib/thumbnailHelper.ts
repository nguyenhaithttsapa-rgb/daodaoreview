// Quản lý và chuẩn hóa ảnh đại diện Video: BẮT BUỘC dùng ảnh gốc của video, cấm dùng ảnh ngoài luồng
export const BRAND_POSTER = '/avatar.jpg';
export const BRAND_OG_IMAGE = '/og-image.jpg';

export function getFallbackPoster(seed: string = ''): string {
  // Ảnh dự phòng duy nhất khi ảnh gốc gặp sự cố là logo thương hiệu chính thức /avatar.jpg
  return BRAND_POSTER;
}

export function getSafeThumbnail(url?: string | null, seed: string = ''): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getFallbackPoster(seed);
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
    return `/api/thumbnail/${localThumbMatch[1]}`;
  }

  if (cleanUrl.startsWith('/api/thumbnail/')) {
    return cleanUrl;
  }

  // Nếu là link CDN Facebook sắp hết hạn hoặc bị chặn, chuyển sang endpoint lấy ảnh gốc nội bộ
  const matchId = cleanUrl.match(/reel\/(\d+)/) || cleanUrl.match(/[?&]v=(\d+)/) || seed.match(/(\d{10,25})/);
  if (matchId) {
    return `/api/thumbnail/${matchId[1]}`;
  }

  // Tuyệt đối loại bỏ các đường dẫn Unsplash hoặc ảnh rác
  if (cleanUrl.includes('unsplash.com') || cleanUrl.includes('fbcdn.net') || cleanUrl.includes('facebook.com/rsrc.php')) {
    return getFallbackPoster(seed);
  }

  return cleanUrl;
}
