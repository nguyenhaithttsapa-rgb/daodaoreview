import fs from 'fs/promises';

async function run() {
  let content = await fs.readFile('src/app/page.tsx', 'utf8');

  const startTag = '<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">';
  if (!content.includes(startTag)) {
    console.log("Could not find start tag");
    return;
  }

  // Define left sidebar
  const leftSidebar = `
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
                  className={\`w-full text-left px-4 py-2 rounded-xl transition \${activeCategory === cat ? 'text-cyan-300 bg-cyan-900/30 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-purple-900/20'}\`}
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
  `;

  // Define right sidebar
  const rightSidebar = `
      </div>

      {/* Right Sidebar */}
      <aside className="hidden 2xl:flex w-72 flex-col gap-6 flex-shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none pb-8">
        <div className="bg-[#0a0514]/60 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2 border-b border-purple-900/50 pb-3">
            🏆 Bảng Xếp Hạng
          </h3>
          <div className="space-y-4 mt-4">
            {seriesList.slice(0, 5).map((series, idx) => (
              <Link href={\`/watch/\${series.slug}\`} key={series.id} className="flex gap-3 group">
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
  `;

  const newStartTag = '<div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6 items-start justify-center">';

  content = content.replace(startTag, newStartTag + leftSidebar);
  
  const newEndTag = rightSidebar + '\n    </div>\n  );\n}';
  content = content.replace(/<\/div>\s*\);\s*}\s*$/, newEndTag);

  await fs.writeFile('src/app/page.tsx', content);
  console.log("Success");
}
run().catch(console.error);
