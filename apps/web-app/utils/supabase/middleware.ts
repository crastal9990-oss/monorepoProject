import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 刷新会话并获取当前用户
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')
  // 白名单
  const isPublicPage = isAuthPage || request.nextUrl.pathname.startsWith('/terms') || request.nextUrl.pathname.startsWith('/privacy') || request.nextUrl.pathname.startsWith('/auth/callback')

  // 如果是笔记页面且带有 token 参数，视为分享链接（放行，让 page.tsx 自己去校验 token 是否合法）
  const isSharedNote = request.nextUrl.pathname.startsWith('/notes/') && request.nextUrl.searchParams.has('token');

  if (!user && !isPublicPage && !isSharedNote) {
    // 【关键修复】：如果是 Server Action 或普通的 API POST 请求，不要在中间件里硬重定向
    // 否则 Server Action 会在前端返回 undefined
    if (request.method === 'POST' || request.headers.has('next-action')) {
      return response // 直接放行
    }

    // 未登录用户访问受保护的页面，重定向到登录页，并带上 next 参数记录当前页面
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    // 已登录用户访问登录/注册页
    // 如果 URL 里带有 next 参数，说明用户是刚登录，应该重定向回最初想访问的页面
    const nextUrl = request.nextUrl.searchParams.get('next')
    const url = request.nextUrl.clone()
    if (nextUrl) {
      url.pathname = nextUrl.split('?')[0] || '/'
      const nextSearch = nextUrl.split('?')[1]
      url.search = nextSearch ? `?${nextSearch}` : ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }
    return NextResponse.redirect(url)
  }

  return response
}
