import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AdminService from "@/services/adminService";
import { useCurrentUser } from "@/hooks/use-current-user";

const MAX_TAGS = 3;
const TYPES = ["Positive", "Negative", "Neutral"];

const typeStyles = {
  Positive: "border-emerald-600 bg-emerald-600 text-white",
  Negative: "border-red-600 bg-red-600 text-white",
  Neutral: "border-slate-600 bg-slate-600 text-white",
};

// Feedback the LLM did not classify within 30 seconds. The admin tags and delivers it, or removes it.
function Unclassified() {
  const user = useCurrentUser();

  const [items, setItems] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // feedbackId -> { attributeId: feedbackType }
  const [choices, setChoices] = useState({});

  useEffect(() => {
    let ignore = false;

    AdminService.getUnclassified()
      .then((data) => {
        if (ignore) return;
        setItems(data.items);
        setAttributes(data.attributes);
      })
      .catch(() => !ignore && setError("Unable to load feedback."))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true;
    };
  }, []);

  // Click a type to pick it, click it again to clear it. At most three attributes.
  const choose = (feedbackId, attributeId, type) => {
    setChoices((current) => {
      const picked = { ...(current[feedbackId] || {}) };

      if (picked[attributeId] === type) {
        delete picked[attributeId];
      } else if (picked[attributeId] || Object.keys(picked).length < MAX_TAGS) {
        picked[attributeId] = type;
      } else {
        toast.error(`Choose at most ${MAX_TAGS} attributes.`);
        return current;
      }

      return { ...current, [feedbackId]: picked };
    });
  };

  const decide = async (feedbackId, decision) => {
    const tags = Object.entries(choices[feedbackId] || {}).map(([attributeId, feedbackType]) => ({
      attributeId: Number(attributeId),
      feedbackType,
    }));

    setBusyId(feedbackId);

    try {
      const result = await AdminService.resolveUnclassified(
        feedbackId,
        decision,
        decision === "deliver" ? tags : undefined
      );

      toast.success(result.message);
      setItems((current) => current.filter((item) => item.feedback_id !== feedbackId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save the decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">

        <h2 className="text-2xl font-bold text-slate-900">Not Classified by LLM</h2>

        <p className="mt-1 text-sm text-slate-500">
          Feedback the language model could not check and tag within 30 seconds. It has not been
          delivered yet. Choose up to three attributes and deliver it, or remove it if it is
          inappropriate. Your decision is final.
        </p>

        <div className="mt-6 space-y-4">

          {loading && <div className="p-10 text-center">Loading feedback...</div>}

          {!loading && error && (
            <div className="p-10 text-center text-red-600">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-card p-10 text-center text-slate-500">
              No feedback waiting.
            </div>
          )}

          {!loading && !error && items.map((item) => {
            const sentToMe = item.receiver_id === user?.user_id;
            const picked = choices[item.feedback_id] || {};
            const busy = busyId === item.feedback_id;

            return (
              <article
                key={item.feedback_id}
                className="rounded-lg border border-slate-200 bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{item.feedback_title}</h3>

                  <span className="text-sm text-slate-400">
                    To {item.receiver_name} · {item.received_on}
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
                  {item.feedback_text}
                </p>

                {sentToMe ? (
                  <p className="mt-4 text-xs text-slate-400">
                    Sent to you: another admin must decide on it
                  </p>
                ) : (
                  <>
                    <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                      {attributes.map((attribute) => (
                        <div key={attribute.attribute_id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-700" title={attribute.description}>
                            {attribute.attribute_name}
                          </span>

                          <div className="flex gap-1">
                            {TYPES.map((type) => (
                              <button
                                key={type}
                                type="button"
                                disabled={busy}
                                aria-pressed={picked[attribute.attribute_id] === type}
                                onClick={() => choose(item.feedback_id, attribute.attribute_id, type)}
                                className={`rounded border px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
                                  picked[attribute.attribute_id] === type
                                    ? typeStyles[type]
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide(item.feedback_id, "remove")}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>

                      <button
                        type="button"
                        disabled={busy || Object.keys(picked).length === 0}
                        onClick={() => decide(item.feedback_id, "deliver")}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        Deliver
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}

        </div>
      </div>
    </div>
  );
}

export default Unclassified;
