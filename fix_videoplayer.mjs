import fs from 'fs';
let code = fs.readFileSync('src/components/VideoPlayer.tsx', 'utf8');

const importStatement = `import { useState, useRef } from 'react';\nimport { Maximize, Minimize } from 'lucide-react';\n`;
code = code.replace("import { Episode } from '@/types/video';", importStatement + "import { Episode } from '@/types/video';");

const stateAndRef = `  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
`;
code = code.replace("  const isVertical = episode.aspectRatio === '9:16';", stateAndRef + "\n  const isVertical = episode.aspectRatio === '9:16';");

code = code.replace('<div\n      className={`flex flex-col', '<div ref={containerRef}\n      className={`flex flex-col relative group');

const fullscreenBtn = `
      {/* Nút phóng to / quay ngang */}
      <button 
        onClick={toggleFullscreen} 
        className="absolute top-16 right-4 z-[60] bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.6)] border border-cyan-500/80 backdrop-blur-sm transition-all flex items-center justify-center opacity-80 hover:opacity-100"
        title="Toàn màn hình (Quay ngang)"
      >
        {isFullscreen ? <Minimize className="w-6 h-6 text-rose-400" /> : <Maximize className="w-6 h-6 text-cyan-400" />}
      </button>
`;
code = code.replace('      <div\n        className={`relative w-full', fullscreenBtn + '\n      <div\n        className={`relative w-full');

fs.writeFileSync('src/components/VideoPlayer.tsx', code);
