// Bộ sưu tập poster dọc chuẩn 9:16 sắc nét cao cấp cho phim 3D, Anime, Kịch tính, Huyền huyễn
export const VERTICAL_POSTERS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514539079130-25950c84af65?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80'
];

export function getFallbackPoster(seed: string = ''): string {
  if (!seed) return VERTICAL_POSTERS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VERTICAL_POSTERS.length;
  return VERTICAL_POSTERS[index];
}

export function getSafeThumbnail(url?: string | null, seed: string = ''): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return getFallbackPoster(seed);
  }

  const cleanUrl = url.trim();
  // Facebook CDN URLs (fbcdn.net) bị chặn hotlink 403 Forbidden và hết hạn
  if (cleanUrl.includes('fbcdn.net') || cleanUrl.includes('facebook.com/rsrc.php')) {
    return getFallbackPoster(seed || cleanUrl);
  }

  return cleanUrl;
}
