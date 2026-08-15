import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import InteractiveMap from './InteractiveMap';

export default function NoteList({ refreshTrigger, filterParams }) {
  const [notes, setNotes] = useState([]);
  const [expandedMapNoteId, setExpandedMapNoteId] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, [refreshTrigger]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get('/api/notes');
      setNotes(response.data.reverse());
    } catch (error) {
      console.error('拉取笔记失败:', error);
    }
  };

  // ==========================================
  // 新增：删除笔记的逻辑
  // ==========================================
  const handleDelete = async (noteId) => {
    if (window.confirm('确定要彻底销毁这条战术复盘吗？')) {
      try {
        await axios.delete(`/api/notes/${noteId}`);
        // 刷新列表：直接调用 fetchNotes 即可
        fetchNotes();
      } catch (e) {
        alert('删除失败，请检查后端服务是否正常。');
        console.error(e);
      }
    }
  };

  const filteredNotes = useMemo(() => {
    if (!filterParams) return notes;

    return notes.filter(note => {
      if (filterParams.text) {
        const query = filterParams.text.toLowerCase();
        const title = note.title || '';
        const context = note.context || '';
        const takeaway = note.takeaway || '';

        const matchTitle = title.toLowerCase().includes(query);
        const matchContext = context.toLowerCase().includes(query);
        const matchTakeaway = takeaway.toLowerCase().includes(query);

        if (!matchTitle && !matchContext && !matchTakeaway) {
          return false; 
        }
      }

      if (filterParams.ids && filterParams.ids.length > 0) {
        const noteTagIds = note.tags.map(t => t.id);
        if (filterParams.mode === 'OR') {
          if (!filterParams.ids.some(selectedId => noteTagIds.includes(selectedId))) return false;
        } else {
          if (!filterParams.ids.every(selectedId => noteTagIds.includes(selectedId))) return false;
        }
      }
      return true;
    });
  }, [notes, filterParams]);

  const toggleMapRecall = (noteId) => {
    setExpandedMapNoteId(prev => (prev === noteId ? null : noteId));
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex justify-between items-end border-b border-slate-700 pb-2">
        <h3 className="text-lg font-bold text-slate-100">历史复盘记录</h3>
        <span className="text-sm text-slate-400">
          当前展示: <span className="text-emerald-400 font-bold">{filteredNotes.length}</span> 条战术
        </span>
      </div>
      
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded border border-slate-700/50">
          <p className="text-slate-500">没有找到符合条件的战术记录。</p>
        </div>
      ) : (
        filteredNotes.map(note => {
          const hasCoordinates = note.map_name && note.coord_x !== null && note.coord_y !== null;
          const isMapOpen = expandedMapNoteId === note.id;

          return (
            <div key={note.id} className="bg-slate-800/80 border border-slate-700 rounded-lg p-5 hover:border-emerald-500/50 transition-colors shadow-md">
              
              {/* 修改处：标题行增加删除按钮 */}
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-md font-bold text-emerald-400">{note.title}</h4>
                <div className="flex items-center gap-3">
                  {hasCoordinates && (
                    <button 
                      onClick={() => toggleMapRecall(note.id)}
                      className={`text-xs px-2.5 py-1 rounded border transition-all ${
                        isMapOpen ? 'bg-red-600 text-white border-red-500' : 'bg-slate-900 text-red-400 border-red-500/40 hover:bg-red-950/30'
                      }`}
                    >
                      {isMapOpen ? '收起战场' : `🎯 ${note.map_name}`}
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="text-slate-500 hover:text-red-500 transition-colors font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4 flex-wrap">
                {note.tags.map(tag => (
                  <span key={tag.id} className="px-2 py-1 bg-slate-700/50 text-xs rounded text-slate-300 border border-slate-600">
                    {tag.name}
                  </span>
                ))}
              </div>

              {hasCoordinates && isMapOpen && (
                <div className="mb-4 bg-slate-900/90 p-3 rounded border border-red-500/50 animate-fadeIn">
                  <InteractiveMap 
                    mapName={note.map_name}
                    readOnlyPoint={{ x: note.coord_x, y: note.coord_y }}
                  />
                </div>
              )}

              {note.context && (
                <div className="text-sm text-slate-300 mb-3">
                  <span className="text-slate-500 mr-2">[情景再现]</span>
                  {note.context}
                </div>
              )}
              
              <div className="text-sm text-slate-100 bg-slate-900/80 p-4 rounded border border-slate-700 mt-3">
                <span className="text-emerald-500 font-bold mb-2 block">💡 核心教训：</span>
                <div className="prose prose-invert max-w-none prose-sm">
                  <ReactMarkdown>{note.takeaway}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}