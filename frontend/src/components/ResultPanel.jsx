import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, ThumbsUp, ThumbsDown, Mail, CheckCircle } from "lucide-react"
import toast from "react-hot-toast"
import { submitFeedback } from "../api"
import { tk, FONTS } from "../theme"

const CATEGORY_STYLE = {
  urgent:          { bg:"#2d0f0f", color:"#f87171", border:"#7f1d1d" },
  action_required: { bg:"#2d1f05", color:"#fbbf24", border:"#78350f" },
  fyi:             { bg:"#0d1f3c", color:"#60a5fa", border:"#1e3a5f" },
  spam:            { bg:"#1a1f2e", color:"#94a3b8", border:"#334155" },
}

const LIGHT_CATEGORY_STYLE = {
  urgent:          { bg:"#fff1f2", color:"#be123c", border:"#fecdd3" },
  action_required: { bg:"#fffbeb", color:"#b45309", border:"#fde68a" },
  fyi:             { bg:"#eff6ff", color:"#1d4ed8", border:"#bfdbfe" },
  spam:            { bg:"#f8fafc", color:"#475569", border:"#e2e8f0" },
}

const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.09 } } }
const fadeUp  = {
  hidden:{ opacity:0, y:14 },
  show:  { opacity:1, y:0, transition:{ duration:0.4, ease:[0.22,1,0.36,1] } }
}

