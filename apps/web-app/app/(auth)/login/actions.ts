'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/login?error=注册失败：' + error.message)
  }

  // 默认情况下 Supabase 注册可能需要邮箱验证，你可以视配置而定
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signInWithGithub() {
  const supabase = createClient()
  const origin = headers().get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      // 授权成功后，Supabase 会重定向到我们配置的回调路由
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url) // 重定向到 GitHub 授权页
  }
}

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
    redirect(data.url) // 重定向到 Google 授权页
  }
}
