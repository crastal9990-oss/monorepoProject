'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// 传统账号密码登录
export async function login(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  let errorMessage = ''

  try {
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
      errorMessage = error.message
    }
  } catch (e: any) {
    errorMessage = e?.message || '发生了未知的网络错误'
  }

  // 必须在 try/catch 外部调用 redirect，否则会被 catch 捕获导致跳转失败
  if (errorMessage) {
    redirect(`/login?error=${encodeURIComponent('登录失败：' + errorMessage)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// 传统账号密码注册
export async function signup(formData: FormData) {
  const supabase = createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  // 3. 处理常规的 Supabase 报错（例如邮箱格式不对、网络问题等）
  if (error) {
    // 如果你在后台关闭了“邮箱枚举保护”，它可能会直接返回“User already registered”的报错
    if (error.message.includes('already registered')) {
      return { error: '该邮箱已被注册，请直接前往登录！' }
    }
    return { error: '注册失败：' + error.message }
  }

  // 4. 处理“邮箱已注册”的隐式情况（默认开启防枚举保护时）
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    return { error: '该邮箱已被注册，请直接前往登录！' }
  }
  // 5. 真正注册成功
  return { success: true, message: '注册成功，请前往您的邮箱查收激活邮件！' }
}

// GitHub 快捷登录/注册
export async function signInWithGithub() {
  const supabase = createClient()
  // 获取当前网站的域名 (例如 http://localhost:3000)
  const origin = headers().get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      // 告诉 Supabase，在 GitHub 授权成功后，跳转回我们自己的回调 API
      redirectTo: `${origin}/auth/callback`,
    },
  })

  // 获取到 GitHub 的授权页面链接后，让用户浏览器跳转过去
  if (data.url) {
    redirect(data.url)
  }
}

// Google 快捷登录/注册
export async function signInWithGoogle() {
  const supabase = createClient()
  const origin = headers().get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

