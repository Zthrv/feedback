import api from "./api";

class FeedbackService {
  // Employees who can receive feedback (excludes the logged-in user)
  static async getRecipients() {
    return (await api.get("/feedback/recipients")).data.data;
  }

  // Blocked-word lists used to warn while typing
  static async getBlockedWords() {
    return (await api.get("/feedback/blocked-words")).data.data;
  }

  // How many feedback the user sent, how many bounced, and how the last one went
  static async getSentSummary() {
    return (await api.get("/feedback/sent-summary")).data.data;
  }

  // Feedback received by the logged-in user
  static async getReceived(attributeId, type) {
    const params = { attributeId: attributeId || undefined, type: type || undefined };
    return (await api.get("/feedback/received", { params })).data.data;
  }

  // Ask for a re-review (once per feedback)
  static async requestReview(feedbackId) {
    return (await api.post(`/feedback/${feedbackId}/review`)).data;
  }

  // Report as abusive (once per feedback); checked in the background
  static async reportAbuse(feedbackId) {
    return (await api.post(`/feedback/${feedbackId}/abuse`)).data;
  }

  // Report as irrelevant (once per feedback); an admin decides
  static async reportIrrelevant(feedbackId) {
    return (await api.post(`/feedback/${feedbackId}/irrelevant`)).data;
  }

  // Attributes and feedback types are assigned by the backend
  static async createFeedback(receiverId, title, text) {
    return (await api.post("/feedback", { receiverId, title, text })).data;
  }
}

export default FeedbackService;