export default function ResultPanel({ result, isLoading, dark = true }) {
  const t = tk(dark)
  const [feedback, setFeedback] = useState({})
  const [copied,   setCopied]   = useState(null)

  // ── Skeleton while loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {[1,2,3].map(i => (
          <motion.div key={i}
            animate={{ opacity:[0.15, 0.4, 0.15] }}
            transition={{ duration:1.5, repeat:Infinity, delay:i * 0.2 }}
            style={{ height:90, borderRadius:16, background:t.cardBg,
                     border:`1px solid ${t.cardBorder}` }}
          />
        ))}
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!result) {
    return (
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`,
                 borderRadius:20, padding:"48px 24px",
                 display:"flex", flexDirection:"column",
                 alignItems:"center", justifyContent:"center",
                 gap:14, minHeight:320,
                 boxShadow:`0 4px 32px rgba(0,0,0,${dark?0.45:0.08})` }}>
        <div style={{ width:52, height:52, borderRadius:16,
                      background:t.accentDim, border:`1px solid ${t.accentBorder}`,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Mail size={22} color={t.textFaint}/>
        </div>
        <p style={{ fontSize:14, fontWeight:600, color:t.textMuted,
                    fontFamily:"'DM Sans',sans-serif", margin:0 }}>
          No results yet
        </p>
        <p style={{ fontSize:12, color:t.textFaint, textAlign:"center",
                    fontFamily:"'DM Sans',sans-serif", maxWidth:220,
                    lineHeight:1.6, margin:0 }}>
          Paste an email and click Analyze Email to see the classification,
          summary and reply drafts here.
        </p>
      </motion.div>
    )
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFeedback = async (replyId, value) => {
    if (feedback[replyId]) return
    try {
      await submitFeedback(replyId, value)
      setFeedback(prev => ({ ...prev, [replyId]: value }))
      toast.success(value === "liked" ? "Marked as helpful!" : "Feedback recorded")
    } catch {
      toast.error("Could not save feedback.")
    }
  }

  const handleCopy = (replyId, text) => {
    navigator.clipboard.writeText(text)
    setCopied(replyId)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Pick category colours based on dark / light ────────────────────────────
  const catStyle = dark
    ? (CATEGORY_STYLE[result.category]       || CATEGORY_STYLE.fyi)
    : (LIGHT_CATEGORY_STYLE[result.category] || LIGHT_CATEGORY_STYLE.fyi)

  const confidence = Math.round(result.confidence * 100)
  const confColor  = confidence >= 80 ? "#22c55e"
                   : confidence >= 50 ? "#f59e0b"
                   :                    "#ef4444"

  return (
    <>
      <style>{`
        ${FONTS}
        .rp * { box-sizing:border-box; }
        .rp    { font-family:'DM Sans',sans-serif; }
        .rp-card {
          background:${t.cardBg};
          border:1px solid ${t.cardBorder};
          border-radius:18px;
          box-shadow:0 4px 32px rgba(0,0,0,${dark?0.45:0.08});
          transition:background 0.35s, border-color 0.35s;
        }
        .draft-card {
          background:${dark?"rgba(255,255,255,0.03)":"#f8fafc"};
          border:1px solid ${t.cardBorder};
          border-radius:14px;
          padding:16px 18px;
          transition:background 0.2s, border-color 0.2s;
        }
        .draft-card:hover {
          background:${dark?"rgba(99,102,241,0.06)":"#f1f5f9"};
          border-color:${dark?"rgba(99,102,241,0.25)":"#c7d2fe"};
        }
        .action-btn {
          display:flex; align-items:center; gap:5px;
          padding:6px 12px; border-radius:9px;
          font-family:'DM Sans',sans-serif;
          font-size:11px; font-weight:500;
          border:none; cursor:pointer;
          transition:background 0.18s, color 0.18s;
        }
        .copy-btn {
          background:${dark?"rgba(255,255,255,0.06)":"#f1f5f9"};
          color:${t.textMuted};
        }
        .copy-btn:hover {
          background:${dark?"rgba(255,255,255,0.1)":"#e2e8f0"};
        }
        .like-btn {
          background:${dark?"rgba(34,197,94,0.1)":"#f0fdf4"};
          color:#22c55e;
        }
        .like-btn:hover  { background:${dark?"rgba(34,197,94,0.18)":"#dcfce7"}; }
        .like-btn.active { background:#22c55e; color:#fff; }
        .dislike-btn {
          background:${dark?"rgba(239,68,68,0.1)":"#fff1f2"};
          color:#ef4444;
        }
        .dislike-btn:hover  { background:${dark?"rgba(239,68,68,0.18)":"#fee2e2"}; }
        .dislike-btn.active { background:#ef4444; color:#fff; }
      `}</style>

      <motion.div className="rp"
        variants={stagger} initial="hidden" animate="show"
        style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* ── Category + Confidence card ─────────────────────────────── */}
        <motion.div variants={fadeUp} className="rp-card"
          style={{ padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center",
                        justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>

            {/* badge */}
            <span style={{
              padding:"5px 14px", borderRadius:20, fontSize:12, fontWeight:700,
              letterSpacing:"0.06em", textTransform:"uppercase",
              background:catStyle.bg, color:catStyle.color,
              border:`1px solid ${catStyle.border}`,
            }}>
              {result.category.replace("_", " ")}
            </span>

            {/* confidence bar */}
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:80, height:4, borderRadius:4,
                            background:dark?"#1e2d4a":"#e2e8f0", overflow:"hidden" }}>
                <motion.div
                  initial={{ width:0 }}
                  animate={{ width:`${confidence}%` }}
                  transition={{ duration:0.9, ease:"easeOut", delay:0.2 }}
                  style={{ height:"100%", borderRadius:4, background:confColor,
                           boxShadow:`0 0 8px ${confColor}88` }}
                />
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:confColor,
                             fontFamily:"'Syne',sans-serif" }}>
                {confidence}%
              </span>
              <span style={{ fontSize:11, color:t.textFaint }}>confidence</span>
            </div>
          </div>
        </motion.div>

        {/* ── Summary card ───────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="rp-card"
          style={{ padding:"20px 22px" }}>
          <p style={{ fontSize:9, fontWeight:600, letterSpacing:"0.14em",
                      color:t.textFaint, textTransform:"uppercase",
                      margin:"0 0 10px", fontFamily:"'DM Sans',sans-serif" }}>
            Summary
          </p>
          <p style={{ fontSize:14, color:t.textSecondary, lineHeight:1.7,
                      margin:0, fontFamily:"'DM Sans',sans-serif" }}>
            {result.summary}
          </p>
        </motion.div>

        {/* ── Reply drafts ───────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="rp-card"
          style={{ padding:"20px 22px" }}>
          <p style={{ fontSize:9, fontWeight:600, letterSpacing:"0.14em",
                      color:t.textFaint, textTransform:"uppercase",
                      margin:"0 0 14px", fontFamily:"'DM Sans',sans-serif" }}>
            Reply Drafts
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {result.replies.map((reply) => {
              const isLiked    = feedback[reply.id] === "liked"
              const isDisliked = feedback[reply.id] === "disliked"
              const isCopied   = copied === reply.id

              return (
                <AnimatePresence key={reply.id}>
                  <motion.div
                    className="draft-card"
                    initial={{ opacity:0, y:8 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ duration:0.35 }}>

                    {/* tone label + action buttons */}
                    <div style={{ display:"flex", alignItems:"center",
                                  justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{
                        fontSize:10, fontWeight:700,
                        letterSpacing:"0.14em", textTransform:"uppercase",
                        color:"#818cf8", fontFamily:"'DM Sans',sans-serif",
                      }}>
                        {reply.tone}
                      </span>

                      <div style={{ display:"flex", gap:6 }}>
                        {/* thumbs up */}
                        <button
                          className={`action-btn like-btn${isLiked ? " active" : ""}`}
                          onClick={() => handleFeedback(reply.id, "liked")}
                          disabled={!!feedback[reply.id]}
                          title="This draft was helpful">
                          <ThumbsUp size={11}/>
                          {isLiked ? "Liked" : "Like"}
                        </button>

                        {/* thumbs down */}
                        <button
                          className={`action-btn dislike-btn${isDisliked ? " active" : ""}`}
                          onClick={() => handleFeedback(reply.id, "disliked")}
                          disabled={!!feedback[reply.id]}
                          title="Not helpful">
                          <ThumbsDown size={11}/>
                        </button>

                        {/* copy */}
                        <button
                          className="action-btn copy-btn"
                          onClick={() => handleCopy(reply.id, reply.draft_text)}
                          title="Copy to clipboard">
                          {isCopied
                            ? <><CheckCircle size={11} color="#22c55e"/><span style={{ color:"#22c55e" }}>Copied!</span></>
                            : <><Copy size={11}/>Copy</>
                          }
                        </button>
                      </div>
                    </div>

                    {/* draft text */}
                    <p style={{
                      margin:0, fontSize:13, color:t.textSecondary,
                      lineHeight:1.8, whiteSpace:"pre-wrap",
                      fontFamily:"'DM Sans',sans-serif",
                    }}>
                      {reply.draft_text}
                    </p>

                  </motion.div>
                </AnimatePresence>
              )
            })}
          </div>
        </motion.div>

      </motion.div>
    </>
  )
}