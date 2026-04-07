import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Trash2, FileText, ChevronDown, AlertCircle, Upload, X, Paperclip } from "lucide-react"
import toast from "react-hot-toast"
import { analyzeEmail, analyzeEmailWithAttachment } from "../api"
import { tk, FONTS } from "../theme"

const TEMPLATES = [
  { label:"Meeting Reminder", subject:"Meeting Reminder", sender:"boss@company.com", body:"Reminder: Meeting scheduled for 5 PM today. Please be on time and bring the quarterly report." },
  { label:"Invoice Due", subject:"Invoice #4821 - Payment Due", sender:"billing@client.com", body:"Dear Customer,\n\nYour invoice #4821 of $2,500 is due by end of this week. Please process the payment at your earliest convenience.\n\nBest regards,\nAccounts Team" },
  { label:"Spam Example", subject:"You've WON $1,000,000!!!", sender:"winner@totallyrealprize.com", body:"Congratulations! You have been selected as the winner of our grand prize. Click here to claim your $1,000,000 now! Limited time offer!" },
]

const TONES = [
  { value:"",         label:"Auto (based on feedback history)" },
  { value:"formal",   label:"Formal"   },
  { value:"friendly", label:"Friendly" },
  { value:"brief",    label:"Brief"    },
]

export default function EmailForm({ onResult, onLoading, prefillEmail, dark = true }) {
  const t = tk(dark)
  const [form,    setForm]    = useState({ subject:"", sender:"", body:"", preferred_tone:"" })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [tplOpen, setTplOpen] = useState(false)
  const [tnOpen,  setTnOpen]  = useState(false)
  const [file,    setFile]    = useState(null)
  const tplRef = useRef(null)
  const tnRef  = useRef(null)

  // Auto-fill form when Gmail email is selected
  useEffect(() => {
    if (prefillEmail) {
      setForm({
        subject: prefillEmail.subject || "",
        sender: prefillEmail.sender || "",
        body: prefillEmail.body || "",
        preferred_tone: "",
      })
      setFile(null)
      setError(null)
    }
  }, [prefillEmail])

  useEffect(() => {
    const h = e => {
      if (tplRef.current && !tplRef.current.contains(e.target)) setTplOpen(false)
      if (tnRef.current  && !tnRef.current.contains(e.target))  setTnOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const handleChange   = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  const handleTemplate = tpl => { setForm({ ...tpl, preferred_tone:"" }); toast.success(`"${tpl.label}" loaded`); setTplOpen(false) }
  const handleClear    = () => { setForm({ subject:"", sender:"", body:"", preferred_tone:"" }); setError(null); setFile(null) }

  const handleFileAttach = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    const ext = selectedFile.name.split(".").pop().toLowerCase()
    const allowed = ["txt", "pdf", "docx", "csv"]

    if (!allowed.includes(ext)) {
      toast.error("Supported formats: .txt, .pdf, .docx, .csv")
      e.target.value = ""
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB")
      e.target.value = ""
      return
    }

    setFile(selectedFile)
    toast.success(`Attached: ${selectedFile.name}`, { icon: "📎" })
    e.target.value = ""
  }

  const handleRemoveFile = () => {
    setFile(null)
  }

  const handleSubmit = async () => {
    if (!form.body.trim()) { setError("Email body is required."); toast.error("Email body cannot be empty"); return }
    setLoading(true); setError(null); onLoading(true)
    try {
      let result
      if (file) {
        result = await analyzeEmailWithAttachment(form, file)
      } else {
        result = await analyzeEmail(form)
      }
      onResult(result, form.sender); toast.success("Analysis complete!", { icon: "✨" })
    } catch (err) {
      const msg = err.response?.data?.detail || "Something went wrong. Is the backend running?"
      setError(msg); toast.error(msg)
    } finally { setLoading(false); onLoading(false) }
  }

  const wordCount = form.body.trim() ? form.body.trim().split(/\s+/).length : 0
  const selectedTone = TONES.find(t => t.value === form.preferred_tone) || TONES[0]

  return (
    <>
      <style>{`
        ${FONTS}
        .ef * { box-sizing:border-box; }
        .ef    { font-family:'DM Sans',sans-serif; }
        .ef-input {
          width:100%; padding:11px 14px;
          background:${t.inputBg}; border:1px solid ${t.inputBorder};
          border-radius:12px; font-family:'DM Sans',sans-serif;
          font-size:13px; color:${t.textSecondary}; outline:none;
          transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; margin-bottom:18px;
        }
        .ef-input::placeholder { color:${t.textFaint}; }
        .ef-input:focus { border-color:${t.inputFocus}; background:${dark?"rgba(99,102,241,0.05)":t.accentDim}; box-shadow:0 0 0 3px ${t.inputFocusShadow}; }
        .ef-textarea {
          width:100%; padding:12px 14px;
          background:${t.inputBg}; border:1px solid ${t.inputBorder};
          border-radius:12px; font-family:'DM Sans',sans-serif;
          font-size:13px; color:${t.textSecondary}; outline:none;
          resize:vertical; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; line-height:1.6;
        }
        .ef-textarea::placeholder { color:${t.textFaint}; }
        .ef-textarea:focus { border-color:${t.inputFocus}; background:${dark?"rgba(99,102,241,0.05)":t.accentDim}; box-shadow:0 0 0 3px ${t.inputFocusShadow}; }
        .ef-dd-btn {
          width:100%; padding:11px 14px; background:${t.inputBg}; border:1px solid ${t.inputBorder};
          border-radius:12px; font-family:'DM Sans',sans-serif; font-size:13px; color:${t.textSecondary};
          cursor:pointer; display:flex; align-items:center; justify-content:space-between;
          transition:border-color 0.2s, background 0.2s; text-align:left;
        }
        .ef-dd-btn:hover,.ef-dd-btn.open { border-color:${t.inputFocus}; background:${t.accentDim}; }
        .ef-dd-menu { position:absolute; top:calc(100% + 6px); left:0; right:0; background:${t.cardBg}; border:1px solid ${t.cardBorder}; border-radius:12px; overflow:hidden; z-index:50; box-shadow:0 12px 40px rgba(0,0,0,0.5); }
        .ef-dd-item { width:100%; padding:10px 14px; text-align:left; font-family:'DM Sans',sans-serif; font-size:13px; color:${t.textMuted}; background:transparent; border:none; cursor:pointer; transition:background 0.15s, color 0.15s; display:block; }
        .ef-dd-item:hover { background:${t.accentDim}; color:${t.textSecondary}; }
        .ef-dd-item.sel  { color:${t.accentIndigo}; background:${t.accentDim}; }
        .tpl-btn { display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:10px; font-size:12px; font-weight:500; font-family:'DM Sans',sans-serif; color:${t.accentIndigo}; background:${t.accentDim}; border:1px solid ${t.accentBorder}; cursor:pointer; transition:background 0.18s; }
        .tpl-btn:hover { background:${dark?"rgba(99,102,241,0.18)":t.accentBorder}; }
        .btn-clear { display:flex; align-items:center; gap:8px; padding:11px 18px; background:${t.accentDim}; border:1px solid ${t.cardBorder}; border-radius:12px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; color:${t.textMuted}; cursor:pointer; transition:background 0.18s; }
        .btn-clear:hover { background:${t.cardBorder}; }
        .btn-submit { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:11px 20px; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:12px; font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#fff; cursor:pointer; transition:transform 0.15s, box-shadow 0.2s, opacity 0.2s; box-shadow:0 4px 20px rgba(99,102,241,0.35); position:relative; overflow:hidden; }
        .btn-submit::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.12),transparent 55%); pointer-events:none; }
        .btn-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 28px rgba(99,102,241,0.5); }
        .btn-submit:disabled { opacity:0.5; cursor:not-allowed; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { display:inline-block; width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; }
      `}</style>

      <motion.div className="ef" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}>
        <div style={{ background:t.cardBg, border:`1px solid ${t.cardBorder}`, borderRadius:20, padding:"24px", boxShadow:`0 4px 32px rgba(0,0,0,${dark?0.45:0.08})`, transition:"background 0.35s, border-color 0.35s" }}>

          {/* header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
            <div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:t.textPrimary, letterSpacing:"-0.02em", margin:0 }}>Paste Email</h2>
              <p style={{ fontSize:11, color:t.textFaint, marginTop:4 }}>Fill in the details below to analyze</p>
            </div>
            <div ref={tplRef} style={{ position:"relative" }}>
              <button className="tpl-btn" onClick={() => setTplOpen(o=>!o)}>
                <FileText size={13}/>Templates
                <ChevronDown size={12} style={{ transform:tplOpen?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
              </button>
              <AnimatePresence>
                {tplOpen && (
                  <motion.div className="ef-dd-menu" initial={{ opacity:0, y:-6, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.97 }} transition={{ duration:0.18 }}>
                    {TEMPLATES.map(tpl => <button key={tpl.label} className="ef-dd-item" onClick={() => handleTemplate(tpl)}>{tpl.label}</button>)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <FieldLabel t={t}>Subject</FieldLabel>
          <input name="subject" placeholder="e.g. Invoice #4821 - Payment Due" value={form.subject} onChange={handleChange} className="ef-input"/>

          <FieldLabel t={t}>Sender</FieldLabel>
          <input name="sender" placeholder="e.g. billing@client.com" value={form.sender} onChange={handleChange} className="ef-input"/>

          <FieldLabel t={t}>Email Body <span style={{ color:"#f87171" }}>*</span></FieldLabel>
          <textarea name="body" placeholder="Paste the full email content here..." value={form.body} onChange={handleChange} rows={9} className="ef-textarea"/>
          <div style={{ display:"flex", justifyContent:"flex-end", margin:"6px 0 18px" }}>
            <span style={{ fontSize:11, color:wordCount>0?t.textMuted:t.textFaint }}>{wordCount} words</span>
          </div>

          <FieldLabel t={t}>Preferred Reply Tone</FieldLabel>
          <div ref={tnRef} style={{ position:"relative", marginBottom:20 }}>
            <button className={`ef-dd-btn${tnOpen?" open":""}`} onClick={() => setTnOpen(o=>!o)} type="button">
              <span style={{ color:form.preferred_tone?t.textSecondary:t.textFaint }}>{selectedTone.label}</span>
              <ChevronDown size={14} color={t.textFaint} style={{ transform:tnOpen?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}/>
            </button>
            <AnimatePresence>
              {tnOpen && (
                <motion.div className="ef-dd-menu" initial={{ opacity:0, y:-6, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.97 }} transition={{ duration:0.18 }}>
                  {TONES.map(tn => (
                    <button key={tn.value} className={`ef-dd-item${form.preferred_tone===tn.value?" sel":""}`}
                      onClick={() => { setForm(p=>({...p,preferred_tone:tn.value})); setTnOpen(false) }}>{tn.label}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* File Attachment */}
          <div style={{ marginBottom: 18 }}>
            <FieldLabel t={t}>Attachment <span style={{ textTransform:"none", color:t.textFaint, fontWeight:400 }}>(optional)</span></FieldLabel>

            {!file ? (
              <label style={{
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                width:"100%", padding:"12px 16px", borderRadius:12,
                border:`2px dashed ${t.inputBorder}`, background:t.inputBg,
                cursor:"pointer", transition:"border-color 0.2s, background 0.2s"
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.inputFocus; e.currentTarget.style.background = t.accentDim }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.inputBorder; e.currentTarget.style.background = t.inputBg }}
              >
                <Upload size={16} color={t.textFaint} />
                <span style={{ fontSize:12, color:t.textFaint, fontWeight:500 }}>
                  Upload PDF, DOCX, TXT, or CSV
                </span>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,.csv"
                  onChange={handleFileAttach}
                  style={{ display:"none" }}
                />
              </label>
            ) : (
              <div style={{
                display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderRadius:12,
                background: dark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
                border:`1px solid ${dark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)"}`
              }}>
                <Paperclip size={14} color={t.accentIndigo} style={{ flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:t.accentIndigo, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>
                    {file.name}
                  </p>
                  <p style={{ fontSize:10, color:t.textFaint, margin:0 }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  style={{ padding:4, borderRadius:8, border:"none", background:"transparent", cursor:"pointer", display:"flex" }}
                  onMouseEnter={e => e.currentTarget.style.background = t.accentDim}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <X size={14} color={t.textFaint} />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} style={{ overflow:"hidden", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 14px", background:dark?"#2d0f0f":"#fff1f2", border:`1px solid ${dark?"#7f1d1d":"#fecdd3"}`, borderRadius:12, fontSize:13, color:"#f87171" }}>
                  <AlertCircle size={14} style={{ flexShrink:0 }}/>{error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display:"flex", gap:10 }}>
            <button className="btn-clear" onClick={handleClear}><Trash2 size={14}/>Clear</button>
            <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? <><span className="spin"/><span>Analyzing…</span></> : <><Send size={14}/><span>Analyze Email</span></>}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

function FieldLabel({ children, t }) {
  return <label style={{ display:"block", fontSize:10, fontWeight:600, letterSpacing:"0.12em", color:t.accentIndigo+"aa", textTransform:"uppercase", marginBottom:7 }}>{children}</label>
}