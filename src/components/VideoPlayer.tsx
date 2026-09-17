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

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        // Ép xoay ngang màn hình trên điện thoại
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Trả lại xoay dọc
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  };

  const isVertical = episode.aspectRatio === '9:16';

  return (
    <div ref={containerRef}
      className={`flex flex-col relative group items-center rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] border border-purple-900/40 p-2 sm:p-4 space-y-3 transition-all duration-300 ${
        isVertical ? 'w-full max-w-[420px] mx-auto bg-[#0a0514]/80 backdrop-blur-xl' : 'w-full bg-[#0a0514]/80 backdrop-blur-md'
      }`}
    >

      {/* Nút phóng to / quay ngang */}
      <button 
        onClick={toggleFullscreen} 
        className="absolute top-16 right-4 z-[60] bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)] border border-cyan-500/80 backdrop-blur-sm transition-all flex items-center justify-center opacity-80 hover:opacity-100"
        title="Toàn màn hình (Quay ngang)"
      >
        {isFullscreen ? <Minimize className="w-6 h-6 text-rose-400" /> : <Maximize className="w-6 h-6 text-cyan-400" />}
      </button>

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
