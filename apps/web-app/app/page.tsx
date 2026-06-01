import { redirect } from 'next/navigation';

export default function Home() {
  // 直接跳转到内部的工作台页面
  redirect('/dashboard');
}

