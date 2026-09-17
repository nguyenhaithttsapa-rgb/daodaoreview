import fs from 'fs/promises';

async function run() {
  let content = await fs.readFile('src/app/page.tsx', 'utf8');

  // Search Bar Section
  content = content.replace(/text-sm text-slate-100/g, 'text-base text-slate-100');
  content = content.replace(/text-xs text-slate-400 px-1/g, 'text-sm text-slate-400 px-1');
  content = content.replace(/text-\[11px\] font-bold/g, 'text-xs font-bold');

  // Direct Play Section
  content = content.replace(/text-xl font-bold/g, 'text-2xl font-bold'); 
  content = content.replace(/text-xs text-cyan-400 font-medium/g, 'text-sm text-cyan-400 font-medium');
  content = content.replace(/text-\[11px\] font-bold bg/g, 'text-xs font-bold bg');
  content = content.replace(/h3 className="text-2xl font-extrabold/g, 'h3 className="text-3xl font-extrabold');
  content = content.replace(/text-xs text-slate-400 mt-1/g, 'text-sm text-slate-400 mt-2');
  content = content.replace(/text-sm text-slate-300 leading-relaxed/g, 'text-base text-slate-300 leading-relaxed');
  content = content.replace(/text-xs font-bold text-slate-300/g, 'text-sm font-bold text-slate-300'); 
  content = content.replace(/text-xs font-semibold text-slate-200/g, 'text-sm font-semibold text-slate-200'); 

  // Reels Section
  content = content.replace(/text-xs text-slate-400/g, 'text-sm text-slate-400');
  content = content.replace(/text-\[10px\] font-semibold/g, 'text-[11px] font-semibold'); 
  content = content.replace(/text-\[10px\] shadow/g, 'text-xs shadow'); 
  content = content.replace(/text-xs font-semibold text-white/g, 'text-sm font-semibold text-white'); 
  content = content.replace(/text-\[11px\] text-slate-400/g, 'text-xs text-slate-400'); 

  // Series Grid
  content = content.replace(/text-\[11px\] font-medium/g, 'text-xs font-medium'); 
  content = content.replace(/font-bold text-base/g, 'font-bold text-lg'); 
  content = content.replace(/text-xs text-slate-400 line-clamp-2/g, 'text-sm text-slate-400 line-clamp-2'); 
  content = content.replace(/text-xs text-slate-400 border-t/g, 'text-sm text-slate-400 border-t'); 
  content = content.replace(/text-\[11px\]">\n/g, 'text-xs">\n'); 

  await fs.writeFile('src/app/page.tsx', content);
}
run().catch(console.error);
