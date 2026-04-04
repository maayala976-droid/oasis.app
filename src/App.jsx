// src/App.jsx — Oasis Polirrubro PWA — Vite + React
import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react'
import { supabase, uploadImage, generateOrderCode } from './supabase.js'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const ADMIN_WHATSAPP   = '5491100000000'
const MERCADOPAGO_LINK = 'https://mpago.la/XXXXXX'
const ADMIN_LOCAL_PASS = 'oasis2024'

// ─── CONTEXTS ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)
const CartContext = createContext(null)
const useAuth = () => useContext(AuthContext)
const useCart = () => useContext(CartContext)

// ─── AUTH PROVIDER ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncProfile = useCallback(async (uid) => {
    if (!uid) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, client_code, whatsapp')
      .eq('id', uid)
      .single()
    if (error) {
      console.error('[Auth_Critical_Error]:', {
        msg: error.message, details: error.details, hint: error.hint
      })
      return null
    }
    return data
  }, [])

  useEffect(() => {
    let isMounted = true

    const handleSessionChange = async (session) => {
      if (!isMounted) return
      if (session?.user) {
        const userData = await syncProfile(session.user.id)
        if (isMounted) {
          setUser(session.user)
          setProfile(userData)
          setLoading(false)
        }
      } else {
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    const initialize = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.refreshSession()
        .catch(() => ({ data: { session: null } }))
      await handleSessionChange(session)
    }

    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        handleSessionChange(session)
      }
      if (event === 'SIGNED_OUT') {
        handleSessionChange(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [syncProfile])

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signOut: () => supabase.auth.signOut(),
    fetchProfile: syncProfile,
  }), [user, profile, loading, syncProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── CART PROVIDER ────────────────────────────────────────────────────────────
function CartProvider({ children }) {
  const [items, setItems]   = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = (product) =>
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...product, qty: 1 }]
    })

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const updateQty = (id, qty) => {
    if (qty <= 0) return removeItem(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i))
  }

  const clearCart = () => setItems([])
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  )
}

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Ico = {
  Cart:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:24,height:24}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/><path d="M10,11v6M14,11v6M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>,
  Plus:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width:18,height:18}}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Close: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:24,height:24}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  User:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:24,height:24}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Box:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Cog:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:20,height:20}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
}

