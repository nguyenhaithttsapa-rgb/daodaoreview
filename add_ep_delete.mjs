import fs from 'fs';
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

// Add state for managing episodes
code = code.replace('const [deleteStatus, setDeleteStatus] = useState<string | null>(null);', 'const [deleteStatus, setDeleteStatus] = useState<string | null>(null);\n  const [epDelStatus, setEpDelStatus] = useState<string | null>(null);');

// Add handleDeleteEpisode function
const delEpFunc = `
  const handleDeleteEpisode = async (epId: string) => {
    if (!selectedSeriesId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa tập này?')) return;
    setEpDelStatus('Đang xóa tập...');
    try {
      const res = await fetch('/api/delete-episode', { method: 'POST', body: JSON.stringify({ seriesId: selectedSeriesId, episodeId: epId }) });
      if (res.ok) {
        setEpDelStatus('Xóa tập thành công!');
        // Update local state
        const updatedList = seriesList.map(s => {
          if (s.id === selectedSeriesId) {
            return { ...s, episodes: s.episodes.filter(e => e.id !== epId) };
          }
          return s;
        });
        setSeriesList(updatedList);
      } else {
        setEpDelStatus('Lỗi khi xóa tập');
      }
    } catch (err) {
      setEpDelStatus('Lỗi kết nối');
    }
  };
`;
code = code.replace('  const handleDeleteSeries = async () => {', delEpFunc + '  const handleDeleteSeries = async () => {');

// Add UI for episode list
const epListUI = `
<div className="mt-6 border-t border-slate-700/50 pt-4">
  <label className="block text-xs font-semibold text-slate-300 mb-2">Quản lý các tập phim (Xóa từng tập)</label>
  {epDelStatus && <p className="text-xs text-rose-500 mb-2">{epDelStatus}</p>}
  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
    {seriesList.find(s => s.id === selectedSeriesId)?.episodes?.map(ep => (
      <div key={ep.id} className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800">
        <span className="text-xs text-slate-300 truncate pr-2 flex-1">{ep.title}</span>
        <button type="button" onClick={() => handleDeleteEpisode(ep.id)} className="text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white px-2 py-1 rounded transition whitespace-nowrap">Xóa tập</button>
      </div>
    )) || <p className="text-xs text-slate-500 italic">Không có tập nào</p>}
  </div>
</div>
`;

code = code.replace('</button>\n            </div>', '</button>\n            ' + epListUI + '\n            </div>');
fs.writeFileSync('src/app/admin/page.tsx', code);
