import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, RefreshCw, ArrowRight, Inbox, AlertCircle, Clock } from "lucide-react"
import toast from "react-hot-toast"
import { fetchGmailEmails } from "../api"

export default function GmailInbox({ onSelectEmail }) {
  const [emails, setEmails]     = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [fetched, setFetched]   = useState(false)
  const [selected, setSelected] = useState(null)

  const hasGoogleToken = !!localStorage.getItem("google_token")

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchGmailEmails()
      setEmails(data)
      setFetched(true)
      toast.success(`Fetched ${data.length} emails from Gmail`, { icon: "📬" })
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to fetch emails. Try logging in with Google."
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (email) => {
    setSelected(email.gmail_id)
    onSelectEmail({
      subject: email.subject,
      sender: email.sender,
      body: email.body || email.snippet,
    })
    toast.success("Email loaded — switch to Analyze tab to analyze it", { icon: "✉️" })
  }

  if (!hasGoogleToken) {
    return (
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-amber-500" />
        </div>
        <p className="text-[15px] font-bold text-slate-700 dark:text-white mb-2">Google Login Required</p>
        <p className="text-[12px] text-slate-400 max-w-sm">
          To fetch your Gmail emails, you need to log out and sign in with Google. 
          This grants read-only access to your inbox.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header card */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Mail size={20} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Gmail Inbox</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {fetched ? `${emails.length} emails loaded` : "Click fetch to load your emails"}
              </p>
            </div>
          </div>
          <button
            onClick={handleFetch}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all cursor-pointer ${
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/20"
            }`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Fetching..." : fetched ? "Refresh" : "Fetch Emails"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/60 dark:border-rose-500/20 rounded-xl text-[12px] text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!fetched && !loading && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Inbox size={28} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-[13px] font-medium text-slate-400">Click "Fetch Emails" to load your Gmail inbox</p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">Your latest 10 emails will appear here</p>
        </div>
      )}

      {/* No emails */}
      {fetched && emails.length === 0 && (
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-slate-700/50 p-10 text-center">
          <p className="text-[13px] text-slate-400">No emails found in your inbox.</p>
        </div>
      )}

      {/* Email list */}
      {emails.length > 0 && (
        <div className="space-y-2">
          {emails.map((email, i) => (
            <motion.div
              key={email.gmail_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSelect(email)}
              className={`group bg-white dark:bg-[#111827] rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                selected === email.gmail_id
                  ? "border-indigo-400 dark:border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-500/5"
                  : "border-slate-200/80 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Subject */}
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">
                      {email.subject || "No subject"}
                    </p>
                    {selected === email.gmail_id && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Sender */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {email.sender}
                  </p>

                  {/* Snippet */}
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {email.snippet}
                  </p>

                  {/* Date */}
                  <div className="flex items-center gap-1 mt-2">
                    <Clock size={10} className="text-slate-300 dark:text-slate-600" />
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">{email.date}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <ArrowRight size={14} className="text-indigo-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}