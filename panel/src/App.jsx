import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpLeft,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  ClipboardList,
  Clock3,
  CreditCard,
  Database,
  FilePlus2,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UserRoundPlus,
  UsersRound,
  Wifi,
  X,
} from 'lucide-react'
import { sileo, Toaster } from 'sileo'

const apiBase = import.meta.env.VITE_API_URL || ''
const emptyPermissions = []

const permissionItems = [
  { key: 'orders', label: 'مدیریت سفارش‌ها', icon: ClipboardList },
  { key: 'announcements', label: 'اطلاعیه‌های برنامه', icon: Bell, collection: 'announcements' },
  { key: 'serviceAnnouncements', label: 'اطلاعیه‌های خدمات', icon: MessageCircle, collection: 'service_announcements' },
  { key: 'services', label: 'مدیریت خدمات', icon: Wifi, collection: 'services' },
  { key: 'categories', label: 'دسته‌بندی خدمات', icon: SlidersHorizontal, collection: 'service_categories' },
  { key: 'settings', label: 'تنظیمات کافینت', icon: Settings2, collection: 'cafe_settings' },
  { key: 'versions', label: 'نسخه‌های برنامه', icon: Activity, collection: 'app_versions' },
]

const statusNames = {
  awaiting_operator: 'در انتظار متصدی',
  awaiting_payment: 'در انتظار پرداخت',
  payment_review: 'بررسی پرداخت',
  in_progress: 'در حال انجام',
  awaiting_customer: 'در انتظار مشتری',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
}

const recordFieldLabels = {
  id: 'شناسه',
  title: 'عنوان',
  description: 'توضیحات',
  message: 'پیام',
  name: 'نام',
  displayName: 'نام نمایشی',
  email: 'ایمیل',
  password: 'گذرواژه',
  emailVisibility: 'نمایش ایمیل',
  verified: 'تأییدشده',
  active: 'فعال',
  sortOrder: 'ترتیب نمایش',
  backgroundType: 'نوع پس‌زمینه',
  backgroundColor: 'رنگ پس‌زمینه',
  backgroundTexture: 'بافت پس‌زمینه',
  image: 'تصویر',
  link: 'پیوند',
  version: 'نسخه',
  status: 'وضعیت',
  notice: 'اطلاعیه',
  estimatedWaitMinutes: 'زمان انتظار (دقیقه)',
  bankName: 'نام بانک',
  cardHolder: 'صاحب کارت',
  cardNumber: 'شماره کارت',
  accountNumber: 'شماره حساب',
  paymentNote: 'راهنمای پرداخت',
  weeklyHours: 'ساعات کاری',
  aboutText: 'درباره',
  instagramUrl: 'اینستاگرام',
  telegramUrl: 'تلگرام',
  whatsappUrl: 'واتساپ',
  service: 'خدمت',
  category: 'دسته‌بندی',
  serviceTitle: 'عنوان خدمت',
  serviceId: 'شناسهٔ خدمت',
  orderNumber: 'شمارهٔ سفارش',
  orderId: 'سفارش',
  assignedOperator: 'متصدی',
  totalAmount: 'مبلغ کل',
  processingMinutes: 'زمان انجام (دقیقه)',
  priceBreakdown: 'جزئیات قیمت',
  formData: 'پاسخ‌های فرم',
  formLabels: 'عنوان‌های فرم',
  guestKey: 'شناسهٔ مشتری',
  fieldKey: 'شناسهٔ فیلد',
  file: 'فایل',
  sender: 'فرستنده',
  body: 'متن',
  permissions: 'مجوزها',
}

function recordFieldLabel(name) {
  return recordFieldLabels[name] || name
}

function recordOptionLabel(fieldName, value) {
  const options = {
    status: { ...statusNames, draft: 'پیش‌نویس', active: 'فعال' },
    orderType: { service: 'خدمات', free: 'سفارش آزاد' },
    sender: { guest: 'مشتری', operator: 'متصدی' },
    backgroundType: { color: 'رنگ', image: 'تصویر' },
    backgroundTexture: { none: 'بدون بافت', dots: 'نقطه‌ای', stripes: 'راه‌راه' },
    type: { info: 'اطلاع', success: 'موفق', warning: 'هشدار', urgent: 'فوری' },
  }
  return options[fieldName]?.[value] || value
}

function notifyError(error) {
  sileo.error({
    title: 'انجام نشد',
    description: error instanceof Error ? error.message : 'خطای نامشخصی رخ داد.',
  })
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (response.status === 204) return null
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(`پاسخ سرور قابل‌خواندن نیست (${response.status}).`)
  }
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `خطای سرور (${response.status})`)
  }
  return body
}

function formatPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${new Intl.NumberFormat('fa-IR').format(amount)} تومان` : '—'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function userTitle(user) {
  return user?.displayName || user?.email || 'همکار'
}

function Login({ onLogin }) {
  const [type, setType] = useState('manager')
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await onLogin({ type, identity, password })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark"><Wifi size={24} strokeWidth={2.2} /></div>
          <div>
            <span className="eyebrow">INTERNET SERVICES · WORKSPACE</span>
            <h1>خوش برگشتی</h1>
          </div>
        </div>
        <p className="login-copy">برای مدیریت خدمات اینترنتی و سفارش‌ها وارد شو.</p>
        <div className="login-tabs" role="tablist" aria-label="نوع حساب">
          <button className={type === 'manager' ? 'login-tab active' : 'login-tab'} onClick={() => setType('manager')} type="button">
            <ShieldCheck size={17} /> مدیر سیستم
          </button>
          <button className={type === 'operator' ? 'login-tab active' : 'login-tab'} onClick={() => setType('operator')} type="button">
            <UserRound size={17} /> متصدی
          </button>
        </div>
        <form className="login-form" onSubmit={submit}>
          <label>
            <span>{type === 'manager' ? 'نام کاربری مدیر' : 'ایمیل متصدی'}</span>
            <input autoComplete="username" onChange={(event) => setIdentity(event.target.value)} placeholder={type === 'manager' ? 'حساب superuser' : 'name@example.com'} required value={identity} />
          </label>
          <label>
            <span>گذرواژه</span>
            <input autoComplete={type === 'manager' ? 'current-password' : 'current-password'} onChange={(event) => setPassword(event.target.value)} placeholder="گذرواژهٔ حساب" required type="password" value={password} />
          </label>
          <button className="primary-button login-submit" disabled={busy} type="submit">
            {busy ? <span className="spinner" /> : <><span>ورود امن به پنل</span><ArrowLeftIcon /></>}
          </button>
        </form>
        <div className="login-note"><ShieldCheck size={15} /> ورود از طریق حساب‌های پایگاه دادهٔ اصلی</div>
      </section>
      <p className="login-footer">مدیریت خدمات اینترنتی، سریع و ساده</p>
    </main>
  )
}

function ArrowLeftIcon() {
  return <ArrowDownRight className="login-arrow" size={18} />
}

function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState('home')
  const [scope, setScope] = useState('pool')
  const [orderPage, setOrderPage] = useState(1)
  const [orders, setOrders] = useState([])
  const [orderCount, setOrderCount] = useState({ pool: 0, mine: 0, all: 0 })
  const [loadedOrderKey, setLoadedOrderKey] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isManager = session?.role === 'manager'
  const permissions = session?.permissions ?? emptyPermissions

  const can = useCallback((permission) => isManager || permissions.includes(permission), [isManager, permissions])
  const loadOrders = useCallback(async (nextScope = scope, nextPage = orderPage) => {
    const data = await request(`/api/panel/orders?scope=${nextScope}&page=${nextPage}&perPage=50`)
    setOrders(data.items)
    setOrderCount((current) => ({ ...current, [nextScope]: data.totalItems }))
    setLoadedOrderKey(`${nextScope}:${nextPage}`)
    return data.items
  }, [orderPage, scope])

  const loadSummary = useCallback(async () => {
    if (!can('orders')) return
    try {
      const scopes = isManager ? ['pool', 'mine', 'all'] : ['pool', 'mine']
      const results = await Promise.all(scopes.map((value) =>
        request(`/api/panel/orders?scope=${value}&page=1&perPage=1`),
      ))
      setOrderCount(Object.fromEntries(scopes.map((value, index) => [value, results[index].totalItems])))
    } catch (error) {
      notifyError(error)
    }
  }, [can, isManager])

  useEffect(() => {
    request('/api/panel/session')
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    if (page === 'orders' && can('orders')) {
      loadOrders(scope, orderPage).catch((error) => {
        setLoadedOrderKey(`${scope}:${orderPage}`)
        notifyError(error)
      })
    }
  }, [page, scope, orderPage, can, loadOrders])

  useEffect(() => {
    if (session) loadSummary()
  }, [session, loadSummary])

  async function login(credentials) {
    const nextSession = await request('/api/panel/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    setSession(nextSession)
    setPage('home')
    sileo.success({ title: `خوش آمدی ${userTitle(nextSession.user)}` })
  }

  async function logout() {
    try {
      await request('/api/panel/logout', { method: 'POST' })
    } catch (error) {
      notifyError(error)
    } finally {
      setSession(null)
      setSelectedOrder(null)
      setPage('home')
    }
  }

  function navigate(nextPage) {
    setPage(nextPage)
    setSelectedOrder(null)
    setDrawerOpen(false)
  }

  async function claimOrder(order) {
    try {
      const claimed = await request(`/api/panel/orders/${order.id}/claim`, { method: 'POST' })
      setSelectedOrder(claimed)
      setScope('mine')
      setOrderPage(1)
      await loadOrders('mine', 1)
      await loadSummary()
      sileo.success({ title: 'سفارش به نام شما ثبت شد' })
    } catch (error) {
      notifyError(error)
      await loadOrders(scope).catch(notifyError)
    }
  }

  function openOrder(order) {
    setSelectedOrder(order)
  }

  const navItems = useMemo(() => {
    const items = [{ id: 'home', title: 'خانه', icon: LayoutDashboard }]
    if (can('orders')) items.push({ id: 'orders', title: 'سفارش‌ها', icon: ClipboardList, badge: orderCount.pool })
    if (isManager) {
      items.push({ id: 'operators', title: 'متصدی‌ها', icon: UsersRound })
      items.push({ id: 'database', title: 'پایگاه داده', icon: Database })
    }
    return items
  }, [can, isManager, orderCount.pool])

  if (checking) {
    return <main className="boot-screen"><div className="boot-mark"><Wifi size={25} /></div><span className="spinner dark" /></main>
  }
  if (!session) return <><Login onLogin={login} /><Toaster position="top-center" /></>

  return (
    <div className="app-shell" dir="rtl">
      <aside className={drawerOpen ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-brand">
          <div className="brand-mark small"><Wifi size={20} /></div>
          <div><strong>کافینت</strong><span>پنل مدیریت</span></div>
          <button className="icon-button mobile-close" onClick={() => setDrawerOpen(false)} aria-label="بستن منو"><X size={19} /></button>
        </div>
        <div className="sidebar-label">فضای کاری</div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(item.id)}>
                <Icon size={19} strokeWidth={1.8} /><span>{item.title}</span>
                {item.badge > 0 && <span className="nav-badge">{item.badge > 9 ? '۹+' : item.badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-label secondary-label">دسترسی سریع</div>
        <div className="quick-nav">
          {permissionItems.filter((item) => item.collection && can(item.key)).slice(0, 4).map((item) => {
            const Icon = item.icon
            return <button key={item.key} onClick={() => navigate(`content:${item.collection}`)}><Icon size={17} /><span>{item.label}</span><ChevronLeft size={15} /></button>
          })}
        </div>
        <div className="sidebar-bottom">
          <div className="profile-chip">
            <div className="avatar">{userTitle(session.user).slice(0, 1)}</div>
            <div className="profile-details"><strong>{userTitle(session.user)}</strong><span>{isManager ? 'مدیر سیستم · متصدی' : 'متصدی سفارش‌ها'}</span></div>
            <button className="icon-button logout-button" onClick={logout} title="خروج"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <div className={drawerOpen ? 'sidebar-backdrop visible' : 'sidebar-backdrop'} onClick={() => setDrawerOpen(false)} />
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setDrawerOpen(true)} aria-label="بازکردن منو"><Menu size={21} /></button>
          <div className="topbar-context">
            <span className="topbar-dot" />
            <span>پنل مدیریت</span>
            <ChevronLeft size={14} />
            <strong>{pageTitle(page, scope, selectedOrder)}</strong>
          </div>
          <div className="topbar-actions">
            <span className="online-indicator"><i /> آنلاین</span>
            <div className="avatar top-avatar">{userTitle(session.user).slice(0, 1)}</div>
          </div>
        </header>
        <div className="page-content">
          {page === 'home' && <Dashboard session={session} count={orderCount} can={can} navigate={navigate} refresh={loadSummary} />}
          {page === 'orders' && (
            <OrdersPage
              orders={orders}
              totalCount={orderCount[scope]}
              scope={scope}
              page={orderPage}
              setPage={setOrderPage}
              setScope={(nextScope) => { setOrderPage(1); setScope(nextScope) }}
              selectedOrder={selectedOrder}
              openOrder={openOrder}
              claimOrder={claimOrder}
              reload={() => loadOrders(scope, orderPage)}
              busy={loadedOrderKey !== `${scope}:${orderPage}`}
              session={session}
              refreshSummary={loadSummary}
              onBack={() => setSelectedOrder(null)}
            />
          )}
          {page === 'operators' && isManager && <OperatorsPage />}
          {page === 'database' && isManager && <RecordsPage key={page} manager session={session} />}
          {page.startsWith('content:') && (
            <RecordsPage
              key={page}
              collectionName={page.slice('content:'.length)}
              permission={permissionItems.find((item) => item.collection === page.slice('content:'.length))}
              session={session}
            />
          )}
          {page !== 'home' && page !== 'orders' && page !== 'operators' && page !== 'database' && !page.startsWith('content:') && (
            <Dashboard session={session} count={orderCount} can={can} navigate={navigate} refresh={loadSummary} />
          )}
        </div>
        <nav className="mobile-nav">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <button key={item.id} className={page === item.id ? 'mobile-nav-item active' : 'mobile-nav-item'} onClick={() => navigate(item.id)}>
                <span className="mobile-nav-icon"><Icon size={20} />{item.badge > 0 && <i />}</span>
                <span>{item.title}</span>
              </button>
            )
          })}
        </nav>
      </main>
      <Toaster position="top-center" />
    </div>
  )
}

function pageTitle(page, scope, selectedOrder) {
  if (selectedOrder) return `سفارش ${selectedOrder.orderNumber}`
  if (page === 'home') return 'نمای کلی'
  if (page === 'orders') return scope === 'pool' ? 'استخر سفارش‌ها' : scope === 'mine' ? 'سفارش‌های من' : 'همهٔ سفارش‌ها'
  if (page === 'operators') return 'مدیریت متصدی‌ها'
  if (page === 'database') return 'مدیریت پایگاه داده'
  const collection = page.slice('content:'.length)
  return permissionItems.find((item) => item.collection === collection)?.label || 'مدیریت اطلاعات'
}

function Dashboard({ session, count, can, navigate, refresh }) {
  const items = [
    { title: 'سفارش‌های آزاد', value: count.pool ?? '—', icon: ClipboardList, tone: 'amber', action: 'orders' },
    { title: 'سفارش‌های من', value: count.mine ?? '—', icon: MessageCircle, tone: 'green', action: 'orders' },
  ]
  if (session.role === 'manager') items.push({ title: 'همکاران فعال', value: 'مدیریت', icon: UsersRound, tone: 'blue', action: 'operators' })

  return (
    <div className="dashboard-page page-enter">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-kicker"><Sparkles size={14} /> خدمات اینترنتی، یک‌جا و همیشه در دسترس</span>
          <h1>سلام، {userTitle(session.user)} <span className="welcome-glyph"><Wifi size={19} /></span></h1>
          <p>مدیریت سفارش‌ها و خدمات اینترنتی از همین‌جا.</p>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="network-mark"><Wifi size={48} /></span>
        </div>
        <div className="banner-shape shape-a" /><div className="banner-shape shape-b" />
      </section>
      <div className="section-heading metric-heading">
        <div><span className="eyebrow">خلاصهٔ فعالیت</span><h2>وضعیت امروز</h2></div>
        <button className="text-button" onClick={() => refresh()}><RefreshCw size={15} /> به‌روزرسانی</button>
      </div>
      <section className="metric-grid">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button className="metric-card" key={item.title} onClick={() => navigate(item.action)}>
              <div className={`metric-icon ${item.tone}`}><Icon size={20} /></div>
              <span className="metric-label">{item.title}</span>
              <strong className="metric-value">{typeof item.value === 'number' ? new Intl.NumberFormat('fa-IR').format(item.value) : item.value}</strong>
              <span className="metric-link">مشاهدهٔ جزئیات <ArrowDownRight size={14} /></span>
            </button>
          )
        })}
      </section>
      <div className="section-heading shortcut-heading">
        <div><span className="eyebrow">میان‌برها</span><h2>دسترسی سریع</h2></div>
      </div>
      <section className="shortcut-grid">
        {can('orders') && <button className="shortcut-card" onClick={() => navigate('orders')}><div className="shortcut-icon terracotta"><ClipboardList size={19} /></div><span><strong>استخر سفارش‌ها</strong><small>پذیرش سفارش تازه</small></span><ChevronLeft size={17} /></button>}
        {session.role === 'manager' && <button className="shortcut-card" onClick={() => navigate('operators')}><div className="shortcut-icon sage"><UserRoundPlus size={19} /></div><span><strong>افزودن متصدی</strong><small>مدیریت دسترسی همکاران</small></span><ChevronLeft size={17} /></button>}
        {session.role === 'manager' && <button className="shortcut-card" onClick={() => navigate('database')}><div className="shortcut-icon blue"><Database size={19} /></div><span><strong>ویرایش داده‌ها</strong><small>مجموعه‌های پایگاه داده</small></span><ChevronLeft size={17} /></button>}
        {permissionItems.filter((item) => item.collection && can(item.key)).slice(0, 2).map((item) => {
          const Icon = item.icon
          return <button className="shortcut-card" key={item.key} onClick={() => navigate(`content:${item.collection}`)}><div className="shortcut-icon sage"><Icon size={19} /></div><span><strong>{item.label}</strong><small>مدیریت و ویرایش</small></span><ChevronLeft size={17} /></button>
        })}
      </section>
      <section className="system-note"><div className="note-icon"><ShieldCheck size={19} /></div><div><strong>حساب امن و یکپارچه</strong><p>ورود و اطلاعات این پنل مستقیماً از پایگاه دادهٔ اصلی برنامه تأیید می‌شوند.</p></div><CheckCheck size={19} className="note-check" /></section>
    </div>
  )
}

function OrdersPage({ orders, totalCount, scope, setScope, page, setPage, selectedOrder, openOrder, claimOrder, reload, busy, session, refreshSummary, onBack }) {
  const isManager = session.role === 'manager'
  const tabs = [
    { id: 'pool', label: 'استخر سفارش', count: scope === 'pool' ? orders.length : undefined },
    { id: 'mine', label: 'سفارش‌های من', count: scope === 'mine' ? orders.length : undefined },
    ...(isManager ? [{ id: 'all', label: 'همه' }] : []),
  ]
  const [query, setQuery] = useState('')
  const filtered = orders.filter((order) => {
    const searchText = `${order.orderNumber} ${order.serviceTitle} ${order.status}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
  })

  if (selectedOrder) {
    return (
      <OrderDetail
        key={`${selectedOrder.id}:${selectedOrder.assignedOperator ?? ''}`}
        initialOrder={selectedOrder}
        session={session}
        onClaim={claimOrder}
        onBack={onBack}
        onChanged={async (order) => {
          openOrder(order)
          await reload()
          await refreshSummary()
        }}
      />
    )
  }

  return (
    <div className="orders-page page-enter">
      <div className="page-heading orders-heading">
        <div><span className="eyebrow">مرکز پشتیبانی</span><h1>سفارش‌ها <span className="heading-count">{new Intl.NumberFormat('fa-IR').format(totalCount ?? orders.length)}</span></h1><p>سفارش آزاد را بردار و از همین‌جا با مشتری در ارتباط باش.</p></div>
        <button className="outline-button refresh-button" onClick={() => reload().catch(notifyError)}><RefreshCw size={16} /><span>تازه‌سازی</span></button>
      </div>
      <div className="order-toolbar">
        <div className="segmented-tabs">
          {tabs.map((tab) => <button key={tab.id} className={scope === tab.id ? 'segment active' : 'segment'} onClick={() => { setScope(tab.id); setQuery('') }}>{tab.label}</button>)}
        </div>
        <label className="search-field"><Search size={16} /><input onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی سفارش…" value={query} /><SlidersHorizontal size={15} /></label>
      </div>
      {scope === 'pool' && <div className="pool-banner"><div className="pool-pulse"><span /></div><div><strong>استخر سفارش‌های آزاد</strong><small>این سفارش‌ها برای همهٔ متصدی‌ها در دسترس هستند.</small></div>            <span className="pool-count">{new Intl.NumberFormat('fa-IR').format(totalCount ?? orders.length)}</span></div>}
      {busy ? <div className="list-loading"><span className="spinner dark" /><span>در حال دریافت سفارش‌ها…</span></div> : filtered.length ? (
        <div className="orders-list">
          {filtered.map((order) => <OrderCard key={order.id} order={order} scope={scope} onClick={() => openOrder(order)} onClaim={() => claimOrder(order)} />)}
        </div>
      ) : <EmptyState icon={ClipboardList} title={query ? 'سفارشی پیدا نشد' : scope === 'pool' ? 'فعلاً سفارش آزادی نیست' : 'سفارشی برای نمایش وجود ندارد'} text={query ? 'عبارت دیگری را جستجو کن.' : scope === 'pool' ? 'به‌محض ثبت سفارش جدید، اینجا نمایش داده می‌شود.' : 'سفارش‌های برداشته‌شده در این بخش قرار می‌گیرند.'} />}
      {!busy && !selectedOrder && totalCount > 50 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> قبلی</button>
          <span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(Math.ceil(totalCount / 50))}</span>
          <button disabled={page * 50 >= totalCount} onClick={() => setPage((value) => value + 1)}>بعدی <ChevronLeft size={16} /></button>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, scope, onClick, onClaim }) {
  const isPool = scope === 'pool'
  return (
    <article className="order-card">
      <button className="order-main" onClick={onClick}>
        <div className={`order-card-icon ${order.orderType === 'free' ? 'free' : 'service'}`}>{order.orderType === 'free' ? <MessageCircle size={20} /> : <FileText size={20} />}</div>
        <div className="order-card-copy">
          <div className="order-card-title"><strong>{order.serviceTitle || 'سفارش'}</strong><span className={`status-pill status-${order.status}`}>{statusNames[order.status] || order.status}</span></div>
          <span className="order-number">شمارهٔ {order.orderNumber}</span>
          <div className="order-card-meta"><span><Clock3 size={13} />{formatDate(order.created)}</span><span><CreditCard size={13} />{formatPrice(order.totalAmount)}</span></div>
        </div>
        <ChevronLeft size={18} className="order-chevron" />
      </button>
      {isPool && <div className="order-card-footer"><span><span className="pool-dot" /> آمادهٔ پذیرش</span><button className="claim-button" onClick={onClaim}><span>برداشتن سفارش</span><ArrowDownRight size={15} /></button></div>}
    </article>
  )
}