// ─── NEON BUTTON ──────────────────────────────────────────────────────────────
function Btn({ onClick, children, className = '', variant = 'primary', disabled = false, size = 'md', style = {} }) {
  const base = { fontFamily: "'Exo 2', sans-serif", fontWeight: 600, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }
  const sizes = { sm: { padding: '8px 18px', fontSize: 14 }, md: { padding: '12px 24px', fontSize: 16 }, lg: { padding: '16px 32px', fontSize: 18 } }
  const variants = {
    primary: { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', borderRadius: 50, boxShadow: '0 0 20px #a855f755, 0 4px 15px rgba(124,58,237,0.4)', color: '#fff', transition: 'all 0.2s' },
    danger:  { background: '#7f1d1d', borderRadius: 50, color: '#fca5a5', transition: 'all 0.2s' },
    outline: { background: 'transparent', borderRadius: 50, border: '1px solid #a855f7', color: '#c084fc', transition: 'all 0.2s' },
    success: { background: '#14532d', borderRadius: 50, color: '#86efac', transition: 'all 0.2s' },
    ghost:   { background: 'transparent', borderRadius: 50, color: '#c084fc', transition: 'all 0.2s' },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }} className={className}>
      {children}
    </button>
  )
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function OasisLogo({ size = 52 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)', animation: 'pulseNeon 2s ease-in-out infinite' }} />
      <img src="/logo192.png" alt="Oasis" style={{ width: size, height: size, objectFit: 'contain', borderRadius: '50%' }}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
      <div style={{ display: 'none', width: size, height: size, alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron,monospace', fontWeight: 900, fontSize: size * 0.4, color: '#a855f7', textShadow: '0 0 20px #a855f7' }}>O</div>
    </div>
  )
}

// ─── CHAT FAB NEON ────────────────────────────────────────────────────────────
// Círculo flotante con "OASIS" arriba y "CHAT" abajo, luz neon pulsante
function ChatFab({ onClick, open }) {
  return (
    <button onClick={onClick} style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 50,
      width: 68, height: 68, borderRadius: '50%', border: 'none', cursor: 'pointer',
      background: 'linear-gradient(135deg,#4a1d96,#7c3aed,#a855f7)',
      animation: 'pulseNeon 2s ease-in-out infinite',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 0, padding: 0,
    }}>
      {open ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{width:26,height:26}}>
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      ) : (
        <>
          <span style={{ fontFamily: 'Orbitron,monospace', fontWeight: 900, fontSize: 10, color: '#fff', letterSpacing: 1, lineHeight: 1.2, textShadow: '0 0 8px rgba(255,255,255,0.8)' }}>OASIS</span>
          <span style={{ fontFamily: 'Orbitron,monospace', fontWeight: 700, fontSize: 9, color: '#ddd6fe', letterSpacing: 2, lineHeight: 1.2 }}>CHAT</span>
        </>
      )}
    </button>
  )
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ setPage }) {
  const { user, profile, signOut } = useAuth()
  const { count, setIsOpen } = useCart()
  const [menu, setMenu] = useState(false)

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setPage('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <OasisLogo size={44} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Orbitron,monospace', fontWeight: 900, fontSize: 20, color: '#fff', textShadow: '0 0 15px rgba(168,85,247,0.8)' }}>OASIS</div>
            <div style={{ fontSize: 11, color: '#a855f7', letterSpacing: 4, fontWeight: 600 }}>POLIRRUBRO</div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setIsOpen(true)} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', padding: 8 }}>
            <Ico.Cart />
            {count > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', boxShadow: '0 0 10px #a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{count}</span>
            )}
          </button>

          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenu(!menu)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', padding: 8 }}><Ico.User /></button>
              {menu && (
                <div style={{ position: 'absolute', right: 0, top: 52, width: 210, borderRadius: 16, overflow: 'hidden', background: '#0f0f1a', border: '1px solid rgba(168,85,247,0.3)', zIndex: 100 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
                    <div style={{ fontSize: 12, color: '#a855f7', fontWeight: 600 }}>Hola,</div>
                    <div style={{ color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || user.email}</div>
                    {profile?.client_code && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>🪪 {profile.client_code}</div>}
                    {profile?.role === 'admin' && <div style={{ fontSize: 12, color: '#e879f9', fontWeight: 600 }}>⚡ Administrador</div>}
                  </div>
                  {[
                    { label: '📦 Mis Pedidos', page: 'account' },
                    ...(profile?.role === 'admin' ? [{ label: '⚙️ Panel Admin', page: 'admin' }] : []),
                  ].map(item => (
                    <button key={item.page} onClick={() => { setPage(item.page); setMenu(false) }}
                      style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: item.page === 'admin' ? '#e879f9' : '#c084fc', fontSize: 15, fontFamily: "'Exo 2',sans-serif" }}>
                      {item.label}
                    </button>
                  ))}
                  <button onClick={() => { signOut(); setMenu(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 15, fontFamily: "'Exo 2',sans-serif" }}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Btn size="sm" onClick={() => setPage('login')}>Ingresar</Btn>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── FLOATING CHAT INTERNO ────────────────────────────────────────────────────
function FloatingChat() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    if (!user || !open) return
    supabase.from('messages').select('*').eq('user_id', user.id).order('created_at')
      .then(({ data }) => setMsgs(data || []))
    const sub = supabase.channel('chat-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
        p => setMsgs(prev => [...prev, p.new]))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user, open])

  const send = async () => {
    if (!text.trim() || !user) return
    await supabase.from('messages').insert({ user_id: user.id, sender: 'user', content: text.trim() })
    setText('')
  }

  // Si no está logueado, no mostramos nada (sin WhatsApp)
  if (!user) return null

  return (
    <>
      <ChatFab onClick={() => setOpen(!open)} open={open} />

      {open && (
        <div style={{ position: 'fixed', bottom: 104, right: 24, zIndex: 70, width: 320, borderRadius: 24, overflow: 'hidden', background: '#0a0a1a', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 0 40px rgba(168,85,247,0.25)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#4a1d96,#7c3aed,#a855f7)' }}>
            <OasisLogo size={36} />
            <div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontWeight: 700, color: '#fff', fontSize: 14 }}>OASIS</div>
              <div style={{ fontSize: 12, color: '#ddd6fe' }}>Chat con nosotros ✓</div>
            </div>
          </div>
          <div style={{ height: 240, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.length === 0 && (
              <div style={{ color: '#a855f7', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
                👋 ¡Hola! Escribinos tu consulta y te respondemos pronto.
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: 16, fontSize: 13,
                  ...(m.sender === 'user'
                    ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', borderBottomRightRadius: 4 }
                    : { background: '#1f1f35', color: '#e2e8f0', borderBottomLeftRadius: 4 })
                }}>
                  {m.sender === 'admin' && <div style={{ fontSize: 10, color: '#a855f7', marginBottom: 2, fontWeight: 700 }}>OASIS</div>}
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 8, borderTop: '1px solid rgba(168,85,247,0.2)' }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escribí tu consulta..." style={{ flex: 1, fontSize: 14, padding: '8px 12px' }} />
            <Btn size="sm" onClick={send}>→</Btn>
          </div>
        </div>
      )}
    </>
  )
}

// ─── CART MODAL ───────────────────────────────────────────────────────────────
function CartModal({ setPage }) {
  const { user, profile } = useAuth()
  const { items, removeItem, updateQty, clearCart, total, isOpen, setIsOpen } = useCart()
  const [step, setStep]   = useState('cart')
  const [method, setMethod] = useState('cash')
  const [wa, setWa]       = useState('')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderCode, setOrderCode] = useState('')

  if (!isOpen) return null

  const placeOrder = async () => {
    if (!user) { setIsOpen(false); setPage('login'); return }
    setPlacing(true)
    const code = generateOrderCode()
    await supabase.from('orders').insert({
      user_id: user.id,
      order_code: code,
      client_code: profile?.client_code || null,
      whatsapp: wa || profile?.whatsapp || null,
      items: items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total,
      payment_method: method,
      notes: notes.trim() || null,
      status: 'received',
    })
    setOrderCode(code); clearCart(); setStep('done'); setPlacing(false)
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60, backdropFilter: 'blur(4px)' }
  const panel   = { position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 440, background: '#07070f', borderLeft: '1px solid rgba(168,85,247,0.3)', overflowY: 'auto', zIndex: 61, animation: 'slideIn 0.3s ease-out' }

  return (
    <div>
      <div style={overlay} onClick={() => setIsOpen(false)} />
      <div style={panel}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Orbitron,monospace', fontSize: 22, fontWeight: 900, color: '#fff' }}>Tu Carrito</h2>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7' }}><Ico.Close /></button>
          </div>

          {step === 'done' ? (
            <div style={{ textAlign: 'center', paddingTop: 48, animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontFamily: 'Orbitron,monospace', fontSize: 22, color: '#fff', marginBottom: 8 }}>¡Pedido Confirmado!</h3>
              <p style={{ color: '#a855f7', marginBottom: 8 }}>Tu código de pedido:</p>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: 28, fontWeight: 900, color: '#e879f9', textShadow: '0 0 20px rgba(232,121,249,0.8)', marginBottom: 24 }}>{orderCode}</div>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 32 }}>Guardá este código para hacer el seguimiento.</p>
              <Btn onClick={() => { setStep('cart'); setIsOpen(false) }} size="lg">Seguir Comprando</Btn>
            </div>

          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 64, color: '#a855f7' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
              <p style={{ fontSize: 18 }}>Tu carrito está vacío</p>
            </div>

          ) : step === 'cart' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                {items.map(item => (
                  <div key={item.id} className="card-neon" style={{ borderRadius: 18, padding: 16, display: 'flex', gap: 14 }}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ color: '#e879f9', fontWeight: 700 }}>${(item.price * item.qty).toLocaleString('es-AR')}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: 'none', cursor: 'pointer', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico.Minus /></button>
                        <span style={{ color: '#fff', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: 'none', cursor: 'pointer', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ico.Plus /></button>
                        <button onClick={() => removeItem(item.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}><Ico.Trash /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(168,85,247,0.2)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
                <span style={{ color: '#fff' }}>Total</span>
                <span style={{ color: '#e879f9' }}>${total.toLocaleString('es-AR')}</span>
              </div>
              <Btn style={{ width: '100%' }} size="lg" onClick={() => setStep('checkout')}>Confirmar Pedido →</Btn>
            </>

          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>¿Cómo querés pagar?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {['cash','mercadopago'].map(m => (
                  <button key={m} onClick={() => setMethod(m)} style={{ padding: 16, borderRadius: 18, border: `2px solid ${method === m ? '#a855f7' : 'rgba(168,85,247,0.2)'}`, background: method === m ? 'rgba(168,85,247,0.15)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{m === 'cash' ? '💵' : '💳'}</div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{m === 'cash' ? 'Efectivo' : 'Mercado Pago'}</div>
                    <div style={{ color: '#a855f7', fontSize: 12 }}>{m === 'cash' ? 'Retiro en local' : 'Pago online'}</div>
                  </button>
                ))}
              </div>
              <input value={wa} onChange={e => setWa(e.target.value)} placeholder="Tu celular (opcional)" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Aclaraciones del pedido..." rows={3} style={{ resize: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 700 }}>
                <span style={{ color: '#fff' }}>Total</span>
                <span style={{ color: '#e879f9' }}>${total.toLocaleString('es-AR')}</span>
              </div>
              {method === 'mercadopago' ? (
                <a href={MERCADOPAGO_LINK} target="_blank" rel="noopener noreferrer" onClick={placeOrder}
                  style={{ display: 'block', padding: '16px 32px', borderRadius: 50, background: 'linear-gradient(135deg,#00b1ea,#009ee3)', color: '#fff', fontWeight: 700, fontSize: 18, textAlign: 'center', textDecoration: 'none' }}>
                  💳 Pagar con Mercado Pago
                </a>
              ) : (
                <Btn style={{ width: '100%' }} size="lg" onClick={placeOrder} disabled={placing}>
                  {placing ? 'Enviando...' : '📦 Confirmar Encargo'}
                </Btn>
              )}
              <button onClick={() => setStep('cart')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', textAlign: 'center', padding: 8 }}>← Volver al carrito</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const outOfStock = product.stock === 0

  const handleAdd = () => {
    addItem(product); setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="card-neon" style={{ borderRadius: 24, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', animation: 'fadeIn 0.4s ease-out' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      {product.image_url ? (
        <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {outOfStock && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#f87171', fontWeight: 700, fontSize: 18 }}>SIN STOCK</span></div>}
        </div>
      ) : (
        <div style={{ height: 180, background: 'linear-gradient(135deg,#0f0f1a,#1a0a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>
      )}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 17, marginBottom: 4, lineHeight: 1.3 }}>{product.name}</h3>
        {product.description && <p style={{ color: '#9ca3af', fontSize: 13, flex: 1, marginBottom: 12 }}>{product.description}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ color: '#e879f9', fontWeight: 700, fontSize: 20 }}>${product.price.toLocaleString('es-AR')}</span>
          <Btn size="sm" onClick={handleAdd} disabled={outOfStock} style={added ? { background: '#14532d' } : {}}>
            {added ? '✓' : outOfStock ? 'Agotado' : '+ Agregar'}
          </Btn>
        </div>
        {product.stock > 0 && product.stock <= 5 && <p style={{ color: '#fbbf24', fontSize: 12, marginTop: 8 }}>⚠️ Últimas {product.stock} unidades</p>}
      </div>
    </div>
  )
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [promo, setPromo]           = useState(null)
  const [activeTab, setActiveTab]   = useState('all')
  const [loading, setLoading]       = useState(true)

  const load = async () => {
    const [{ data: cats }, { data: prods }, { data: promoData }] = await Promise.all([
      supabase.from('categories').select('*').eq('active', true).order('display_order'),
      supabase.from('products').select('*').eq('active', true).neq('stock', 0).order('created_at', { ascending: false }),
      supabase.from('promotions').select('*').eq('active', true).limit(1).maybeSingle(),
    ])
    const catIds = new Set((prods || []).map(p => p.category_id))
    setCategories((cats || []).filter(c => !c.auto_hide_empty || catIds.has(c.id)))
    setProducts(prods || [])
    setPromo(promoData)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, load)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const filtered = useMemo(() =>
    activeTab === 'all' ? products : products.filter(p => p.category_id === activeTab)
  , [activeTab, products])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#a855f7' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, animation: 'float 1.5s ease-in-out infinite' }}>⚡</div>
        <p style={{ fontFamily: 'Orbitron,monospace', fontSize: 18, marginTop: 12 }}>Cargando Oasis...</p>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      {promo && (
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', marginBottom: 32, background: 'linear-gradient(135deg,#1a0a2e,#0f0f1a)', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 0 40px rgba(168,85,247,0.12)' }}>
          {promo.image_url && <img src={promo.image_url} alt={promo.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />}
          <div style={{ position: 'relative', padding: '32px 36px' }}>
            <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>✦ OFERTA ESPECIAL</div>
            <h2 style={{ fontFamily: 'Orbitron,monospace', fontSize: 'clamp(22px,5vw,40px)', fontWeight: 900, color: '#fff', textShadow: '0 0 30px rgba(168,85,247,0.8)', marginBottom: 8 }}>{promo.title}</h2>
            {promo.subtitle && <p style={{ color: '#c084fc', fontSize: 18 }}>{promo.subtitle}</p>}
            {promo.price && <p style={{ color: '#e879f9', fontWeight: 700, fontSize: 26, marginTop: 8 }}>${promo.price.toLocaleString('es-AR')}</p>}
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 28, paddingBottom: 4 }} className="scrollbar-hide">
          {[{ id: 'all', name: 'Todo' }, ...categories].map(cat => (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)}
              style={{ flexShrink: 0, padding: '9px 22px', borderRadius: 50, fontWeight: 600, fontSize: 14, fontFamily: "'Exo 2',sans-serif", cursor: 'pointer', transition: 'all 0.2s', border: activeTab === cat.id ? 'none' : '1px solid rgba(168,85,247,0.4)', ...(activeTab === cat.id ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', boxShadow: '0 0 20px #a855f755' } : { background: 'transparent', color: '#a855f7' }) }}>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80, color: '#a855f7' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌴</div>
          <p style={{ fontSize: 20 }}>No hay productos disponibles</p>
          <p style={{ fontSize: 14, color: '#4b5563', marginTop: 8 }}>Volvé pronto o escribinos por el chat</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ setPage }) {
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleLogin = async () => {
    if (!email.trim()) { setError('Ingresá tu email'); return }
    if (!name.trim())  { setError('Ingresá tu nombre'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        data: { full_name: name.trim(), whatsapp: phone.trim() },
        emailRedirectTo: window.location.origin,
      }
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><OasisLogo size={80} /></div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontWeight: 900, fontSize: 32, color: '#fff', textShadow: '0 0 20px rgba(168,85,247,0.8)' }}>OASIS</div>
          <p style={{ color: '#a855f7', marginTop: 4 }}>Ingresá para hacer tus encargos</p>
        </div>
        <div className="card-neon" style={{ borderRadius: 28, padding: 32 }}>
          {sent ? (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
              <h3 style={{ fontFamily: 'Orbitron,monospace', color: '#fff', fontSize: 20, marginBottom: 8 }}>¡Revisá tu correo!</h3>
              <p style={{ color: '#a855f7', marginBottom: 8 }}>Te enviamos un link mágico a</p>
              <p style={{ color: '#e879f9', fontWeight: 700, marginBottom: 24 }}>{email}</p>
              <p style={{ color: '#6b7280', fontSize: 14 }}>Hacé click ahí para entrar sin contraseña.</p>
              <button onClick={() => setSent(false)} style={{ marginTop: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', textDecoration: 'underline' }}>Usar otro email</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tu nombre</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y apellido" />
              </div>
              <div>
                <label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Celular</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej: 2214567890" type="tel" />
              </div>
              <div>
                <label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" type="email"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
              {error && <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>}
              <Btn style={{ width: '100%' }} size="lg" onClick={handleLogin} disabled={loading}>
                {loading ? 'Enviando...' : 'Entrar con Magic Link ✨'}
              </Btn>
              <p style={{ color: '#6b7280', fontSize: 12, textAlign: 'center' }}>Recibís un link en tu email. Sin contraseñas.</p>
            </div>
          )}
        </div>
        <button onClick={() => setPage('home')} style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7' }}>← Volver a la tienda</button>
      </div>
    </div>
  )
}

// ─── ACCOUNT PAGE ─────────────────────────────────────────────────────────────
function AccountPage() {
  const { user, profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [user])

  const statuses = {
    received:  { label: 'Recibido',        color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: '📥' },
    preparing: { label: 'En Preparación',  color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  icon: '⚙️' },
    ready:     { label: 'Listo ✅',         color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  icon: '✅' },
    cancelled: { label: 'Cancelado',        color: '#f87171', bg: 'rgba(248,113,113,0.15)', icon: '❌' },
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(168,85,247,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
        <div>
          <h1 style={{ fontFamily: 'Orbitron,monospace', fontSize: 22, fontWeight: 900, color: '#fff' }}>{profile?.full_name || 'Mi Cuenta'}</h1>
          <p style={{ color: '#a855f7' }}>{user?.email}</p>
          {profile?.client_code && <p style={{ color: '#6b7280', fontSize: 13 }}>🪪 Código de cliente: <span style={{ color: '#e879f9', fontWeight: 700 }}>{profile.client_code}</span></p>}
          {profile?.whatsapp && <p style={{ color: '#6b7280', fontSize: 13 }}>📱 {profile.whatsapp}</p>}
        </div>
      </div>

      <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 16 }}>📦 Mis Pedidos</h2>

      {loading ? <div style={{ textAlign: 'center', color: '#a855f7', padding: 32 }}>Cargando...</div>
        : orders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a855f7', paddingTop: 48 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div><p>Todavía no hiciste ningún encargo</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map(order => {
              const s = statuses[order.status] || statuses.received
              return (
                <div key={order.id} className="card-neon" style={{ borderRadius: 20, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: 'Orbitron,monospace', color: '#e879f9', fontWeight: 700, fontSize: 16 }}>{order.order_code}</div>
                      <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{new Date(order.created_at).toLocaleString('es-AR')}</div>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg }}>{s.icon} {s.label}</span>
                  </div>
                  {(order.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                      <span style={{ color: '#d1d5db' }}>{item.name} x{item.qty}</span>
                      <span style={{ color: '#a855f7' }}>${(item.price * item.qty).toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(168,85,247,0.2)', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>{order.payment_method === 'mercadopago' ? '💳 Mercado Pago' : '💵 Efectivo'}</span>
                    <span style={{ color: '#e879f9', fontWeight: 700 }}>${order.total.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({ setPage }) {
  const { user, profile } = useAuth()
  const [pass, setPass]         = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [tab, setTab]           = useState('orders')

  const isAdmin = user && profile?.role === 'admin'
  if (!isAdmin && !unlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card-neon" style={{ width: '100%', maxWidth: 360, borderRadius: 28, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontFamily: 'Orbitron,monospace', color: '#fff', fontSize: 22, marginBottom: 8 }}>Panel Admin</h2>
          <p style={{ color: '#a855f7', fontSize: 14, marginBottom: 20 }}>Acceso restringido</p>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" style={{ marginBottom: 14 }}
            onKeyDown={e => e.key === 'Enter' && (pass === ADMIN_LOCAL_PASS ? setUnlocked(true) : alert('Clave incorrecta'))} />
          <Btn style={{ width: '100%' }} size="lg" onClick={() => pass === ADMIN_LOCAL_PASS ? setUnlocked(true) : alert('Clave incorrecta')}>Ingresar</Btn>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'orders',     label: '📦 Pedidos' },
    { id: 'categories', label: '🏷️ Categorías' },
    { id: 'products',   label: '🛒 Productos' },
    { id: 'banner',     label: '🎯 Banner' },
    { id: 'broadcast',  label: '📢 Difusión' },
    { id: 'chat',       label: '💬 Chat' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Orbitron,monospace', fontSize: 24, fontWeight: 900, color: '#fff' }}>⚡ Panel Admin</h1>
          <p style={{ color: '#a855f7', fontSize: 14 }}>Oasis Polirrubro</p>
        </div>
        <Btn variant="outline" size="sm" onClick={() => setPage('home')}>← Tienda</Btn>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }} className="scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink: 0, padding: '9px 18px', borderRadius: 50, fontWeight: 600, fontSize: 13, fontFamily: "'Exo 2',sans-serif", cursor: 'pointer', border: tab === t.id ? 'none' : '1px solid rgba(168,85,247,0.4)', transition: 'all 0.2s', ...(tab === t.id ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', boxShadow: '0 0 15px #a855f755' } : { background: 'transparent', color: '#a855f7' }) }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'orders'     && <AdminOrders />}
      {tab === 'categories' && <AdminCategories />}
      {tab === 'products'   && <AdminProducts />}
      {tab === 'banner'     && <AdminBanner />}
      {tab === 'broadcast'  && <AdminBroadcast />}
      {tab === 'chat'       && <AdminChat />}
    </div>
  )
}

// ─── ADMIN: ORDERS ────────────────────────────────────────────────────────────
function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('orders').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false) })
    const sub = supabase.channel('admin-orders-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, p => setOrders(prev => [p.new, ...prev]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, p => setOrders(prev => prev.map(o => o.id === p.new.id ? p.new : o)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'orders' }, p => setOrders(prev => prev.filter(o => o.id !== p.old.id)))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const setStatus = (id, status) => supabase.from('orders').update({ status }).eq('id', id)
  const statusMap = {
    received:  { label: 'Recibido',       color: '#60a5fa', icon: '📥' },
    preparing: { label: 'En Preparación', color: '#fbbf24', icon: '⚙️' },
    ready:     { label: 'Listo ✅',        color: '#4ade80', icon: '✅' },
  }

  if (loading) return <div style={{ textAlign: 'center', color: '#a855f7', padding: 32 }}>Cargando pedidos...</div>

  return (
    <div>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>{orders.length} pedido(s) — actualizaciones en tiempo real</p>
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a855f7', padding: 48 }}><div style={{ fontSize: 40 }}>📭</div><p style={{ marginTop: 12 }}>No hay pedidos todavía</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const s = statusMap[order.status] || statusMap.received
            return (
              <div key={order.id} className="card-neon" style={{ borderRadius: 20, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron,monospace', color: '#e879f9', fontWeight: 700, fontSize: 18 }}>{order.order_code}</div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{new Date(order.created_at).toLocaleString('es-AR')}</div>
                    {order.client_code && <div style={{ color: '#a855f7', fontSize: 13, marginTop: 2 }}>🪪 {order.client_code}</div>}
                    {order.whatsapp && <div style={{ color: '#4ade80', fontSize: 13, marginTop: 2 }}>📱 {order.whatsapp}</div>}
                  </div>
                  <span style={{ color: s.color, fontWeight: 600 }}>{s.icon} {s.label}</span>
                </div>
                {(order.items || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span style={{ color: '#d1d5db' }}>{item.name} x{item.qty}</span>
                    <span style={{ color: '#a855f7' }}>${(item.price * item.qty).toLocaleString('es-AR')}</span>
                  </div>
                ))}
                {order.notes && <p style={{ color: '#fbbf24', fontSize: 13, marginTop: 8 }}>📝 {order.notes}</p>}
                <div style={{ borderTop: '1px solid rgba(168,85,247,0.2)', paddingTop: 14, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: '#e879f9', fontWeight: 700, fontSize: 18 }}>${order.total.toLocaleString('es-AR')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['received','preparing','ready'].map(st => (
                      <button key={st} onClick={() => setStatus(order.id, st)}
                        style={{ padding: '6px 14px', borderRadius: 50, fontWeight: 600, fontSize: 12, fontFamily: "'Exo 2',sans-serif", cursor: 'pointer', border: order.status === st ? 'none' : '1px solid rgba(168,85,247,0.4)', transition: 'all 0.2s', ...(order.status === st ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' } : { background: 'transparent', color: '#a855f7' }) }}>
                        {statusMap[st].icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ADMIN: CATEGORIES ────────────────────────────────────────────────────────
function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [newName, setNewName]       = useState('')

  const load = async () => { const { data } = await supabase.from('categories').select('*').order('display_order'); setCategories(data || []) }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newName.trim()) return
    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
    await supabase.from('categories').insert({ name: newName.trim(), slug, display_order: categories.length })
    setNewName(''); load()
  }

  const toggle = async (cat) => { await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id); load() }
  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return
    await supabase.from('categories').delete().eq('id', id); load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card-neon" style={{ borderRadius: 20, padding: 24 }}>
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>➕ Nueva Categoría</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Electrónica, Limpieza..." onKeyDown={e => e.key === 'Enter' && create()} style={{ flex: 1 }} />
          <Btn onClick={create}>Crear</Btn>
        </div>
      </div>
      {categories.map(cat => (
        <div key={cat.id} className="card-neon" style={{ borderRadius: 18, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{cat.name}</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>slug: {cat.slug} · {cat.auto_hide_empty ? 'Se oculta si está vacía' : 'Siempre visible'}</div>
          </div>
          <button onClick={() => toggle(cat)} style={{ padding: '5px 14px', borderRadius: 50, fontWeight: 600, fontSize: 12, cursor: 'pointer', border: 'none', ...(cat.active ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' } : { background: 'rgba(107,114,128,0.15)', color: '#6b7280' }) }}>
            {cat.active ? '✓ Activa' : '✗ Oculta'}
          </button>
          <button onClick={() => remove(cat.id)} style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ico.Trash />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── ADMIN: PRODUCTS ──────────────────────────────────────────────────────────
function AdminProducts() {
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [form, setForm]   = useState({ name:'', description:'', price:'', stock:'-1', category_id:'', image: null })
  const [preview, setPreview] = useState(null)
  const [saving, setSaving]   = useState(false)

  const load = async () => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').eq('active', true).order('display_order'),
      supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
    ])
    setCategories(cats || []); setProducts(prods || [])
  }
  useEffect(() => { load() }, [])

  const handleImg = (e) => {
    const file = e.target.files[0]; if (!file) return
    setForm(f => ({ ...f, image: file }))
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const save = async () => {
    if (!form.name.trim() || !form.price || !form.category_id) { alert('Completá nombre, precio y categoría'); return }
    setSaving(true)
    let image_url = null
    if (form.image) { try { image_url = await uploadImage(form.image, 'products') } catch(e) { alert('Error al subir imagen: ' + e.message); setSaving(false); return } }
    await supabase.from('products').insert({ name: form.name.trim(), description: form.description.trim(), price: parseFloat(form.price), stock: isNaN(parseInt(form.stock)) ? -1 : parseInt(form.stock), category_id: form.category_id, image_url, active: true })
    setForm({ name:'', description:'', price:'', stock:'-1', category_id:'', image: null }); setPreview(null); setSaving(false); load()
  }

  const toggleProd = async (p) => { await supabase.from('products').update({ active: !p.active }).eq('id', p.id); load() }
  const removeProd = async (id) => { if (!window.confirm('¿Eliminar este producto?')) return; await supabase.from('products').delete().eq('id', id); load() }
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card-neon" style={{ borderRadius: 20, padding: 24 }}>
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 20 }}>➕ Agregar Producto</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Nombre *</label><input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Nombre del producto" /></div>
          <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Categoría *</label>
            <select value={form.category_id} onChange={e => f('category_id', e.target.value)}>
              <option value="">Seleccioná</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Precio (ARS) *</label><input value={form.price} onChange={e => f('price', e.target.value)} type="number" placeholder="0.00" /></div>
          <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Stock (-1 = sin límite)</label><input value={form.stock} onChange={e => f('stock', e.target.value)} type="number" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Descripción</label><textarea value={form.description} onChange={e => f('description', e.target.value)} placeholder="Descripción breve..." rows={2} style={{ resize: 'none' }} /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Foto del producto 📷</label>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, borderRadius: 16, cursor: 'pointer', border: '2px dashed rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.05)', overflow: 'hidden' }}>
              {preview ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32 }}>📷</div><p style={{ color: '#a855f7', fontSize: 14, marginTop: 4 }}>Tocá para subir desde el celu</p></div>}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImg} />
            </label>
          </div>
        </div>
        <Btn style={{ width: '100%', marginTop: 18 }} size="lg" onClick={save} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar Producto'}</Btn>
      </div>

      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Productos ({products.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {products.map(p => (
          <div key={p.id} className="card-neon" style={{ borderRadius: 18, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ color: '#e879f9', fontWeight: 700 }}>${p.price.toLocaleString('es-AR')}</div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>{p.categories?.name} · Stock: {p.stock === -1 ? '∞' : p.stock}</div>
            </div>
            <button onClick={() => toggleProd(p)} style={{ padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', flexShrink: 0, ...(p.active ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80' } : { background: 'rgba(107,114,128,0.15)', color: '#6b7280' }) }}>{p.active ? '✓' : '✗'}</button>
            <button onClick={() => removeProd(p.id)} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ico.Trash /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ADMIN: BANNER ────────────────────────────────────────────────────────────
function AdminBanner() {
  const [form, setForm]       = useState({ title: '', subtitle: '', price: '', image: null })
  const [current, setCurrent] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [ok, setOk]           = useState(false)

  useEffect(() => {
    supabase.from('promotions').select('*').eq('active', true).limit(1).maybeSingle()
      .then(({ data }) => { if (data) { setCurrent(data); setForm({ title: data.title, subtitle: data.subtitle || '', price: data.price || '', image: null }) } })
  }, [])

  const handleImg = (e) => {
    const file = e.target.files[0]; if (!file) return
    setForm(f => ({ ...f, image: file }))
    const reader = new FileReader(); reader.onload = ev => setPreview(ev.target.result); reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    let image_url = current?.image_url
    if (form.image) { try { image_url = await uploadImage(form.image, 'banners') } catch(e) { alert('Error imagen'); setSaving(false); return } }
    if (current?.id) await supabase.from('promotions').update({ title: form.title, subtitle: form.subtitle, price: form.price || null, image_url }).eq('id', current.id)
    else await supabase.from('promotions').insert({ title: form.title, subtitle: form.subtitle, price: form.price || null, image_url, active: true })
    setSaving(false); setOk(true); setTimeout(() => setOk(false), 3000)
  }

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="card-neon" style={{ borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>🎯 Banner / Oferta de la Semana</h3>
      <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Título</label><input value={form.title} onChange={e => f('title', e.target.value)} placeholder="🔥 Oferta de la Semana" /></div>
      <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Subtítulo</label><textarea value={form.subtitle} onChange={e => f('subtitle', e.target.value)} rows={2} style={{ resize: 'none' }} /></div>
      <div><label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Precio (opcional)</label><input value={form.price} onChange={e => f('price', e.target.value)} type="number" placeholder="0.00" /></div>
      <div>
        <label style={{ color: '#c084fc', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Imagen del banner</label>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 130, borderRadius: 16, cursor: 'pointer', border: '2px dashed rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.05)', overflow: 'hidden' }}>
          {(preview || current?.image_url) ? <img src={preview || current?.image_url} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32 }}>🖼️</div><p style={{ color: '#a855f7', fontSize: 14, marginTop: 4 }}>Subí la imagen del banner</p></div>}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImg} />
        </label>
      </div>
      {ok && <p style={{ color: '#4ade80', fontWeight: 600 }}>✓ Banner actualizado correctamente</p>}
      <Btn style={{ width: '100%' }} size="lg" onClick={save} disabled={saving}>{saving ? 'Guardando...' : '💾 Actualizar Banner'}</Btn>
    </div>
  )
}

// ─── ADMIN: BROADCAST ─────────────────────────────────────────────────────────
function AdminBroadcast() {
  const [msg, setMsg]         = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)

  const broadcast = async () => {
    if (!msg.trim()) return
    setSending(true)
    const { data: profiles } = await supabase.from('profiles').select('id').eq('role', 'customer')
    if (profiles?.length) {
      await supabase.from('messages').insert(
        profiles.map(p => ({ user_id: p.id, sender: 'admin', content: `📢 ${msg.trim()}` }))
      )
    }
    setMsg(''); setDone(true); setSending(false)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div className="card-neon" style={{ borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>📢 Difusión Masiva</h3>
      <p style={{ color: '#9ca3af', fontSize: 14 }}>El mensaje llega al chat de todos tus clientes registrados al mismo tiempo.</p>
      <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ej: ¡Nuevos productos disponibles! Entrá a ver las novedades..." rows={4} style={{ resize: 'none', fontSize: 16 }} />
      {done && <p style={{ color: '#4ade80', fontWeight: 600 }}>✓ Difusión enviada a todos los clientes</p>}
      <Btn style={{ width: '100%' }} size="lg" onClick={broadcast} disabled={sending || !msg.trim()}>
        {sending ? 'Enviando...' : '📢 Enviar a Todos'}
      </Btn>
    </div>
  )
}

// ─── ADMIN: CHAT ──────────────────────────────────────────────────────────────
function AdminChat() {
  const [convs, setConvs]       = useState([])
  const [selected, setSelected] = useState(null)
  const [msgs, setMsgs]         = useState([])
  const [reply, setReply]       = useState('')

  useEffect(() => {
    supabase.from('messages')
      .select('user_id, content, created_at, sender, profiles(full_name, client_code)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const seen = new Set(); const result = []
        ;(data || []).forEach(m => { if (!seen.has(m.user_id)) { seen.add(m.user_id); result.push(m) } })
        setConvs(result)
      })
  }, [])

  const loadMsgs = async (uid) => {
    setSelected(uid)
    const { data } = await supabase.from('messages').select('*').eq('user_id', uid).order('created_at')
    setMsgs(data || [])
    await supabase.from('messages').update({ read: true }).eq('user_id', uid).eq('sender', 'user')
  }

  const sendReply = async () => {
    if (!reply.trim() || !selected) return
    await supabase.from('messages').insert({ user_id: selected, sender: 'admin', content: reply.trim() })
    setReply(''); loadMsgs(selected)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '220px 1fr' : '1fr', gap: 14, minHeight: 400 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Conversaciones</h3>
        {convs.length === 0 ? (
          <p style={{ color: '#6b7280', textAlign: 'center', paddingTop: 32 }}>Sin mensajes</p>
        ) : convs.map(c => (
          <button key={c.user_id} onClick={() => loadMsgs(c.user_id)}
            style={{ textAlign: 'left', padding: 12, borderRadius: 14, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Exo 2',sans-serif",
              ...(selected === c.user_id ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' } : { background: '#0f0f1a', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }) }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.profiles?.full_name || 'Usuario'}</div>
            {c.profiles?.client_code && <div style={{ fontSize: 11, opacity: 0.7 }}>🪪 {c.profiles.client_code}</div>}
            <div style={{ fontSize: 12, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.content}</div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="card-neon" style={{ borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'admin' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%', padding: '8px 14px', borderRadius: 16, fontSize: 14,
                  ...(m.sender === 'admin' ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' } : { background: '#1f1f35', color: '#e2e8f0' }) }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, display: 'flex', gap: 8, borderTop: '1px solid rgba(168,85,247,0.2)' }}>
            <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} placeholder="Respondé al cliente..." style={{ flex: 1, fontSize: 14 }} />
            <Btn size="sm" onClick={sendReply}>→</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function AppContent() {
  const [page, setPage] = useState('home')
  const { loading }     = useAuth()

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {})
    if (window.location.hash.includes('access_token')) setPage('home')
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', color: '#a855f7' }}>
        <div style={{ fontSize: 52, animation: 'float 1.5s ease-in-out infinite' }}>⚡</div>
        <p style={{ fontFamily: 'Orbitron,monospace', fontSize: 20, marginTop: 16 }}>OASIS</p>
      </div>
    </div>
  )

  const pages = {
    home:    <HomePage />,
    login:   <LoginPage setPage={setPage} />,
    account: <AccountPage />,
    admin:   <AdminPage setPage={setPage} />,
  }

  return (
    <>
      {page !== 'login' && <Header setPage={setPage} />}
      <main>{pages[page] || <HomePage />}</main>
      <CartModal setPage={setPage} />
      <FloatingChat />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  )
}
