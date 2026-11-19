import FeedbackModel from "../models/FeedbackModel.js";
import ClassificationService from "./classificationService.js";
import BertClassifier from "./bertClassifier.js";
import ExplicitFilter from "./explicitFilter.js";
import EmbeddingService from "./embeddingService.js";

const RETRY_INTERVAL = 5 * 60 * 1000;

// Longest each LLM call on new feedback may take before the feedback goes to an admin
const LLM_TIMEOUT = 30 * 1000;

// Works through saved feedback in the background, one at a time,
// so the sender never waits for the LLM.
class ClassificationQueue {

  static waiting = [];

  static running = false;

  // kind is "classify", "review" (re-review) or "abuse" (abuse report)
  static enqueue(feedbackId, kind = "classify") {
    const job = `${kind}:${feedbackId}`;

    if (!this.waiting.includes(job)) this.waiting.push(job);

    this.run();
  }

  static async run() {
    if (this.running) return;

    this.running = true;

    const jobs = { classify: this.process, review: this.review, abuse: this.checkAbuse };

    while (this.waiting.length > 0) {
      const [kind, id] = this.waiting.shift().split(":");

      try {
        await jobs[kind].call(this, Number(id));
      } catch (error) {
        // The feedback keeps its waiting status and is picked up by the next retry
        console.error(`Job ${kind} for feedback ${id} failed: ${error.message}`);
      }
    }

    this.running = false;
  }

  // BERT tagging needs trained weights and a loaded model (CLASSIFIER=llm switches it off)
  static canUseBert() {
    return (
      (process.env.CLASSIFIER || "hybrid") !== "llm" &&
      BertClassifier.isAvailable() &&
      EmbeddingService.isReady()
    );
  }

  // Check one feedback's language, then tag and deliver it. Abusive feedback bounces.
  // If the LLM takes over 30 seconds or gives an unusable answer, an admin decides instead.
  static async process(feedbackId) {
    const feedback = await FeedbackModel.findPendingById(feedbackId);

    if (!feedback) return;

    const { feedback_title: title, feedback_text: text } = feedback;

    try {
      const language = await ExplicitFilter.check(title, text, { timeout: LLM_TIMEOUT });

      if (language.explicit) return FeedbackModel.bounce(feedbackId, language);

      const attributes = await FeedbackModel.getAttributes();

      let tags = null;

      // BERT goes first and answers only when it is sure; the LLM takes the rest
      if (this.canUseBert()) {
        try {
          const result = await BertClassifier.classify(text, attributes);
          if (result.confident) tags = result.tags;
        } catch (error) {
          console.error(`BERT classification failed, using the LLM instead: ${error.message}`);
        }
      }

      const source = tags ? "bert" : "llm";

      tags ||= await ClassificationService.classifyAttributes(title, text, attributes, { timeout: LLM_TIMEOUT });

      await FeedbackModel.saveTags(feedbackId, tags, source);
    } catch (error) {
      // An unreachable LLM is an outage: the feedback stays pending and is retried later
      if (!error.unusable) throw error;

      console.error(`Feedback ${feedbackId} sent to an admin: ${error.message}`);
      await FeedbackModel.sendToAdmin(feedbackId);
    }
  }

  // Re-review asked by the recipient. The LLM decides and its answer is final.
  static async review(feedbackId) {
    const feedback = await FeedbackModel.findReviewRequested(feedbackId);

    if (!feedback) return;

    const tags = await ClassificationService.classifyAttributes(
      feedback.feedback_title,
      feedback.feedback_text,
      await FeedbackModel.getAttributes(),
      { careful: true }
    );

    const before = new Set(feedback.tags.map((tag) => `${tag.attribute_id}:${tag.feedback_type}`));

    const unchanged =
      tags.length === before.size &&
      tags.every((tag) => before.has(`${tag.attribute.attribute_id}:${tag.feedbackType}`));

    await FeedbackModel.finishReview(feedbackId, unchanged ? null : tags);
  }

  // Abuse report by the recipient. The LLM decides and its answer is final:
  // abusive feedback is deleted and logged, anything else stays.
  static async checkAbuse(feedbackId) {
    const feedback = await FeedbackModel.findAbuseRequested(feedbackId);

    if (!feedback) return;

    const { feedback_title: title, feedback_text: text } = feedback;

    if (!(await ClassificationService.isExplicit(title, text))) {
      return FeedbackModel.finishAbuseCheck(feedbackId);
    }

    // toxic-bert names the kind of abuse for the admin's log
    const category = await ExplicitFilter.categoryOf(title, text).catch(() => null);

    await FeedbackModel.removeAsAbusive(feedbackId, category);
  }

  // Queue everything still waiting in the database (irrelevant reports go to an admin instead)
  static async enqueuePending() {
    try {
      (await FeedbackModel.getPendingIds()).forEach((id) => this.enqueue(id));
      (await FeedbackModel.getReviewRequestedIds()).forEach((id) => this.enqueue(id, "review"));
      (await FeedbackModel.getAbuseRequestedIds()).forEach((id) => this.enqueue(id, "abuse"));
    } catch (error) {
      console.error(`Could not load pending feedback: ${error.message}`);
    }
  }

  // Pick up leftovers from a restart or an LLM outage, now and every few minutes
  static start() {
    this.enqueuePending();
    setInterval(() => this.enqueuePending(), RETRY_INTERVAL).unref();
  }

}

export default ClassificationQueue;
