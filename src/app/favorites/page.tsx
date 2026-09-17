'use client';

import Link from 'next/link';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { Heart, ArrowLeft } from 'lucide-react';

export default function FavoritesPage() {
  const { favorites, mounted } = useUserLibrary();

  if (!mounted) return <div className="p-8 text-center text-white">Đang tải...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          Tủ Phim Yêu Thích <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
        </h1>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
          <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Tủ phim của bạn đang trống.</p>
          <Link href="/" className="inline-block mt-6 px-6 py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-500 transition">
            Tìm Phim Hay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favorites.map((item) => (
            <Link
              href={`/watch/${item.slug}`}
              key={item.seriesId}
              className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-pink-500/50 transition duration-300"
            >
              <div className="aspect-[3/4] relative">
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition" />
                <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1.5 shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                   <Heart className="w-3 h-3 text-white fill-white" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-pink-300">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Lưu lúc: {new Date(item.savedAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
