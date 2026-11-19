import api from "./api";

// Admin-only calls: the backend answers 403 for anyone else
class AdminService {
  static async createUser(user) {
    return (await api.post("/admin/users", user)).data;
  }

  // Feedback reported as irrelevant, waiting for a decision
  static async getIrrelevantReports() {
    return (await api.get("/admin/irrelevant-reports")).data.data;
  }

  // decision is "remove" or "keep"
  static async resolveIrrelevantReport(feedbackId, decision) {
    return (await api.post(`/admin/irrelevant-reports/${feedbackId}`, { decision })).data;
  }

  // Feedback the LLM could not classify in time: { items, attributes }
  static async getUnclassified() {
    return (await api.get("/admin/unclassified")).data.data;
  }

  // decision is "deliver" (with tags: [{ attributeId, feedbackType }]) or "remove"
  static async resolveUnclassified(feedbackId, decision, tags) {
    return (await api.post(`/admin/unclassified/${feedbackId}`, { decision, tags })).data;
  }

  // One page of all delivered feedback, optionally for one receiver
  static async getAllFeedback(page, receiverId) {
    const params = { page, receiverId: receiverId || undefined };
    return (await api.get("/admin/feedback", { params })).data.data;
  }

  // One page of feedback blocked or removed as abusive, optionally for one receiver
  static async getAbuseLog(page, receiverId) {
    const params = { page, receiverId: receiverId || undefined };
    return (await api.get("/admin/abuse-log", { params })).data.data;
  }
}

export default AdminService;
