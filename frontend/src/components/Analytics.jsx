import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Mail, TrendingUp, BarChart3, Clock, AlertCircle } from "lucide-react"
import { getAnalytics, getHistory } from "../api"
import { tk, FONTS, CATEGORY_COLORS } from "../theme"

const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.07 } } }
const fadeUp  = { hidden:{ opacity:0, y:16 }, show:{ opacity:1, y:0, transition:{ duration:0.42, ease:[0.22,1,0.36,1] } } }

const DarkTooltip = ({ active, payload }) => {
  if (!active||!payload?.length) return null
  return (
    <div style={{ background:"#0d1424", border:"1px solid #3730a3", borderRadius:10, padding:"8px 14px", fontSize:12, color:"#e0e7ff", boxShadow:"0 8px 32px rgba(0,0,0,0.7)" }}>
      <span style={{ fontWeight:600, textTransform:"capitalize" }}>{payload[0].name}</span>
      <span style={{ marginLeft:8, color:"#818cf8" }}>{payload[0].value}</span>
    </div>
  )
}

export default function Analytics({ dark = true }) {
  const t = tk(dark)
  const [analytics, setAnalytics] = useState(null)
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [a,h] = await Promise.all([getAnalytics(), getHistory()])
        setAnalytics(a); setHistory(h)
      } catch { setError("Could not load analytics. Is the backend running?") }
      finally { setLoading(false) }
    })()
  }, [])

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
      <AlertCircle size={16}/>{error}
    </div>
  )

  if (!analytics) return <p style={{ color:t.textMuted, fontSize:13 }}>No analytics data available.</p>

  const pieData = Object.entries(analytics.categories||{}).map(([name,value]) => ({
    name:name.replace("_"," "), value, color:CATEGORY_COLORS[name]||"#6366f1", key:name,
  }))

  const barData = Object.entries(analytics.tone_likes||{}).map(([tone,count]) => ({
    name:tone.charAt(0).toUpperCase()+tone.slice(1), count,
  }))

  return (
    <>
      <style>{`
        ${FONTS}
        .an * { box-sizing:border-box; }
        .an { font-family:'DM Sans',sans-serif; }
        .an-card { background:${t.cardBg}; border:1px solid ${t.cardBorder}; border-radius:18px; box-shadow:0 2px 28px rgba(0,0,0,${dark?0.45:0.07}); transition:background 0.35s, border-color 0.35s; }
        .an-trow { transition:background 0.15s; cursor:default; }
        .an-trow:hover { background:${t.rowHover}; }
        .stat-ic { transition:transform 0.22s; }
        .stat-card:hover .stat-ic { transform:scale(1.1); }
      `}</style>

      <div className="an" style={{ display:"flex", flexDirection:"column", gap:18 }}>

        {/* stat cards */}
        <motion.div variants={stagger} initial="hidden" animate="show"
          style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
          <StatCard variants={fadeUp} icon={Mail}       label="Total Emails"    value={analytics.total_emails}                      accent="#6366f1" t={t} dark={dark}/>
          <StatCard variants={fadeUp} icon={TrendingUp} label="Preferred Tone"  value={analytics.preferred_tone||"None Yet"}        accent="#22c55e" t={t} dark={dark} isText/>
          <StatCard variants={fadeUp} icon={BarChart3}  label="Categories Seen" value={Object.keys(analytics.categories||{}).length} accent="#f59e0b" t={t} dark={dark}/>
        </motion.div>

        {/* charts */}
        <motion.div variants={stagger} initial="hidden" animate="show"
          style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:14 }}>

          {/* pie */}
          <motion.div variants={fadeUp} className="an-card" style={{ padding:"22px 24px" }}>
            <CardTitle t={t}>Emails by Category</CardTitle>
            {pieData.length===0 ? <Empty t={t} text="No category data yet."/> : (
              <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                <ResponsiveContainer width={150} height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={4} dataKey="value" stroke="none">
                      {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip content={<DarkTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1, minWidth:140 }}>
                  {pieData.map(d=>{
                    const b=t.badge[d.key]||t.badge.fyi
                    return (
                      <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ width:9, height:9, borderRadius:"50%", background:d.color, boxShadow:`0 0 7px ${d.color}bb`, display:"inline-block", flexShrink:0 }}/>
                          <span style={{ fontSize:12, fontWeight:500, padding:"3px 10px", borderRadius:20, background:b.bg, color:b.color, border:`1px solid ${b.border}`, textTransform:"capitalize" }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize:14, fontWeight:700, color:t.textPrimary }}>{d.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* tones */}
          <motion.div variants={fadeUp} className="an-card" style={{ padding:"22px 24px" }}>
            <CardTitle t={t}>Liked Tones</CardTitle>
            {barData.length===0 ? <Empty t={t} text="No feedback yet."/> : (
              <>
                <ResponsiveContainer width="100%" height={148}>
                  <BarChart data={barData} barSize={26} margin={{ top:4,right:4,left:-18,bottom:0 }}>
                    <defs>
                      <linearGradient id="anBarG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#6366f1" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark?"#1e2d4a":"#dde3f5"} vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill:t.textMuted, fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:t.textMuted, fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<DarkTooltip/>} cursor={{ fill:t.accentDim }}/>
                    <Bar dataKey="count" name="Liked" fill="url(#anBarG)" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                  {Object.entries(analytics.tone_likes).map(([tone,count])=>{
                    const max=Math.max(...Object.values(analytics.tone_likes))
                    const pct=max>0?Math.round((count/max)*100):0
                    return (
                      <div key={tone}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, color:t.textMuted, textTransform:"capitalize" }}>{tone}</span>
                          <span style={{ fontSize:12, fontWeight:600, color:"#22c55e" }}>{count} liked</span>
                        </div>
                        <div style={{ width:"100%", height:4, background:dark?"#1e2d4a":"#dde3f5", borderRadius:4, overflow:"hidden" }}>
                          <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.85, ease:"easeOut", delay:0.25 }}
                            style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#22c55e,#16a34a)", boxShadow:"0 0 8px rgba(34,197,94,0.5)" }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* history table */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="an-card" style={{ padding:"22px 24px", overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <CardTitle t={t} style={{ margin:0 }}>Recent Emails</CardTitle>
            {history.length>0&&(
              <span style={{ fontSize:11, fontWeight:600, color:t.accentIndigo, background:t.accentDim, border:`1px solid ${t.accentBorder}`, borderRadius:20, padding:"3px 11px" }}>
                {history.length} records
              </span>
            )}
          </div>
          {history.length===0 ? <Empty t={t} text="No emails analyzed yet." icon={<Mail size={26} color={t.textFaint}/>}/> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr>
                    {["Subject","Category","Confidence","Date"].map(h=>(
                      <th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:10, fontWeight:600, color:t.textFaint, textTransform:"uppercase", letterSpacing:"0.12em", borderBottom:`1px solid ${t.cardBorder}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {history.map((email,idx)=>{
                      const b=t.badge[email.category]||t.badge.fyi
                      const conf=Math.round((email.confidence||0)*100)
                      const confColor=conf>=80?"#22c55e":conf>=50?"#f59e0b":"#ef4444"
                      return (
                        <motion.tr key={email.id} className="an-trow"
                          initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                          transition={{ delay:idx*0.04, duration:0.3 }}
                          style={{ borderBottom:`1px solid ${t.divider}` }}>
                          <td style={{ padding:"13px 14px", color:t.textSecondary, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {email.subject||<span style={{ color:t.textFaint, fontStyle:"italic" }}>No subject</span>}
                          </td>
                          <td style={{ padding:"13px 14px" }}>
                            {email.category
                              ? <span style={{ padding:"3px 11px", borderRadius:20, fontSize:11, fontWeight:600, textTransform:"capitalize", background:b.bg, color:b.color, border:`1px solid ${b.border}`, whiteSpace:"nowrap" }}>{email.category.replace("_"," ")}</span>
                              : <span style={{ color:t.textFaint }}>—</span>}
                          </td>
                          <td style={{ padding:"13px 14px" }}>
                            {email.confidence ? (
                              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ width:50, height:3, background:dark?"#1e2d4a":"#dde3f5", borderRadius:4, overflow:"hidden" }}>
                                  <div style={{ width:`${conf}%`, height:"100%", background:confColor, boxShadow:`0 0 6px ${confColor}99`, borderRadius:4 }}/>
                                </div>
                                <span style={{ fontSize:12, fontWeight:600, color:confColor, minWidth:30 }}>{conf}%</span>
                              </div>
                            ) : <span style={{ color:t.textFaint }}>—</span>}
                          </td>
                          <td style={{ padding:"13px 14px", whiteSpace:"nowrap" }}>
                            <span style={{ display:"flex", alignItems:"center", gap:6, color:t.textFaint, fontSize:12 }}>
                              <Clock size={11}/>{new Date(email.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}

function StatCard({ icon:Icon, label, value, accent, variants, isText, t, dark }) {
  const iconBg = dark
    ? accent==="#6366f1"?"#1e1b4b":accent==="#22c55e"?"#0d2e1a":"#2d1f05"
    : accent==="#6366f1"?"#eef2ff":accent==="#22c55e"?"#f0fdf4":"#fffbeb"
  return (
    <motion.div variants={variants} className="an-card stat-card"
      style={{ padding:"20px 22px", display:"flex", alignItems:"center", gap:16 }}
      whileHover={{ y:-2, transition:{ duration:0.2 } }}>
      <div className="stat-ic" style={{ width:48, height:48, borderRadius:14, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:iconBg, border:`1px solid ${accent}40`, boxShadow:`0 0 20px ${accent}22` }}>
        <Icon size={20} color={accent}/>
      </div>
      <div style={{ overflow:"hidden" }}>
        <p style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", color:t.textFaint, textTransform:"uppercase", margin:0 }}>{label}</p>
        <p style={{ fontFamily:isText?"'DM Sans',sans-serif":"'Syne',sans-serif", fontSize:isText?16:26, fontWeight:700, color:t.textPrimary, margin:"3px 0 0", textTransform:"capitalize", letterSpacing:isText?0:"-0.02em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</p>
      </div>
    </motion.div>
  )
}

function CardTitle({ children, t, style={} }) {
  return <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:t.textSecondary, margin:"0 0 16px", letterSpacing:"-0.01em", ...style }}>{children}</h3>
}

function Empty({ text, t, icon }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"26px 0", color:t.textFaint, fontSize:13 }}>
      {icon}{text}
    </div>
  )
}