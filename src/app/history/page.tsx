'use client';

import Link from 'next/link';
import { useUserLibrary } from '@/hooks/useUserLibrary';
import { Play, Clock, Trash2, ArrowLeft } from 'lucide-react';

export default function HistoryPage() {
  const { history, clearHistory, mounted } = useUserLibrary();

  if (!mounted) return <div className="p-8 text-center text-white">Đang tải...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Lịch Sử Xem Phim</h1>
        </div>
        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/30 text-red-400 rounded-xl hover:bg-red-900/50 transition border border-red-500/30"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa tất cả</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800">
          <Clock className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Bạn chưa xem bộ phim nào.</p>
          <Link href="/" className="inline-block mt-6 px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition">
            Khám Phá Ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {history.map((item) => (
            <Link
              href={`/watch/${item.slug}?part=${item.lastPart || 1}`}
              key={item.seriesId}
              className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition duration-300"
            >
              <div className="aspect-[3/4] relative">
                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition" />
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-bold border border-slate-700">
                  Tập {item.lastPart || 1}
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-cyan-300">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Đã xem: {new Date(item.savedAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
