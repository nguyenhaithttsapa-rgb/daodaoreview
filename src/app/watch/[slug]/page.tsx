import { getSeriesBySlug, getAllSeries } from '@/lib/store';
import VideoPlayer from '@/components/VideoPlayer';
import AdBanner from '@/components/AdBanner';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Play, Share2, ThumbsUp, MessageSquare, ChevronRight, CheckCircle2, Bookmark } from 'lucide-react';

interface WatchPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ part?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const { part } = await searchParams;

  const series = getSeriesBySlug(slug);
  if (!series) {
    notFound();
  }

  const requestedPart = part ? parseInt(part, 10) : 1;
  const currentEpisode =
    series.episodes.find((ep) => ep.partNumber === requestedPart) ||
    series.episodes[0];

  const nextEpisode = series.episodes.find(
    (ep) => ep.partNumber === (currentEpisode?.partNumber || 1) + 1
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 overflow-hidden text-ellipsis whitespace-nowrap">
        <Link href="/" className="hover:text-white transition">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/watch/${series.slug}`} className="hover:text-white transition font-medium text-slate-300">
          {series.title}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-cyan-400 neon-text-blue font-semibold">Tập {currentEpisode.partNumber}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột chính: Trình phát Video + Thông tin */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trình phát Video Nhúng */}
          <VideoPlayer episode={currentEpisode} />

          {/* Tiêu đề & Tác vụ */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {currentEpisode.title}
                </h1>
                <p className="text-sm text-slate-400 mt-2">
                  Thuộc bộ: <span className="text-slate-200 font-medium">{series.title}</span> • Đăng ngày {currentEpisode.publishedAt}
                </p>
              </div>

              {/* Nút chuyển tập kế tiếp nhanh */}
              {nextEpisode && (
                <Link
                  href={`/watch/${series.slug}?part=${nextEpisode.partNumber}`}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-white text-base font-semibold px-4 py-2 rounded-xl shadow-lg transition self-start sm:self-auto"
                >
                  <span>Tập Tiếp ({nextEpisode.partNumber})</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Kênh & Tương tác */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0a0514]/60 backdrop-blur-md border border-purple-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-900/30 border border-purple-500/20 overflow-hidden border border-slate-700">
                  <img
                    src={series.channelAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={series.channelName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>{series.channelName}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  </h4>
                  <p className="text-sm text-slate-400">Review Hoạt Hình Chuyên Nghiệp</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-semibold">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/30 hover:bg-cyan-900/40 border border-purple-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] text-slate-200 transition">
                  <ThumbsUp className="w-4 h-4 text-cyan-400 neon-text-blue" />
                  <span>Thích</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/30 hover:bg-cyan-900/40 border border-purple-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] text-slate-200 transition">
                  <Bookmark className="w-4 h-4 text-fuchsia-400" />
                  <span>Theo dõi</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/30 hover:bg-cyan-900/40 border border-purple-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] text-slate-200 transition">
                  <Share2 className="w-4 h-4" />
                  <span>Chia sẻ</span>
                </button>
              </div>
            </div>

            {/* Mô tả bộ phim */}
            <div className="p-4 rounded-xl bg-[#0a0514]/40 backdrop-blur-md border border-purple-900/40/80 text-base text-slate-300 leading-relaxed space-y-2">
              <h4 className="font-semibold text-white">Tóm tắt nội dung:</h4>
              <p>{series.description}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {series.categories.map((cat) => (
                  <span key={cat} className="text-sm px-2.5 py-1 rounded-md bg-purple-900/30 border border-purple-500/20 text-fuchsia-400 font-medium">
                    #{cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Banner quảng cáo chân trang xem */}
            <AdBanner position="top" />
          </div>
        </div>

        {/* Cột phụ: Danh sách tập (Next Episodes Playlist) & Quảng cáo Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#0a0514]/80 backdrop-blur-md border border-purple-900/40 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                <span>Danh Sách Tập ({series.episodes.length})</span>
              </h3>
              <span className="text-sm text-slate-400">Bấm để đổi tập</span>
            </div>

            <div className="divide-y divide-slate-800/60 mt-2 max-h-[520px] overflow-y-auto pr-1">
              {series.episodes.map((ep) => {
                const isActive = ep.partNumber === currentEpisode.partNumber;
                return (
                  <Link
                    key={ep.id}
                    href={`/watch/${series.slug}?part=${ep.partNumber}`}
                    className={`flex items-center gap-3 p-3 rounded-xl my-1 transition ${
                      isActive
                        ? 'bg-purple-600/20 border border-purple-500/40 text-fuchsia-300 shadow-[inset_0_0_15px_rgba(168,85,247,0.2)]'
                        : 'hover:bg-purple-900/20 text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                        isActive ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border-transparent' : 'bg-purple-900/30 border border-purple-500/20 text-slate-400'
                      }`}
                    >
                      {ep.partNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                        {ep.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="uppercase">{ep.platform}</span>
                        <span>•</span>
                        <span>{ep.aspectRatio === '9:16' ? 'Dọc (Reel)' : 'Ngang (16:9)'}</span>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] text-white flex-shrink-0">
                        Đang xem
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quảng cáo sidebar */}
          <AdBanner position="sidebar" />
        </div>
      </div>
    </div>
  );
}
