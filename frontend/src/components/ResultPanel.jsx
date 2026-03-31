import { useState } from "react"
import { submitFeedback } from "../api"

const CATEGORY_STYLE = {
  urgent:          "bg-red-50 text-red-800 border border-red-200",
  action_required: "bg-amber-50 text-amber-800 border border-amber-200",
  fyi:             "bg-blue-50 text-blue-800 border border-blue-200",
  spam:            "bg-slate-100 text-slate-600 border border-slate-200",
}

export default function ResultPanel({ result, isLoading }) {
  const [feedback, setFeedback] = useState({})
  const [copied, setCopied]     = useState(null)

  // Skeleton loader while AI is processing
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 bg-slate-100 rounded-md w-1/3 animate-pulse" />
        <div className="h-5 bg-slate-100 rounded-md w-2/3 animate-pulse" />
        <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
        <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
        <div className="h-24 bg-slate-100 rounded-md animate-pulse" />
      </div>
    )
  }

  // Empty state
  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-slate-400 text-sm text-center">
          Results will appear here after you analyze an email.
        </p>
      </div>
    )
  }

  const handleFeedback = async (replyId, value) => {
    if (feedback[replyId]) return
    try {
      await submitFeedback(replyId, value)
      setFeedback((prev) => ({ ...prev, [replyId]: value }))
    } catch (err) {
      console.error("Feedback failed:", err)
    }
  }

  const handleCopy = (replyId, text) => {
    navigator.clipboard.writeText(text)
    setCopied(replyId)
    setTimeout(() => setCopied(null), 2000)
  }

  const badgeClass = CATEGORY_STYLE[result.category] || CATEGORY_STYLE.fyi

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">

      {/* Category badge + confidence */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${badgeClass}`}>
          {result.category.replace("_", " ").toUpperCase()}
        </span>
        <span className="text-xs text-slate-500">
          {Math.round(result.confidence * 100)}% confidence
        </span>
      </div>

      {/* Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Summary
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
      </div>

      {/* Reply drafts */}
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Reply Drafts</h3>

      <div className="space-y-3">
        {result.replies.map((reply) => {
          const isLiked    = feedback[reply.id] === "liked"
          const isDisliked = feedback[reply.id] === "disliked"
          const isCopied   = copied === reply.id

          return (
            <div
              key={reply.id}
              className="border border-slate-200 rounded-xl p-4"
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold tracking-widest text-indigo-500 uppercase">
                  {reply.tone}
                </span>

                <div className="flex gap-2">
                  {/* Thumbs up */}
                  <button
                    onClick={() => handleFeedback(reply.id, "liked")}
                    disabled={!!feedback[reply.id]}
                    className={`px-2.5 py-1 rounded-md text-sm transition-colors ${
                      isLiked
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    } disabled:cursor-not-allowed`}
                    title="Helpful"
                  >
                    👍
                  </button>

                  {/* Thumbs down */}
                  <button
                    onClick={() => handleFeedback(reply.id, "disliked")}
                    disabled={!!feedback[reply.id]}
                    className={`px-2.5 py-1 rounded-md text-sm transition-colors ${
                      isDisliked
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    } disabled:cursor-not-allowed`}
                    title="Not helpful"
                  >
                    👎
                  </button>

                  {/* Copy */}
                  <button
                    onClick={() => handleCopy(reply.id, reply.draft_text)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      isCopied
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Draft text */}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {reply.draft_text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}