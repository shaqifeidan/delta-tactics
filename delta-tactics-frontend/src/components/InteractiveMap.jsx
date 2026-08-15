import { useState, useRef, useEffect } from 'react';

export default function InteractiveMap({ mapName, onPointSelected, readOnlyPoint }) {
  const mapRef = useRef(null);
  
  // 内部状态：保存当前打点的百分比坐标 { x, y }
  const [marker, setMarker] = useState(readOnlyPoint || null);

  // 监听外部传进来的只读点位（用于后续在列表中查看历史记录）
  useEffect(() => {
    if (readOnlyPoint) {
      setMarker(readOnlyPoint);
    }
  }, [readOnlyPoint]);

  // 地图图片映射字典 (确保这里的文件名和后缀与你 public/maps/ 里的完全一致)
  const mapImages = {
    "零号大坝": "/maps/zero_dam.png", 
    "AZ3": "/maps/az3.png",
    "巴克什": "/maps/balkans.png", 
    "航天基地": "/maps/space_station.png"
  };

  const handleMapClick = (e) => {
    // 如果是只读模式（在列表里查看），直接拦截，不允许重新打点
    if (readOnlyPoint) return;

    const rect = mapRef.current.getBoundingClientRect();
    
    // 计算点击位置相对于图片左上角的像素距离
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 核心：转换为绝对的百分比 (0.00 ~ 100.00)
    const percentX = parseFloat(((x / rect.width) * 100).toFixed(2));
    const percentY = parseFloat(((y / rect.height) * 100).toFixed(2));

    const newPoint = { x: percentX, y: percentY };
    setMarker(newPoint);
    
    // 将坐标数据通过回调函数发送给“记事本”
    if (onPointSelected) {
      onPointSelected(newPoint);
    }
  };

  // 如果当前还没有选择地图，显示一个待机占位符
  if (!mapName || !mapImages[mapName]) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-800/50 rounded border border-slate-700 border-dashed">
        <p className="text-slate-500 text-sm">选择一个地图标签以加载空间战术雷达...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded border border-slate-600 bg-black group shadow-lg">
      
      {/* 战术地图本体 */}
      <img 
        ref={mapRef}
        src={mapImages[mapName]} 
        alt={mapName}
        className={`w-full h-auto object-contain transition-opacity ${readOnlyPoint ? '' : 'cursor-crosshair hover:opacity-90'}`}
        onClick={handleMapClick}
        draggable="false"
      />
      
      {/* 准星/骷髅头标记 */}
      {marker && (
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
        >
          {/* 这里可以换成任何你喜欢的 Emoji 或者 SVG 图标 */}
          <span className="text-red-500 text-2xl drop-shadow-[0_0_8px_rgba(239,68,68,1)] animate-bounce-short">
            💀
          </span>
          <span className="bg-red-900/80 text-white text-[10px] px-1 rounded mt-1 shadow border border-red-700/50">
            {marker.x}%, {marker.y}%
          </span>
        </div>
      )}

      {/* 右上角的模式提示标签 */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-slate-900/80 rounded text-xs text-slate-300 border border-slate-700 pointer-events-none">
        {readOnlyPoint ? '现场回溯模式' : '战术打点模式'}
      </div>
    </div>
  );
}
