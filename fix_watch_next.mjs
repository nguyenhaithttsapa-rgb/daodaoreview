import fs from 'fs';
const path = 'src/app/watch/[slug]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Thêm logic Random Series
const randomLogic = `
  const nextEpisode = series.episodes.find(
    (ep) => ep.partNumber === (currentEpisode?.partNumber || 1) + 1
  );
  
  // Logic nút Xem Tiếp
  let nextUrl = '';
  let nextText = '';
  if (nextEpisode) {
    nextUrl = \`/watch/\${series.slug}?part=\${nextEpisode.partNumber}\`;
    nextText = \`Tập Tiếp Theo (\${nextEpisode.partNumber})\`;
  } else {
    const allSeries = getAllSeries();
    const otherSeries = allSeries.filter(s => s.id !== series.id);
    const randomSeries = otherSeries.length > 0 ? otherSeries[Math.floor(Math.random() * otherSeries.length)] : series;
    nextUrl = \`/watch/\${randomSeries.slug}\`;
    nextText = 'Chuyển Phim Khác (Ngẫu nhiên)';
  }
`;

code = code.replace(`  const nextEpisode = series.episodes.find(
    (ep) => ep.partNumber === (currentEpisode?.partNumber || 1) + 1
  );`, randomLogic);

// Thêm nút Xem Tiếp khổng lồ dưới VideoPlayer
const hugeButton = `          {/* Trình phát Video Nhúng */}
          <VideoPlayer episode={currentEpisode} />
          
          {/* Nút Xem Tiếp Khổng Lồ */}
          <div className="w-full mt-2">
            <Link 
              href={nextUrl}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white font-bold text-lg py-4 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all animate-pulse-slow border border-cyan-400/30"
            >
              <span>{nextText}</span>
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
`;

code = code.replace(`          {/* TrAnh phAt Video NhAng */}
          <VideoPlayer episode={currentEpisode} />`, hugeButton);

// Fallback if encoding caused replace failure
code = code.replace(`          {/* Trình phát Video Nhúng */}
          <VideoPlayer episode={currentEpisode} />`, hugeButton);
code = code.replace(/\{\/\* Tr[^\*]*\*\/\}\s*<VideoPlayer episode=\{currentEpisode\} \/>/, hugeButton);

fs.writeFileSync(path, code);
