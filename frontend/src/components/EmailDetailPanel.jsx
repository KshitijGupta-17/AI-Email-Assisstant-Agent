// frontend/src/components/EmailDetailPanel.jsx  — CREATE THIS FILE

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ThumbsUp, ThumbsDown, Edit3, RefreshCw, Send, Copy } from "lucide-react"
import toast from "react-hot-toast"
import { generateReply, submitReplyFeedback, sendEmail } from "../api"
import { tk } from "../theme"

export default function EmailDetailPanel({ email, user, dark, onClose }) {
  const t = tk(dark)

  const [reply,       setReply]       = useState(null)
  const [replyId,     setReplyId]     = useState(null)
  const [version,     setVersion]     = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [regenLoading,setRegenLoading]= useState(false)
  const [feedback,    setFeedback]    = useState(null)
  const [showCustom,  setShowCustom]  = useState(false)
  const [instruction, setInstruction] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [sendTo,      setSendTo]      = useState("")
  const [sending,     setSending]     = useState(false)

  const userId = user?.id || 1

  // Auto-generate reply when email is selected
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setFeedback(null)
      setShowCustom(false)
      try {
        const data = await generateReply(email.id, userId)
        setReply(data.draft)
        setReplyId(data.reply_id)
        setVersion(data.version)
      } catch {
        toast.error("Could not generate reply.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [email.id])

  const handleFeedback = async (type) => {
    if (feedback) return
    setFeedback(type)
    if (type === "good") {
      try {
        await submitReplyFeedback(replyId, "good", "", userId)
        toast.success("Thanks for the feedback!")
      } catch { toast.error("Could not save feedback.") }
      return
    }
    if (type === "bad") {
      await regenerate("bad", "")
    }
  }

  const handleCustomFeedback = async () => {
    if (!instruction.trim()) { toast.error("Please enter an instruction."); return }
    await regenerate("modified", instruction)
    setShowCustom(false)
    setInstruction("")
  }

  const regenerate = async (feedbackType, customInstruction) => {
    setRegenLoading(true)
    try {
      const data = await submitReplyFeedback(replyId, feedbackType, customInstruction, userId)
      if (data.regenerated) {
        setReply(data.draft)
        setReplyId(data.reply_id)
        setVersion(data.version)
        setFeedback(null)
        toast.success(`Reply improved! (v${data.version})`)
      }
    } catch {
      toast.error("Regeneration failed.")
    } finally {
      setRegenLoading(false)
    }
  }

  const handleSend = async () => {
    const googleToken = localStorage.getItem("google_token")
    if (!googleToken) { toast.error("Google token missing. Please log in again."); return }
    if (!sendTo)      { toast.error("Please enter a recipient email."); return }

    setSending(true)
    try {
      await sendEmail(sendTo, `Re: ${email.subject}`, reply, googleToken)
      toast.success("Email sent successfully!")
      setShowCompose(false)
    } catch {
      toast.error("Failed to send email.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`,
                  borderRadius:20, padding:24, height:"100%",
                  display:"flex", flexDirection:"column", gap:16 }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1, marginRight:12 }}>
          <p style={{ margin:0, fontSize:15, fontWeight:600,
                      color:t.textPrimary, fontFamily:"'Syne',sans-serif" }}>
            {email.subject || "(No subject)"}
          </p>
          <p style={{ margin:"4px 0 0", fontSize:12, color:t.textFaint }}>
            From: {email.sender}
          </p>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none",
                                           cursor:"pointer", color:t.textFaint, padding:4 }}>
          <X size={18}/>
        </button>
      </div>

      {/* Email body */}
      <div style={{ background:t.inputBg, border:`1px solid ${t.inputBorder}`,
                    borderRadius:12, padding:"12px 16px" }}>
        <p style={{ margin:0, fontSize:13, color:t.textSecondary,
                    lineHeight:1.7, whiteSpace:"pre-wrap" }}>
          {email.body || email.snippet}
        </p>
      </div>

      {/* AI Reply section */}
      <div style={{ flex:1 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:10 }}>
          <p style={{ margin:0, fontSize:10, fontWeight:600,
                      letterSpacing:"0.12em", color:t.textFaint,
                      textTransform:"uppercase" }}>
            AI Reply {version > 1 ? `(v${version})` : ""}
          </p>
          {reply && !loading && (
            <button onClick={() => { navigator.clipboard.writeText(reply); toast.success("Copied!") }}
              style={{ display:"flex", alignItems:"center", gap:5,
                       padding:"5px 10px", borderRadius:8, border:"none",
                       background:t.accentDim, color:t.accentIndigo,
                       fontSize:11, cursor:"pointer" }}>
              <Copy size={11}/> Copy
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[80,60,90,50].map((w,i) => (
              <motion.div key={i}
                animate={{ opacity:[0.15, 0.4, 0.15] }}
                transition={{ duration:1.4, repeat:Infinity, delay:i*0.18 }}
                style={{ height:12, width:`${w}%`, borderRadius:4,
                         background:t.cardBorder }}
              />
            ))}
          </div>
        ) : (
          <div style={{ background:t.inputBg, border:`1px solid ${t.inputBorder}`,
                        borderRadius:12, padding:"12px 16px", minHeight:100 }}>
            <p style={{ margin:0, fontSize:13, color:t.textSecondary,
                        lineHeight:1.8, whiteSpace:"pre-wrap" }}>
              {reply}
            </p>
          </div>
        )}
      </div>

      {/* Feedback buttons */}
      {reply && !loading && (
        <div>
          <p style={{ margin:"0 0 10px", fontSize:11, color:t.textFaint,
                      fontWeight:500, letterSpacing:"0.08em",
                      textTransform:"uppercase" }}>
            How was this reply?
          </p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>

            {/* Good */}
            <button
              onClick={() => handleFeedback("good")}
              disabled={!!feedback}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:10, border:"none",
                background: feedback === "good" ? "#22c55e" : "rgba(34,197,94,0.12)",
                color:      feedback === "good" ? "#fff"    : "#22c55e",
                fontSize:12, fontWeight:500, cursor:"pointer",
                transition:"all 0.18s",
              }}>
              <ThumbsUp size={13}/> Good
            </button>

            {/* Bad — triggers regeneration */}
            <button
              onClick={() => handleFeedback("bad")}
              disabled={!!feedback || regenLoading}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:10, border:"none",
                background: feedback === "bad" ? "#ef4444" : "rgba(239,68,68,0.12)",
                color:      feedback === "bad" ? "#fff"    : "#ef4444",
                fontSize:12, fontWeight:500, cursor:"pointer",
                transition:"all 0.18s",
              }}>
              <ThumbsDown size={13}/>
              {regenLoading && feedback === "bad" ? "Regenerating..." : "Bad"}
            </button>

            {/* Modify instruction */}
            <button
              onClick={() => setShowCustom(s => !s)}
              disabled={!!feedback && feedback !== "modified"}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:10, border:"none",
                background: showCustom ? t.accentBorder : t.accentDim,
                color:      t.accentIndigo,
                fontSize:12, fontWeight:500, cursor:"pointer",
                transition:"all 0.18s",
              }}>
              <Edit3 size={13}/> Modify
            </button>

            {/* Send */}
            <button
              onClick={() => setShowCompose(s => !s)}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 14px", borderRadius:10, border:"none",
                background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer",
                marginLeft:"auto",
              }}>
              <Send size={13}/> Send
            </button>
          </div>

          {/* Custom instruction input */}
          <AnimatePresence>
            {showCustom && (
              <motion.div key="custom"
                initial={{ opacity:0, height:0 }}
                animate={{ opacity:1, height:"auto" }}
                exit={{ opacity:0, height:0 }}
                style={{ overflow:"hidden", marginTop:10 }}>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    value={instruction}
                    onChange={e => setInstruction(e.target.value)}
                    placeholder='e.g. "Make it more concise" or "Add apology tone"'
                    onKeyDown={e => e.key === "Enter" && handleCustomFeedback()}
                    style={{
                      flex:1, padding:"9px 12px", borderRadius:10,
                      background:t.inputBg, border:`1px solid ${t.inputBorder}`,
                      color:t.textSecondary, fontSize:13,
                      fontFamily:"'DM Sans',sans-serif", outline:"none",
                    }}
                  />
                  <button onClick={handleCustomFeedback} disabled={regenLoading}
                    style={{
                      display:"flex", alignItems:"center", gap:5,
                      padding:"9px 16px", borderRadius:10, border:"none",
                      background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
                      color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer",
                    }}>
                    <RefreshCw size={12}/>
                    {regenLoading ? "..." : "Regenerate"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compose / Send panel */}
          <AnimatePresence>
            {showCompose && (
              <motion.div key="compose"
                initial={{ opacity:0, height:0 }}
                animate={{ opacity:1, height:"auto" }}
                exit={{ opacity:0, height:0 }}
                style={{ overflow:"hidden", marginTop:10 }}>
                <div style={{
                  background:t.inputBg, border:`1px solid ${t.inputBorder}`,
                  borderRadius:12, padding:14,
                  display:"flex", flexDirection:"column", gap:8,
                }}>
                  <input
                    value={sendTo}
                    onChange={e => setSendTo(e.target.value)}
                    placeholder="To: recipient@example.com"
                    style={{
                      padding:"9px 12px", borderRadius:9,
                      background:t.cardBg, border:`1px solid ${t.cardBorder}`,
                      color:t.textSecondary, fontSize:13,
                      fontFamily:"'DM Sans',sans-serif", outline:"none",
                    }}
                  />
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    rows={5}
                    style={{
                      padding:"9px 12px", borderRadius:9, resize:"vertical",
                      background:t.cardBg, border:`1px solid ${t.cardBorder}`,
                      color:t.textSecondary, fontSize:13,
                      fontFamily:"'DM Sans',sans-serif", outline:"none",
                    }}
                  />
                  <button onClick={handleSend} disabled={sending}
                    style={{
                      display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                      padding:"10px", borderRadius:10, border:"none",
                      background: sending ? "#64748b" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                      color:"#fff", fontSize:13, fontWeight:600,
                      cursor: sending ? "not-allowed" : "pointer",
                    }}>
                    <Send size={14}/>
                    {sending ? "Sending..." : "Send Email"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}