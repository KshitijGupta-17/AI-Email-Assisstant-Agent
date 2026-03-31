import { useState } from "react"
import EmailForm from "./components/EmailForm"
import ResultPanel from "./components/ResultPanel"
import Analytics from "./components/Analytics"

export default function App() {
  const [result, setResult]       = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView]           = useState("home")

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* Navbar */}
      <nav className="bg-[#1e3a5f] px-8 h-14 flex items-center justify-between">
        <span className="text-white font-bold text-lg tracking-tight">
          AI Email Assistant
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setView("home")}
            className={`px-4 py-1 text-sm font-medium border-b-2 transition-colors ${
              view === "home"
                ? "text-blue-400 border-blue-400"
                : "text-slate-300 border-transparent hover:text-white"
            }`}
          >
            Analyze
          </button>
          <button
            onClick={() => setView("analytics")}
            className={`px-4 py-1 text-sm font-medium border-b-2 transition-colors ${
              view === "analytics"
                ? "text-blue-400 border-blue-400"
                : "text-slate-300 border-transparent hover:text-white"
            }`}
          >
            Analytics
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {view === "home" && (
          <div className="grid grid-cols-2 gap-6 items-start">
            <EmailForm onResult={setResult} onLoading={setIsLoading} />
            <ResultPanel result={result} isLoading={isLoading} />
          </div>
        )}
        {view === "analytics" && <Analytics />}
      </main>

    </div>
  )
}