import { useEffect, useState } from "react";

import AdminService from "@/services/adminService";
import Pager from "@/components/common/Pager";
import EmployeeFilter from "@/components/common/EmployeeFilter";

// How each entry was caught
const detectedByLabels = {
  wordlist: "Caught by the word list",
  vectors: "Caught by similarity to abuse examples",
  bert: "Caught by the toxicity model",
  llm: "Caught by the language model",
  report: "Reported by the recipient and confirmed",
  admin: "Removed by an admin (not classified by the LLM)",
};

const capitalise = (word) => word.charAt(0).toUpperCase() + word.slice(1);

// Read-only list of abusive feedback that was blocked or removed
function AbuseLog() {
  const [receiverId, setReceiverId] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pageSize: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await AdminService.getAbuseLog(page, receiverId);
        if (!ignore) setResult(data);
      } catch {
        if (!ignore) setError("Unable to load the abuse log.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [page, receiverId]);

  const changeReceiver = (id) => {
    setReceiverId(id);
    setPage(1);
  };

  return (
    <div className="bg-slate-100 px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl">

        <h2 className="text-2xl font-bold text-slate-900">Abusive</h2>

        <p className="mt-1 text-sm text-slate-500">
          Feedback that was blocked or removed for abusive language. Senders are anonymous and are not recorded.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <EmployeeFilter value={receiverId} onChange={changeReceiver} />

          {!loading && !error && (
            <span className="ml-auto text-sm text-slate-400">
              {result.total} {result.total === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>

        <div className="mt-6 space-y-4">

          {loading && <div className="p-10 text-center">Loading abusive feedback...</div>}

          {!loading && error && <div className="p-10 text-center text-red-600">{error}</div>}

          {!loading && !error && result.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-card p-10 text-center text-slate-500">
              No abusive feedback recorded.
            </div>
          )}

          {!loading && !error && result.items.map((item) => (
            <article
              key={item.log_id}
              className="rounded-lg border border-slate-200 bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">{item.feedback_title}</h3>

                <span className="text-sm text-slate-400">
                  To {item.receiver_name} · {item.removed_on}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.feedback_text}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                {item.category && (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {capitalise(item.category)}
                  </span>
                )}

                <span className="text-xs text-slate-400">
                  {detectedByLabels[item.detected_by] || item.detected_by}
                </span>
              </div>
            </article>
          ))}

        </div>

        {!error && result.total > 0 && (
          <Pager page={page} total={result.total} pageSize={result.pageSize} onChange={setPage} />
        )}

      </div>
    </div>
  );
}

export default AbuseLog;
