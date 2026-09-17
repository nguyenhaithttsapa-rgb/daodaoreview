'use client';

import Link from 'next/link';
import AdBanner from '@/components/AdBanner';
import VideoPlayer from '@/components/VideoPlayer';
import { Play, Sparkles, Flame, Eye, Layers, Clock, Search, Filter, X, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Series } from '@/types/video';

export default function Home() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/series')
      .then((res) => res.json())
      .then((data) => {
        setSeriesList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const categoriesList = ['Tất cả', 'Phim Ngắn', 'Kịch Tính', 'Đô Thị', 'Tu Tiên', 'Huyền Huyễn', 'Trọng Sinh', 'Nghịch Thiên', 'Khoa Huyễn 3D'];

  // Lọc phim thông minh: Theo Tên phim, Theo Thể loại, Theo Kênh và Nội dung mô tả
  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      // Lọc theo thể loại
      const matchCategory =
        activeCategory === 'Tất cả' ||
        s.categories?.some((c) => c.toLowerCase().includes(activeCategory.toLowerCase()));

      // Lọc theo từ khóa tìm kiếm (Tên phim, mô tả, thể loại, kênh)
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.categories?.some((c) => c.toLowerCase().includes(query)) ||
        s.channelName?.toLowerCase().includes(query) ||
        s.episodes?.some((ep) => ep.title?.toLowerCase().includes(query));

      return matchCategory && matchSearch;
    });
  }, [seriesList, activeCategory, searchQuery]);


  // Lọc ra các video ngắn (Reels/Shorts tỷ lệ 9:16), tự động lọc theo từ khóa tìm kiếm & thể loại
  const filteredShortEpisodes = useMemo(() => {
    const seenEpisodeUrls = new Set<string>();
    const query = searchQuery.trim().toLowerCase();

    return seriesList.flatMap((s) => {
      const matchCategory =
        activeCategory === 'Tất cả' ||
        s.categories?.some((c) => c.toLowerCase().includes(activeCategory.toLowerCase()));

      if (!matchCategory) return [];

      return (s.episodes || [])
        .filter((ep) => {
          const rawUrl = (ep.originalUrl || (ep as any).videoUrl || '').trim();
          const embedUrl = (ep.embedUrl || '').trim();
          if (ep.aspectRatio !== '9:16' || !embedUrl || !rawUrl) return false;

          const normalized = rawUrl.split('?')[0].replace(/\/$/, '');
          if (seenEpisodeUrls.has(normalized)) return false;
          seenEpisodeUrls.add(normalized);

          // Lọc theo từ khóa tìm kiếm (tên tập, tên phim, kênh, thể loại)
          if (query) {
            const matchQuery =
              (ep.title && ep.title.toLowerCase().includes(query)) ||
              (s.title && s.title.toLowerCase().includes(query)) ||
              (s.channelName && s.channelName.toLowerCase().includes(query)) ||
              (s.description && s.description.toLowerCase().includes(query)) ||
              s.categories?.some((c) => c.toLowerCase().includes(query));
            if (!matchQuery) return false;
          }

          return true;
        })
        .map((ep) => ({
          ...ep,
          seriesTitle: s.title,
          seriesSlug: s.slug,
          seriesThumbnail: ep.thumbnail || s.thumbnail,
        }));
    });
  }, [seriesList, searchQuery, activeCategory]);


  return (
    <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6 items-start justify-center">
      {/* Left Sidebar */}
      <aside className="hidden xl:flex w-60 flex-col gap-6 flex-shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none pb-8">
        <div className="bg-[#0a0514]/60 backdrop-blur-md border border-purple-900/40 rounded-3xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
          <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></span>
            Menu Chính
          </h3>
          <ul className="space-y-2">
            <li>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/20 to-purple-600/20 text-fuchsia-300 font-semibold border border-purple-500/30">
                🏠 Trang Chủ
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">
                🔥 Thịnh Hành
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">
                🕒 Lịch Sử Xem
              </button>
            </li>
            <li>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">
                ❤️ Yêu Thích
              </button>
            </li>
          </ul>
        </div>

        <div className="bg-[#0a0514]/60 backdrop-blur-md border border-purple-900/40 rounded-3xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.1)] flex-1">
          <h3 className="text-fuchsia-400 font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_#d946ef]"></span>
            Khám Phá
          </h3>
          <ul className="space-y-1">
            {categoriesList.map(cat => (
              <li key={cat}>
                <button 
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-4 py-2 rounded-xl transition ${activeCategory === cat ? 'text-cyan-300 bg-cyan-900/30 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-purple-900/20'}`}
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 max-w-4xl mx-auto space-y-8">
  
      {/* Banner Quảng cáo Vị trí Top */}
      <AdBanner position="top" />

      {/* THANH TÌM KIẾM VIDEO DUY NHẤT & BỘ LỌC THỂ LOẠI TỐI ƯU */}
      <div className="bg-[#0a0514]/70 border border-cyan-500/20 rounded-3xl shadow-[0_0_25px_rgba(6,182,212,0.1)] p-5 sm:p-6 shadow-2xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-cyan-400 neon-text-blue absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Nhập tên phim, tập phim, thể loại hoặc nội dung cần tìm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 hover:border-cyan-500/50 focus:border-cyan-400 rounded-2xl pl-12 pr-12 py-3 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 text-sm text-slate-400 px-1">
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Đang lọc: <strong className="text-white">{activeCategory}</strong></span>
              {searchQuery && (
                <span className="text-fuchsia-400 font-semibold neon-text-purple truncate max-w-[150px]">("{searchQuery}")</span>
              )}
            </div>
            <span className="text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-xl text-xs font-bold">
              {filteredSeries.length} kết quả
            </span>
          </div>
        </div>

        {/* Danh mục nhanh (Category Filters) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm font-medium text-slate-300">
          {categoriesList.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)] border-transparent'
                    : 'bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* KHU VỰC PHÁT TRỰC TIẾP VIDEO ĐƯỢC TÌM KIẾM (NẾU ĐANG TÌM KIẾM) */}
      {searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-cyan-400 fill-cyan-400 neon-text-blue" />
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Phát Trực Tiếp Video Tìm Thấy
              </h2>
            </div>
            <span className="text-sm text-cyan-400 font-medium">Xem ngay tại trang</span>
          </div>

          {filteredSeries.length > 0 && filteredSeries[0].episodes?.length > 0 ? (
            <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] p-4 sm:p-6 shadow-2xl space-y-4">
              <div className="flex flex-col lg:flex-row gap-6 items-center">
                {/* Trình phát nhúng video trực tiếp */}
                <div className="w-full lg:w-1/2 flex justify-center">
                  <VideoPlayer episode={filteredSeries[0].episodes[0]} />
                </div>

                {/* Thông tin chi tiết & danh sách tập */}
                <div className="w-full lg:w-1/2 space-y-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)] uppercase tracking-wider mb-2">
                      Kết quả chính xác nhất
                    </span>
                    <h3 className="text-3xl font-extrabold text-white leading-tight">
                      {filteredSeries[0].title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-2">
                      Kênh: <strong className="text-slate-200">{filteredSeries[0].channelName}</strong> • {filteredSeries[0].totalEpisodes} Tập
                    </p>
                  </div>

                  <p className="text-base text-slate-300 leading-relaxed line-clamp-3">
                    {filteredSeries[0].description}
                  </p>

                  {/* Danh sách tập chọn nhanh để phát trực tiếp */}
                  {filteredSeries[0].episodes.length > 1 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-sm font-bold text-slate-300">Chọn tập để xem tiếp:</span>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                        {filteredSeries[0].episodes.map((ep) => (
                          <Link
                            key={ep.id}
                            href={`/watch/${filteredSeries[0].slug}?part=${ep.partNumber}`}
                            className="px-3 py-1.5 rounded-xl bg-slate-950/50 hover:bg-cyan-600 border border-purple-900/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] text-sm font-semibold text-slate-200 hover:text-white transition"
                          >
                            Tập {ep.partNumber}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      href={`/watch/${filteredSeries[0].slug}`}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 text-sm"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Mở Trang Chi Tiết Đầy Đủ</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
              Không tìm thấy video nào khớp với từ khóa "{searchQuery}".
            </div>
          )}
        </section>
      )}

      {/* Reels / Shorts Section (9:16) */}
      {filteredShortEpisodes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-400 neon-text-purple" />
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {searchQuery ? `Reels Khớp Từ Khóa (${filteredShortEpisodes.length})` : 'Reels & Phim Ngắn Kịch Tính (Nổi Bật)'}
              </h2>
            </div>
            <span className="text-sm text-slate-400">Đoạn ngắn cao trào triệu view</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {filteredShortEpisodes.slice(0, 12).map((ep, idx) => {
              const bgGradients = [
                'from-cyan-900/40 to-[#05010a]',
                'from-purple-900/40 to-[#05010a]',
                'from-fuchsia-900/40 to-[#05010a]',
                'from-indigo-900/40 to-[#05010a]',
              ];
              const gradient = bgGradients[idx % bgGradients.length];

              return (
                <Link
                  key={ep.id}
                  href={`/watch/${ep.seriesSlug}?part=${ep.partNumber}`}
                  className="group relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 hover:border-fuchsia-500/60 transition hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] aspect-[9/16] flex flex-col justify-end p-3 shadow-lg transform hover:-translate-y-1"
                >
                  {/* Ảnh Poster Đại Diện Của Phim / Tập */}
                  <img
                    src={ep.seriesThumbnail || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80'}
                    alt={ep.title}
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition duration-500"
                  />
                  {/* Gradient tối dần từ dưới lên để chữ hiển thị rõ nét */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 z-10" />

                  <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[11px] font-semibold text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] uppercase tracking-wider">
                    {ep.platform}
                  </div>
                  <div className="relative z-20 space-y-1">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-fuchsia-600 text-xs shadow-[0_0_10px_rgba(168,85,247,0.6)] font-bold text-white shadow">
                      Tập {ep.partNumber}
                    </span>
                    <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-cyan-300 transition group-hover:neon-text-blue">
                      {ep.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <Eye className="w-3 h-3 text-cyan-400" />
                      <span>{ep.viewsCount?.toLocaleString() || 0} lượt xem</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Series Grid Section (Danh sách các bộ phim tổng hợp) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-fuchsia-500 neon-text-purple" />
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {searchQuery ? `Tất Cả Các Bộ Khớp Với "${searchQuery}"` : (activeCategory === 'Tất cả' ? 'Tất Cả Các Bộ Phim & Video' : `Thể Loại: ${activeCategory}`)}
            </h2>
          </div>
          <span className="text-sm text-slate-400">Tìm thấy {filteredSeries.length} tác phẩm</span>
        </div>

        {filteredSeries.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            Chưa có bộ phim nào thuộc thể loại này. Bạn có thể thêm trong trang Admin!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredSeries.map((series) => (
              <Link
                key={series.id}
                href={`/watch/${series.slug}`}
                className="group bg-slate-900/60 rounded-2xl border border-slate-800/80 border-purple-900/30 hover:border-cyan-500/50 overflow-hidden shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-800">
                  <img
                    src={series.thumbnail}
                    alt={series.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {series.categories?.slice(0, 2).map((cat) => (
                      <span key={cat} className="px-2 py-0.5 rounded bg-black/70 backdrop-blur text-xs font-medium text-cyan-200 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/80 backdrop-blur text-sm font-semibold text-white flex items-center gap-1">
                    <Play className="w-3 h-3 fill-fuchsia-500 text-fuchsia-500" />
                    <span>{series.totalEpisodes || series.episodes?.length || 0} Tập</span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-lg text-white group-hover:text-fuchsia-300 line-clamp-2 transition leading-snug">
                    {series.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    {series.description}
                  </p>
                  <div className="pt-2 flex items-center justify-between text-sm text-slate-400 border-t border-slate-800/60">
                    <span className="font-medium text-slate-300">{series.channelName}</span>
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Cập nhật: {series.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    
      </div>

      {/* Right Sidebar */}
      <aside className="hidden 2xl:flex w-72 flex-col gap-6 flex-shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none pb-8">
        <div className="bg-[#0a0514]/60 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-purple-900/50 pb-3">
            🏆 Bảng Xếp Hạng
          </h3>
          <div className="space-y-4 mt-4">
            {seriesList.slice(0, 5).map((series, idx) => (
              <Link href={`/watch/${series.slug}`} key={series.id} className="flex gap-3 group">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-purple-600 opacity-50 group-hover:opacity-100 transition w-6 text-center">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-300 group-hover:text-cyan-300 line-clamp-2 leading-snug transition">{series.title}</h4>
                  <p className="text-xs text-fuchsia-400 mt-1">{series.episodes?.length || 1} Tập</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-cyan-900/20 backdrop-blur-md border border-purple-500/30 rounded-3xl p-5 text-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <h4 className="text-cyan-300 font-bold mb-2">Đăng Nhập Ngay</h4>
          <p className="text-xs text-slate-400 mb-4">Lưu lại tiến trình xem và tạo danh sách yêu thích của riêng bạn.</p>
          <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all">
            Đăng Nhập
          </button>
        </div>
      </aside>
  
    </div>
  );
}