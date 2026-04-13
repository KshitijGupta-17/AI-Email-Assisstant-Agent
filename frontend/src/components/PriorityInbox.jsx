import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, AlertCircle, Info, ShieldX, Inbox, ChevronDown, RefreshCw, Mail, X, ThumbsUp, ThumbsDown, Link2 } from "lucide-react"
import { getHistory, getEmailDetail } from "../api"
import toast from "react-hot-toast"
import { tk, FONTS } from "../theme"

const PRIORITY_ORDER = ["urgent", "action_required", "fyi", "spam"]

const PRIORITY_CFG = {
  urgent:          { label:"Urgent",          icon:AlertTriangle, accent:"#ef4444", accentDim:"rgba(239,68,68,0.1)",  accentBorder:"rgba(239,68,68,0.22)",  accentGlow:"rgba(239,68,68,0.15)",  rowBorder:"rgba(239,68,68,0.2)"  },
  action_required: { label:"Action Required", icon:AlertCircle,   accent:"#f59e0b", accentDim:"rgba(245,158,11,0.1)", accentBorder:"rgba(245,158,11,0.22)", accentGlow:"rgba(245,158,11,0.12)", rowBorder:"rgba(245,158,11,0.2)" },
  fyi:             { label:"FYI",             icon:Info,           accent:"#4e75a3", accentDim:"rgba(99,102,241,0.1)", accentBorder:"rgba(99,102,241,0.22)", accentGlow:"rgba(99,102,241,0.12)", rowBorder:"rgba(99,102,241,0.2)" },
  spam:            { label:"Spam",            icon:ShieldX,        accent:"#475569", accentDim:"rgba(71,85,105,0.1)",  accentBorder:"rgba(71,85,105,0.2)",   accentGlow:"rgba(71,85,105,0.1)",   rowBorder:"rgba(71,85,105,0.18)" },
}

const TONE_COLORS = {
  formal: { color:"#8b5cf6", bg:"rgba(139,92,246,0.06)", border:"rgba(139,92,246,0.18)" },
  friendly: { color:"#22c55e", bg:"rgba(34,197,94,0.06)", border:"rgba(34,197,94,0.18)" },
  brief: { color:"#f59e0b", bg:"rgba(245,158,11,0.06)", border:"rgba(245,158,11,0.18)" },
}

const CAT_BADGE = {
  urgent: { bg:"rgba(239,68,68,0.1)", color:"#ef4444", border:"rgba(239,68,68,0.25)" },
  action_required: { bg:"rgba(245,158,11,0.1)", color:"#f59e0b", border:"rgba(245,158,11,0.25)" },
  fyi: { bg:"rgba(99,102,241,0.1)", color:"#4e75a3", border:"rgba(99,102,241,0.25)" },
  spam: { bg:"rgba(71,85,105,0.1)", color:"#475569", border:"rgba(71,85,105,0.25)" },
}

const sectionVar = { hidden:{ opacity:0, y:14 }, show:{ opacity:1, y:0, transition:{ duration:0.4, ease:[0.22,1,0.36,1] } } }
const rowVar = { hidden:{ opacity:0, x:-10 }, show:(i)=>({ opacity:1, x:0, transition:{ delay:i*0.05, duration:0.35, ease:[0.22,1,0.36,1] } }) }

