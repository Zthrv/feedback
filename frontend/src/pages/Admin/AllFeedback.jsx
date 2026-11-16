import { useEffect, useState } from "react";

import AdminService from "@/services/adminService";
import EmployeeFilter from "@/components/common/EmployeeFilter";
import Pager from "@/components/common/Pager";

const tagStyles = {
  Positive: "text-green-700",
  Negative: "text-red-700",
  Neutral: "text-slate-700",
};

// Read-only list of every delivered feedback. Feedback is anonymous: there is no sender.
function AllFeedback() {
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
        const data = await AdminService.getAllFeedback(page, receiverId);
        if (!ignore) setResult(data);
      } catch {
        if (!ignore) setError("Unable to load feedback.");
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

        <h2 className="text-2xl font-bold text-slate-900">All Feedback</h2>

        <p className="mt-1 text-sm text-slate-500">
          Every feedback delivered to every employee. Senders are anonymous.
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

          {loading && <div className="p-10 text-center">Loading feedback...</div>}

          {!loading && error && <div className="p-10 text-center text-red-600">{error}</div>}

          {!loading && !error && result.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-card p-10 text-center text-slate-500">
              No feedback here yet.
            </div>
          )}

          {!loading && !error && result.items.map((item) => (
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

              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.feedback_text}</p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {item.attributes.map((tag) => (
                  <span
                    key={tag.attribute_name}
                    className={`text-xs font-semibold ${tagStyles[tag.feedback_type] || "text-slate-500"}`}
                  >
                    {tag.attribute_name} · {tag.feedback_type}
                  </span>
                ))}
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

export default AllFeedback;
