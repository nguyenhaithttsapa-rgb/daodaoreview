export type VideoPlatform = 'facebook' | 'youtube' | 'tiktok' | 'custom';

export interface Episode {
  id: string;
  seriesId: string;
  partNumber: number; // Ví dụ: 1, 2, 3...
  title: string;
  originalUrl: string; // Link gốc người dùng dán vào
  embedUrl: string; // Link embed chuẩn hóa để đưa vào iframe
  platform: VideoPlatform;
  aspectRatio: '9:16' | '16:9'; // Video dọc (Reels/Shorts) hay ngang
  duration?: string;
  viewsCount?: number;
  thumbnail?: string;
  publishedAt: string;
}

export interface Series {
  id: string;
  slug: string;
  title: string; // Tên phim / truyện: ví dụ "Phế Vật Ngũ Hành Linh Căn"
  description: string;
  thumbnail: string;
  channelName: string; // Kênh review: ví dụ "Đại Đạo"
  channelAvatar?: string;
  categories: string[]; // ["Tu Tiên", "Huyền Huyễn", "Trọng Sinh"]
  totalEpisodes: number;
  featured?: boolean;
  updatedAt: string;
  episodes: Episode[];
}
