'use client';

import { Episode } from '@/types/video';

interface VideoPlayerProps {
  episode: Episode;
}

export default function VideoPlayer({ episode }: VideoPlayerProps) {
  const isVertical = episode.aspectRatio === '9:16';

  return (
    <div
      className={`flex flex-col items-center rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] border border-purple-900/40 p-2 sm:p-4 space-y-3 transition-all duration-300 ${
        isVertical ? 'w-full max-w-[420px] mx-auto bg-[#0a0514]/80 backdrop-blur-xl' : 'w-full bg-[#0a0514]/80 backdrop-blur-md'
      }`}
    >
      <div
        className={`relative w-full ${
          isVertical ? 'aspect-[9/16]' : 'max-w-4xl aspect-video'
        } bg-black rounded-xl overflow-hidden shadow-inner border border-cyan-500/20`}
      >
        <iframe
          src={episode.embedUrl}
          title={episode.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>

      {/* Nút xem trực tiếp trên Facebook dự phòng trường hợp Facebook chặn iframe một số video */}
      {episode.platform === 'facebook' && (
        <div className="w-full max-w-[380px] flex items-center justify-between text-sm text-purple-300 bg-purple-900/20 px-3 py-2 rounded-xl border border-purple-500/30">
          <span>Nếu video không hiển thị:</span>
          <a
            href={episode.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 neon-text-blue font-semibold underline flex items-center gap-1"
          >
            Mở xem trực tiếp trên Facebook ↗
          </a>
        </div>
      )}
    </div>
  );
}
