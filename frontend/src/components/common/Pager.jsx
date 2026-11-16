// Previous / Next pager with "Page x of y"
function Pager({ page, total, pageSize, onChange }) {
  const pages = Math.max(1, Math.ceil(total / (pageSize || 1)));
  const button =
    "rounded-lg border border-slate-200 bg-card px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className={button}>
        Previous
      </button>

      <span className="text-sm text-slate-500">Page {page} of {pages}</span>

      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className={button}>
        Next
      </button>
    </div>
  );
}

export default Pager;
