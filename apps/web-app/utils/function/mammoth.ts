import { createClient } from "@/utils/supabase/client"

// 动态加载 mammoth.js 用于客户端解析 .docx 文件
export const loadMammoth = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window is undefined"))
      return
    }
    const globalWindow = window as any
    if (globalWindow.mammoth) {
      resolve(globalWindow.mammoth)
      return
    }
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"
    script.onload = () => {
      if (globalWindow.mammoth) {
        resolve(globalWindow.mammoth)
      } else {
        reject(new Error("mammoth is not defined on window after script load"))
      }
    }
    script.onerror = () => reject(new Error("Failed to load mammoth.js library"))
    document.head.appendChild(script)
  })
}

/**
 * 将 Word .docx 的 ArrayBuffer 解析转换为 HTML，并在此过程中将嵌入的所有图片上传至 Supabase Storage
 * 返回的 HTML 中图片 src 均已被替换为 Supabase Storage 公网可访问的 URL，以防图片丢失
 * 
 * @param arrayBuffer .docx 文件的二进制 buffer
 * @returns 解析并上传图片替换后的 HTML 字符串
 */
export const convertDocxToHtmlWithImages = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const mammothInstance = await loadMammoth()
  const supabase = createClient()
  
  // 自定义 Mammoth 图片转换规则，拦截 base64 转为 Supabase 云端存储的 CDN 地址
  const mammothOptions = {
    convertImage: mammothInstance.images.imgElement(async (image: any) => {
      const imgBuffer = await image.read()
      const fileExt = image.contentType.split("/")[1] || "png"
      const fileName = `docx_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `uploads/${fileName}`
      
      // 上传图片二进制数据至公开存储桶
      const { error: uploadErr } = await supabase.storage
        .from('notes-images')
        .upload(filePath, imgBuffer, {
          contentType: image.contentType,
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadErr) {
        console.error("Failed to upload docx inline image to Supabase Storage:", uploadErr)
        throw uploadErr
      }
      
      // 获取图片的公网 URL 并回填给 img 标签
      const { data: { publicUrl } } = supabase.storage
        .from('notes-images')
        .getPublicUrl(filePath)
        
      return { src: publicUrl }
    })
  }
  
  const result = await mammothInstance.convertToHtml({ arrayBuffer }, mammothOptions)
  return result.value
}
