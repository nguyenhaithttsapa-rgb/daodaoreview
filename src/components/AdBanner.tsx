import { ExternalLink, Sparkles } from 'lucide-react';

interface AdBannerProps {
  position?: 'top' | 'sidebar' | 'bottom';
  className?: string;
}

export default function AdBanner({ position = 'top', className = '' }: AdBannerProps) {
  if (position === 'top') {
    return null;
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
