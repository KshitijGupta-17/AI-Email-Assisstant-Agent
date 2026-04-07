import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Mail, Clock, ArrowRight } from "lucide-react"
import { useInbox } from "../hooks/useInbox"
import { useGoogleLogin } from "@react-oauth/google"
import { tk } from "../theme"
import { googleLogin } from "../api"

const BUCKET_LABELS = {
  today:      "Today",
  yesterday:  "Yesterday",
  last_7_days:"Last 7 Days",
  older:      "Older",
}

export default function DayGroupedInbox({ user, dark = true, onSelectEmail }) {
  const t = tk(dark)
  const { emails, loading, error, refresh } = useInbox(user)
  const [filter, setFilter] = useState("all")

  const googleTokenVal = localStorage.getItem("google_token")
  const needsAuth =
    !googleTokenVal ||
    googleTokenVal === "null" ||
    googleTokenVal === "undefined"

  const connectGmail = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await googleLogin(tokenResponse.access_token)
        localStorage.setItem("google_token", tokenResponse.access_token)
        window.location.reload()
      } catch (err) {
        console.error("Failed to link Gmail", err)
      }
    },
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    flow: "implicit",
  })

  if (loading)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
            style={{
              height: 64, borderRadius: 12,
              background: t.cardBg, border: `1px solid ${t.cardBorder}`,
            }}
          />
        ))}
      </div>
    )

  if (error)
    return (
      <div style={{
        padding: 16, borderRadius: 12, background: "#2d0f0f",
        border: "1px solid #7f1d1d", color: "#f87171", fontSize: 13,
      }}>
        {error}
      </div>
    )

  return (
    <div
      className="main-scroll"
      style={{ height: "calc(100vh - 120px)", overflowY: "auto", paddingRight: 12 }}
    >
      {/* STICKY HEADER */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: t.bg || (dark ? "#0b1120" : "#eef2fc"),
        paddingBottom: 12, marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{
            fontFamily: "'Syne',sans-serif", fontWeight: 700,
            fontSize: 18, color: t.textPrimary, margin: 0,
          }}>
            Inbox
          </h2>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Time filter dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                color: t.textPrimary, padding: "6px 12px",
                borderRadius: 8, fontSize: 13, cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="older">Older</option>
            </select>

            <button
              onClick={needsAuth ? () => connectGmail() : refresh}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 10,
                background: needsAuth ? t.navActiveBg : t.accentDim,
                border: `1px solid ${t.accentBorder}`,
                color: t.accentIndigo, fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              <RefreshCw size={13} />
              {needsAuth ? "Connect Gmail" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* EMAIL GROUPS */}
      {(filter === "all"
        ? ["today", "yesterday", "last_7_days", "older"]
        : [filter]
      ).map((bucket) => {
        const list = emails[bucket] || []
        if (list.length === 0) return null

        return (
          <div key={bucket} style={{ marginBottom: 28 }}>
            {/* Bucket header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.12em",
                color: t.textFaint, textTransform: "uppercase",
              }}>
                {BUCKET_LABELS[bucket]}
              </span>

              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                background: t.accentDim, color: t.accentIndigo,
                border: `1px solid ${t.accentBorder}`,
              }}>
                {list.length}
              </span>

              <div style={{ flex: 1, height: 1, background: t.cardBorder }} />
            </div>

            {/* Email list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <AnimatePresence>
                {list.map((email, idx) => (
                  <motion.div
                    key={email.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => onSelectEmail && onSelectEmail(email)}
                    style={{
                      padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                      background: t.cardBg, border: `1px solid ${t.cardBorder}`,
                      transition: "border-color 0.18s",
                    }}
                    whileHover={{ x: 3 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>
                            {email.sender?.split("<")[0].trim() || "Unknown"}
                          </span>
                          <span style={{
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: 11, color: t.textFaint, flexShrink: 0,
                          }}>
                            <Clock size={10} />
                            {new Date(email.received_at).toLocaleTimeString([], {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 500, color: t.textSecondary }}>
                          {email.subject || "(No subject)"}
                        </p>

                        <p style={{
                          margin: "3px 0 0", fontSize: 11, color: t.textFaint,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {email.snippet}
                        </p>
                      </div>

                      {/* Arrow hint */}
                      <div style={{
                        marginLeft: 12, flexShrink: 0,
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 10px", borderRadius: 8,
                        background: t.accentDim, border: `1px solid ${t.accentBorder}`,
                        color: t.accentIndigo, fontSize: 11, fontWeight: 500,
                      }}>
                        <ArrowRight size={12} />
                        Reply
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      {/* EMPTY STATE */}
      {Object.values(emails).every((arr) => arr.length === 0) && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Mail size={32} color={t.textFaint} />
          <p style={{ color: t.textMuted, fontSize: 14, marginTop: 12 }}>
            No emails found.
          </p>
        </div>
      )}
    </div>
  )
}