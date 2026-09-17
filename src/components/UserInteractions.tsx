'use client';

import { useEffect } from 'react';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { Series } from '@/types/video';
import { Heart } from 'lucide-react';

export default function UserInteractions({ series, currentPart }: { series: Series, currentPart: number }) {
  const { toggleFavorite, isFavorite, addToHistory, mounted } = useUserLibrary();

  // Tự động lưu vào lịch sử xem khi component được load
  useEffect(() => {
    addToHistory(series, currentPart);
  }, [series.id, currentPart]);

  if (!mounted) return null; // Avoid hydration mismatch

  const fav = isFavorite(series.id);

  return (
    <button
      onClick={() => toggleFavorite(series)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
        fav 
          ? 'bg-pink-500/20 text-pink-500 border border-pink-500/50 hover:bg-pink-500/30' 
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
      }`}
    >
      <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
      {fav ? 'Đã Lưu Yêu Thích' : 'Lưu Yêu Thích'}
    </button>
  );
}
