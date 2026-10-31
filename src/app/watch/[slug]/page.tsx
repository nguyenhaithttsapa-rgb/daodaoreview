import { Metadata } from 'next';
import { getSeriesBySlug, getAllSeries } from '@/lib/store';
import VideoPlayer from '@/components/VideoPlayer';
import AdBanner from '@/components/AdBanner';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import UserInteractions from '@/components/UserInteractions';
import { getSafeThumbnail } from '@/lib/thumbnailHelper';
import { Play, Share2, ThumbsUp, ChevronRight, ChevronLeft, CheckCircle2, Bookmark, Sparkles } from 'lucide-react';

interface WatchPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ part?: string }>;
}

export const dynamic = 'force-dynamic';

function durationToIso8601(durStr?: string): string {
  if (!durStr) return 'PT45M';
  const parts = durStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 'PT45M';
  if (parts.length === 3) {
    return `PT${parts[0]}H${parts[1]}M${parts[2]}S`;
  }
  if (parts.length === 2) {
    return `PT${parts[0]}M${parts[1]}S`;
  }
  return 'PT45M';
}

export async function generateMetadata({ params, searchParams }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { part } = await searchParams;
  const series = getSeriesBySlug(slug);

  if (!series) {
    return {
      title: 'Không tìm thấy phim | Dao Dao Review',
    };
  }

  const requestedPart = part ? parseInt(part, 10) : 1;
  const currentEpisode =
    series.episodes.find((ep) => ep.partNumber === requestedPart) ||
    series.episodes[0];

  const pageTitle = series.episodes.length > 1 && requestedPart > 1
    ? `Tập ${requestedPart}: ${series.title} | Dao Dao Review`
    : `${series.title} | Dao Dao Review`;

  const rawDesc = (series.description || '').trim();
  const enrichedDesc = rawDesc.length >= 110
    ? rawDesc
    : `${rawDesc || series.title} - Xem trọn bộ thuyết minh chất lượng cao (${currentEpisode?.duration || 'Full'}) kênh ${series.channelName} hoàn toàn không quảng cáo tại Dao Dao Review.`;
  const pageDesc = enrichedDesc.slice(0, 158);
  const canonicalUrl = `https://daodaoreview.com/watch/${series.slug}`;
  const thumbUrl = series.thumbnail?.startsWith('http')
    ? series.thumbnail
    : `https://daodaoreview.com${series.thumbnail || '/og-image.jpg'}`;

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: canonicalUrl,
      siteName: 'Dao Dao Review',
      images: [
        {
          url: thumbUrl,
          width: 1200,
          height: 630,
          alt: series.title,
        },
      ],
      locale: 'vi_VN',
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDesc,
      images: [thumbUrl],
    },
  };
}

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
  
  // Tính toán phim trước & phim tiếp theo tuần tự theo đúng vị trí trong CSDL
  const allSeries = getAllSeries();
  const currentIndex = allSeries.findIndex((s) => s.slug === series.slug || s.id === series.id);
  const validIndex = currentIndex >= 0 ? currentIndex : 0;
  const totalSeries = allSeries.length;

  const prevIndex = (validIndex - 1 + totalSeries) % totalSeries;
  const nextIndex = (validIndex + 1) % totalSeries;

  const prevSeries = allSeries[prevIndex];
  const nextSeries = allSeries[nextIndex];

  // Gợi ý 12 bộ phim liên quan để tăng liên kết nội bộ (Internal Linking SEO) & giữ chân người xem
  const relatedSeries = allSeries
    .filter((s) => s.slug !== series.slug)
    .slice(0, 12);

  const thumbFullUrl = series.thumbnail?.startsWith('http')
    ? series.thumbnail
    : `https://daodaoreview.com${series.thumbnail || '/og-image.jpg'}`;

  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoObject',
        name: currentEpisode?.title || series.title,
        description: series.description || series.title,
        thumbnailUrl: [thumbFullUrl],
        uploadDate: `${currentEpisode?.publishedAt || series.updatedAt || '2026-10-01'}T00:00:00+07:00`,
        duration: durationToIso8601(currentEpisode?.duration),
        embedUrl: currentEpisode?.embedUrl,
        interactionStatistic: {
          '@type': 'InteractionCounter',
          interactionType: { '@type': 'WatchAction' },
          userInteractionCount: currentEpisode?.viewsCount || 25000,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Trang chủ',
            item: 'https://daodaoreview.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: series.title,
            item: `https://daodaoreview.com/watch/${series.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
      />
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
          {/* Trình phát Video Nhúng tích hợp vuốt chuyển phim tuần tự */}
          <VideoPlayer
            episode={currentEpisode}
            prevFilm={{
              slug: prevSeries.slug,
              title: prevSeries.title,
              thumbnail: prevSeries.thumbnail
            }}
            nextFilm={{
              slug: nextSeries.slug,
              title: nextSeries.title,
              thumbnail: nextSeries.thumbnail
            }}
            currentIndex={validIndex}
            totalFilms={totalSeries}
          />
          
          {/* Bộ điều hướng chuyển phim tuần tự Trước / Sau */}
          <div className="w-full space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href={`/watch/${prevSeries.slug}`}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-[#0a0514]/90 hover:bg-[#160a2c] border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ChevronLeft className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-cyan-400 font-semibold tracking-wider uppercase">
                    ❮ PHIM TRƯỚC
                  </div>
                  <div className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                    {prevSeries.title}
                  </div>
                </div>
              </Link>

              <Link 
                href={`/watch/${nextSeries.slug}`}
                className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#0a0514]/90 hover:bg-[#160a2c] border border-purple-500/30 hover:border-purple-400 transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] min-w-0 text-right"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-fuchsia-400 font-semibold tracking-wider uppercase">
                    PHIM TIẾP THEO ❯
                  </div>
                  <div className="text-sm font-bold text-white truncate group-hover:text-fuchsia-300 transition-colors">
                    {nextSeries.title}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <ChevronRight className="w-5 h-5 text-fuchsia-400" />
                </div>
              </Link>
            </div>

            {/* Chỉ dẫn cử chỉ vuốt thông minh */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Vuốt màn hình (lên/xuống hoặc sang trái/phải) để chuyển phim</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500/20">
                Phim {validIndex + 1}/{totalSeries}
              </span>
            </div>
          </div>


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
              <div className="mt-4"><UserInteractions series={series} currentPart={currentEpisode.partNumber} /></div>
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
                    src={series.channelAvatar || '/avatar.jpg'}
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

      {/* Khu vực Phim Đề Xuất Liên Quan (Tăng sức mạnh Internal Linking SEO cho Googlebot & Bingbot) */}
      {relatedSeries.length > 0 && (
        <section className="mt-10 pt-8 border-t border-purple-900/40">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span>Phim Đề Xuất Đang Hot</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedSeries.map((rel) => (
              <Link
                key={rel.id}
                href={`/watch/${rel.slug}`}
                className="group rounded-xl overflow-hidden bg-[#0a0514]/80 border border-purple-900/40 hover:border-cyan-500/50 transition flex flex-col"
              >
                <div className="aspect-video w-full overflow-hidden bg-slate-900 relative">
                  <img
                    src={getSafeThumbnail(rel.thumbnail, rel.id || rel.title)}
                    alt={rel.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-2">
                    {rel.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 mt-1 truncate">
                    {rel.channelName}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