function OrderDetail({ initialOrder, session, onBack, onChanged, onClaim }) {
  const [order, setOrder] = useState(initialOrder)
  const [messages, setMessages] = useState([])
  const [attachments, setAttachments] = useState([])
  const [message, setMessage] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [price, setPrice] = useState(String(initialOrder.totalAmount ?? 0))
  const [priceDirty, setPriceDirty] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formFields, setFormFields] = useState([])
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [chatLoaded, setChatLoaded] = useState(false)
  const endRef = useRef(null)
  const isPool = !order.assignedOperator
  const isMine = order.assignedOperator === (session.role === 'manager' ? `admin:${session.user.id}` : session.user.id)

  const refresh = useCallback(async (silent = false) => {
    if (isPool) return
    try {
      const [nextOrder, nextMessages, nextAttachments] = await Promise.all([
        request(`/api/panel/orders/${order.id}`),
        request(`/api/panel/orders/${order.id}/messages`),
        request(`/api/panel/orders/${order.id}/attachments`),
      ])
      setOrder(nextOrder)
      setMessages(nextMessages)
      setAttachments(nextAttachments)
      if (!priceDirty) setPrice(String(nextOrder.totalAmount ?? 0))
    } catch (error) {
      if (!silent) notifyError(error)
    } finally {
      setChatLoaded(true)
    }
  }, [isPool, order.id, priceDirty])

  useEffect(() => {
    if (isPool) return undefined
    refresh()
    const timer = window.setInterval(() => refresh(true), 8000)
    return () => window.clearInterval(timer)
  }, [isPool, refresh])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function sendMessage(event) {
    event.preventDefault()
    if (!message.trim() && !file) return
    setBusy(true)
    try {
      const body = new FormData()
      body.set('body', message.trim())
      if (file) body.set('attachment', file)
      const sent = await request(`/api/panel/orders/${order.id}/messages`, { method: 'POST', body })
      setMessages((current) => [...current, sent])
      setMessage('')
      setFile(null)
      sileo.success({ title: 'پیام برای مشتری ارسال شد' })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(status) {
    try {
      const updated = await request(`/api/panel/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setOrder(updated)
      await onChanged(updated)
      sileo.success({ title: 'وضعیت سفارش به‌روز شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  async function savePrice() {
    const amount = Number(price)
    if (!Number.isFinite(amount) || amount < 0) {
      notifyError(new Error('مبلغ سفارش معتبر نیست.'))
      return
    }
    try {
      const updated = await request(`/api/panel/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ totalAmount: amount }),
      })
      setOrder(updated)
      setPrice(String(updated.totalAmount ?? 0))
      setPriceDirty(false)
      await onChanged(updated)
      sileo.success({ title: 'قیمت خدمت ذخیره شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  async function sendForm(event) {
    event.preventDefault()
    if (!formFields.length) {
      notifyError(new Error('حداقل یک فیلد به فرم اضافه کن.'))
      return
    }
    try {
      const updated = await request(`/api/panel/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ operatorFormSchema: formFields, status: 'awaiting_customer' }),
      })
      setOrder(updated)
      await request(`/api/panel/orders/${order.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: 'لطفاً اطلاعات خواسته‌شده را در فرمی که برایتان ارسال شده تکمیل کنید.' }),
      })
      setFormOpen(false)
      await refresh()
      await onChanged(updated)
      sileo.success({ title: 'فرم برای مشتری ارسال شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  async function sendPayment() {
    const amount = Number(price)
    if (!Number.isFinite(amount) || amount < 0) {
      notifyError(new Error('مبلغ خدمت آزاد معتبر نیست.'))
      return
    }
    try {
      const payment = await request('/api/payment/instructions')
      if (!payment.available) {
        throw new Error('اطلاعات پرداخت در تنظیمات کافینت کامل نشده است.')
      }
      const updated = await request(`/api/panel/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          totalAmount: amount,
          paymentInstructions: payment,
          status: 'awaiting_payment',
        }),
      })
      setOrder(updated)
      setPrice(String(updated.totalAmount ?? 0))
      setPriceDirty(false)
      await request(`/api/panel/orders/${order.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: `مبلغ خدمت ${formatPrice(amount)} است. لطفاً از اطلاعات پرداخت ارسال‌شده در سفارش استفاده کنید.` }),
      })
      setPaymentOpen(false)
      await refresh()
      await onChanged(updated)
      sileo.success({ title: 'اطلاعات پرداخت برای مشتری ارسال شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  if (isPool) {
    return (
      <div className="order-detail page-enter">
        <button className="back-link" onClick={onBack}><ArrowRight size={17} /> بازگشت به استخر</button>
        <section className="pool-preview">
          <div className="preview-icon">{order.orderType === 'free' ? <MessageCircle size={24} /> : <FileText size={24} />}</div>
          <span className="eyebrow">سفارش آزاد</span>
          <h1>{order.serviceTitle}</h1>
          <p>این سفارش هنوز به نام متصدی خاصی ثبت نشده است.</p>
          <div className="preview-number">شمارهٔ سفارش <strong>{order.orderNumber}</strong></div>
          <div className="preview-meta"><span><Clock3 size={15} />{formatDate(order.created)}</span><span><CreditCard size={15} />{formatPrice(order.totalAmount)}</span></div>
          <button className="primary-button take-order-button" onClick={() => onClaim(initialOrder)}><span>برداشتن سفارش</span><ArrowDownRight size={17} /></button>
          <div className="preview-hint"><UsersRound size={15} /> پس از پذیرش، این سفارش از استخر خارج می‌شود.</div>
        </section>
      </div>
    )
  }

  return (
    <div className="order-detail page-enter">
      <button className="back-link" onClick={onBack}><ArrowRight size={17} /> بازگشت به سفارش‌ها</button>
      <div className="conversation-layout">
        <section className="conversation-panel">
          <header className="conversation-header">
            <div className="conversation-heading">
              <div className={`order-card-icon ${order.orderType === 'free' ? 'free' : 'service'}`}>{order.orderType === 'free' ? <MessageCircle size={20} /> : <FileText size={20} />}</div>
              <div><strong>{order.serviceTitle}</strong><span>سفارش {order.orderNumber}</span></div>
            </div>
            <span className={`status-pill status-${order.status}`}>{statusNames[order.status] || order.status}</span>
          </header>
          <div className="conversation-subbar">
            <span className="assigned-mark"><Check size={14} />{isMine ? `به نام ${userTitle(session.user)}` : 'مشاهدهٔ سفارش همکار'}</span>
            <button className="icon-button" onClick={() => refresh().catch(notifyError)} aria-label="به‌روزرسانی گفت‌وگو"><RefreshCw size={16} /></button>
          </div>
          <div className="chat-scroll">
            <div className="chat-day-divider"><span>اطلاعات سفارش</span></div>
            <div className="order-information-card">
              <div className="info-card-head"><FileText size={16} /><strong>اطلاعات مشتری و فرم ثبت سفارش</strong></div>
              {Object.keys(order.formData ?? {}).length ? (
                <div className="customer-fields">
                  {Object.entries(order.formData).map(([key, value]) => (
                    <div className="customer-field" key={key}><span>{order.formLabels?.[key] || key}</span><strong>{formatValue(value)}</strong></div>
                  ))}
                </div>
              ) : <span className="empty-detail">اطلاعات اضافه‌ای برای این سفارش ثبت نشده.</span>}
              {attachments.length > 0 && <div className="attachment-list">{attachments.map((item) => <a href={item.fileUrl} key={item.id} rel="noreferrer" target="_blank"><Paperclip size={14} />{order.formLabels?.[item.fieldKey] || item.fieldKey}<ArrowUpLeft size={13} /></a>)}</div>}
              {order.operatorFormSubmitted && Object.keys(order.operatorFormData ?? {}).length > 0 && (
                <div className="submitted-form"><span>پاسخ فرم متصدی</span>{Object.entries(order.operatorFormData).map(([key, value]) => <div key={key}><small>{order.operatorFormSchema?.find((field) => field.key === key)?.label || key}</small><strong>{formatValue(value)}</strong></div>)}</div>
              )}
            </div>
            <div className="chat-day-divider"><span>گفت‌وگو</span></div>
            {!chatLoaded && !messages.length && <div className="chat-loading"><span className="spinner dark" /></div>}
            {messages.map((item) => (
              <div className={item.sender === 'operator' ? 'message-row mine' : 'message-row theirs'} key={item.id}>
                <div className="message-bubble">
                  {item.attachmentUrl && <a className="message-image-link" href={item.attachmentUrl} rel="noreferrer" target="_blank"><img alt="پیوست سفارش" src={item.attachmentUrl} /></a>}
                  {item.body && <p>{item.body}</p>}
                  <span>{formatDate(item.created)}</span>
                </div>
              </div>
            ))}
            {!messages.length && !loadingChat && <div className="no-messages"><MessageCircle size={18} /><span>هنوز گفت‌وگویی شروع نشده است.</span></div>}
            <div ref={endRef} />
          </div>
          <form className="composer" onSubmit={sendMessage}>
            {file && <div className="selected-file"><ImagePlus size={14} /><span>{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="حذف فایل"><X size={14} /></button></div>}
            <label className="attach-button" title="افزودن تصویر"><Paperclip size={19} /><input accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></label>
            <textarea onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="پیام خود را بنویس…" rows={1} value={message} />
            <button className="send-button" disabled={busy || (!message.trim() && !file)} type="submit" aria-label="ارسال پیام">{busy ? <span className="spinner" /> : <Send size={17} />}</button>
          </form>
        </section>
        <aside className="order-tools">
          <section className="tool-card">
            <div className="tool-card-title"><SlidersHorizontal size={17} /><strong>مدیریت سفارش</strong></div>
            <label className="field-label">وضعیت سفارش</label>
            <div className="status-select-wrap"><select onChange={(event) => changeStatus(event.target.value)} value={order.status}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={16} /></div>
            <div className="tool-divider" />
            <label className="field-label" htmlFor="order-price">مبلغ خدمت</label>
            <div className="price-input-wrap"><input id="order-price" inputMode="numeric" min="0" onChange={(event) => { setPrice(event.target.value); setPriceDirty(true) }} type="number" value={price} /><span>تومان</span></div>
            {order.orderType === 'free' && <small className="field-hint">قیمت سفارش آزاد را خودت تعیین می‌کنی.</small>}
            <button className="outline-button full-button" onClick={savePrice}><Check size={15} /> ذخیرهٔ قیمت</button>
            <button className="primary-button full-button payment-button" onClick={() => setPaymentOpen(true)}><CreditCard size={16} /> ارسال اطلاعات پرداخت</button>
            <button className="outline-button full-button form-button" onClick={() => { setFormFields(order.operatorFormSchema ?? []); setFormOpen(true) }}><FilePlus2 size={16} /> ارسال فرم به مشتری</button>
          </section>
          <section className="tool-card order-summary">
            <div className="tool-card-title"><FileText size={17} /><strong>خلاصهٔ سفارش</strong></div>
            <SummaryRow label="نوع سفارش" value={order.orderType === 'free' ? 'سفارش آزاد' : 'خدمات کافینت'} />
            <SummaryRow label="زمان ثبت" value={formatDate(order.created)} />
            <SummaryRow label="مبلغ فعلی" value={formatPrice(order.totalAmount)} />
            {order.processingMinutes > 0 && <SummaryRow label="زمان انجام" value={`${new Intl.NumberFormat('fa-IR').format(order.processingMinutes)} دقیقه`} />}
            {order.paymentInstructions?.available && <div className="payment-mini"><CreditCard size={15} /><span>اطلاعات پرداخت برای این سفارش ارسال شده.</span></div>}
          </section>
          <section className="tool-tip"><CircleAlert size={16} /><span>فایل‌ها و اطلاعات مشتری فقط برای همکاران مجاز این سفارش نمایش داده می‌شود.</span></section>
        </aside>
      </div>
      {formOpen && <FormModal fields={formFields} setFields={setFormFields} onClose={() => setFormOpen(false)} onSubmit={sendForm} />}
      {paymentOpen && <PaymentModal amount={price} order={order} onClose={() => setPaymentOpen(false)} onSubmit={sendPayment} setAmount={setPrice} />}
    </div>
  )
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر'
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '—')
}

function SummaryRow({ label, value }) {
  return <div className="summary-row"><span>{label}</span><strong>{value}</strong></div>
}

function defaultJsonValue(type) {
  if (type === 'string') return ''
  if (type === 'number') return 0
  if (type === 'boolean') return false
  if (type === 'array') return []
  if (type === 'null') return null
  return {}
}

function JsonValueEditor({ value, onChange, depth = 0 }) {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  const indentation = depth > 0 ? 'json-nested' : ''

  function changeType(nextType) {
    onChange(defaultJsonValue(nextType))
  }

  if (type === 'object') {
    return (
      <div className={`json-structure ${indentation}`}>
        {Object.entries(value).map(([key, item]) => (
          <div className="json-property" key={key}>
            <label className="json-key"><span>نام</span><input aria-label="نام ویژگی" onChange={(event) => {
              const nextKey = event.target.value
              if (nextKey !== key && Object.hasOwn(value, nextKey)) return
              const next = { ...value }
              delete next[key]
              next[nextKey] = item
              onChange(next)
            }} value={key} /></label>
            <div className="json-property-value"><span>مقدار</span><JsonValueEditor depth={depth + 1} onChange={(next) => onChange({ ...value, [key]: next })} value={item} /></div>
            <button aria-label={`حذف ${key}`} className="json-remove" onClick={() => {
              const next = { ...value }
              delete next[key]
              onChange(next)
            }} type="button"><X size={15} /></button>
          </div>
        ))}
        <button className="json-add" onClick={() => {
          let index = Object.keys(value).length + 1
          let key = `field_${index}`
          while (Object.hasOwn(value, key)) key = `field_${++index}`
          onChange({ ...value, [key]: '' })
        }} type="button"><Plus size={14} /> افزودن ویژگی</button>
      </div>
    )
  }

  if (type === 'array') {
    return (
      <div className={`json-structure ${indentation}`}>
        {value.map((item, index) => (
          <div className="json-array-item" key={index}>
            <JsonValueEditor depth={depth + 1} onChange={(next) => onChange(value.map((current, itemIndex) => itemIndex === index ? next : current))} value={item} />
            <button aria-label={`حذف گزینهٔ ${index + 1}`} className="json-remove" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} type="button"><X size={15} /></button>
          </div>
        ))}
        <button className="json-add" onClick={() => onChange([...value, ''])} type="button"><Plus size={14} /> افزودن گزینه</button>
      </div>
    )
  }

  return (
    <div className={`json-scalar ${indentation}`}>
      {type === 'boolean' ? (
        <label className="record-checkbox"><input checked={value} onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span>{value ? 'فعال' : 'غیرفعال'}</span></label>
      ) : type === 'null' ? <span className="field-note">مقدار خالی</span> : (
        <input aria-label="مقدار" inputMode={type === 'number' ? 'decimal' : undefined} onChange={(event) => onChange(type === 'number' ? (event.target.value === '' ? 0 : Number(event.target.value)) : event.target.value)} type={type === 'number' ? 'number' : 'text'} value={value} />
      )}
      <select aria-label="نوع مقدار" className="json-type-select" onChange={(event) => changeType(event.target.value)} value={type}>
        <option value="string">متن</option><option value="number">عدد</option><option value="boolean">بله/خیر</option><option value="object">گروه</option><option value="array">فهرست</option><option value="null">خالی</option>
      </select>
    </div>
  )
}

function fieldHelp(field) {
  const details = []
  if (field.name === 'id') {
    details.push('شناسه پس از ساخت به‌صورت خودکار تعیین می‌شود')
    return details
  }
  if (field.required) details.push('الزامی')
  if (field.type === 'select' && Array.isArray(field.options)) {
    details.push(`گزینه‌ها: ${field.options.map((option) => recordOptionLabel(field.name, option)).join('، ') || 'ندارد'}`)
  } else if (field.type === 'relation') {
    details.push(`ارتباط با: ${field.collectionName || 'مجموعهٔ مرتبط'}`)
    if (!field.collectionName) details.push('در صورت نبود فهرست، شناسهٔ رکورد را وارد کن')
    if (field.maxSelect > 1) details.push(`حداکثر ${field.maxSelect} مورد`)
  } else if (field.type === 'file') {
    details.push(field.mimeTypes?.length ? `نوع فایل: ${field.mimeTypes.join('، ')}` : 'همهٔ نوع‌های فایل')
    if (field.maxSelect > 1) details.push(`حداکثر ${field.maxSelect} فایل`)
    if (field.maxSize > 0) details.push(`حداکثر حجم ${Math.ceil(field.maxSize / 1024 / 1024)} مگابایت`)
    details.push('در ویرایش، انتخاب فایل جدید جایگزین فایل قبلی می‌شود')
  } else if (field.type === 'json') {
    details.push('ویژگی و گزینه اضافه کن؛ نوع هر مقدار قابل انتخاب است')
  } else if (field.type === 'autodate') {
    details.push('زمان به‌صورت خودکار ثبت می‌شود')
  } else if (field.type === 'password') {
    details.push('برای نگه‌داشتن گذرواژهٔ فعلی، خالی بگذار')
  }
  if ((field.type === 'text' || field.type === 'editor' || field.type === 'number') && field.min !== null && field.min !== undefined) details.push(`کمینه ${field.min}`)
  if ((field.type === 'text' || field.type === 'editor' || field.type === 'number') && field.max !== null && field.max !== undefined) details.push(`بیشینه ${field.max}`)
  if (field.pattern) details.push(`الگو: ${field.pattern}`)
  if ((field.type === 'select' || field.type === 'relation') && field.minSelect > 0) details.push(`حداقل ${field.minSelect} مورد`)
  if (field.type === 'number' && field.onlyInt) details.push('فقط عدد صحیح')
  return details
}

function RecordField({ field, value, onChange, selectedFiles, onFilesChange, relationOptions, existingFile, required, readOnly }) {
  const multiple = (field.type === 'select' || field.type === 'relation' || field.type === 'file') && field.maxSelect > 1
  const hints = fieldHelp(field)
  let control

  if (field.name === 'id' && readOnly) {
    control = <input aria-label={field.name} disabled type="text" value={value || 'پس از ساخت تعیین می‌شود'} />
  } else if (field.type === 'bool') {
    control = <label className="record-checkbox"><input aria-label={field.name} checked={Boolean(value)} disabled={readOnly} onChange={(event) => onChange(event.target.checked)} type="checkbox" /><span>{value ? 'فعال' : 'غیرفعال'}</span></label>
  } else if (field.type === 'select') {
    control = (
      <select aria-label={field.name} disabled={readOnly} multiple={multiple} onChange={(event) => onChange(multiple ? Array.from(event.target.selectedOptions, (option) => option.value) : event.target.value)} required={required && !multiple} value={multiple ? (Array.isArray(value) ? value : []) : value ?? ''}>
        {!multiple && <option value="">انتخاب کنید</option>}
        {(field.options ?? []).map((option) => <option key={option} value={option}>{recordOptionLabel(field.name, option)}</option>)}
      </select>
    )
  } else if (field.type === 'relation' && relationOptions?.length) {
    const selectedIds = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : []
    const options = [
      ...relationOptions,
      ...selectedIds.filter((id) => !relationOptions.some((option) => option.id === id)).map((id) => ({ id, label: `شناسهٔ ${id}` })),
    ]
    control = (
      <select aria-label={field.name} disabled={readOnly} multiple={multiple} onChange={(event) => onChange(multiple ? Array.from(event.target.selectedOptions, (option) => option.value) : event.target.value)} required={required && !multiple} value={multiple ? (Array.isArray(value) ? value : []) : value ?? ''}>
        {!multiple && <option value="">انتخاب کنید</option>}
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    )
  } else if (field.type === 'file') {
    control = (
      <>
        {existingFile && <span className="current-file">{Array.isArray(existingFile) ? existingFile.join('، ') : existingFile}</span>}
        <input accept={field.mimeTypes?.join(',') || undefined} aria-label={field.name} disabled={readOnly} multiple={multiple} onChange={(event) => onFilesChange(Array.from(event.target.files ?? []).slice(0, field.maxSelect > 1 ? field.maxSelect : 1))} required={required && !existingFile} type="file" />
        {selectedFiles?.length > 0 && <span className="current-file">فایل تازه: {selectedFiles.map((file) => file.name).join('، ')}</span>}
      </>
    )
  } else if (field.type === 'json') {
    control = <JsonValueEditor onChange={onChange} value={value === undefined ? {} : value} />
  } else if (field.type === 'autodate') {
    control = <input aria-label={field.name} disabled type="text" value={value || 'پس از ذخیره ثبت می‌شود'} />
  } else if (field.type === 'date') {
    const dateValue = value ? new Date(value) : null
    const localDate = dateValue && !Number.isNaN(dateValue.getTime()) ? new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
    control = <input aria-label={field.name} disabled={readOnly} max={field.max || undefined} min={field.min || undefined} onChange={(event) => onChange(event.target.value)} required={required} type="datetime-local" value={localDate} />
  } else if (field.type === 'number') {
    control = <input aria-label={field.name} disabled={readOnly} max={field.max ?? undefined} min={field.min ?? undefined} onChange={(event) => onChange(event.target.value)} required={required} step={field.onlyInt ? 1 : 'any'} type="number" value={value ?? ''} />
  } else if (field.type === 'geoPoint') {
    const point = value && typeof value === 'object' ? value : {}
    control = <div className="geo-fields"><label><span>طول جغرافیایی</span><input aria-label={`${field.name} طول`} disabled={readOnly} onChange={(event) => onChange({ ...point, lon: event.target.value === '' ? null : Number(event.target.value) })} type="number" value={point.lon ?? ''} /></label><label><span>عرض جغرافیایی</span><input aria-label={`${field.name} عرض`} disabled={readOnly} onChange={(event) => onChange({ ...point, lat: event.target.value === '' ? null : Number(event.target.value) })} type="number" value={point.lat ?? ''} /></label></div>
  } else {
    const inputType = field.type === 'email' || field.type === 'url' || field.type === 'password' ? field.type : 'text'
    const isLong = field.type === 'editor'
    const inputProps = {
      'aria-label': field.name,
      autoCapitalize: field.type === 'email' || field.type === 'url' ? 'none' : undefined,
      maxLength: field.max ?? undefined,
      minLength: field.min ?? undefined,
      onChange: (event) => onChange(event.target.value),
      placeholder: field.type === 'relation' ? 'شناسهٔ رکورد مرتبط' : undefined,
      required,
      value: value ?? '',
    }
    control = isLong
      ? <textarea {...inputProps} disabled={readOnly} rows={4} />
      : <input {...inputProps} autoComplete={field.type === 'password' ? 'new-password' : undefined} disabled={readOnly} pattern={field.pattern || undefined} type={inputType} />
  }

  return (
    <div className={`record-field ${field.type === 'bool' ? 'record-field-boolean' : ''}`}>
      <span className="record-field-label">{recordFieldLabel(field.name)}{required && !readOnly && <i>*</i>}<small>{field.name}</small></span>
      {control}
      {hints.length > 0 && <small className="field-note">{hints.join(' · ')}</small>}
    </div>
  )
}

function Modal({ label, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div aria-label={label} aria-modal="true" className="modal-dialog" role="dialog">
        {children}
      </div>
    </div>,
    document.body,
  )
}

function FormModal({ fields, setFields, onClose, onSubmit }) {
  function updateField(index, patch) {
    setFields((current) => current.map((field, itemIndex) => itemIndex === index ? { ...field, ...patch } : field))
  }
  function addField() {
    setFields((current) => [...current, { key: `field_${current.length + 1}`, label: '', type: 'text', required: false }])
  }

  return (
    <Modal label="درخواست اطلاعات از مشتری" onClose={onClose}>
      <form className="modal-card" onSubmit={onSubmit}>
        <header className="modal-header"><div><span className="eyebrow">فرم تکمیلی</span><h2>درخواست اطلاعات از مشتری</h2></div><button className="icon-button" onClick={onClose} type="button" aria-label="بستن"><X size={19} /></button></header>
        <p className="modal-copy">مشتری فرم را در صفحهٔ سفارش می‌بیند و پاسخ او در همین گفت‌وگو ثبت می‌شود.</p>
        <div className="form-field-list">
          {fields.map((field, index) => (
            <div className="form-field-editor" key={`${index}-${field.key}`}>
              <div className="form-row">
                <label><span>عنوان فیلد</span><input onChange={(event) => updateField(index, { label: event.target.value })} placeholder="مثلاً شمارهٔ پرونده" required value={field.label} /></label>
                <label><span>نوع ورودی</span><select onChange={(event) => updateField(index, { type: event.target.value })} value={field.type}><option value="text">متن</option><option value="number">عدد</option><option value="phone">شماره تلفن</option><option value="email">ایمیل</option><option value="textarea">متن بلند</option><option value="select">انتخاب گزینه</option><option value="checkbox">تأیید / بله‌خیر</option><option value="date">تاریخ</option></select></label>
              </div>
              {field.type === 'select' && <label className="options-label"><span>گزینه‌ها (با ویرگول جدا کن)</span><input onChange={(event) => updateField(index, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="گزینهٔ اول، گزینهٔ دوم" value={(field.options ?? []).join(', ')} /></label>}
              <div className="form-row form-row-bottom">
                <label><span>شناسهٔ فیلد</span><input onChange={(event) => updateField(index, { key: event.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} required value={field.key} /></label>
                <label className="checkbox-line"><input checked={Boolean(field.required)} onChange={(event) => updateField(index, { required: event.target.checked })} type="checkbox" /><span>پاسخ الزامی</span></label>
                <button className="remove-field" onClick={() => setFields((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button" title="حذف فیلد"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>
        <button className="add-field-button" onClick={addField} type="button"><Plus size={16} /> افزودن فیلد</button>
        <div className="modal-actions"><button className="outline-button" onClick={onClose} type="button">انصراف</button><button className="primary-button" type="submit"><Send size={15} /> ارسال فرم</button></div>
      </form>
    </Modal>
  )
}

function PaymentModal({ amount, setAmount, order, onClose, onSubmit }) {
  return (
    <Modal label="ارسال درخواست پرداخت" onClose={onClose}>
      <section className="modal-card compact-modal">
        <header className="modal-header"><div><span className="eyebrow">اطلاعات پرداخت برنامه</span><h2>ارسال درخواست پرداخت</h2></div><button className="icon-button" onClick={onClose} aria-label="بستن"><X size={19} /></button></header>
        <p className="modal-copy">اطلاعات کارت از تنظیمات کافینت خوانده می‌شود و به همین سفارش پیوند می‌خورد.</p>
        <label className="modal-price-field"><span>{order.orderType === 'free' ? 'قیمت خدمت آزاد را وارد کن' : 'مبلغ سفارش'}</span><div className="price-input-wrap"><input autoFocus inputMode="numeric" min="0" onChange={(event) => setAmount(event.target.value)} type="number" value={amount} /><span>تومان</span></div></label>
        <div className="modal-note"><CreditCard size={17} /><span>اطلاعات کارت ذخیره‌شده در تنظیمات کافینت برای مشتری نمایش داده می‌شود.</span></div>
        <div className="modal-actions"><button className="outline-button" onClick={onClose}>انصراف</button><button className="primary-button" onClick={onSubmit}><Send size={15} /> ارسال برای مشتری</button></div>
      </section>
    </Modal>
  )
}

function OperatorsPage() {
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ displayName: '', email: '', password: '', permissions: [] })
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    const data = await request('/api/panel/operators')
    setOperators(data)
  }, [])

  useEffect(() => {
    reload().catch(notifyError).finally(() => setLoading(false))
  }, [reload])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      await request('/api/panel/operators', { method: 'POST', body: JSON.stringify(form) })
      setForm({ displayName: '', email: '', password: '', permissions: [] })
      setModal(false)
      await reload()
      sileo.success({ title: 'حساب متصدی ساخته شد' })
    } catch (error) {
      notifyError(error)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(operator) {
    try {
      await request(`/api/panel/operators/${operator.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !operator.active }),
      })
      await reload()
      sileo.success({ title: operator.active ? 'دسترسی متصدی غیرفعال شد' : 'دسترسی متصدی فعال شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  async function updatePermissions(operator, permission) {
    const next = operator.permissions.includes(permission)
      ? operator.permissions.filter((value) => value !== permission)
      : [...operator.permissions, permission]
    try {
      await request(`/api/panel/operators/${operator.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: next }),
      })
      await reload()
      sileo.success({ title: 'مجوزهای متصدی ذخیره شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <div className="operators-page page-enter">
      <div className="page-heading">
        <div><span className="eyebrow">تیم پشتیبانی</span><h1>متصدی‌ها <span className="heading-count">{new Intl.NumberFormat('fa-IR').format(operators.length)}</span></h1><p>ساخت حساب و مدیریت دسترسی‌های همکاران.</p></div>
        <button className="primary-button add-operator-button" onClick={() => setModal(true)}><Plus size={17} /><span>متصدی جدید</span></button>
      </div>
      <div className="operator-notice"><ShieldCheck size={18} /><span>ساخت حساب فقط برای مدیر سیستم فعال است. متصدی‌ها با حساب مجموعهٔ users وارد می‌شوند.</span></div>
      {loading ? <div className="list-loading"><span className="spinner dark" /><span>در حال دریافت همکاران…</span></div> : operators.length ? (
        <div className="operators-list">
          {operators.map((operator) => (
            <article className={operator.active ? 'operator-card' : 'operator-card disabled'} key={operator.id}>
              <div className="operator-card-heading">
                <div className="avatar operator-avatar">{userTitle(operator).slice(0, 1)}</div>
                <div className="operator-info"><strong>{userTitle(operator)}</strong><span>{operator.email}</span></div>
                <button className={operator.active ? 'toggle active' : 'toggle'} onClick={() => toggle(operator)} aria-label={operator.active ? 'غیرفعال‌کردن متصدی' : 'فعال‌کردن متصدی'}><i /></button>
              </div>
              <div className="operator-status"><span className={operator.active ? 'active-dot' : 'inactive-dot'} />{operator.active ? 'حساب فعال' : 'دسترسی متوقف شده'}</div>
              <div className="permission-title"><ShieldCheck size={14} /> مجوزهای دسترسی</div>
              <div className="permission-chips">
                {permissionItems.map((permission) => (
                  <button className={operator.permissions.includes(permission.key) ? 'permission-chip selected' : 'permission-chip'} key={permission.key} onClick={() => updatePermissions(operator, permission.key)}>
                    {operator.permissions.includes(permission.key) && <Check size={12} />}{permission.label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={UsersRound} title="هنوز متصدی‌ای نساختی" text="با ساخت اولین حساب، همکارت می‌تواند وارد پنل شود." />}
      {modal && (
        <Modal label="ساخت متصدی جدید" onClose={() => setModal(false)}>
          <form className="modal-card operator-modal" onSubmit={submit}>
            <header className="modal-header"><div><span className="eyebrow">حساب همکار</span><h2>ساخت متصدی جدید</h2></div><button className="icon-button" onClick={() => setModal(false)} type="button" aria-label="بستن"><X size={19} /></button></header>
            <p className="modal-copy">حساب در مجموعهٔ اصلی users ساخته می‌شود. گذرواژه را با متصدی به‌صورت امن در میان بگذار.</p>
            <label className="input-label"><span>نام نمایشی</span><input onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="نام متصدی" required value={form.displayName} /></label>
            <label className="input-label"><span>ایمیل ورود</span><input autoComplete="off" onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" required type="email" value={form.email} /></label>
            <label className="input-label"><span>گذرواژهٔ موقت</span><input autoComplete="new-password" minLength="8" onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="حداقل ۸ نویسه" required type="password" value={form.password} /></label>
            <div className="permission-title"><ShieldCheck size={15} /> انتخاب مجوزها</div>
            <div className="new-permissions">
              {permissionItems.map((permission) => (
                <label className="permission-check" key={permission.key}><input checked={form.permissions.includes(permission.key)} onChange={() => setForm((current) => ({ ...current, permissions: current.permissions.includes(permission.key) ? current.permissions.filter((value) => value !== permission.key) : [...current.permissions, permission.key] }))} type="checkbox" /><span>{permission.label}</span></label>
              ))}
            </div>
            <div className="modal-actions"><button className="outline-button" onClick={() => setModal(false)} type="button">انصراف</button><button className="primary-button" disabled={busy} type="submit">{busy ? <span className="spinner" /> : <><UserRoundPlus size={16} /> ساخت حساب</>}</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function RecordsPage({ manager = false, collectionName: initialCollectionName, permission, session }) {
  const [collections, setCollections] = useState([])
  const [collection, setCollection] = useState(initialCollectionName ?? '')
  const [records, setRecords] = useState([])
  const [schema, setSchema] = useState([])
  const [values, setValues] = useState({})
  const [files, setFiles] = useState({})
  const [relationOptions, setRelationOptions] = useState({})
  const [loadingCollections, setLoadingCollections] = useState(true)
  const [loadedRecordsKey, setLoadedRecordsKey] = useState('')
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState('')

  const basePath = manager ? '/api/panel/data' : '/api/panel/content'

  useEffect(() => {
    if (!manager) return undefined
    request('/api/panel/data/collections')
      .then((data) => setCollections(data))
      .catch(notifyError)
      .finally(() => setLoadingCollections(false))
    return undefined
  }, [manager])

  const loadRecords = useCallback(async () => {
    if (!collection) return
    const requestKey = `${collection}:${page}`
    try {
      const [result, info] = await Promise.all([
        request(`${basePath}/${collection}/records?page=${page}&perPage=30`),
        manager
          ? request('/api/panel/data/collections').then((items) => items.find((item) => item.name === collection))
          : Promise.resolve(null),
      ])
      setRecords(result.items)
      setTotal(result.totalItems)
      setSchema(info?.fields ?? result.fields ?? [])
    } catch (error) {
      notifyError(error)
    } finally {
      setLoadedRecordsKey(requestKey)
    }
  }, [basePath, collection, manager, page])

  useEffect(() => {
    if (collection) loadRecords()
  }, [collection, loadRecords])

  useEffect(() => {
    if (!editor) return undefined
    const targets = [...new Set(schema
      .filter((field) => field.type === 'relation' && field.collectionName)
      .map((field) => field.collectionName))]
    if (!targets.length) return undefined

    let cancelled = false
    Promise.all(targets.map(async (target) => {
      const targetPermission = permissionItems.find((item) => item.collection === target)
      const canReadTarget = manager || (targetPermission && session?.permissions?.includes(targetPermission.key))
      if (!canReadTarget) return [target, []]
      const path = manager ? `/api/panel/data/${target}/records` : `/api/panel/content/${target}/records`
      const result = await request(`${path}?page=1&perPage=50`)
      return [target, result.items.map((record) => ({
        id: record.id,
        label: record.title || record.name || record.email || record.version || record.id,
      }))]
    })).then((entries) => {
      if (!cancelled) setRelationOptions(Object.fromEntries(entries))
    }).catch(notifyError)

    return () => { cancelled = true }
  }, [editor, manager, schema, session?.permissions])

  function startCreate() {
    const template = Object.fromEntries(schema
      .filter((field) => field.name !== 'tokenKey')
      .map((field) => [
        field.name,
        field.type === 'bool' ? false
          : field.type === 'json' ? {}
            : (field.type === 'select' || field.type === 'relation') && field.maxSelect > 1 ? []
              : '',
      ]))
    setValues(template)
    setFiles({})
    setRelationOptions({})
    setEditor({ mode: 'create' })
  }

  function startEdit(record) {
    const data = Object.fromEntries(schema
      .filter((field) => field.name !== 'tokenKey')
      .map((field) => [field.name, field.type === 'password' ? '' : record[field.name] ?? (
        field.type === 'bool' ? false
          : field.type === 'json' ? {}
            : field.maxSelect > 1 && (field.type === 'select' || field.type === 'relation') ? []
              : ''
      )]))
    setValues(data)
    setFiles({})
    setRelationOptions({})
    setEditor({ mode: 'edit', id: record.id })
  }

  async function saveRecord(event) {
    event.preventDefault()
    const data = { ...values }
    for (const field of schema) {
      if (field.type === 'number' && data[field.name] !== '') {
        data[field.name] = Number(data[field.name])
      } else if (field.type === 'date' && data[field.name]) {
        data[field.name] = new Date(data[field.name]).toISOString()
      } else if (field.type === 'password' && !data[field.name]) {
        delete data[field.name]
      }
      if (field.system && !['password', 'email', 'emailVisibility', 'verified'].includes(field.name)) delete data[field.name]
    }
    if (collection === 'users' && data.password) data.passwordConfirm = data.password
    const body = new FormData()
    body.set('data', JSON.stringify(data))
    for (const [field, selected] of Object.entries(files)) {
      for (const file of selected) body.append(field, file)
    }
    setSaving(true)
    try {
      const isCreate = editor.mode === 'create'
      const url = `${basePath}/${collection}/records${isCreate ? '' : `/${editor.id}`}`
      await request(url, { method: isCreate ? 'POST' : 'PATCH', body })
      setEditor(null)
      await loadRecords()
      sileo.success({ title: isCreate ? 'رکورد ساخته شد' : 'تغییرات ذخیره شد' })
    } catch (error) {
      notifyError(error)
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord(record) {
    const name = record.title || record.name || record.email || record.id
    if (!window.confirm(`رکورد «${name}» برای همیشه حذف شود؟`)) return
    try {
      await request(`${basePath}/${collection}/records/${record.id}`, { method: 'DELETE' })
      await loadRecords()
      sileo.success({ title: 'رکورد حذف شد' })
    } catch (error) {
      notifyError(error)
    }
  }

  const collectionInfo = collections.find((item) => item.name === collection)
  const title = permission?.label ?? collectionInfo?.name ?? 'مجموعه‌ها'
  const loading = collection ? loadedRecordsKey !== `${collection}:${page}` : loadingCollections
  const filteredRecords = records.filter((record) => {
    if (!query) return true
    const haystack = `${record.title ?? ''} ${record.name ?? ''} ${record.id} ${record.email ?? ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div className="records-page page-enter">
      <div className="page-heading">
        <div><span className="eyebrow">{manager ? 'ابزار مدیر سیستم' : 'مدیریت محتوا'}</span><h1>{collection ? title : 'پایگاه داده'}</h1><p>{manager ? 'رکوردهای مجموعه‌های پایگاه دادهٔ برنامه را مدیریت کن.' : 'اطلاعات برنامه را با همان ساختاری که اپلیکیشن استفاده می‌کند ویرایش کن.'}</p></div>
        {collection && <button className="primary-button add-record-button" onClick={startCreate}><Plus size={16} /><span>رکورد جدید</span></button>}
      </div>
      {manager && !collection && (
        <section className="collection-intro"><div className="collection-intro-icon"><Database size={22} /></div><div><strong>مجموعه‌های پایگاه داده</strong><span>مجموعه‌ای را برای دیدن و ویرایش رکوردهای آن انتخاب کن.</span></div><span className="total-pill">{new Intl.NumberFormat('fa-IR').format(collections.length)} مجموعه</span></section>
      )}
      {!collection && manager ? (
        loading ? <div className="list-loading"><span className="spinner dark" /><span>در حال دریافت مجموعه‌ها…</span></div> : (
          <div className="collections-grid">
            {collections.map((item) => {
              const known = permissionItems.find((permissionItem) => permissionItem.collection === item.name)
              const Icon = known?.icon ?? Database
              return <button className="collection-card" key={item.id} onClick={() => { setPage(1); setCollection(item.name) }}><div className="collection-icon"><Icon size={19} /></div><div><strong>{known?.label || collectionLabel(item.name)}</strong><span><Database size={12} /> {item.name} · {new Intl.NumberFormat('fa-IR').format(item.fields.length)} فیلد</span></div><ChevronLeft size={17} /></button>
            })}
          </div>
        )
      ) : collection ? (
        <>
          {manager && <button className="back-link database-back" onClick={() => { setCollection(''); setRecords([]); setPage(1) }}><ArrowRight size={17} /> بازگشت به مجموعه‌ها</button>}
          <div className="records-toolbar">
            <label className="search-field"><Search size={16} /><input onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در این صفحه…" value={query} /><span>{new Intl.NumberFormat('fa-IR').format(total)} رکورد</span></label>
            {!manager && <button className="icon-button" onClick={() => loadRecords().catch(notifyError)} aria-label="به‌روزرسانی"><RefreshCw size={17} /></button>}
          </div>
          {loading ? <div className="list-loading"><span className="spinner dark" /><span>در حال دریافت رکوردها…</span></div> : filteredRecords.length ? (
            <div className="records-list">
              {filteredRecords.map((record) => (
                <article className="record-card" key={record.id}>
                  <div className="record-leading"><FileText size={18} /></div>
                  <div className="record-copy"><strong>{record.title || record.name || record.serviceTitle || record.version || record.id}</strong><span>{record.description || record.summary || record.message || record.created || record.id}</span></div>
                  <button className="icon-button record-more" onClick={() => startEdit(record)} title="ویرایش"><Settings2 size={16} /></button>
                  <button className="icon-button delete-record" onClick={() => deleteRecord(record)} title="حذف"><X size={16} /></button>
                </article>
              ))}
              {total > 30 && <div className="pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> قبلی</button><span>صفحهٔ {new Intl.NumberFormat('fa-IR').format(page)}</span><button disabled={page * 30 >= total} onClick={() => setPage((value) => value + 1)}>بعدی <ChevronLeft size={16} /></button></div>}
            </div>
          ) : <EmptyState icon={Database} title="رکوردی پیدا نشد" text={query ? 'عبارت دیگری را جستجو کن.' : 'برای شروع، اولین رکورد این مجموعه را بساز.'} />}
        </>
      ) : !manager ? <EmptyState icon={ShieldCheck} title="دسترسی این بخش فعال نیست" text="برای ویرایش این اطلاعات، مجوز مربوطه را از مدیر سیستم بگیر." /> : null}
      {editor && (
        <Modal label={editor.mode === 'create' ? 'ساخت رکورد' : 'ویرایش رکورد'} onClose={() => setEditor(null)}>
          <form className="modal-card record-editor" onSubmit={saveRecord}>
            <header className="modal-header"><div><span className="eyebrow">{collection}</span><h2>{editor.mode === 'create' ? 'ساخت رکورد' : 'ویرایش رکورد'}</h2></div><button className="icon-button" onClick={() => setEditor(null)} type="button" aria-label="بستن"><X size={19} /></button></header>
            <p className="modal-copy">هر مقدار را در کادر مربوط به نوع خودش وارد کن. فیلدهای سیستمی و زمان‌دار خودکار مدیریت می‌شوند.</p>
            <div className="record-fields">
              {schema.filter((field) => !field.name.startsWith('_') && field.name !== 'tokenKey').map((field) => {
                const required = (field.required && !(field.type === 'password' && editor.mode === 'edit')) || (collection === 'users' && editor.mode === 'create' && field.type === 'password')
                const existingFile = editor.mode === 'edit' ? records.find((record) => record.id === editor.id)?.[field.name] : null
                const readOnly = field.type === 'autodate' || (field.system && !['password', 'email', 'emailVisibility', 'verified'].includes(field.name))
                return (
                  <RecordField
                    existingFile={existingFile}
                    field={field}
                    key={field.name}
                    onChange={(next) => setValues((current) => ({ ...current, [field.name]: next }))}
                    onFilesChange={(selected) => setFiles((current) => ({ ...current, [field.name]: selected }))}
                    relationOptions={relationOptions[field.collectionName]}
                    readOnly={readOnly}
                    required={required}
                    selectedFiles={files[field.name]}
                    value={values[field.name]}
                  />
                )
              })}
            </div>
            <div className="modal-actions"><button className="outline-button" onClick={() => setEditor(null)} type="button">انصراف</button><button className="primary-button" disabled={saving} type="submit">{saving ? <span className="spinner" /> : <><Check size={16} /> ذخیرهٔ رکورد</>}</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function collectionLabel(name) {
  return ({
    orders: 'سفارش‌ها',
    order_messages: 'گفت‌وگوها',
    order_attachments: 'فایل‌های سفارش',
    service_categories: 'دسته‌بندی خدمات',
    service_announcements: 'اطلاعیه‌های خدمات',
    cafe_settings: 'تنظیمات کافینت',
    app_versions: 'نسخه‌های برنامه',
  })[name] || name
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><strong>{title}</strong><p>{text}</p></div>
}

export default App
