import { type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 调用封装好的 Supabase 会话刷新与路由拦截逻辑
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 匹配所有的请求路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网页图标)
     * - public 目录下的文件 (如图片、字体等)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
