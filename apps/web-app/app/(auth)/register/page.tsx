"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import Image from "next/image"

// 引入你的 Server Actions
import { signup, signInWithGithub, signInWithGoogle, sendPhoneOtp } from "../register/actions"

// 引入组件库 (请根据你的实际路径调整)
import { Button, Input, Label, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui"

// ==========================================
// 1. 定义 Zod 校验规则 (Schema)
// ==========================================
const emailSchema = z.object({
    email: z.string().email("请输入有效的邮箱地址。"),
    password: z.string().min(6, "密码至少需要 6 个字符。"),
})

const phoneSchema = z.object({
    phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的 11 位手机号码。"),
})

export default function RegisterPage() {
    const [method, setMethod] = useState<"email" | "phone">("email")
    const [isPending, startTransition] = useTransition()
    const [serverError, setServerError] = useState<string | null>(null)

    const formEmail = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "", password: "" },
    })

    const formPhone = useForm<z.infer<typeof phoneSchema>>({
        resolver: zodResolver(phoneSchema),
        defaultValues: { phone: "" },
    })

    function onSubmitEmail(values: z.infer<typeof emailSchema>) {
        setServerError(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.append("email", values.email)
            formData.append("password", values.password)

            const res = await signup(formData)
            if (res?.error) setServerError(res.error)
        })
    }

    function onSubmitPhone(values: z.infer<typeof phoneSchema>) {
        setServerError(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.append("phone", values.phone)

            const res = await sendPhoneOtp(formData)
            if (res?.error) setServerError(res.error)
        })
    }

    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">

            {/* 左侧：科技感图片背景区 */}
            <div className="relative hidden h-full flex-col bg-black lg:flex dark:border-r">
                <Image
                    src="/login(1).jpg"
                    alt="AI 知识库 Pro - 智能沉淀你的数字大脑"
                    fill
                    priority
                    className="object-cover object-center opacity-90"
                />

                <div className="absolute top-10 left-10 z-20 flex items-center text-lg font-medium text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-6 w-6 text-white">
                        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                    </svg>
                    &ldquo;种一棵树最好的时间是十年前，其次是现在。&rdquo;
                    <br />
                    开启你的知识沉淀之旅，将碎片化的信息编织成你的第二大脑。
                </div>
            </div>

            {/* 右侧注册表单 */}
            <div className="lg:p-8 flex items-center justify-center h-full">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight">创建新账号</h1>
                        <p className="text-sm text-muted-foreground">填写信息完成注册，开启智能笔记体验</p>
                    </div>

                    <div className="grid gap-6">
                        {/* 注册方式切换 Tabs */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
                            <button
                                onClick={() => { setMethod("email"); setServerError(null) }}
                                className={`flex items-center justify-center py-2 text-sm font-medium rounded-md transition-colors ${method === "email" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                邮箱注册
                            </button>
                            <button
                                onClick={() => { setMethod("phone"); setServerError(null) }}
                                className={`flex items-center justify-center py-2 text-sm font-medium rounded-md transition-colors ${method === "phone" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                手机号注册
                            </button>
                        </div>

                        {/* --- 核心表单区 --- */}
                        {method === "email" ? (
                            <Form {...formEmail}>
                                <form onSubmit={formEmail.handleSubmit(onSubmitEmail)} className="space-y-4">
                                    <FormField
                                        control={formEmail.control}
                                        name="email"
                                        render={({ field, fieldState }) => (
                                            <FormItem>
                                                <FormLabel>邮箱地址</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="you@example.com"
                                                        {...field}
                                                        className={`bg-background/50 ${fieldState.invalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
                                                <FormLabel>设置密码</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="至少 6 位字符"
                                                        {...field}
                                                        className={`bg-background/50 ${fieldState.invalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-destructive" />
                                            </FormItem>
                                        )}
                                    />

                                    {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

                                    <Button type="submit" className="w-full !mt-6" disabled={isPending}>
                                        {isPending ? "注册中..." : "注册账号"}
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            <Form {...formPhone}>
                                <form onSubmit={formPhone.handleSubmit(onSubmitPhone)} className="space-y-4">
                                    <FormField
                                        control={formPhone.control}
                                        name="phone"
                                        render={({ field, fieldState }) => (
                                            <FormItem>
                                                <FormLabel>手机号码</FormLabel>
                                                <FormControl>
                                                    <div className="flex space-x-2">
                                                        <div className="flex items-center justify-center px-3 border border-input rounded-md bg-muted/50 text-sm text-muted-foreground">
                                                            +86
                                                        </div>
                                                        <Input
                                                            type="tel"
                                                            placeholder="138 0000 0000"
                                                            {...field}
                                                            className={`flex-1 bg-background/50 ${fieldState.invalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-destructive" />
                                            </FormItem>
                                        )}
                                    />

                                    {serverError && <p className="text-sm font-medium text-destructive">{serverError}</p>}

                                    <Button type="submit" className="w-full !mt-6" disabled={isPending}>
                                        {isPending ? "发送中..." : "发送验证码"}
                                    </Button>
                                </form>
                            </Form>
                        )}

                        {/* --- 分隔线 --- */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">或者使用</span>
                            </div>
                        </div>

                        {/* --- 第三方快捷登录 --- */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* 注意：第三方登录保持原生 <form action={...}> 即可，不要用 react-hook-form 接管 */}
                            <form action={signInWithGithub}>
                                <Button variant="outline" className="w-full" type="submit">
                                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
                                        <path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z" />
                                    </svg>
                                    GitHub
                                </Button>
                            </form>
                            <form action={signInWithGoogle}>
                                <Button variant="outline" className="w-full" type="submit">
                                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                                    </svg>
                                    Google
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* 底部协议与登录链接 */}
                    <div className="space-y-4">
                        <p className="text-center text-sm text-muted-foreground">
                            已有账号？{" "}
                            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                                直接登录
                            </Link>
                        </p>
                        <p className="px-8 text-center text-xs text-muted-foreground/60">
                            点击注册即表示您同意我们的{" "}
                            <Link href="/terms" className="underline hover:text-foreground">服务条款</Link>
                            {" "}和{" "}
                            <Link href="/privacy" className="underline hover:text-foreground">隐私政策</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}