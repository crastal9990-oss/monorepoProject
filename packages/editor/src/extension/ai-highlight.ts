import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const aiHighlightKey = new PluginKey('aiHighlight')

// 声明类型，让 TypeScript 认识我们的自定义命令
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiHighlight: {
      setAiHighlight: (options: { from: number; to: number }) => ReturnType
      clearAiHighlight: () => ReturnType
    }
  }
}
// 点击对话跳转到编辑器进行高亮
export const AiHighlightExtension = Extension.create({
  name: 'aiHighlight',

  // 增加命令，方便在外部直接调用 editor.commands.setAiHighlight()
  addCommands() {
    return {
      setAiHighlight: ({ from, to }) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(aiHighlightKey, { from, to })
        }
        return true
      },
      clearAiHighlight: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(aiHighlightKey, 'clear')
        }
        return true
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiHighlightKey,
        state: {
          init() { return DecorationSet.empty },
          apply(tr, oldSet) {
            const highlight = tr.getMeta(aiHighlightKey)
            if (highlight) {
              if (highlight === 'clear') return DecorationSet.empty
              return DecorationSet.create(tr.doc, [
                Decoration.inline(highlight.from, highlight.to, { class: 'ai-highlight-flash' })
              ])
            }
            // 自动映射文档变化（比如高亮期间用户删除了前面的字，高亮范围会自动跟随偏移）
            return oldSet.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)
          }
        }
      })
    ]
  }
})