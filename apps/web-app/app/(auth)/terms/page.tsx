import Link from "next/link";
export default function TermsPage() {
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">服务条
              款</h1>
            <p className="mt-2 text-sm text-slate-400">最后更新日期:2026年6月1日</p>
          </header>
          <div className="space-y-6 text-sm md:text-base leading-relaxed text-slate-600">
            <p>
              欢迎使用我们的笔记分享平台(以下简称“本服务”)。请在注册或使用本服务前仔细阅读以下条款。点击注册或继
              续使用本服务,即表示您同意接受本条款的约束。
            </p>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">1. 账号注册与安全</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800">提供准确信息:</strong>您在注册时必须提供真
                  实、准确、完整的个人信息,并保持更新。</li>
                <li><strong className="text-slate-800">账号安全:</strong>您须妥善保管您的账号密码。
                  任何通过您的账号发生的行为(包括但不限于创建笔记、添加好友、分享内容),均视为您本人的行为,您须对此负责。</li>
                <li><strong className="text-slate-800">账号限制:</strong>如果您违反本条款,我们有权
                  随时暂停或终止您的账号,且无需事先通知。</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">2. 用户内容与知识产权</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-slate-800">您的内容归您所有:</strong>您在使用本服务时创
                  建的笔记、文档、图片等内容(简称“用户内容”),其知识产权归您本人或原作者所有。</li>
                <li><strong className="text-slate-800">授权说明:</strong>为了向您提供“多端同步”、“好
                  友分享”等核心功能,您同意授予我们在提供服务所必需的范围内,对您的内容进行存储、复制、传输和展示的许可。</li>
                <li><strong className="text-slate-800">禁止的内容:</strong>您不得利用本服务制作、上
                  传或传播任何违反国家法律法规、侵犯他人版权、或包含色情、暴力、仇恨言论的内容。</li>
              </ul>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">3. 社交与分享行为规范</h2>
              <p>
                本平台提供好友添加与笔记分享功能。您在与他人互动时,应保持尊重,不得恶意骚扰其他用户。您应当谨慎决
                定分享您的笔记内容,对于因您主动分享而导致的信息泄露或纠纷,本平台不承担责任。
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">4. 服务的变更与终止</h2>
              <p>
                我们将尽最大商业努力保障服务的稳定运行,但不对服务的绝对可用性、数据的绝对不丢失提供明示或暗示的保
                证。建议您对重要的笔记定期进行本地备份。
              </p>
            </section>
            <section className="pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                如果您对本条款有任何疑问,请联系我们的官方支持团队。
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}