export default function PriorityInbox({ dark = true }) {
  const t = tk(dark)
  const [emails,     setEmails]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [expanded,   setExpanded]   = useState({})
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const fetchEmails = async (isRefresh=false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const data = await getHistory()
      setEmails(data)
      const exp={}; PRIORITY_ORDER.forEach(c=>exp[c]=true); setExpanded(exp)
    } catch { setError("Could not load emails. Is the backend running?") }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchEmails() }, [])

  const toggleSection = cat => setExpanded(p=>({...p,[cat]:!p[cat]}))

  const handleEmailClick = async (emailId) => {
    setLoadingDetail(true)
    try {
      const detail = await getEmailDetail(emailId)
      setSelectedEmail(detail)
    } catch {
      toast.error("Could not load email details")
    } finally {
      setLoadingDetail(false)
    }
  }

  const grouped={}; PRIORITY_ORDER.forEach(c=>(grouped[c]=[]));
  emails.forEach(email => { const cat=email.category||"fyi"; if(grouped[cat]) grouped[cat].push(email); else grouped["fyi"].push(email) })

  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {[1,2,3].map(i=>(
        <motion.div key={i} animate={{ opacity:[0.2,0.45,0.2] }} transition={{ duration:1.5, repeat:Infinity, delay:i*0.18 }}
          style={{ height:80, borderRadius:16, background:t.cardBg, border:`1px solid ${t.cardBorder}` }}/>
      ))}
    </div>
  )

  if (error) return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px", background:dark?"#2d0f0f":"#fff1f2", border:`1px solid ${dark?"#7f1d1d":"#fecdd3"}`, borderRadius:14, color:"#f87171", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
      <AlertCircle size={15}/>{error}
    </div>
  )

  if (emails.length===0) return (
    <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
      style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:20, padding:"60px 24px", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", boxShadow:`0 4px 32px rgba(0,0,0,${dark?0.4:0.06})` }}>
      <div style={{ width:64, height:64, borderRadius:18, background:t.accentDim, border:`1px solid ${t.accentBorder}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
        <Inbox size={26} color={t.textFaint}/>
      </div>
      <p style={{ fontSize:14, fontWeight:600, color:t.textMuted, fontFamily:"'DM Sans',sans-serif" }}>No emails analyzed yet.</p>
      <p style={{ fontSize:12, color:t.textFaint, marginTop:6, fontFamily:"'DM Sans',sans-serif" }}>Go to the Analyze tab to get started</p>
    </motion.div>
  )

  return (
    <>
      <style>{`
        ${FONTS}
        .pi * { box-sizing:border-box; }
        .pi { font-family:'DM Sans',sans-serif; }
        .pi-card { background:${t.cardBg}; border:1px solid ${t.cardBorder}; border-radius:14px; padding:16px 18px; cursor:pointer; transition:background 0.18s, border-color 0.18s, transform 0.18s, box-shadow 0.18s; position:relative; overflow:hidden; }
        .pi-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--acc); opacity:0; transition:opacity 0.18s; border-radius:2px 0 0 2px; }
        .pi-card:hover { transform:translateX(3px); box-shadow:-3px 0 0 0 var(--acc), 0 4px 20px rgba(0,0,0,${dark?0.3:0.1}); border-color:var(--acc-border); }
        .pi-card:hover::before { opacity:1; }
        .sec-toggle { width:100%; display:flex; align-items:center; gap:12px; padding:12px 16px; background:${dark?"#0f1826":t.accentDim}; border:1px solid ${t.cardBorder}; border-radius:14px; cursor:pointer; transition:background 0.18s, border-color 0.18s; font-family:'DM Sans',sans-serif; margin-bottom:10px; }
        .sec-toggle:hover { background:${t.cardBg}; border-color:${t.accentBorder}; }
        .ref-btn { display:flex; align-items:center; gap:7px; padding:7px 14px; background:${t.accentDim}; border:1px solid ${t.accentBorder}; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:500; color:${t.accentIndigo}; cursor:pointer; transition:background 0.18s; }
        .ref-btn:hover { background:${dark?"rgba(99,102,241,0.18)":t.accentBorder}; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spinning { animation:spin 0.7s linear infinite; }
      `}</style>

      <div className="pi" style={{ display:"flex", flexDirection:"column", gap:6 }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:22, color:t.textPrimary, letterSpacing:"-0.02em", margin:0 }}>Priority Inbox</h2>
            <p style={{ fontSize:12, color:t.textMuted, marginTop:4 }}>{emails.length} email{emails.length!==1?"s":""} sorted by urgency · Click any email to view details</p>
          </div>
          <button className="ref-btn" onClick={()=>fetchEmails(true)}>
            <RefreshCw size={13} className={refreshing?"spinning":""}/>Refresh
          </button>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {PRIORITY_ORDER.map(cat=>{
            const cfg=PRIORITY_CFG[cat]; const count=grouped[cat].length; if(!count) return null
            const b=t.badge[cat]||t.badge.fyi
            return (
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:20, background:b.bg, border:`1px solid ${b.border}`, fontSize:11, fontWeight:600, color:b.color, cursor:"pointer" }}
                onClick={()=>{ const el=document.getElementById(`sec-${cat}`); el?.scrollIntoView({behavior:"smooth",block:"start"}) }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:cfg.accent, boxShadow:`0 0 6px ${cfg.accent}`, display:"inline-block" }}/>
                {cfg.label} · {count}
              </div>
            )
          })}
        </div>

        {PRIORITY_ORDER.map((category, sectionIdx) => {
          const cfg=PRIORITY_CFG[category]; const items=grouped[category]; const Icon=cfg.icon; const isOpen=expanded[category]!==false
          if(items.length===0) return null
          const b=t.badge[category]||t.badge.fyi

          return (
            <motion.div key={category} id={`sec-${category}`} variants={sectionVar} initial="hidden" animate="show" style={{ marginBottom:16 }}>
              <button className="sec-toggle" onClick={()=>toggleSection(category)}>
                <div style={{ width:30, height:30, borderRadius:9, flexShrink:0, background:cfg.accentDim, border:`1px solid ${cfg.accentBorder}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 12px ${cfg.accentGlow}` }}>
                  <Icon size={14} color={cfg.accent}/>
                </div>
                <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:t.textSecondary, flex:1, textAlign:"left" }}>{cfg.label}</span>
                <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, background:b.bg, color:b.color, border:`1px solid ${b.border}` }}>{items.length}</span>
                <motion.div animate={{ rotate:isOpen?180:0 }} transition={{ duration:0.25 }} style={{ marginLeft:4 }}>
                  <ChevronDown size={14} color={t.textFaint}/>
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.3, ease:[0.22,1,0.36,1] }} style={{ overflow:"hidden" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:8, paddingBottom:4 }}>
                      {items.map((email,i)=>{
                        const conf=Math.round((email.confidence||0)*100)
                        const confColor=conf>=80?"#22c55e":conf>=50?"#f59e0b":"#ef4444"
                        return (
                          <motion.div key={email.id} custom={i} variants={rowVar} initial="hidden" animate="show"
                            className="pi-card"
                            style={{ "--acc":cfg.accent, "--acc-border":cfg.accentBorder }}
                            onClick={() => handleEmailClick(email.id)}>
                            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:13, fontWeight:600, color:t.textPrimary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>
                                  {email.subject||"No subject"}
                                </p>
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5 }}>
                                  <div style={{ width:18, height:18, borderRadius:5, background:cfg.accentDim, border:`1px solid ${cfg.accentBorder}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                    <Mail size={10} color={cfg.accent}/>
                                  </div>
                                  <span style={{ fontSize:11, color:t.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{email.sender||"Unknown sender"}</span>
                                </div>
                                {email.summary && (
                                  <p style={{ fontSize:12, color:t.textMuted, marginTop:8, lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{email.summary}</p>
                                )}
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:7, flexShrink:0 }}>
                                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                                  <span style={{ fontSize:11, fontWeight:700, color:confColor, padding:"2px 8px", borderRadius:20, background:conf>=80?"rgba(34,197,94,0.1)":conf>=50?"rgba(245,158,11,0.1)":"rgba(239,68,68,0.1)", border:`1px solid ${conf>=80?"rgba(34,197,94,0.25)":conf>=50?"rgba(245,158,11,0.25)":"rgba(239,68,68,0.25)"}` }}>{conf}%</span>
                                  <div style={{ width:44, height:3, background:dark?"#1e2d4a":"#dde3f5", borderRadius:4, overflow:"hidden" }}>
                                    <motion.div initial={{ width:0 }} animate={{ width:`${conf}%` }} transition={{ duration:0.8, ease:"easeOut", delay:0.2 }}
                                      style={{ height:"100%", background:confColor, boxShadow:`0 0 6px ${confColor}88`, borderRadius:4 }}/>
                                  </div>
                                </div>
                                <span style={{ fontSize:10, color:t.textFaint, whiteSpace:"nowrap" }}>
                                  {new Date(email.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Email Detail Modal */}
      <AnimatePresence>
        {selectedEmail && (
          <EmailDetailModal email={selectedEmail} onClose={() => setSelectedEmail(null)} dark={dark} t={t} />
        )}
      </AnimatePresence>
    </>
  )
}

function EmailDetailModal({ email, onClose, dark, t }) {
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)" }}>
      <motion.div
        initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:20 }}
        transition={{ duration:0.3 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:20, padding:24, width:"100%", maxWidth:640, maxHeight:"80vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:t.textPrimary, margin:0 }}>Email Analysis</h3>
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, border:"none", background:t.accentDim, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={16} color={t.textMuted} />
          </button>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          {(() => {
            const cb = CAT_BADGE[email.category] || CAT_BADGE.fyi
            return <span style={{ padding:"4px 14px", borderRadius:20, fontSize:11, fontWeight:700, textTransform:"uppercase", background:cb.bg, color:cb.color, border:`1px solid ${cb.border}` }}>
              {email.category?.replace("_"," ")}
            </span>
          })()}
          <span style={{ fontSize:12, fontWeight:600, color:t.textMuted }}>
            {Math.round(email.confidence * 100)}% confidence
          </span>
        </div>

        {email.is_thread && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"5px 12px", marginBottom:14, background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:10 }}>
            <Link2 size={12} color="#8b5cf6" />
            <span style={{ fontSize:11, fontWeight:600, color:"#8b5cf6" }}>Thread Detected</span>
          </div>
        )}

        <div style={{ position:"relative", background:dark?"rgba(99,102,241,0.06)":"rgba(99,102,241,0.04)", borderRadius:14, padding:"14px 18px 14px 22px", marginBottom:20, border:`1px solid ${dark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.1)"}`, overflow:"hidden" }}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:"linear-gradient(to bottom,#4e75a3,#8b5cf6)", borderRadius:"3px 0 0 3px" }} />
          <p style={{ fontSize:10, fontWeight:700, color:"#4e75a3", textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 6px" }}>Summary</p>
          <p style={{ fontSize:13, color:t.textSecondary, lineHeight:1.6, margin:0 }}>{email.summary}</p>
        </div>

        <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:t.textSecondary, margin:"0 0 12px" }}>Reply Drafts</h4>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {email.replies?.map((reply) => {
            const tc = TONE_COLORS[reply.tone] || TONE_COLORS.formal
            return (
              <div key={reply.id} style={{ border:`1px solid ${tc.border}`, background:tc.bg, borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontSize:10, fontWeight:800, letterSpacing:"0.15em", textTransform:"uppercase", color:tc.color }}>{reply.tone}</span>
                  {reply.feedback && (
                    <span style={{
                      display:"flex", alignItems:"center", gap:4, fontSize:10, fontWeight:600, padding:"2px 10px", borderRadius:20,
                      background: reply.feedback === "liked" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      color: reply.feedback === "liked" ? "#22c55e" : "#ef4444",
                      border: `1px solid ${reply.feedback === "liked" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`
                    }}>
                      {reply.feedback === "liked" ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}
                      {reply.feedback === "liked" ? "Liked" : "Disliked"}
                    </span>
                  )}
                </div>
                <p style={{ fontSize:12.5, color:t.textSecondary, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>{reply.draft_text}</p>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}