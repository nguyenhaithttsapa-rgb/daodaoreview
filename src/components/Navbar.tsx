'use client';

import Link from 'next/link';
import { Film, PlusCircle, Flame } from 'lucide-react';

export default function Navbar() {

  return (
    <header className="sticky top-0 z-50 bg-[#05010a]/60 backdrop-blur-xl border-b border-purple-900/40 text-slate-100 shadow-[0_4px_30px_rgba(168,85,247,0.15)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.6)] group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition duration-300 border border-cyan-500/40 bg-slate-950 flex-shrink-0">
            <img src="/avatar.jpg" alt="Dao Dao Review Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent neon-text-purple">
              DaoDao<span className="text-white drop-shadow-md">Review</span>
            </span>
            <span className="block text-[10px] text-cyan-200/70 uppercase tracking-widest font-semibold">
              3D Anime & Truyện Hay
            </span>
          </div>
        </Link>



        
      </div>
    </header>
  );
}
