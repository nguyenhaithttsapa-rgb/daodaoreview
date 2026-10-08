// Quản lý và chuẩn hóa ảnh đại diện Video: BẮT BUỘC dùng ảnh gốc của video, cấm dùng ảnh ngoài luồng
export const BRAND_POSTER = '/avatar.jpg';
export const BRAND_OG_IMAGE = '/og-image.jpg';

export function getFallbackPoster(seed: string = ''): string {
  // Nếu seed chứa mã số ID của video Reel Facebook, chuyển hướng đến ảnh gốc của video đó
  const matchId = seed.match(/(\d{10,25})/);
  if (matchId) {
    return `/thumbnails/${matchId[1]}.jpg`;
  }
  return BRAND_POSTER;
}

export function getSafeThumbnail(url?: string | null, seed: string = ''): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getFallbackPoster(seed);
  }

  const cleanUrl = url.trim();

  // Nếu là ảnh cục bộ hoặc ảnh thương hiệu nội bộ, trả về ngay
  if (cleanUrl.startsWith('/thumbnails/') || cleanUrl === BRAND_POSTER || cleanUrl === BRAND_OG_IMAGE) {
    return cleanUrl;
  }

  // Nếu là link CDN Facebook sắp hết hạn hoặc bị chặn, chuyển sang endpoint lấy ảnh gốc nội bộ
  const matchId = cleanUrl.match(/reel\/(\d+)/) || seed.match(/(\d{10,25})/);
  if (matchId) {
    return `/thumbnails/${matchId[1]}.jpg`;
  }

  // Tuyệt đối loại bỏ các đường dẫn Unsplash hoặc ảnh rác
  if (cleanUrl.includes('unsplash.com') || cleanUrl.includes('fbcdn.net') || cleanUrl.includes('facebook.com/rsrc.php')) {
    return getFallbackPoster(seed);
  }

  return cleanUrl;
}
