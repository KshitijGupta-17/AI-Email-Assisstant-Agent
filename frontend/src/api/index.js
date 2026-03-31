import axios from "axios"

const BASE_URL = "http://localhost:8000"

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// Analyze an email — classify, summarize, generate replies
export const analyzeEmail = async (payload) => {
  const response = await api.post("/api/email/analyze", payload)
  return response.data
}

// Submit feedback (liked / disliked) on a reply draft
export const submitFeedback = async (replyId, feedback) => {
  const response = await api.post(`/api/email/${replyId}/feedback`, { feedback })
  return response.data
}

// Get last 20 analyzed emails
export const getHistory = async () => {
  const response = await api.get("/api/email/history")
  return response.data
}

// Get analytics summary
export const getAnalytics = async () => {
  const response = await api.get("/api/analytics/summary")
  return response.data
}