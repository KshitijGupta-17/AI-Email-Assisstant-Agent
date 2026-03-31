import { useState } from "react"
import { analyzeEmail } from "../api"

export default function EmailForm({ onResult, onLoading }) {
  const [form, setForm]       = useState({ subject: "", sender: "", body: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.body.trim()) {
      setError("Email body is required.")
      return
    }
    setLoading(true)
    setError(null)
    onLoading(true)
    try {
      const result = await analyzeEmail(form)
      onResult(result)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Something went wrong. Make sure the backend is running."
      )
    } finally {
      setLoading(false)
      onLoading(false)
    }
  }

  const handleClear = () => {
    setForm({ subject: "", sender: "", body: "" })
    setError(null)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-5">Paste Email</h2>

      {/* Subject */}
      <label className="block text-sm font-medium text-slate-600 mb-1">
        Subject
      </label>
      <input
        name="subject"
        placeholder="e.g. Invoice #4821 - Payment Due"
        value={form.subject}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 mb-4"
      />

      {/* Sender */}
      <label className="block text-sm font-medium text-slate-600 mb-1">
        Sender
      </label>
      <input
        name="sender"
        placeholder="e.g. billing@client.com"
        value={form.sender}
        onChange={handleChange}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 mb-4"
      />

      {/* Body */}
      <label className="block text-sm font-medium text-slate-600 mb-1">
        Email Body <span className="text-red-500">*</span>
      </label>
      <textarea
        name="body"
        placeholder="Paste the full email content here..."
        value={form.body}
        onChange={handleChange}
        rows={14}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 mb-4 resize-y font-sans"
      />

      {/* Error */}
      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleClear}
          className="px-5 py-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-[#1e3a5f] hover:bg-[#162d4a] cursor-pointer"
          }`}
        >
          {loading ? "Analyzing..." : "Analyze Email"}
        </button>
      </div>
    </div>
  )
}