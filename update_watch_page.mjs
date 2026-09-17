import fs from 'fs';
let code = fs.readFileSync('src/app/watch/[slug]/page.tsx', 'utf8');

if (!code.includes('import UserInteractions')) {
  code = code.replace("import { Play, Share2", "import UserInteractions from '@/components/UserInteractions';\nimport { Play, Share2");
  
  // Use regex to replace the specific block safely
  const regex = /(<p className="text-sm text-slate-400 mt-2">[\s\S]*?<\/p>\s*)<\/div>/;
  code = code.replace(regex, `$1<div className="mt-4"><UserInteractions series={series} currentPart={currentEpisode.partNumber} /></div>\n</div>`);
  
  fs.writeFileSync('src/app/watch/[slug]/page.tsx', code);
}
