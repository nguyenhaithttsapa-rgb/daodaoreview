'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, Minimize, ChevronLeft, ChevronRight, ArrowUpDown, Sparkles, Film } from 'lucide-react';
import { Episode } from '@/types/video';

export interface NavFilmInfo {
  slug: string;
  title: string;
  thumbnail?: string;
}

interface VideoPlayerProps {
  episode: Episode;
  prevFilm?: NavFilmInfo;
  nextFilm?: NavFilmInfo;
  currentIndex?: number;
  totalFilms?: number;
}

export default function VideoPlayer({
  episode,
  prevFilm,
  nextFilm,
  currentIndex,
  totalFilms
}: VideoPlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitioning, setTransitioning] = useState<{
    direction: 'next' | 'prev';
    title: string;
  } | null>(null);

  const isVertical =
    episode.aspectRatio === '9:16' ||
    (episode.title && (episode.title.includes('Dọc') || episode.title.includes('Reel')));

  // Tối ưu link embed để loại bỏ tối đa đề xuất rác & chú thích thừa
  let cleanEmbedUrl = episode.embedUrl;
  if (episode.platform === 'youtube' || cleanEmbedUrl.includes('youtube.com/embed/')) {
    const separator = cleanEmbedUrl.includes('?') ? '&' : '?';
    cleanEmbedUrl = `${cleanEmbedUrl}${separator}rel=0&modestbranding=1&iv_load_policy=3`;
  }

  // Pre-load các trang phim kế tiếp và trước đó để chuyển trang siêu tốc
  useEffect(() => {
    if (prevFilm?.slug) {
      router.prefetch(`/watch/${prevFilm.slug}`);
    }
    if (nextFilm?.slug) {
      router.prefetch(`/watch/${nextFilm.slug}`);
    }
  }, [prevFilm?.slug, nextFilm?.slug, router]);

  // Reset trạng thái transitioning khi đổi phim (đảm bảo không bao giờ bị kẹt)
  useEffect(() => {
    setTransitioning(null);
  }, [episode.id, cleanEmbedUrl]);

  // Lắng nghe sự kiện thoát Fullscreen (bằng nút cứng điện thoại hoặc phím Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Điều hướng sang phim trước
  const navigateToPrev = useCallback(() => {
    if (!prevFilm?.slug) return;
    setTransitioning({ direction: 'prev', title: prevFilm.title });
    router.push(`/watch/${prevFilm.slug}`);
    setTimeout(() => setTransitioning(null), 2000);
  }, [prevFilm, router]);

  // Điều hướng sang phim tiếp theo
  const navigateToNext = useCallback(() => {
    if (!nextFilm?.slug) return;
    setTransitioning({ direction: 'next', title: nextFilm.title });
    router.push(`/watch/${nextFilm.slug}`);
    setTimeout(() => setTransitioning(null), 2000);
  }, [nextFilm, router]);

  // Lắng nghe phím điều hướng bàn phím (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        navigateToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        navigateToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToNext, navigateToPrev]);

  // Lắng nghe cử chỉ vuốt toàn trang (Global Touch Swipe)
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTracking = false;

    const handleGlobalTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Tránh cướp thao tác khi người dùng cuộn danh sách tập phim riêng hoặc đang gõ phím
      if (target.closest('input') || target.closest('textarea') || target.closest('.overflow-y-auto')) {
        isTracking = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isTracking = true;
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const duration = Date.now() - startTime;
      const diffX = endX - startX;
      const diffY = endY - startY;

      // Cho phép thời gian vuốt thoải mái lên đến 900ms
      if (duration > 900) return;

      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const minDistance = 30;

      if (absX < minDistance && absY < minDistance) return;

      // Ưu tiên trục vuốt lớn hơn
      if (absY > absX) {
        // Vuốt dọc (Lên / Xuống)
        if (diffY < -minDistance) {
          // Vuốt lên -> Phim tiếp theo
          navigateToNext();
        } else if (diffY > minDistance) {
          // Vuốt xuống -> Phim trước
          navigateToPrev();
        }
      } else {
        // Vuốt ngang (Trái / Phải)
        if (diffX < -minDistance) {
          // Vuốt sang trái -> Phim tiếp theo
          navigateToNext();
        } else if (diffX > minDistance) {
          // Vuốt sang phải -> Phim trước
          navigateToPrev();
        }
      }
    };

    window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleGlobalTouchStart);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [navigateToNext, navigateToPrev]);

  // Bộ bắt cử chỉ vuốt chuyên dụng ngay trên khung Video Player
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handlePlayerTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const duration = Date.now() - start.time;
    if (duration > 900) return;

    const diffX = endX - start.x;
    const diffY = endY - start.y;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const minDistance = 30;

    if (absX < minDistance && absY < minDistance) return;

    if (absY > absX) {
      if (diffY < -minDistance) {
        navigateToNext();
      } else if (diffY > minDistance) {
        navigateToPrev();
      }
    } else {
      if (diffX < -minDistance) {
        navigateToNext();
      } else if (diffX > minDistance) {
        navigateToPrev();
      }
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
        // @ts-ignore
        if (screen.orientation && screen.orientation.lock) {
          // Luôn khóa xoay ngang màn hình (Landscape) khi bấm phóng to để xem to và rõ nhất
          // @ts-ignore
          await screen.orientation.lock('landscape').catch(() => {});
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
    <div
      ref={containerRef}
      className={`flex flex-col relative group items-center overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'w-full h-full bg-black p-0 justify-center'
          : `rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.15)] border border-purple-900/40 p-2 sm:p-4 space-y-3 ${
              isVertical
                ? 'w-full max-w-[420px] mx-auto bg-[#0a0514]/80 backdrop-blur-xl'
                : 'w-full bg-[#0a0514]/80 backdrop-blur-md'
            }`
      }`}
    >
      {/* Huy hiệu thứ tự phim góc trên bên trái */}
      {typeof currentIndex === 'number' && typeof totalFilms === 'number' && !isFullscreen && (
        <div className="absolute top-4 left-4 z-30 bg-black/70 backdrop-blur-md border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <Film className="w-3 h-3 text-cyan-400" />
          <span>#{currentIndex + 1} / {totalFilms}</span>
        </div>
      )}

      {/* Nút phóng to / quay ngang */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-[60] bg-black/70 hover:bg-black/90 text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)] border border-cyan-500/80 backdrop-blur-sm transition-all flex items-center justify-center opacity-85 hover:opacity-100"
        title="Toàn màn hình (Quay ngang)"
      >
        {isFullscreen ? (
          <Minimize className="w-5 h-5 text-rose-400" />
        ) : (
          <Maximize className="w-5 h-5 text-cyan-400" />
        )}
      </button>

      <div
        className={`relative w-full ${
          isFullscreen
            ? 'h-full flex-1 max-w-none'
            : isVertical
            ? 'aspect-[9/16]'
            : 'max-w-4xl aspect-video'
        } bg-black ${isFullscreen ? '' : 'rounded-xl border border-cyan-500/20 shadow-inner'} overflow-hidden`}
      >
        {/* Iframe trình phát video: BẮT BUỘC có key={cleanEmbedUrl} để React hủy video cũ và nạp ngay video mới khi vuốt */}
        <iframe
          key={cleanEmbedUrl}
          src={cleanEmbedUrl}
          title={episode.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />

        {/* Dải bắt cử chỉ mép trái & phải: Bắt trọn thao tác vuốt từ mép màn hình */}
        <div
          className="absolute top-12 bottom-16 left-0 w-10 z-20 pointer-events-auto touch-none"
          onTouchStart={handlePlayerTouchStart}
          onTouchEnd={handlePlayerTouchEnd}
          aria-label="Vuốt mép trái đổi phim"
        />
        <div
          className="absolute top-12 bottom-16 right-0 w-10 z-20 pointer-events-auto touch-none"
          onTouchStart={handlePlayerTouchStart}
          onTouchEnd={handlePlayerTouchEnd}
          aria-label="Vuốt mép phải đổi phim"
        />

        {/* Màn hình HUD thông báo chuyển phim mượt mà */}
        {transitioning && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.8)] animate-bounce mb-3">
              {transitioning.direction === 'next' ? (
                <ChevronRight className="w-8 h-8 text-white" />
              ) : (
                <ChevronLeft className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="text-cyan-300 font-bold text-xs uppercase tracking-wider mb-1">
              {transitioning.direction === 'next'
                ? 'Đang chuyển sang phim kế tiếp...'
                : 'Đang chuyển về phim trước...'}
            </div>
            <div className="text-white text-sm font-semibold max-w-xs truncate px-2">
              {transitioning.title}
            </div>
          </div>
        )}
      </div>

      {/* Thanh điều hướng và gợi ý vuốt đặt HOÀN TOÀN BÊN DƯỚI video, không che thanh trượt thời gian và thời lượng */}
      {!isFullscreen && (
        <div className="w-full max-w-4xl flex items-center justify-between gap-3 px-1 py-1 select-none">
          <button
            onClick={() => navigateToPrev()}
            disabled={!prevFilm}
            className="flex items-center gap-1.5 text-slate-200 hover:text-cyan-400 py-2 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/40 transition-all disabled:opacity-30 cursor-pointer shadow-sm text-xs font-semibold"
            title={prevFilm ? `Phim trước: ${prevFilm.title}` : 'Không có'}
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span>Phim trước</span>
          </button>

          <div
            onClick={() => navigateToNext()}
            className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3.5 py-1.5 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer hover:bg-cyan-900/80 transition-all text-xs font-medium"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
            <span>Vuốt lên / sang đổi phim</span>
          </div>

          <button
            onClick={() => navigateToNext()}
            disabled={!nextFilm}
            className="flex items-center gap-1.5 text-slate-200 hover:text-purple-400 py-2 px-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/40 transition-all disabled:opacity-30 cursor-pointer shadow-sm text-xs font-semibold"
            title={nextFilm ? `Phim tiếp: ${nextFilm.title}` : 'Không có'}
          >
            <span>Phim tiếp</span>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      )}
    </div>
  );
}
