import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Toaster } from "react-hot-toast"
import { Mail, BarChart3, Inbox, Moon, Sun, Zap, ChevronRight, LogOut } from "lucide-react"
import EmailForm    from "./components/EmailForm"
import ResultPanel  from "./components/ResultPanel"
import Analytics    from "./components/Analytics"
import PriorityInbox from "./components/PriorityInbox"
import AuthPage     from "./components/AuthPage"
import GmailInbox   from "./components/GmailInbox"
import { tk, FONTS } from "./theme"

const NAV_ITEMS = [
  { id:"home",      label:"Analyze",        icon:Mail,      desc:"Classify & reply"  },
  { id:"gmail",     label:"Gmail Inbox",    icon:Inbox,     desc:"Fetch real emails" },
  { id:"analytics", label:"Analytics",      icon:BarChart3, desc:"Insights & trends" },
  { id:"inbox",     label:"Priority Inbox", icon:Inbox,     desc:"Sorted by urgency" },
]

const pageVariants = {
  initial:{ opacity:0, y:14, filter:"blur(4px)" },
  animate:{ opacity:1, y:0,  filter:"blur(0px)", transition:{ duration:0.38, ease:[0.25,0.46,0.45,0.94] } },
  exit:   { opacity:0, y:-8, filter:"blur(4px)", transition:{ duration:0.22 } },
}

