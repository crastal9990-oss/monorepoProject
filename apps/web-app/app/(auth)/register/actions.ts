'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/register?error=注册失败：' + error.message)
  }

  // 修改这里：注册成功后，不要去 /dashboard，而是去 /login 并带上提示信息
  redirect('/login?message=注册成功，请前往邮箱点击验证链接激活账号！')
}
