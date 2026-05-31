export default function LoginPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>🔒 登录页 (/login)</h1>
      <p>这是公开页面。中间件检测到你未登录，所以把你拦截到了这里！</p>
    </div>
  )
}
