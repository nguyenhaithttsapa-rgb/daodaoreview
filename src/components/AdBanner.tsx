import { ExternalLink, Sparkles } from 'lucide-react';

interface AdBannerProps {
  position?: 'top' | 'sidebar' | 'bottom';
  className?: string;
}

export default function AdBanner({ position = 'top', className = '' }: AdBannerProps) {
  if (position === 'top') {
    return (
      <div className={`w-full bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 border border-amber-500/30 rounded-xl p-3 sm:p-4 my-4 flex items-center justify-between gap-4 text-slate-200 shadow-lg ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                Tài Trợ
              </span>
              <span className="font-semibold text-sm text-white">Kiếm Hiệp Tình 3D: Tặng 100 Vé Quay Thần Tướng Miễn Phí</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Tải ngay hôm nay, nhận trang bị Hoàng Kim và Code Tân Thủ cực đỉnh!</p>
          </div>
        </div>
        <button className="flex-shrink-0 flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg transition">
          <span>Tải Game</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (position === 'sidebar') {
    return (
      <div className={`w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-center ${className}`}>
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Quảng cáo tài trợ (300x250)</span>
        <div className="my-3 py-8 px-4 rounded-lg bg-gradient-to-br from-rose-900/30 to-purple-900/30 border border-rose-500/20 flex flex-col items-center justify-center">
          <p className="font-bold text-sm text-rose-300">Đấu Thần Giới 3D</p>
          <p className="text-xs text-slate-400 mt-1">Đăng ký trước nhận Thú Cưỡi Rồng Thiêng</p>
          <button className="mt-3 text-xs bg-rose-600 hover:bg-rose-500 text-white font-medium px-3 py-1 rounded transition">
            Khám phá
          </button>
        </div>
      </div>
    );
  }

  return null;
}
