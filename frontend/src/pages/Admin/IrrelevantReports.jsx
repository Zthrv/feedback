import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AdminService from "@/services/adminService";
import { useCurrentUser } from "@/hooks/use-current-user";

function IrrelevantReports() {
  const user = useCurrentUser();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let ignore = false;

    AdminService.getIrrelevantReports()
      .then((data) => !ignore && setReports(data))
      .catch(() => !ignore && setError("Unable to load reports."))
      .finally(() => !ignore && setLoading(false));

    return () => {
      ignore = true;
    };
  }, []);

  const decide = async (feedbackId, decision) => {
    setBusyId(feedbackId);

    try {
      const result = await AdminService.resolveIrrelevantReport(feedbackId, decision);

      toast.success(result.message);
      setReports((current) => current.filter((item) => item.feedback_id !== feedbackId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save the decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">

        <h2 className="text-2xl font-bold text-slate-900">Irrelevant Reports</h2>

        <p className="mt-1 text-sm text-slate-500">
          Feedback that recipients reported as not about their work. Your decision is final.
        </p>

        <div className="mt-6 space-y-4">

          {loading && <div className="p-10 text-center">Loading reports...</div>}

          {!loading && error && (
            <div className="p-10 text-center text-red-600">{error}</div>
          )}

          {!loading && !error && reports.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-card p-10 text-center text-slate-500">
              No reports waiting for review.
            </div>
          )}

          {!loading && !error && reports.map((item) => {
            const ownReport = item.receiver_id === user?.user_id;

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

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  {item.attributes.map((tag) => (
                    <span key={tag.attribute_name} className="text-xs font-semibold text-slate-500">
                      {tag.attribute_name} · {tag.feedback_type}
                    </span>
                  ))}

                  <div className="ml-auto flex items-center gap-2">
                    {ownReport ? (
                      <span className="text-xs text-slate-400">
                        Your own report: another admin must review it
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busyId === item.feedback_id}
                          onClick={() => decide(item.feedback_id, "keep")}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Keep
                        </button>

                        <button
                          type="button"
                          disabled={busyId === item.feedback_id}
                          onClick={() => decide(item.feedback_id, "remove")}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

        </div>
      </div>
    </div>
  );
}

export default IrrelevantReports;
