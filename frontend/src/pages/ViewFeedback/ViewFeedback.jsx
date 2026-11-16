import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCheck, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import DashboardService from "@/services/dashboardService";
import FeedbackService from "@/services/feedbackService";

const typeFilters = ["All", "Positive", "Negative", "Neutral"];

const tagStyles = {
  Positive: "text-green-700",
  Negative: "text-red-700",
  Neutral: "text-slate-700",
};

const removedToast = {
  duration: 5000,
  style: { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" },
};

function formatDate(day) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ViewFeedback() {
  const { attributeId } = useParams();
  const navigate = useNavigate();

  const [attributes, setAttributes] = useState([]);
  const [activeType, setActiveType] = useState("All");
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    DashboardService.getDashboardData()
      .then((response) => setAttributes(response.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchFeedback = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await FeedbackService.getReceived(
          attributeId,
          activeType === "All" ? null : activeType
        );
        if (!ignore) setFeedback(data);
      } catch (err) {
        if (!ignore) setError("Unable to load feedback.");
        console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchFeedback();

    return () => {
      ignore = true;
    };
  }, [attributeId, activeType]);

  // While a re-review or abuse check is running, look again every few seconds and
  // tell the user how an abuse or relevance check turned out
  useEffect(() => {
    // Irrelevant reports wait for an admin, so they are not polled: their result shows on reload
    const inProgress = feedback.some(
      (item) => item.review_status === "requested" || item.abuse_status === "requested"
    );

    if (!inProgress) return undefined;

    let ignore = false;

    const timer = setTimeout(async () => {
      try {
        const data = await FeedbackService.getReceived(
          attributeId,
          activeType === "All" ? null : activeType
        );

        if (ignore) return;

        for (const item of feedback) {
          const abuseAsked = item.abuse_status === "requested";
          const irrelevantAsked = item.irrelevant_status === "requested";

          if (!abuseAsked && !irrelevantAsked) continue;

          const latest = data.find((row) => row.feedback_id === item.feedback_id);

          // A feedback that is also being re-reviewed may leave a filtered list for another reason
          if (!latest && item.review_status !== "requested") {
            // With both checks running, the list cannot tell which one removed it
            const reason = abuseAsked && irrelevantAsked
              ? "Feedback was removed"
              : abuseAsked
                ? "Feedback was found abusive"
                : "Feedback was found irrelevant and removed";

            toast.error(reason, removedToast);
            continue;
          }

          if (abuseAsked && latest?.abuse_status === "done") {
            toast("Feedback was not found abusive", { duration: 4000 });
          }

          if (irrelevantAsked && latest?.irrelevant_status === "done") {
            toast("Feedback was found relevant", { duration: 4000 });
          }
        }

        setFeedback(data);
      } catch (err) {
        console.error(err);
      }
    }, 4000); // stays under the server's limit of 20 requests per endpoint per minute

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [feedback, attributeId, activeType]);

  // Runs a request for one feedback, then applies `changes` to it in the list
  const act = async (feedbackId, request, changes, failMessage) => {
    setReviewError("");

    try {
      const result = await request(feedbackId);

      setFeedback((current) =>
        current.map((item) => (item.feedback_id === feedbackId ? { ...item, ...changes } : item))
      );

      return result;
    } catch (err) {
      setReviewError(err.response?.data?.message || failMessage);
      return null;
    }
  };

  const requestReview = (feedbackId) =>
    act(feedbackId, FeedbackService.requestReview, { review_status: "requested" },
      "Unable to request a re-review.");

  // Queues the feedback for the LLM. If it agrees, the feedback is gone for good.
  const reportAbuse = (feedbackId) =>
    act(feedbackId, FeedbackService.reportAbuse, { abuse_checked: true, abuse_status: "requested" },
      "Unable to check this feedback.");

  // Sends the feedback to an admin. If the admin agrees it is not about work, it is gone for good.
  const reportIrrelevant = async (feedbackId) => {
    const result = await act(feedbackId, FeedbackService.reportIrrelevant,
      { irrelevant_status: "requested" }, "Unable to check this feedback.");

    if (result) toast.success(result.message, { duration: 4000 });
  };

  const term = search.trim().toLowerCase();

  const visibleFeedback = term
    ? feedback.filter((item) =>
        `${item.feedback_title} ${item.feedback_text}`.toLowerCase().includes(term)
      )
    : feedback;

  const activeAttribute = attributes.find((attribute) => String(attribute.id) === attributeId);

  return (
    <div className="bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">

        <h2 className="text-2xl font-bold text-slate-900">
          {activeAttribute ? `${activeAttribute.name} Feedback` : "All Feedback"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {activeAttribute
            ? activeAttribute.description
            : "Everything your colleagues have shared with you."}
        </p>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select
            aria-label="Attribute"
            value={attributeId || ""}
            onChange={(event) =>
              navigate(event.target.value ? `/feedback/${event.target.value}` : "/feedback")
            }
            className="h-10 rounded-md border border-slate-200 bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Attributes</option>
            {attributes.map((attribute) => (
              <option key={attribute.id} value={attribute.id}>
                {attribute.name}
              </option>
            ))}
          </select>

          <div className="inline-flex gap-1 rounded-md border border-slate-200 bg-card p-1">
            {typeFilters.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                className={`rounded px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activeType === type
                    ? "bg-brand-50 text-brand-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <input
            type="search"
            aria-label="Search feedback"
            placeholder="Search…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-48 rounded-md border border-slate-200 bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {!loading && !error && (
            <span className="ml-auto text-sm text-slate-400">
              {visibleFeedback.length} {visibleFeedback.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        {reviewError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {reviewError}
          </div>
        )}

        {/* List */}
        <div className="mt-6 space-y-4">

          {loading && <div className="p-10 text-center">Loading feedback...</div>}

          {!loading && error && <div className="p-10 text-center text-red-600">{error}</div>}

          {!loading && !error && visibleFeedback.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-card p-10 text-center text-slate-500">
              No feedback here yet.
            </div>
          )}

          {!loading && !error && visibleFeedback.map((item) => (
            <article
              key={item.feedback_id}
              className="rounded-lg border border-slate-200 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">{item.feedback_title}</h3>

                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  {item.review_status === "done" && (
                    <span title="Re-reviewed" aria-label="Re-reviewed">
                      <CheckCheck size={14} className="text-slate-300" />
                    </span>
                  )}

                  {formatDate(item.received_on)}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.feedback_text}</p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {item.attributes.map((tag) => (
                  <span
                    key={tag.attribute_id}
                    className={`py-1 text-xs font-semibold ${tagStyles[tag.feedback_type]}`}
                  >
                    {tag.attribute_name} · {tag.feedback_type}
                  </span>
                ))}

                <div className="ml-auto flex items-center gap-4 text-xs text-slate-400">
                  {!item.review_status && (
                    <button
                      type="button"
                      onClick={() => requestReview(item.feedback_id)}
                      className="underline-offset-2 hover:text-brand-600 hover:underline"
                    >
                      Request re-review
                    </button>
                  )}

                  {item.review_status === "requested" && <span>Re-reviewing…</span>}

                  {item.irrelevant_status === "requested" && <span>Sent to admin for review</span>}

                  {!item.irrelevant_status && (
                    <button
                      type="button"
                      onClick={() => reportIrrelevant(item.feedback_id)}
                      className="underline-offset-2 hover:text-amber-600 hover:underline"
                    >
                      Irrelevant
                    </button>
                  )}

                  {item.abuse_status === "requested" ? (
                    <span>Checking…</span>
                  ) : (
                    !item.abuse_checked && (
                      <button
                        type="button"
                        onClick={() => reportAbuse(item.feedback_id)}
                        className="underline-offset-2 hover:text-red-600 hover:underline"
                      >
                        Abusive
                      </button>
                    )
                  )}
                </div>
              </div>
            </article>
          ))}

        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} />
          All feedback is anonymous. The sender is erased once it is delivered.
        </div>

      </div>
    </div>
  );
}

export default ViewFeedback;
