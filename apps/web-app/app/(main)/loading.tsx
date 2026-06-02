import { Loader2 } from "lucide-react"

export default function MainLoading() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center h-full min-h-[60vh]">
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-primary/5 rounded-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground tracking-wide animate-pulse">
                    正在加载内容...
                </p>
            </div>
        </div>
    )
}
