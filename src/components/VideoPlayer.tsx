'use client';

import { useState, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { Episode } from '@/types/video';

interface VideoPlayerProps {
  episode: Episode;
}

export default function VideoPlayer({ episode }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isVertical = episode.aspectRatio === '9:16' || (episode.title && (episode.title.includes('Dọc') || episode.title.includes('Reel')));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
          // @ts-ignore
          if (isVertical) {
            // @ts-ignore
            await screen.orientation.lock('portrait').catch(() => {});
          } else {
            // @ts-ignore
            await screen.orientation.lock('landscape').catch(() => {});
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // @ts-ignore
        if (screen.orientation && screen.orientation.unlock) {
          // @ts-ignore
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  };

  return (
    <div ref={containerRef}
      className={`flex flex-col relative group items-center overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full bg-black p-0 justify-center' 
          : `rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.15)] border border-purple-900/40 p-2 sm:p-4 space-y-3 ${
              isVertical ? 'w-full max-w-[420px] mx-auto bg-[#0a0514]/80 backdrop-blur-xl' : 'w-full bg-[#0a0514]/80 backdrop-blur-md'
            }`
      }`}
    >

      {/* Nút phóng to / quay ngang */}
      <button 
        onClick={toggleFullscreen} 
        className="absolute top-4 right-4 z-[60] bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)] border border-cyan-500/80 backdrop-blur-sm transition-all flex items-center justify-center opacity-80 hover:opacity-100"
        title="Toàn màn hình (Quay ngang)"
      >
        {isFullscreen ? <Minimize className="w-6 h-6 text-rose-400" /> : <Maximize className="w-6 h-6 text-cyan-400" />}
      </button>

      <div
        className={`relative w-full ${
          isFullscreen 
            ? 'h-full flex-1 max-w-none' 
            : isVertical ? 'aspect-[9/16]' : 'max-w-4xl aspect-video'
        } bg-black ${isFullscreen ? '' : 'rounded-xl border border-cyan-500/20 shadow-inner'} overflow-hidden`}
      >
        <iframe
          src={episode.embedUrl}
          title={episode.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>

      {/* Nút xem trực tiếp dự phòng trường hợp YouTube/Facebook chặn iframe */}
      {!isFullscreen && (
        <div className="w-full max-w-[380px] flex items-center justify-between text-sm text-purple-300 bg-purple-900/20 px-3 py-2 rounded-xl border border-purple-500/30 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <span>Nếu video không hiển thị:</span>
          <a
            href={episode.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 neon-text-blue font-semibold underline flex items-center gap-1"
          >
            Mở xem trực tiếp trên {episode.platform === 'youtube' ? 'YouTube' : 'Facebook'} ↗
          </a>
        </div>
      )}
    </div>
  );
}
