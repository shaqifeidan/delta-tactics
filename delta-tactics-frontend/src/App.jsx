import { useState } from 'react'
import Sidebar from './components/Sidebar'
import NoteEditor from './components/NoteEditor'
import NoteList from './components/NoteList'

function App() {
  // 刷新触发器（通知列表重新拉取最新数据）
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // 过滤参数状态：用来接收 Sidebar 传过来的选中标签 ID 数组和过滤模式
  const [filterParams, setFilterParams] = useState({ ids: [], mode: 'OR' })

  return (
    // 最外层容器：铺满全屏，采用左右 Flex 布局
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 font-sans">
      
      {/* 左侧边栏：使用动态的 Sidebar 组件 */}
      <Sidebar 
        refreshTrigger={refreshTrigger} 
        onFilterChange={setFilterParams} 
      />

      {/* 右侧主内容区：用于展示笔记列表和 Markdown 编辑器 */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 bg-slate-900/80">
          <h2 className="text-lg font-semibold text-slate-100">
            {filterParams.ids.length > 0 
              ? `已应用过滤: ${filterParams.ids.length} 个标签 (${filterParams.mode} 模式)` 
              : '全部笔记'}
          </h2>
        </header>
        
        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
          {/* 编辑器：传入刷新回调函数 */}
          <NoteEditor onNoteAdded={() => setRefreshTrigger(prev => prev + 1)} />
          
          {/* 列表：接收刷新信号和过滤参数 */}
          <NoteList 
            refreshTrigger={refreshTrigger} 
            filterParams={filterParams} 
          />
        </div>
      </main>

    </div>
  )
}

export default App