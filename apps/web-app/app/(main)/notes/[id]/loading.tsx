import { ChevronLeft, Sparkles } from 'lucide-react'

export default function NoteLoading() {
  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-60px)] w-full overflow-hidden bg-background">
      {/* 侧边目录 (左侧) 占位 */}
      <div className="shrink-0 border-r border-border bg-muted/10 hidden md:block w-64 h-full opacity-50" />

      {/* 编辑器主体区域占位 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 relative">
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full relative">
          
          {/* 顶部骨架 */}
          <div className="pt-6 lg:pt-10 px-6 lg:px-10 pb-4 border-b border-transparent">
            {/* 顶部操作区 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center text-muted-foreground text-sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium bg-background text-muted-foreground border-border/80">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                AI 助手
              </div>
            </div>

            {/* 标题骨架 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 bg-muted/60 rounded-md w-1/3 animate-pulse" />
            </div>
            
            {/* 底部信息栏骨架 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 bg-muted/60 rounded w-24 animate-pulse" />
              </div>
              <div className="h-4 bg-muted/60 rounded w-32 animate-pulse" />
            </div>
          </div>

          {/* 正文骨架 */}
          <div className="flex-1 w-full px-6 lg:px-10 py-6 relative">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 px-6 lg:px-10 py-6 pointer-events-none">
              <div className="animate-pulse space-y-4">
                <div className="h-5 bg-muted/60 rounded w-3/4" />
                <div className="h-5 bg-muted/60 rounded w-full" />
                <div className="h-5 bg-muted/60 rounded w-5/6" />
                <div className="h-5 bg-muted/60 rounded w-2/3" />
                <div className="h-5 bg-muted/60 rounded w-full mt-8" />
                <div className="h-5 bg-muted/60 rounded w-4/5" />
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
