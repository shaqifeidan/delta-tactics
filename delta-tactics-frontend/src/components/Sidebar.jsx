import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// 核心修改：如果 Vercel 环境变量存在则用云端地址，否则本地开发时用 127.0.0.1
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function Sidebar({ onFilterChange, refreshTrigger }) {
  const [tags, setTags] = useState([]);
  const [searchText, setSearchText] = useState(''); // 改造为：全文搜索词
  const [expanded, setExpanded] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterMode, setFilterMode] = useState('OR'); 

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await axios.get('/api/tags');
        setTags(res.data);
      } catch (e) {
        console.error('拉取标签字典失败:', e);
      }
    };
    fetchTags();
  }, [refreshTrigger]);

  // 统一的触发过滤函数：将标签、模式和文本一起发送给 App
  const applyFilter = () => {
    if (onFilterChange) {
      onFilterChange({ 
        ids: Array.from(selectedIds), 
        mode: filterMode,
        text: searchText.trim() // 加上文本过滤条件
      });
    }
  };

  // 当标签勾选或 AND/OR 模式改变时，自动触发一次过滤
  useEffect(() => {
    applyFilter();
  }, [selectedIds, filterMode]);

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); 
    else next.add(id); 
    setSelectedIds(next);
  };

  // 组装树状标签（移除原本的树结构搜索过滤，保持全量显示）
  const treeData = useMemo(() => {
    const map = {};
    const roots = [];
    tags.forEach(t => map[t.id] = { ...t, children: [] });
    tags.forEach(t => {
      if (t.parent_id && map[t.parent_id]) {
        map[t.parent_id].children.push(map[t.id]);
      } else if (!t.parent_id) {
        roots.push(map[t.id]);
      }
    });
    return roots;
  }, [tags]);

  const renderNode = (node) => {
    // 默认展开所有一级父节点，方便查看
    const isExpanded = expanded[node.id] !== undefined ? expanded[node.id] : true; 
    const isSelected = selectedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="ml-3 mt-1">
        <div className="flex items-center gap-2 text-sm text-slate-300 select-none">
          {hasChildren ? (
            <span onClick={() => toggleExpand(node.id)} className="w-5 h-5 flex items-center justify-center cursor-pointer hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors">
              {isExpanded ? '▾' : '▸'}
            </span>
          ) : (
            <span className="w-5"></span> 
          )}
          <div 
            className={`flex-1 px-2 py-1 rounded cursor-pointer transition-colors border border-transparent ${
              isSelected ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50' : 'hover:bg-slate-700/50 hover:text-slate-100'
            }`}
            onClick={() => toggleSelect(node.id)}
          >
            {node.name}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-700/50 ml-2.5 pl-1">
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 shadow-xl z-10">
      <div className="p-5 border-b border-slate-700 bg-slate-800/80">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wider">DELTA TACTICS</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">哈呀哈基米 v1.0</p>
      </div>
      
      {/* 核心升级：内容搜索区 */}
      <div className="p-4 border-b border-slate-700 space-y-3 bg-slate-800/50">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="搜索情景/心得/标题..." 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilter()} // 支持回车搜索
            className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
          <button 
            onClick={applyFilter}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
          >
            搜索
          </button>
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/50 p-1.5 rounded border border-slate-700/50 mt-2">
          <span className="ml-1 font-medium">标签策略</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setFilterMode('OR')}
              className={`px-3 py-1 rounded transition-colors ${filterMode === 'OR' ? 'bg-emerald-600 text-white shadow' : 'hover:text-slate-200 hover:bg-slate-700'}`}
            >
              包含 (OR)
            </button>
            <button 
              onClick={() => setFilterMode('AND')}
              className={`px-3 py-1 rounded transition-colors ${filterMode === 'AND' ? 'bg-emerald-600 text-white shadow' : 'hover:text-slate-200 hover:bg-slate-700'}`}
            >
              精准 (AND)
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        {treeData.map(renderNode)}
      </div>
    </aside>
  );
}