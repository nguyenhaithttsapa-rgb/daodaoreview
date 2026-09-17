import fs from 'fs/promises';

async function run() {
  let content = await fs.readFile('src/app/watch/[slug]/page.tsx', 'utf8');

  // Watch page
  content = content.replace(/text-xs text-slate-400 mb-4/g, 'text-sm text-slate-400 mb-4'); // Breadcrumb
  content = content.replace(/text-xl sm:text-2xl/g, 'text-2xl sm:text-3xl'); // Title
  content = content.replace(/text-xs text-slate-400 mt-1/g, 'text-sm text-slate-400 mt-2'); // Meta
  content = content.replace(/text-sm font-semibold px-4/g, 'text-base font-semibold px-4'); // Next button
  content = content.replace(/text-sm font-bold text-white/g, 'text-base font-bold text-white'); // Channel Name
  content = content.replace(/text-\[11px\] text-slate-400/g, 'text-xs text-slate-400'); // Sub Channel
  content = content.replace(/text-xs font-semibold/g, 'text-sm font-semibold'); // Interactive buttons text
  content = content.replace(/text-sm text-slate-300 leading-relaxed/g, 'text-base text-slate-300 leading-relaxed'); // Description text
  content = content.replace(/text-xs px-2.5/g, 'text-sm px-2.5'); // Categories
  
  content = content.replace(/text-base flex items-center/g, 'text-lg flex items-center'); // Danh sách tập title
  content = content.replace(/text-xs text-slate-400/g, 'text-sm text-slate-400'); // "Bấm để đổi tập"
  content = content.replace(/text-xs font-semibold truncate/g, 'text-sm font-semibold truncate'); // Episode list title
  content = content.replace(/text-\[10px\] text-slate-400/g, 'text-xs text-slate-400'); // Episode list meta
  content = content.replace(/text-\[10px\] font-bold/g, 'text-xs font-bold'); // "Đang xem" label

  await fs.writeFile('src/app/watch/[slug]/page.tsx', content);
}
run().catch(console.error);
