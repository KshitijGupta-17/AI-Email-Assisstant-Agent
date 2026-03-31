import { useState, useEffect } from "react"
import { getAnalytics, getHistory } from "../api"

const CATEGORY_COLORS = {
  urgent:          "bg-red-500",
  action_required: "bg-amber-400",
  fyi:             "bg-blue-500",
  spam:            "bg-slate-400",
}

const CATEGORY_TEXT = {
  urgent:          "text-red-600 bg-red-50",
  action_required: "text-amber-700 bg-amber-50",
  fyi:             "text-blue-700 bg-blue-50",
  spam:            "text-slate-600 bg-slate-100",
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null)
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsData, historyData] = await Promise.all([
          getAnalytics(),
          getHistory(),
        ])
        setAnalytics(analyticsData)
        setHistory(historyData)
      } catch (err) {
        setError("Could not load analytics. Is the backend running?")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <p className="text-slate-400 text-sm">Loading analytics...</p>
  if (error)   return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-6">
        Analytics Dashboard
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Emails"    value={analytics.total_emails} />
        <StatCard label="Preferred Tone"  value={analytics.preferred_tone || "None yet"} />
        <StatCard label="Categories Seen" value={Object.keys(analytics.categories).length} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5 mb-5">

        {/* Emails by category */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Emails by Category
          </h3>
          {Object.keys(analytics.categories).length === 0 ? (
            <p className="text-slate-400 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(analytics.categories).map(([cat, count]) => {
                const pct = analytics.total_emails > 0
                  ? Math.round((count / analytics.total_emails) * 100)
                  : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 capitalize">
                        {cat.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-slate-800">{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${CATEGORY_COLORS[cat] || "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Liked tones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Liked Tones
          </h3>
          {Object.keys(analytics.tone_likes).length === 0 ? (
            <p className="text-slate-400 text-sm">No feedback yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {Object.entries(analytics.tone_likes).map(([tone, count]) => (
                <div key={tone} className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate-700 capitalize">{tone}</span>
                  <span className="text-sm font-semibold text-green-600">
                    {count} liked
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* History table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">
          Recent Emails
        </h3>
        {history.length === 0 ? (
          <p className="text-slate-400 text-sm">No emails analyzed yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Subject
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Category
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Confidence
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {history.map((email) => (
                <tr key={email.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-slate-700">
                    {email.subject || (
                      <span className="text-slate-400">No subject</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${CATEGORY_TEXT[email.category] || "bg-slate-100 text-slate-600"}`}>
                      {email.category?.replace("_", " ") || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {email.confidence
                      ? `${Math.round(email.confidence * 100)}%`
                      : "—"}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {new Date(email.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-800 capitalize">{value}</p>
    </div>
  )
}