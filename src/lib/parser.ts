import { VideoPlatform } from '@/types/video';

export interface ParsedVideo {
  platform: VideoPlatform;
  embedUrl: string;
  originalUrl: string;
  aspectRatio: '9:16' | '16:9';
  videoId?: string;
}

export function parseVideoUrl(inputUrl: string): ParsedVideo {
  const url = inputUrl.trim();

  // 1. Facebook Reels / Watch / Videos
  // Ví dụ: https://www.facebook.com/reel/2294631994663679
  // hoặc: https://fb.watch/xyz/
  // hoặc: https://www.facebook.com/watch/?v=123
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    // Mã hóa link Facebook để truyền vào Facebook Embedded Video Player iframe
    const encodedUrl = encodeURIComponent(url);
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&autoplay=0`;
    
    // Nếu là dạng Reel thì mặc định tỷ lệ là dọc 9:16
    const isReel = url.includes('/reel/') || url.includes('/reels/');
    return {
      platform: 'facebook',
      embedUrl,
      originalUrl: url,
      aspectRatio: isReel ? '9:16' : '16:9',
    };
  }

  // 2. YouTube (Shorts & Standard Video)
  // Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // hoặc: https://youtu.be/dQw4w9WgXcQ
  // hoặc: https://www.youtube.com/shorts/3i9FjG6cRtc
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    let isShort = false;

    if (url.includes('/shorts/')) {
      const match = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (match) videoId = match[1];
      isShort = true;
    } else if (url.includes('youtu.be/')) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (match) videoId = match[1];
    } else {
      const match = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      if (match) videoId = match[1];
    }

    if (videoId) {
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
        originalUrl: url,
        aspectRatio: isShort ? '9:16' : '16:9',
        videoId,
      };
    }
  }

  // 3. TikTok
  // Ví dụ: https://www.tiktok.com/@user/video/7123456789
  if (url.includes('tiktok.com')) {
    const match = url.match(/\/video\/(\d+)/);
    const videoId = match ? match[1] : '';
    return {
      platform: 'tiktok',
      embedUrl: videoId 
        ? `https://www.tiktok.com/embed/v2/${videoId}` 
        : url,
      originalUrl: url,
      aspectRatio: '9:16',
      videoId,
    };
  }

  // Fallback
  return {
    platform: 'custom',
    embedUrl: url,
    originalUrl: url,
    aspectRatio: '16:9',
  };
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
