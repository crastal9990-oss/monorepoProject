'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// ==========================================
// 1. 传统账号密码登录 (你原有的代码)
// ==========================================
export async function login(formData: FormData) {
    const supabase = createClient()
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: '注册失败：' + error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

// ==========================================
// 2. 传统邮箱注册
// ==========================================
export async function signup(formData: FormData) {
    const supabase = createClient()
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        // 注册失败，跳回注册页并显示错误
        return { error: '注册失败：' + error.message }
    }

    revalidatePath('/', 'layout')
    // 注册成功，根据你的业务逻辑，可以直接去仪表盘，或者去提示验证邮箱的页面
    redirect('/dashboard')
}

// ==========================================
// 3. GitHub 快捷登录/注册
// ==========================================
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

// ==========================================
// 4. Google 快捷登录/注册
// ==========================================
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

// ==========================================
// 5. 手机号发送验证码
// ==========================================
export async function sendPhoneOtp(formData: FormData) {
    const supabase = createClient()
    // 获取用户填写的手机号
    let phone = formData.get('phone') as string

    // 简单处理一下国家代码，Supabase 通常需要带国家代码的格式，如 +8613800138000
    if (!phone.startsWith('+')) {
        phone = '+86' + phone
    }

    const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
    })

    if (error) {
        return { error: '注册失败：' + error.message }
    }

    // 发送成功后，重定向到一个新的页面（你需要自己建一个 /login/verify 页面）让用户输入验证码
    // 或者在 URL 上带上信息，让前端 UI 发生变化
    redirect(`/login/verify?phone=${encodeURIComponent(phone)}&message=验证码已发送，请查收`)
}