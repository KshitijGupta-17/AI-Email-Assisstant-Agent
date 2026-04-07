import { useState, useEffect, useCallback } from "react"
import { fetchAndCacheInbox, getGroupedInbox } from "../api"

export function useInbox(user) {
  const [emails, setEmails] = useState({
    today: [],
    yesterday: [],
    last_7_days: [],
    older: [],
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const googleToken = localStorage.getItem("google_token")

  const loadInbox = useCallback(async () => {
    if (!user) return   // must be authenticated
    setLoading(true)
    setError(null)

    try {
      if (googleToken && googleToken !== "null" && googleToken !== "undefined") {
        try {
          await fetchAndCacheInbox(googleToken, true) // force refresh
        } catch (fetchErr) {
          console.warn("Could not sync fresh Gmail mail (token may be expired):", fetchErr)
          if (fetchErr?.response?.status === 401 || fetchErr?.message?.includes("401")) {
             localStorage.removeItem("google_token")
             window.dispatchEvent(new Event("storage"))
          }
        }
      }

      const grouped = await getGroupedInbox()   // JWT identifies user on backend
      setEmails(grouped)
    } catch (err) {
      setError("Failed to load inbox")
    } finally {
      setLoading(false)
    }
  }, [user, googleToken])

  useEffect(() => {
    if (user) loadInbox()
  }, [user])

  return {
    emails,
    loading,
    error,
    refresh: loadInbox,
  }
}