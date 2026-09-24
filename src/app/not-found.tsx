import Link from 'next/link';
import { Film, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-[#0a0514]/80 backdrop-blur-xl p-8 rounded-3xl border border-purple-900/50 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
        {/* Icon & 404 Header */}
        <div className="relative inline-block">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)]">
            <Film className="w-10 h-10 text-white" />
          </div>
          <span className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full border border-black">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
            Không Tìm Thấy Trang
          </h1>
          <p className="text-sm text-purple-200/70">
            Tập phim hoặc liên kết bạn truy cập không tồn tại hoặc đã được cập nhật sang đường dẫn mới.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-105"
          >
            <Home className="w-4 h-4" /> Về Trang Chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
