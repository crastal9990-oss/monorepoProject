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
      return { error: '登录失败：' + errorMessage }
    }
  } catch (e: any) {
    errorMessage = e?.message || '发生了未知的网络错误'
    return { error: '登录失败：' + errorMessage }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: '登陆成功' }
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

  if (error) {
    // 如果你在后台关闭了“邮箱枚举保护”，它可能会直接返回“User already registered”的报错
    if (error.message.includes('already registered')) {
      return { error: '该邮箱已被注册，请直接前往登录！' }
    }
    return { error: '注册失败：' + error.message }
  }

  // 处理“邮箱已注册”的隐式情况（默认开启防枚举保护时）
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    return { error: '该邮箱已被注册，请直接前往登录！' }
  }

  if (data?.session) {
    // 如果返回了 session，说明 Supabase 后台关闭了邮箱验证，用户已直接登录成功
    return { success: true, message: '注册成功，已为您自动登录！', redirect: '/dashboard' }
  }

  return { success: true, message: '注册成功，请前往您的邮箱查收激活邮件！' }
}

// GitHub 快捷登录/注册
export async function signInWithGithub(formData: FormData) {
  const supabase = createClient()
  const host = headers().get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`
  const next = formData.get('next') as string || '/dashboard'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`, // 告诉 Supabase，在 GitHub 授权成功后，跳转回我们自己的回调 API
    },
  })

  if (error) {
    console.error('GitHub login error:', error.message)
  }

  if (data?.url) {
    redirect(data.url) // 获取到 GitHub 的授权页面链接后，让用户浏览器跳转过去
  }
}

// Google 快捷登录/注册
export async function signInWithGoogle(formData: FormData) {
  const supabase = createClient()
  const host = headers().get('host')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`
  const next = formData.get('next') as string || '/dashboard'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) {
    console.error('Google login error:', error.message)
  }

  if (data?.url) {
    redirect(data.url)
  }
}

