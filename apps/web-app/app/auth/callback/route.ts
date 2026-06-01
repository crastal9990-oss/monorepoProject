import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 如果 URL 里带有 next 参数，登录成功后跳去 next，否则去 /dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    // 使用 code 换取 session 会话
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 成功换取后，重定向到目的页面
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 换取失败或没有 code，返回登录页并可以带上错误信息
  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
