import { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/creatable';
import axios from 'axios';
import InteractiveMap from './InteractiveMap'; // 引入我们刚刚写好的战术地图组件

axios.defaults.baseURL = 'http://127.0.0.1:8000';

export default function NoteEditor({ onNoteAdded }) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [takeaway, setTakeaway] = useState('');
  
  // 原始标签数据缓存（用来反查父子地图关系）
  const [rawTagsCache, setRawTagsCache] = useState([]);

  const [mapOptions, setMapOptions] = useState([]);
  const [mechanicOptions, setMechanicOptions] = useState([]);
  const [phaseOptions, setPhaseOptions] = useState([]);

  const [selectedMaps, setSelectedMaps] = useState([]);
  const [selectedMechanics, setSelectedMechanics] = useState([]);
  const [selectedPhases, setSelectedPhases] = useState([]);

  // 新增：当前激活的地图名称与选中的死亡点位坐标
  const [activeMapName, setActiveMapName] = useState(null);
  const [mapPoint, setMapPoint] = useState(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await axios.get('/api/tags');
      const rawTags = response.data;
      setRawTagsCache(rawTags); // 缓存原始数据

      const buildOptions = (categoryFilter, icon) => {
        const parents = rawTags.filter(t => !t.parent_id && t.category === categoryFilter);
        return parents.map(parent => ({
          label: `${icon} ${parent.name}`,
          options: [
            { value: parent.id, label: `🎯 ${parent.name} (全局)`, category: parent.category },
            ...rawTags.filter(t => t.parent_id === parent.id).map(child => ({
              value: child.id, label: `├ ${child.name}`, category: child.category
            }))
          ]
        }));
      };

      setMapOptions(buildOptions("MAP", "🗺️"));
      setMechanicOptions(buildOptions("MECHANICS", "⚡"));
      setPhaseOptions(buildOptions("PHASE", "⏱️"));
      
    } catch (error) {
      console.error('拉取标签失败:', error);
    }
  };

  // 核心：当用户在地图选择框里做出改变时，自动计算应该展开哪张地图
  useEffect(() => {
    if (selectedMaps.length === 0) {
      setActiveMapName(null);
      setMapPoint(null);
      return;
    }

    // 取最后选中的一个地图标签去匹配对应的底图
    const latestSelected = selectedMaps[selectedMaps.length - 1];
    const tagObj = rawTagsCache.find(t => t.id === latestSelected.value);

    if (tagObj) {
      if (!tagObj.parent_id) {
        // 如果选的是顶级地图（如 "零号大坝"）
        setActiveMapName(tagObj.name);
      } else {
        //如果选的是子区域（如 "行政楼"），往上找它的父级拿到大地图名称
        const parentTag = rawTagsCache.find(t => t.id === tagObj.parent_id);
        if (parentTag) {
          setActiveMapName(parentTag.name);
        }
      }
    }
  }, [selectedMaps, rawTagsCache]);

  const handleCreateTag = async (inputValue, category, setOptions, setSelected) => {
    try {
      const newTagData = { name: inputValue, category: category, color: "#3B82F6" };
      const response = await axios.post('/api/tags', newTagData);
      
      const newOption = {
        value: response.data.id,
        label: response.data.name,
        category: response.data.category
      };
      
      setOptions(prev => [
        { label: "🆕 新建标签", options: [newOption] },
        ...prev
      ]);
      setSelected(prev => [...prev, newOption]);
    } catch (error) {
      console.error(`创建 ${category} 标签失败:`, error);
    }
  };

  const handleSubmit = async () => {
    try {
      const allSelectedIds = [
        ...selectedMaps, 
        ...selectedMechanics, 
        ...selectedPhases
      ].map(tag => tag.value);

      const noteData = {
        title: title,
        context: context,
        takeaway: takeaway,
        tag_ids: allSelectedIds,
        // 挂载空间坐标数据（如果没有展开地图打点，则默认为 null，保持轻量）
        map_name: activeMapName,
        coord_x: mapPoint ? mapPoint.x : null,
        coord_y: mapPoint ? mapPoint.y : null
      };
      
      await axios.post('/api/notes', noteData);
      if (onNoteAdded) onNoteAdded(); 
      
      // 清空所有表单及地图状态
      setTitle(''); setContext(''); setTakeaway(''); 
      setSelectedMaps([]); setSelectedMechanics([]); setSelectedPhases([]);
      setActiveMapName(null); setMapPoint(null);
    } catch (error) {
      console.error('保存笔记失败:', error);
    }
  };

  const customStyles = {
    control: (base) => ({ ...base, backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }),
    menu: (base) => ({ ...base, backgroundColor: '#1e293b' }),
    option: (base, state) => ({ 
      ...base, 
      backgroundColor: state.isFocused ? '#334155' : '#1e293b', 
      color: '#f1f5f9', cursor: 'pointer' 
    }),
    groupHeading: (base) => ({
      ...base, color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold',
      borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px'
    }),
    input: (base) => ({ ...base, color: '#f1f5f9' }),
    multiValue: (base) => ({ ...base, backgroundColor: '#0f172a' }),
    multiValueLabel: (base) => ({ ...base, color: '#10b981' }),
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 shadow-lg">
      <h3 className="text-lg font-bold text-slate-100 mb-4 border-b border-slate-700 pb-2">录入新战术 / 复盘</h3>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1">一句话总结 (Title)</label>
          <input 
            value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors" 
            placeholder="例如：零号大坝变电站二楼漏身位被秒" 
          />
        </div>

        {/* 三列网格标签选择器 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/30 p-3 rounded border border-slate-700/50">
          <div>
            <label className="block text-xs font-semibold text-emerald-400 mb-1 uppercase tracking-wider">🗺️ 地图与区域</label>
            <CreatableSelect
              isMulti closeMenuOnSelect={false} hideSelectedOptions={false}
              options={mapOptions} value={selectedMaps} onChange={setSelectedMaps}
              onCreateOption={(val) => handleCreateTag(val, "MAP", setMapOptions, setSelectedMaps)}
              styles={customStyles} placeholder="选定地图后展开雷达..."
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-blue-400 mb-1 uppercase tracking-wider">⚡ 战术与微操</label>
            <CreatableSelect
              isMulti closeMenuOnSelect={false} hideSelectedOptions={false}
              options={mechanicOptions} value={selectedMechanics} onChange={setSelectedMechanics}
              onCreateOption={(val) => handleCreateTag(val, "MECHANICS", setMechanicOptions, setSelectedMechanics)}
              styles={customStyles} placeholder="动作细节..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-400 mb-1 uppercase tracking-wider">⏱️ 战局时机</label>
            <CreatableSelect
              isMulti closeMenuOnSelect={false} hideSelectedOptions={false}
              options={phaseOptions} value={selectedPhases} onChange={setSelectedPhases}
              onCreateOption={(val) => handleCreateTag(val, "PHASE", setPhaseOptions, setSelectedPhases)}
              styles={customStyles} placeholder="切入时机..."
            />
          </div>
        </div>

        {/* 动态展开的战术地图打点区 (只有选择了地图时才会“唰”地展现) */}
        {activeMapName && (
          <div className="bg-slate-900/80 p-4 rounded border border-emerald-500/40 animate-fadeIn">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                📍 空间战术定位：已锁定 [{activeMapName}]，请在下方底图点击阵亡/交战精准点位
              </span>
              {mapPoint && (
                <button 
                  onClick={() => setMapPoint(null)}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  清除当前打点
                </button>
              )}
            </div>
            <InteractiveMap 
              mapName={activeMapName} 
              onPointSelected={(point) => setMapPoint(point)} 
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-400 mb-1">战局情景 (Context)</label>
          <textarea 
            value={context} onChange={e => setContext(e.target.value)}
            className="w-full h-16 bg-slate-900 border border-slate-600 rounded p-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors resize-none" 
            placeholder="当时发生了什么？例如：开局抢高价值区，听到楼下有脚步..." 
          />
        </div>

        <div>
          <label className="block text-sm text-emerald-400 mb-1">核心复盘心得 (Takeaway)</label>
          <textarea 
            value={takeaway} onChange={e => setTakeaway(e.target.value)}
            className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors" 
            placeholder="正确的做法应该是什么？(支持 Markdown 语法)" 
          />
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded shadow-lg transition-all transform active:scale-95"
        >
          确认归档
        </button>
      </div>
    </div>
  );
}