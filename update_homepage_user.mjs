import fs from 'fs';
let code = fs.readFileSync('src/app/HomePageClient.tsx', 'utf8');

if (!code.includes('useUserLibrary')) {
  // 1. Add import
  code = code.replace("import { useState, useEffect, useMemo } from 'react';", "import { useState, useEffect, useMemo } from 'react';\nimport { useUserLibrary } from '@/hooks/useUserLibrary';");
  
  // 2. Call hook inside component
  code = code.replace("export default function HomePageClient({ initialSeries = [] }: { initialSeries: Series[] }) {\n  const [seriesList, setSeriesList] = useState<Series[]>(initialSeries);", "export default function HomePageClient({ initialSeries = [] }: { initialSeries: Series[] }) {\n  const { favorites, history, mounted } = useUserLibrary();\n  const [seriesList, setSeriesList] = useState<Series[]>(initialSeries);");

  // 3. Update Left Sidebar buttons to use Links.
  // Actually, they are inside <ul className="space-y-2">. I'll replace the text.
  code = code.replace(/<button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900\/30 text-slate-400 hover:text-cyan-300 transition">\s*(?:dY ')?\s*Lịch Sử Xem\s*<\/button>/g, `<Link href="/history" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">🕒 Lịch Sử Xem</Link>`);
  
  code = code.replace(/<button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900\/30 text-slate-400 hover:text-cyan-300 transition">\s*.*?Yêu Thích\s*<\/button>/g, `<Link href="/favorites" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">❤️ Yêu Thích</Link>`);
  
  // Update left sidebar buttons fallback (due to utf-8 encoding issues in the terminal view earlier)
  code = code.replace(/<button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900\/30 text-slate-400 hover:text-cyan-300 transition">\s*[^<]*L.ch S. Xem\s*<\/button>/i, `<Link href="/history" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">🕒 Lịch Sử Xem</Link>`);
  code = code.replace(/<button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900\/30 text-slate-400 hover:text-cyan-300 transition">\s*[^<]*Y.u Th.ch\s*<\/button>/i, `<Link href="/favorites" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-purple-900/30 text-slate-400 hover:text-cyan-300 transition">❤️ Yêu Thích</Link>`);

  // 4. Update Right Sidebar Login Box
  const loginBoxRegex = /<div className="bg-gradient-to-br from-purple-900\/40 to-cyan-900\/20 backdrop-blur-md border border-purple-500\/30 rounded-3xl p-5 text-center shadow-\[0_0_20px_rgba\(168,85,247,0\.2\)\]">[\s\S]*?<\/div>/;
  
  const userProfileBox = `<div className="bg-gradient-to-br from-purple-900/40 to-cyan-900/20 backdrop-blur-md border border-purple-500/30 rounded-3xl p-5 text-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
          <h4 className="text-cyan-300 font-bold mb-3">Tủ Phim Của Bạn</h4>
          <div className="flex justify-between items-center bg-slate-900/60 rounded-xl p-3 mb-4 border border-purple-500/20">
            <div className="text-center w-1/2 border-r border-slate-700">
              <p className="text-xs text-slate-400">Đã Lưu</p>
              <p className="text-xl font-bold text-pink-400">{mounted ? favorites.length : 0}</p>
            </div>
            <div className="text-center w-1/2">
              <p className="text-xs text-slate-400">Lịch Sử</p>
              <p className="text-xl font-bold text-cyan-400">{mounted ? history.length : 0}</p>
            </div>
          </div>
          <Link href="/favorites" className="block w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all">
            Mở Tủ Phim
          </Link>
        </div>`;
        
  code = code.replace(loginBoxRegex, userProfileBox);

  fs.writeFileSync('src/app/HomePageClient.tsx', code);
}
