import Link from "next/link";
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        {/* 返回顶部/主页导航 */}
        <div className="mb-8">
          <Link href="/register" className="text-sm font-medium text-blue-600 hover:text-blue-800
transition-colors inline-flex items-center gap-1">
            ← 返回
          </Link>
        </div>
        {/* 文章主体 */}
        <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-
sm">

          <header className="mb-8 pb-6 border-b border-slate-100 text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">隐私政
              策</h1>
            <p className="mt-2 text-sm text-slate-400">最后更新日期:2026年6月1日</p>
          </header>
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-slate-600">
            <p>
              我们深知隐私对您的重要性,并致力于保护您的个人数据。本隐私政策解释了我们如何收集、使用、存储和共享您
              的信息。
            </p>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">1. 我们收集哪些信息?</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800">账户信息:</strong>当您注册时,我们可能会收集
                  您的用户名、密码、电子邮件地址或头像等基本信息。</li>
                <li><strong className="text-slate-800">您创建的内容:</strong>您在平台上创建并存储的
                  笔记、文档、上传的图片及相关媒体文件。</li>
                <li><strong className="text-slate-800">社交与互动数据:</strong>您的好友列表、您主动
                  分享的笔记链接以及在平台内的互动记录。</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">2. 我们如何使用您的信息?
              </h2>
              <p>我们将收集到的信息用于以下用途:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>创建和管理您的账户,提供多端同步与云端存储服务;</li>
                <li>实现您所请求的社交功能(如好友可见性、特定笔记的定向分享等);</li>
                <li>保护您的账号安全,防止欺诈、多重恶意登录等不安全行为;</li>
                <li>优化产品体验,进行系统性能分析与日常漏洞修补。</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">3. 我们如何共享您的信息?
              </h2>
              <p>
                我们<strong className="text-red-600 font-medium">绝对不会</strong>将您的个人信息和笔记
                内容出售给任何第三方。我们仅在以下情况下共享您的信息:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800">在您的显式授权下:</strong>当您主动使用“分
                  享”功能或“添加好友”功能时,相关用户将获得您指定笔记的查看权限。</li>
                <li><strong className="text-slate-800">法律合规要求:</strong>根据相关法律法规、诉讼
                  程序或政府机关的强制性要求时。</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">4. 您的权利与数据导出</h2>
              <p>
                您对自己的数据拥有完全的控制权。您可以随时编辑、下载或彻底删除您的笔记文档。当您选择注销您的账户
                时,我们将永久删除您的个人信息和所有云端笔记内容,法律法规另有规定的除外。
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  )
}