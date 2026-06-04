import { toast } from '@repo/ui'

export function useImageUpload(uploadFn?: (file: File) => Promise<string | null>) {
    const handlePaste = (view: any, event: any) => {
        if (!uploadFn) return false // 如果没有传入 uploadFn，就走默认逻辑（可能是 base64 或者纯文本）

        const items = event.clipboardData?.items
        if (!items) return false

        // 遍历剪贴板内容
        for (const item of Array.from(items) as any[]) {
            // 如果发现是图片格式 (image/png, image/jpeg 等)
            if (item.type.indexOf('image') === 0) {
                const file = item.getAsFile()
                if (!file) continue

                // ⚠️ 阻止默认的粘贴行为
                event.preventDefault()

                toast.loading('正在上传图片...')

                // 异步上传
                uploadFn(file).then((url) => {
                    if (url) {
                        view.dispatch(
                            view.state.tr.replaceSelectionWith(
                                view.state.schema.nodes.image.create({ src: url })
                            )
                        )
                        toast.dismiss()
                        toast.success('图片上传成功')
                    } else {
                        toast.dismiss()
                        toast.error('上传失败，请重试')
                    }
                })
                return true
            }
        }
        return false
    }

    const handleDrop = (view: any, event: any, slice: any, moved: boolean) => {
        // 1. 防御性判断：如果没有上传函数，或者是内部文字拖拽排版 (moved = true)，直接放行
        if (!uploadFn || moved) return false

        // 2. 尝试提取拖入的文件
        const file = event.dataTransfer?.files?.[0]

        // 3. 校验是否为图片文件
        if (file && file.type.startsWith('image/')) {
            // ⚠️ 必须：阻止浏览器默认打开新标签页查看图片的行为
            event.preventDefault()

            // 开启 loading 提示 (传入 id 方便后续精准关闭)
            toast.loading('正在提取图片...', { id: 'upload-toast' })

            // 🌟 核心黑魔法：获取鼠标松开那一瞬间，在富文本树状结构中的确切坐标
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })

            // 触发异步上传
            uploadFn(file).then((url) => {
                if (url) {
                    // 创建一个图片节点
                    const node = view.state.schema.nodes.image.create({ src: url })

                    // 决定插入位置：如果有确切坐标就插在坐标处，否则插在当前光标位置
                    const insertPos = coordinates?.pos || view.state.selection.to

                    // 派发一个事务 (Transaction) 来安全地将节点插入到指定位置
                    const transaction = view.state.tr.insert(insertPos, node)
                    view.dispatch(transaction)

                    toast.success('图片上传成功', { id: 'upload-toast' })
                } else {
                    toast.error('图片云端上传失败，请重试', { id: 'upload-toast' })
                }
            })

            // 返回 true 告诉底层引擎：我已经完美接管了这个拖拽事件
            return true
        }

        // 如果拖进来的不是图片（比如拖了个 txt 进来），放行让默认逻辑处理
        return false
    }

    // 将封装好的方法暴露出去
    return { handlePaste, handleDrop }
}