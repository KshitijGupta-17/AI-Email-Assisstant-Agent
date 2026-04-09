import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Lock, User, Zap, Eye, EyeOff } from "lucide-react"
import toast from "react-hot-toast"
import { Toaster } from "react-hot-toast"
import { login, signup, googleLogin } from "../api"
import { FONTS } from "../theme"
import { useGoogleLogin } from "@react-oauth/google"

function getStrength(pw) {
  let s = 0
  if (pw.length >= 6)  s++
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const segColor = s => s <= 1 ? "#ef4444" : s <= 2 ? "#f59e0b" : "#22c55e"

export default function AuthPage({ onLogin }) {
  const [isSignup,     setIsSignup]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [form,         setForm]         = useState({ name:"", email:"", password:"" })

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  const strength = getStrength(form.password)

  const switchMode = () => { setIsSignup(s => !s); setForm({ name:"", email:"", password:"" }) }

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true)
    try {
      // DEBUG: log raw token to verify account selection
      console.log("[OAuth] access_token received:", tokenResponse.access_token?.slice(0, 20) + "...")

      const result = await googleLogin(tokenResponse.access_token)

      // DEBUG: log which Gmail account was authenticated
      console.log("[OAuth] Authenticated as:", result.user_email)

      // Guard: make sure the authenticated email matches what was selected
      if (!result.user_email) {
        throw new Error("Could not determine authenticated Gmail account")
      }

      // Clear any stale per-user state before storing new session
      localStorage.removeItem("google_token")
      localStorage.removeItem("token")
      localStorage.removeItem("user_id")
      localStorage.removeItem("user_name")
      localStorage.removeItem("user_email")

      localStorage.setItem("token",        result.access_token)
      localStorage.setItem("user_id",      result.user_id)
      localStorage.setItem("user_name",    result.user_name)
      localStorage.setItem("user_email",   result.user_email)
      localStorage.setItem("google_token", tokenResponse.access_token)

      onLogin(result)
      toast.success(`Welcome, ${result.user_name}! (${result.user_email})`)
    } catch (err) {
      console.error("[OAuth] Google login error:", err)
      toast.error("Google login failed")
    } finally {
      setLoading(false)
    }
  }

  const googleLoginHook = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      console.error("[OAuth] Google OAuth error:", err)
      toast.error("Google login failed")
    },
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    flow: "implicit",
    // CRITICAL: Force account picker every time — prevents silent reuse of personal account
    prompt: "select_account",
  })

  const handleSubmit = async () => {
    if (isSignup && (!form.name || form.name.trim().length < 2)) { toast.error("Name must be at least 2 characters"); return }
    if (!form.email)  { toast.error("Email is required"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Please enter a valid email address"); return }
    if (!form.password) { toast.error("Password is required"); return }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return }

    setLoading(true)
    try {
      if (isSignup) {
        await signup(form.name, form.email, form.password)
        toast.success("Account created! Please log in.")
        setIsSignup(false); setForm({ name:"", email:"", password:"" }); return
      }
      const result = await login(form.email, form.password)
      toast.success(`Welcome back, ${result.user_name}!`)
      localStorage.setItem("token",      result.access_token)
      localStorage.setItem("user_id",    result.user_id)
      localStorage.setItem("user_name",  result.user_name)
      localStorage.setItem("user_email", result.user_email)
      // NEVER restore google_token from a manual login — it's always expired
      // and might belong to a different Google account. Only Google OAuth sets this.
      localStorage.removeItem("google_token")
      onLogin(result)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === "string")   toast.error(detail)
      else if (Array.isArray(detail))   toast.error(detail.map(e => e.msg).join(", "))
      else                              toast.error("Authentication failed")
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .auth-root { min-height:100vh; background:#060b18; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',sans-serif; position:relative; overflow:hidden; padding:2rem 1rem; }
        .auth-input { width:100%; padding:11px 40px 11px 38px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; font-family:'DM Sans',sans-serif; font-size:13px; color:#e8e8f0; outline:none; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; }
        .auth-input::placeholder { color:rgba(255,255,255,0.18); }
        .auth-input:focus { border-color:rgba(99,102,241,0.5); background:rgba(99,102,241,0.06); box-shadow:0 0 0 3px rgba(99,102,241,0.12); }
        .tab-btn { flex:1; padding:8px; border-radius:9px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; border:none; cursor:pointer; transition:all 0.25s ease; }
        .tab-active { background:linear-gradient(135deg,#4f46e5,#7c3aed) !important; color:#fff !important; box-shadow:0 2px 12px rgba(99,102,241,0.4); }
        .submit-btn { width:100%; padding:13px; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:13px; font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:#fff; cursor:pointer; position:relative; overflow:hidden; transition:transform 0.15s, box-shadow 0.2s, opacity 0.2s; box-shadow:0 4px 24px rgba(99,102,241,0.35); }
        .submit-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.14) 0%,transparent 55%); pointer-events:none; }
        .submit-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 32px rgba(99,102,241,0.5); }
        .submit-btn:disabled { opacity:0.55; cursor:not-allowed; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { display:inline-block; width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.6s linear infinite; margin-right:8px; vertical-align:middle; }
      `}</style>

      <Toaster position="top-right" toastOptions={{ style:{ background:"rgba(10,16,36,0.95)", color:"#e8e8f0", border:"1px solid rgba(99,102,241,0.25)", borderRadius:"12px", fontSize:"13px", backdropFilter:"blur(12px)", boxShadow:"0 8px 32px rgba(0,0,0,0.5)" }, duration:3200 }}/>

      <div className="auth-root">
        {/* orbs */}
        {[{ w:340,h:340,top:"-80px",left:"-60px",c:"#3b1fa855" },{ w:280,h:280,bottom:"-60px",right:"-40px",c:"#1a4f8833" },{ w:200,h:200,top:"50%",left:"50%",transform:"translate(-50%,-50%)",c:"#6d28d920" }].map((o,i)=>(
          <div key={i} style={{ position:"absolute", borderRadius:"50%", filter:"blur(80px)", pointerEvents:"none", width:o.w, height:o.h, top:o.top, left:o.left, bottom:o.bottom, right:o.right, transform:o.transform, background:`radial-gradient(circle,${o.c} 0%,transparent 70%)` }}/>
        ))}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)", backgroundSize:"44px 44px" }}/>

        <motion.div initial={{ opacity:0, y:24, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }} transition={{ duration:0.5, ease:[0.22,1,0.36,1] }}
          style={{ position:"relative", width:"100%", maxWidth:420 }}>

          {/* logo */}
          <div style={{ display:"flex", alignItems:"center", gap:14, justifyContent:"center", marginBottom:"2rem" }}>
            <div style={{ width:48, height:48, borderRadius:14, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 24px rgba(99,102,241,0.4)" }}>
              <Zap size={22} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:20, color:"#f0f0ff", letterSpacing:"-0.03em", margin:0, lineHeight:1 }}>AI Email</h1>
              <span style={{ fontSize:9, fontWeight:500, letterSpacing:"0.22em", color:"rgba(139,128,255,0.6)", textTransform:"uppercase", display:"block", marginTop:4 }}>Assistant</span>
            </div>
          </div>

          {/* card */}
          <div style={{ background:"rgba(10,16,32,0.85)", border:"1px solid rgba(99,102,241,0.18)", borderRadius:24, padding:"2.5rem 2rem", backdropFilter:"blur(20px)", boxShadow:"0 0 0 1px rgba(99,102,241,0.06),0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.05)" }}>
            {/* tabs */}
            <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:4, marginBottom:"2rem" }}>
              {["Login","Signup"].map(label => {
                const active = label==="Login" ? !isSignup : isSignup
                return <button key={label} onClick={() => { setIsSignup(label==="Signup"); setForm({name:"",email:"",password:""}) }}
                  className={`tab-btn${active?" tab-active":""}`}
                  style={{ color:active?"#fff":"rgba(255,255,255,0.4)", background:active?"":"transparent" }}>{label}</button>
              })}
            </div>

            {/* heading */}
            <motion.div key={isSignup?"s":"l"} initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.22 }}>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#f0f0ff", letterSpacing:"-0.03em", margin:0 }}>{isSignup?"Create account":"Welcome back"}</p>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.35)", marginTop:4, marginBottom:"1.6rem" }}>{isSignup?"Start analyzing your emails with AI":"Sign in to your workspace"}</p>
            </motion.div>

            {/* fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <AnimatePresence>
                {isSignup && (
                  <motion.div key="name" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.3 }} style={{ overflow:"hidden" }}>
                    <FieldLabel>Full name</FieldLabel>
                    <div style={{ position:"relative" }}>
                      <IconWrap><User size={15}/></IconWrap>
                      <input name="name" placeholder="John Doe" value={form.name} onChange={handleChange} className="auth-input"/>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <FieldLabel>Email address</FieldLabel>
                <div style={{ position:"relative" }}>
                  <IconWrap><Mail size={15}/></IconWrap>
                  <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className="auth-input"/>
                </div>
              </div>

              <div>
                <FieldLabel>Password</FieldLabel>
                <div style={{ position:"relative" }}>
                  <IconWrap><Lock size={15}/></IconWrap>
                  <input name="password" type={showPassword?"text":"password"} placeholder="••••••••" value={form.password} onChange={handleChange} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} className="auth-input" style={{ paddingRight:40 }}/>
                  <button onClick={()=>setShowPassword(s=>!s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:2 }}>
                    {showPassword ? <EyeOff size={15} color="rgba(255,255,255,0.4)"/> : <Eye size={15} color="rgba(255,255,255,0.25)"/>}
                  </button>
                </div>
                <AnimatePresence>
                  {isSignup && form.password.length > 0 && (
                    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
                      style={{ display:"flex", gap:4, marginTop:7 }}>
                      {[1,2,3,4].map(n => (
                        <div key={n} style={{ height:3, flex:1, borderRadius:4, background:n<=strength?segColor(strength):"rgba(255,255,255,0.08)", transition:"background 0.3s" }}/>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <button className="submit-btn" onClick={handleSubmit} disabled={loading} style={{ marginTop:"1.5rem" }}>
              {loading ? <><span className="spin"/><span>Please wait…</span></> : isSignup ? "Create Account" : "Log In"}
            </button>

            {/* Divider */}
<div className="flex items-center gap-4 mt-8">
  <div className="flex-1 h-px bg-white/[0.08]" />
  <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">Or</span>
  <div className="flex-1 h-px bg-white/[0.08]" />
</div>

{/* Google Button */}
<button
  onClick={() => {
    // Clear stale google_token before launching picker to prevent any token reuse
    localStorage.removeItem("google_token")
    googleLoginHook()
  }}
  className="w-full mt-6 flex items-center justify-center gap-3 py-3.5 bg-white rounded-xl hover:bg-gray-50 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md active:scale-95"
>
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
  <span className="text-[14px] font-semibold text-gray-700 group-hover:text-gray-900">Continue with Google</span>
</button>

            <p style={{ textAlign:"center", fontSize:12.5, color:"rgba(255,255,255,0.3)", marginTop:"1.4rem" }}>
              {isSignup?"Already have an account?":"Don't have an account?"}{" "}
              <button onClick={switchMode} style={{ background:"none", border:"none", cursor:"pointer", color:"#818cf8", fontWeight:500, fontSize:12.5, padding:0 }}>
                {isSignup?"Log In":"Sign Up"}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function FieldLabel({ children }) {
  return <label style={{ display:"block", fontSize:11, fontWeight:500, letterSpacing:"0.12em", color:"rgba(139,128,255,0.7)", textTransform:"uppercase", marginBottom:6 }}>{children}</label>
}
function IconWrap({ children }) {
  return <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.2)", pointerEvents:"none", display:"flex" }}>{children}</span>
}