import { signup } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { Label } from '@repo/ui'
import { Input } from '@repo/ui'
import { Button } from '@repo/ui'
import Link from 'next/link'

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">注册新账号</CardTitle>
          <CardDescription>请输入你的邮箱和密码来加入知识库。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              {/* 注册要求密码最少6位 */}
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            
            {/* 错误信息展示区 */}
            {searchParams?.error && (
              <p className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-md">
                {searchParams.error}
              </p>
            )}
            
            <div className="flex flex-col gap-2 pt-4">
              <Button formAction={signup} className="w-full">
                立即注册
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">已有账号？返回登录</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
