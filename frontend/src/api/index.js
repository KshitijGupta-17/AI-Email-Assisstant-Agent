import axios from "axios"

const BASE_URL = "http://localhost:8000"

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// Add token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const analyzeEmail = async (data) => {
  const response = await api.post("/api/email/analyze", {
    subject: data.subject,
    sender: data.sender,
    body: data.body,
    preferred_tone: data.preferred_tone || null,
  })
  return response.data
}

export const submitFeedback = async (replyId, feedback) => {
  const response = await api.post(`/api/email/${replyId}/feedback`, { feedback })
  return response.data
}

export const getHistory = async () => {
  const response = await api.get("/api/email/history")
  return response.data
}

// Regenerate all replies for an email (by email_id + optional tone)
export const regenerateReplies = async (emailId, tone) => {
  const params = tone ? `?tone=${tone}` : ""
  const response = await api.post(`/api/email/${emailId}/regenerate${params}`)
  return response.data
}

// Regenerate a single reply with a custom user instruction
export const regenerateWithInstruction = async (emailId, tone, instruction) => {
  const params = new URLSearchParams()
  if (tone)        params.append("tone",        tone)
  if (instruction) params.append("instruction", instruction)
  const response = await api.post(`/api/email/${emailId}/regenerate?${params.toString()}`)
  return response.data
}

export const getAnalytics = async () => {
  const response = await api.get("/api/analytics/summary")
  return response.data
}

export const signup = async (name, email, password) => {
  const response = await api.post("/api/auth/signup", { name, email, password })
  return response.data
}

export const login = async (email, password) => {
  const response = await api.post("/api/auth/login", { email, password })
  return response.data
}

export const googleLogin = async (credential) => {
  const response = await api.post("/api/auth/google-login", { credential })
  return response.data
}
export const analyzeEmailWithAttachment = async (data, file) => {
  const formData = new FormData()
  formData.append("body", data.body)
  if (data.subject) formData.append("subject", data.subject)
  if (data.sender) formData.append("sender", data.sender)
  if (data.preferred_tone) formData.append("preferred_tone", data.preferred_tone)
  if (file) formData.append("attachment", file)

  const token = localStorage.getItem("token")
  const response = await axios.post("http://localhost:8000/api/email/analyze-with-attachment", formData, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  })
  return response.data
}
export const fetchGmailEmails = async () => {
  const googleToken = localStorage.getItem("google_token")
  if (!googleToken) {
    throw new Error("No Google token. Please login with Google.")
  }
  const response = await api.get("/api/auth/gmail/messages", {
    params: { google_token: googleToken },
  })
  return response.data.emails
}
export const getEmailDetail = async (emailId) => {
  const response = await api.get(`/api/email/${emailId}`)
  return response.data
}
// Get cached emails grouped by day — no Gmail API call
export const fetchAndCacheInbox = async (googleToken, force = false) => {
  const response = await api.post(`/api/inbox/fetch?force=${force}`, {}, {
    headers: {
      "X-Google-Token": googleToken,
    },
  })
  return response.data
}

// Get cached emails grouped by day — no Gmail API call
export const getGroupedInbox = async () => {
  const response = await api.get("/api/inbox/grouped")
  return response.data
}

// Generate AI reply for an email
export const generateReply = async (emailId, userId) => {
  const response = await api.post(`/api/inbox/${emailId}/reply/generate`, {}, {
    headers: { "X-User-Id": userId },
  })
  return response.data
}

// Submit feedback + optionally regenerate
export const submitReplyFeedback = async (replyId, feedback, instruction = "", userId) => {
  const response = await api.post(`/api/inbox/reply/${replyId}/feedback`,
    { feedback, instruction },
    { headers: { "X-User-Id": userId } }
  )
  return response.data
}

// Send email via Gmail API
export const sendEmail = async (to, subject, body, googleToken) => {
  const response = await api.post("/api/inbox/send",
    { to, subject, body },
    { headers: { "X-Google-Token": googleToken } }
  )
  return response.data
}