export default function App() {
  const [result,     setResult]     = useState(null)
  const [isLoading,  setIsLoading]  = useState(false)
  const [view,       setView]       = useState("home")
  const [dark,       setDark]       = useState(true)
  const [gmailEmail, setGmailEmail] = useState(null)

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token")
    const name  = localStorage.getItem("user_name")
    const email = localStorage.getItem("user_email")
    return token ? { token, name, email } : null
  })

  const handleLogin = (d) => setUser({ token:d.access_token, name:d.user_name, email:d.user_email })

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user_name")
    localStorage.removeItem("user_email")
    localStorage.removeItem("google_token")
    setUser(null)
    setResult(null)
    setIsLoading(false)
    setView("home")
    setGmailEmail(null)
  }

  const handleGmailSelect = (emailData) => {
    setGmailEmail(emailData)
    setResult(null)
    setView("home")
  }

  if (!user) return <AuthPage onLogin={handleLogin} />

  const t = tk(dark)
  const currentNav = NAV_ITEMS.find(n => n.id === view)

  return (
    <>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${t.appBg}; }
        .app-wrap { display:flex; height:100vh; background:${t.appBg}; font-family:'DM Sans',sans-serif; overflow:hidden; transition:background 0.35s; }
        .main-scroll { scrollbar-width:thin; scrollbar-color:${t.scrollThumb} transparent; }
        .main-scroll::-webkit-scrollbar { width:4px; }
        .main-scroll::-webkit-scrollbar-track { background:transparent; }
        .main-scroll::-webkit-scrollbar-thumb { background:${t.scrollThumb}; border-radius:4px; }
        .nav-btn { width:100%; display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; font-size:13px; font-weight:500; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; position:relative; transition:background 0.18s, color 0.18s; text-align:left; }
        .nav-icon { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.18s, color 0.18s; }
        .active-pip { position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:22px; background:linear-gradient(to bottom,#818cf8,#7c3aed); border-radius:0 4px 4px 0; }
        .btm-btn { width:100%; display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:12px; font-size:13px; font-family:'DM Sans',sans-serif; border:none; cursor:pointer; transition:background 0.18s; text-align:left; background:transparent; }
      `}</style>

      <div className="app-wrap">
        <Toaster position="top-right" toastOptions={{ style:{ background:t.cardBg, color:t.textSecondary, border:`1px solid ${t.cardBorder}`, borderRadius:"12px", fontSize:"13px", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }, duration:3000 }} />

        {/* ══ SIDEBAR ══ */}
        <aside style={{ width:256, flexShrink:0, background:t.sidebarBg, borderRight:`1px solid ${t.sidebarBorder}`, display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden", transition:"background 0.35s, border-color 0.35s" }}>
          <div style={{ position:"absolute", top:-80, left:-60, width:260, height:260, borderRadius:"50%", background:`radial-gradient(circle, ${t.orbColor} 0%, transparent 70%)`, pointerEvents:"none" }}/>

          <div style={{ padding:"20px 16px", position:"relative" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 12px", marginBottom:28 }}>
              <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(99,102,241,0.4)" }}>
                <Zap size={18} color="#fff"/>
              </div>
              <div>
                <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"#f0f4ff", letterSpacing:"-0.02em", lineHeight:1 }}>AI Email</h1>
                <span style={{ fontSize:9, fontWeight:500, letterSpacing:"0.22em", color:"rgba(139,128,255,0.55)", textTransform:"uppercase", display:"block", marginTop:4 }}>Assistant</span>
              </div>
            </div>

            <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.15em", color:"#2d4060", textTransform:"uppercase", padding:"0 12px", marginBottom:8 }}>Workspace</p>

            <nav style={{ display:"flex", flexDirection:"column", gap:2 }}>
              {NAV_ITEMS.map(({ id, label, icon:Icon, desc }) => {
                const active = view === id
                return (
                  <button key={id} onClick={() => setView(id)} className="nav-btn"
                    style={{ background:active ? t.navActiveBg : "transparent", color:active ? t.navActiveText : "#4b6080" }}
                    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,0.05)" }}
                    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent" }}>
                    {active && <motion.div className="active-pip" layoutId="pip" transition={{ type:"spring", stiffness:400, damping:32 }}/>}
                    <div className="nav-icon" style={{ background:active ? t.navIconActive : "rgba(255,255,255,0.04)", color:active ? t.navIconColor : "#3d5270" }}>
                      <Icon size={15} strokeWidth={active?2.2:1.8}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <span style={{ display:"block", lineHeight:1 }}>{label}</span>
                      <span style={{ display:"block", fontSize:10, marginTop:3, color:active?"rgba(139,128,255,0.55)":"#2d4060" }}>{desc}</span>
                    </div>
                    {active && <ChevronRight size={13} color="rgba(139,128,255,0.4)"/>}
                  </button>
                )
              })}
            </nav>
          </div>

          <div style={{ padding:"16px", position:"relative" }}>
            <div style={{ padding:"10px 12px", borderRadius:12, marginBottom:8, background:"rgba(255,255,255,0.03)", border:`1px solid ${t.sidebarBorder}` }}>
              <p style={{ fontSize:12, fontWeight:600, color:"#c7d2e8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name}</p>
              <p style={{ fontSize:10, color:"#2d4060", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</p>
            </div>
            <button className="btm-btn" onClick={() => setDark(d=>!d)} style={{ color:"#4b6080" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {dark ? <Sun size={14} color="#fbbf24"/> : <Moon size={14} color="#818cf8"/>}
              </div>
              <span style={{ color:"#4b6080" }}>{dark?"Light Mode":"Dark Mode"}</span>
            </button>
            <button className="btm-btn" onClick={handleLogout} style={{ color:"#f87171", marginTop:2 }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:32, height:32, borderRadius:9, background:"rgba(239,68,68,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <LogOut size={14} color="#f87171"/>
              </div>
              Log Out
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:t.mainBg, transition:"background 0.35s" }}>
          <header style={{ flexShrink:0, background:t.headerBg, borderBottom:`1px solid ${t.headerBorder}`, padding:"18px 32px", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", transition:"background 0.35s, border-color 0.35s" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:t.textPrimary, letterSpacing:"-0.02em", lineHeight:1, transition:"color 0.35s" }}>{currentNav?.label||"Analyze"}</h2>
                <p style={{ fontSize:12, color:t.textMuted, marginTop:5, transition:"color 0.35s" }}>{currentNav?.desc||""}</p>
              </div>
              <div style={{ padding:"6px 14px", borderRadius:20, background:t.accentDim, border:`1px solid ${t.accentBorder}`, fontSize:11, fontWeight:500, color:"#818cf8", display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 6px #22c55e", display:"inline-block" }}/>
                {user.name}
              </div>
            </div>
          </header>

          <div className="main-scroll" style={{ flex:1, overflowY:"auto", padding:"28px 32px", background:t.mainBg, transition:"background 0.35s", position:"relative" }}>
            <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:`linear-gradient(${t.gridLine} 1px,transparent 1px),linear-gradient(90deg,${t.gridLine} 1px,transparent 1px)`, backgroundSize:"44px 44px" }}/>
            <div style={{ position:"relative", zIndex:1 }}>
              <AnimatePresence mode="wait">
                {view==="home" && (
                  <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit"
                    style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))", gap:20, alignItems:"start" }}>
                    <EmailForm onResult={setResult} onLoading={setIsLoading} dark={dark} prefillEmail={gmailEmail}/>
                    <ResultPanel result={result} isLoading={isLoading} dark={dark}/>
                  </motion.div>
                )}
                {view==="gmail" && (
                  <motion.div key="gmail" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <GmailInbox onSelectEmail={handleGmailSelect} dark={dark}/>
                  </motion.div>
                )}
                {view==="analytics" && (
                  <motion.div key="analytics" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <Analytics dark={dark}/>
                  </motion.div>
                )}
                {view==="inbox" && (
                  <motion.div key="inbox" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <PriorityInbox dark={dark}/>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}