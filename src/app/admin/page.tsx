'use client';

import { useState, useEffect } from 'react';
import { Series } from '@/types/video';
import { parseVideoUrl } from '@/lib/parser';
import { PlusCircle, Link as LinkIcon, Film, CheckCircle2, AlertCircle, PlaySquare, Layers, Search, Bot, Trash2, ShieldCheck, Sparkles, Video, Upload, Image as ImageIcon, Eye } from 'lucide-react';

export default function AdminPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Thêm Tập Phim
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [episodeUrl, setEpisodeUrl] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [previewParse, setPreviewParse] = useState<any>(null);
  const [epStatus, setEpStatus] = useState<string | null>(null);

  // Form Thêm Bộ Phim Mới
  const [newSeriesTitle, setNewSeriesTitle] = useState('');
  const [newSeriesDesc, setNewSeriesDesc] = useState('');
  const [newSeriesChannel, setNewSeriesChannel] = useState('');
  const [newSeriesThumbnail, setNewSeriesThumbnail] = useState('');
  const [newSeriesCategories, setNewSeriesCategories] = useState('Tu Tiên, Huyền Huyễn');
  const [seriesStatus, setSeriesStatus] = useState<string | null>(null);

  // Form Cào & Nhập Hàng Loạt Tự Động (Batch Scraper / Importer)
  const [batchRawText, setBatchRawText] = useState('');
  const [batchChannelName, setBatchChannelName] = useState('Đại Đạo Review');
  const [batchStatus, setBatchStatus] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<any>(null);

  // Bot Dọn Dẹp & Lọc Video Trùng Lặp / Không Nhúng Được
  const [cleanerLoading, setCleanerLoading] = useState(false);
  const [cleanerResult, setCleanerResult] = useState<any>(null);

  // Bot Cào Tự Động Facebook Reels Theo Kênh / URL / Hình Ảnh
  const [reelCrawlUrl, setReelCrawlUrl] = useState('');
  const [reelCrawlChannel, setReelCrawlChannel] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [reelCrawlLoading, setReelCrawlLoading] = useState(false);
  const [reelCrawlResult, setReelCrawlResult] = useState<any>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage(base64);
    };
    reader.readAsDataURL(file);
  }

  async function runReelCrawlerBot() {
    setReelCrawlLoading(true);
    setReelCrawlResult(null);
    try {
      const res = await fetch('/api/reel-crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: reelCrawlUrl.trim(),
          channelName: reelCrawlChannel.trim(),
          uploadedImage: uploadedImage || undefined,
          maxVideos: 50,
        }),
      });
      const data = await res.json();
      setReelCrawlResult(data);
      if (data.success) {
        fetchSeries();
      }
    } catch (err: any) {
      setReelCrawlResult({ error: 'Lỗi khi kích hoạt bot: ' + err.message });
    } finally {
      setReelCrawlLoading(false);
    }
  }

  async function runCleanerBot() {
    setCleanerLoading(true);
    setCleanerResult(null);
    try {
      const res = await fetch('/api/cleaner-bot', { method: 'POST' });
      const data = await res.json();
      setCleanerResult(data);
      if (data.success) {
        fetchSeries();
      }
    } catch (err: any) {
      setCleanerResult({ error: 'Lỗi khi kích hoạt bot: ' + err.message });
    } finally {
      setCleanerLoading(false);
    }
  }

  useEffect(() => {
    fetchSeries();
  }, []);

  async function fetchSeries() {
    try {
      const res = await fetch('/api/series');
      const data = await res.json();
      setSeriesList(data);
      if (data.length > 0 && !selectedSeriesId) {
        setSelectedSeriesId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Tự động phân tích khi dán link đơn
  function handleUrlChange(url: string) {
    setEpisodeUrl(url);
    if (url.trim()) {
      const parsed = parseVideoUrl(url);
      setPreviewParse(parsed);
    } else {
      setPreviewParse(null);
    }
  }

  // Xử lý Cào & Nhập Hàng Loạt
  async function handleBatchImport(e: React.FormEvent) {
    e.preventDefault();
    if (!batchRawText.trim()) return;

    try {
      setBatchStatus('Đang tự động bóc tách link và phân loại tập...');
      setBatchResult(null);

      const res = await fetch('/api/batch-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: batchRawText,
          channelName: batchChannelName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBatchStatus(`Thành công! Đã bóc tách ${data.scrapedCount} video. Tạo mới ${data.createdSeriesCount} bộ phim, thêm ${data.addedEpisodesCount} tập.`);
        setBatchResult(data);
        setBatchRawText('');
        fetchSeries();
      } else {
        setBatchStatus('Lỗi: ' + (data.error || 'Không thể cào dữ liệu'));
      }
    } catch (error) {
      setBatchStatus('Lỗi kết nối máy chủ');
    }
  }

  async function handleAddEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSeriesId || !episodeUrl) return;

    try {
      setEpStatus('Đang lưu...');
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId: selectedSeriesId,
          originalUrl: episodeUrl,
          title: episodeTitle,
          partNumber: partNumber ? parseInt(partNumber, 10) : undefined,
        }),
      });

      if (res.ok) {
        setEpStatus('Thêm tập thành công!');
        setEpisodeUrl('');
        setEpisodeTitle('');
        setPartNumber('');
        setPreviewParse(null);
        fetchSeries();
      } else {
        const err = await res.json();
        setEpStatus('Lỗi: ' + (err.error || 'Không thể thêm tập'));
      }
    } catch (error) {
      setEpStatus('Lỗi kết nối máy chủ');
    }
  }

  async function handleCreateSeries(e: React.FormEvent) {
    e.preventDefault();
    if (!newSeriesTitle) return;

    try {
      setSeriesStatus('Đang tạo bộ phim...');
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSeriesTitle,
          description: newSeriesDesc,
          channelName: newSeriesChannel,
          thumbnail: newSeriesThumbnail,
          categories: newSeriesCategories.split(',').map((c) => c.trim()),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setSeriesStatus('Tạo bộ phim thành công!');
        setNewSeriesTitle('');
        setNewSeriesDesc('');
        setNewSeriesChannel('');
        setNewSeriesThumbnail('');
        fetchSeries();
        setSelectedSeriesId(created.id);
      } else {
        const err = await res.json();
        setSeriesStatus('Lỗi: ' + (err.error || 'Không thể tạo'));
      }
    } catch (error) {
      setSeriesStatus('Lỗi kết nối');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Bảng Quản Trị Nhúng Video (CMS)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ra lệnh cho Bot tự tìm link và cào, hoặc lọc sạch toàn bộ video trùng lặp và lỗi nhúng trên toàn hệ thống.
          </p>
        </div>
      </div>

      {/* SECTION BOT LỌC VIDEO TRÙNG LẶP & VIDEO KHÔNG CÓ NỘI DUNG NHÚNG */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950/50">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Bot Tự Động Lọc Video Trùng Lặp & Video Không Thể Nhúng
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-black font-extrabold uppercase tracking-wide">
                  Auto Cleaner Bot
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Bot sẽ quét toàn bộ cơ sở dữ liệu web: Xóa tất cả video trùng link Reel/YouTube và dọn dẹp các video trống không có iframe nhúng.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runCleanerBot}
            disabled={cleanerLoading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-950/50 transition transform hover:-translate-y-0.5 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {cleanerLoading ? (
              <span>🤖 Bot đang quét & dọn dẹp...</span>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>🧹 Quét & Dọn Dẹp Toàn Bộ Web Ngay</span>
              </>
            )}
          </button>
        </div>

        {cleanerResult && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold space-y-1.5 ${
            cleanerResult.success 
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
              : 'bg-rose-950/60 border-cyan-500/50 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{cleanerResult.message || cleanerResult.error}</span>
            </div>
            {cleanerResult.success && (
              <div className="flex flex-wrap gap-4 text-slate-300 pt-1 text-[11px] font-normal">
                <span>• Video trùng đã xóa: <strong className="text-white">{cleanerResult.removedDuplicates}</strong></span>
                <span>• Video lỗi nhúng đã xóa: <strong className="text-white">{cleanerResult.removedEmptyEmbeds}</strong></span>
                <span>• Bộ phim còn lại: <strong className="text-white">{cleanerResult.totalRemainingSeries}</strong></span>
                <span>• Tổng video sạch trên web: <strong className="text-white">{cleanerResult.totalRemainingEpisodes}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION BOT CÀO REELS THEO HÌNH ẢNH & POSTER (REEL POSTER CRAWLER BOT) */}
      <div className="bg-gradient-to-r from-fuchsia-950/40 via-slate-900 to-purple-950/40 border-2 border-fuchsia-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-950/50">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Bot Cào Reels Theo Poster Hình Ảnh Tự Động
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-fuchsia-500 text-black font-extrabold uppercase tracking-wide">
                  Reel Poster & Auto-Sort Bot
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chỉ cần dán link mục Reels Fanpage hoặc tải ảnh màn hình. Bot tự động cuộn trang bắt ảnh poster chất lượng cao, <strong>tự động rà soát những video cùng một bộ phim để gom lại và sắp xếp số thứ tự Tập 1 ➔ Tập N chuẩn xác 100%</strong>!
              </p>
            </div>
          </div>
        </div>

        {/* KHUNG TẢI LÊN / CHỌN HÌNH ẢNH CHỤP MÀN HÌNH REELS */}
        <div className="bg-slate-950/60 border border-fuchsia-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ImageIcon className="w-4 h-4 text-fuchsia-400" />
              <span>1. Tải lên / Chọn hình ảnh chụp màn hình chứa các video Reels</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Chấp nhận ảnh PNG, JPG, WebP (Ảnh chụp tab Reels như mẫu bạn đã gửi)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-fuchsia-500/40 hover:border-fuchsia-400 rounded-2xl p-6 bg-slate-900/50 hover:bg-slate-900 cursor-pointer transition group text-center">
                <Upload className="w-8 h-8 text-fuchsia-400 mb-2 group-hover:scale-110 transition transform" />
                <span className="text-xs font-bold text-white">
                  Bấm vào đây để chọn ảnh chụp màn hình Reels từ máy tính
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Hoặc kéo thả file ảnh màn hình vào đây
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 min-h-[120px]">
              {uploadedImage ? (
                <div className="space-y-2 text-center w-full">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-fuchsia-500/50 shadow-lg">
                    <img src={uploadedImage} alt="Ảnh chụp màn hình Reels" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã chọn ảnh
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="text-cyan-300 hover:underline"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs space-y-1">
                  <ImageIcon className="w-6 h-6 mx-auto opacity-40" />
                  <span>Chưa có ảnh nào được chọn</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* THÔNG TIN LINK FANPAGE & TÊN KÊNH TƯƠNG ỨNG */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <LinkIcon className="w-4 h-4 text-fuchsia-400" />
            <span>2. Link Fanpage & Nguồn tương ứng với hình ảnh</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-8">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Link Fanpage / Mục Reels (Bot sẽ bóc tách link & poster theo hình ảnh)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={reelCrawlUrl}
                  onChange={(e) => setReelCrawlUrl(e.target.value)}
                  placeholder="https://www.facebook.com/profile.php?id=...&sk=reels_tab"
                  className="w-full bg-slate-950 border border-fuchsia-500/40 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400 font-medium"
                />
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Tên Kênh / Nguồn hiển thị
              </label>
              <input
                type="text"
                value={reelCrawlChannel}
                onChange={(e) => setReelCrawlChannel(e.target.value)}
                placeholder="Khu Trú Ẩn 2AM"
                className="w-full bg-slate-950 border border-fuchsia-500/40 rounded-2xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400 font-medium"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Video className="w-4 h-4 text-fuchsia-400" />
            <span>Bot tự động nhận diện danh sách video từ hình ảnh & link, tự bắt poster HD, nạp trực tiếp ra web.</span>
          </div>

          <button
            type="button"
            onClick={runReelCrawlerBot}
            disabled={reelCrawlLoading}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-xl shadow-fuchsia-950/50 transition transform hover:-translate-y-0.5 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {reelCrawlLoading ? (
              <span>🤖 Bot đang mở trình duyệt cuộn trang cào Reels & Ảnh... Vui lòng đợi...</span>
            ) : (
              <>
                <Bot className="w-5 h-5" />
                <span>🚀 Kích Hoạt Bot Cào Reels Ngay</span>
              </>
            )}
          </button>
        </div>

        {reelCrawlResult && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold space-y-3 ${
            reelCrawlResult.success 
              ? 'bg-fuchsia-950/60 border-fuchsia-500/50 text-fuchsia-300' 
              : 'bg-rose-950/60 border-cyan-500/50 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />
              <span>{reelCrawlResult.message || reelCrawlResult.error}</span>
            </div>

            {reelCrawlResult.success && reelCrawlResult.previewItems?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-fuchsia-500/30">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Hình ảnh poster & video vừa cào thành công:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {reelCrawlResult.previewItems.map((item: any, i: number) => (
                    <div key={i} className="group relative rounded-xl overflow-hidden bg-slate-900 border border-fuchsia-500/30">
                      <div className="aspect-[9/14] bg-slate-950 relative overflow-hidden">
                        {item.poster ? (
                          <img src={item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">No Poster</div>
                        )}
                        <span className="absolute bottom-1 left-1 right-1 bg-black/80 backdrop-blur-sm px-1 py-0.5 rounded text-[9px] text-white truncate text-center">
                          {item.genre}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>





      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form 1: Thêm Tập Mới Cho Bộ Phim */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg pb-3 border-b border-slate-800">
            <PlaySquare className="w-5 h-5" />
            <span>Thêm Tập Video (Nhúng Nhanh)</span>
          </div>

          <form onSubmit={handleAddEpisode} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Chọn Bộ Phim / Tác Phẩm
              </label>
              <select
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-rose-500"
              >
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.episodes.length} tập)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dán Link Video Gốc (Facebook Reel / YouTube / TikTok)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://www.facebook.com/reel/2294631994663679..."
                  value={episodeUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:border-rose-500 placeholder-slate-500"
                />
                <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Xem trước phân tích link */}
            {previewParse && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs space-y-1 text-slate-300">
                <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Đã nhận diện: Nền tảng {previewParse.platform.toUpperCase()} ({previewParse.aspectRatio === '9:16' ? 'Video Dọc 9:16' : 'Video Ngang 16:9'})
                </p>
                <p className="text-slate-400 truncate text-[11px]">Embed: {previewParse.embedUrl}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tập Số (Part)</label>
                <input
                  type="number"
                  placeholder="Tự động"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tiêu Đề Tập</label>
                <input
                  type="text"
                  placeholder="VD: Tập 6: Không áp chế nổi nữa"
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {epStatus && (
              <p className="text-xs font-medium text-purple-400">{epStatus}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-2.5 rounded-xl shadow-lg transition"
            >
              Lưu & Nhúng Tập Này
            </button>
          </form>
        </div>

        {/* Form 2: Tạo Bộ Phim Mới */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2 text-fuchsia-400 font-bold text-lg pb-3 border-b border-slate-800">
            <Layers className="w-5 h-5" />
            <span>Tạo Bộ Phim / Tác Phẩm Mới</span>
          </div>

          <form onSubmit={handleCreateSeries} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Bộ Phim / Truyện</label>
              <input
                type="text"
                placeholder="VD: Tiên Nghịch, Phàm Nhân Tu Tiên..."
                value={newSeriesTitle}
                onChange={(e) => setNewSeriesTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tóm tắt nội dung</label>
              <textarea
                rows={3}
                placeholder="Nội dung cốt truyện, bối cảnh nhân vật..."
                value={newSeriesDesc}
                onChange={(e) => setNewSeriesDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Kênh Review</label>
                <input
                  type="text"
                  placeholder="VD: Đại Đạo"
                  value={newSeriesChannel}
                  onChange={(e) => setNewSeriesChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Thể loại (cách nhau dấu phẩy)</label>
                <input
                  type="text"
                  value={newSeriesCategories}
                  onChange={(e) => setNewSeriesCategories(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ảnh Thumbnail (URL)</label>
              <input
                type="text"
                placeholder="https://... (để trống sẽ dùng ảnh mặc định)"
                value={newSeriesThumbnail}
                onChange={(e) => setNewSeriesThumbnail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {seriesStatus && (
              <p className="text-xs font-medium text-purple-400">{seriesStatus}</p>
            )}

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-400 font-bold py-2.5 rounded-xl transition"
            >
              Tạo Bộ Phim
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
