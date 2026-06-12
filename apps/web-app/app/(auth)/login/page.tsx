"use client"

import * as React from "react"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { login, signInWithGithub, signInWithGoogle } from "@/actions/login"
import { Button, Input, Label, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, toast } from "@repo/ui"

// 定义 Zod 校验规则 (Schema)
const emailSchema = z.object({
    email: z.string().email("请输入有效的邮箱地址。"),
    password: z.string().min(6, "密码至少需要 6 个字符。"),
})

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const nextUrl = searchParams.get('next')
    const [isPending, startTransition] = useTransition() // 用于标记非紧急的更新，让 UI 保持响应

    const formEmail = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "", password: "" },
    })

    function onSubmitEmail(values: z.infer<typeof emailSchema>) {
        startTransition(() => {
            const formData = new FormData()
            formData.append("email", values.email)
            formData.append("password", values.password)

            login(formData).then((res) => {
                if (res?.error) {
                    toast.error(res.error)
                } else if (res?.success) {
                    toast.success(res.message)
                    router.push(nextUrl || '/dashboard')
                }
            })
        })
    }

    return (
        <div
            className="relative min-h-screen flex items-center justify-center lg:justify-end bg-cover bg-center bg-no-repeat p-4 sm:p-8 lg:pr-24 xl:pr-40"
            style={{ backgroundImage: "url('/login.jpg')" }}
        >
            <div className="absolute inset-0 bg-black/5" />

            {/* 登录卡片 */}
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl border border-border flex flex-col p-8 animate-in fade-in zoom-in-95 duration-500">

                {/* 顶部 Logo 与欢迎语 */}
                <div className="flex flex-col space-y-2 text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight">智记云</h1>
                    <p className="text-sm text-muted-foreground font-medium mt-2">
                        欢迎回来，请登录您的账号
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* --- 核心表单区 --- */}
                    <Form {...formEmail}>
                        <form key="email-form" onSubmit={formEmail.handleSubmit(onSubmitEmail)} className="space-y-4">
                            <FormField
                                control={formEmail.control}
                                name="email"
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <FormLabel>邮箱地址</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="请输入邮箱"
                                                {...field}
                                                className={`bg-background/50 border-border/50 ${fieldState.invalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-destructive" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={formEmail.control}
                                name="password"
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>密码</FormLabel>
                                            <Link href="#" className="text-sm font-medium text-primary hover:underline">
                                                忘记密码？
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="请输入密码"
                                                {...field}
                                                className={`bg-background/50 border-border/50 ${fieldState.invalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-destructive" />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full !mt-6" disabled={isPending}>
                                {isPending ? "登录中..." : "登录"}
                            </Button>
                        </form>
                    </Form>

                    {/* --- 分隔线 --- */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">或者使用第三方账号登录</span>
                        </div>
                    </div>

                    {/* 第三方快捷登录 */}
                    <div className="grid grid-cols-2 gap-4">
                        <form action={signInWithGithub as any}>
                            {nextUrl && <input type="hidden" name="next" value={nextUrl} />}
                            <Button variant="outline" className="w-full bg-background/50 hover:bg-background/90" type="submit">
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
                                    <path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
                                </svg>
                                GitHub
                            </Button>
                        </form>
                        <form action={signInWithGoogle as any}>
                            {nextUrl && <input type="hidden" name="next" value={nextUrl} />}
                            <Button variant="outline" className="w-full bg-background/50 hover:bg-background/90" type="submit">
                                <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                                </svg>
                                Google
                            </Button>
                        </form>
                    </div>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-5">
                    还没有账号？{" "}
                    <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
                        立即注册
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
                正在加载...
            </div>
        }>
            <LoginForm />
        </React.Suspense>
    )
}