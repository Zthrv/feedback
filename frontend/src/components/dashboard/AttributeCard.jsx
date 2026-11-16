import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { getSpectrumColor } from "@/utils/dashboard/getSpectrumColor";

const ARC = "M10 45 Q100 -10 190 45";

function AttributeCard({ attribute }) {
  const Icon = attribute.icon;

  const total = attribute.positive + attribute.negative;
  const positivePercent = total === 0 ? 50 : (attribute.positive / total) * 100;

  // The spectrum comes from the backend so cards and filter tabs always agree
  const colors = getSpectrumColor(attribute.spectrum);

  const counts = [
    { label: "Positive", value: attribute.positive, color: "text-green-600 dark:text-green-400" },
    { label: "Negative", value: attribute.negative, color: "text-red-600" },
    { label: "Neutral", value: attribute.neutral, color: "text-slate-500" },
  ];

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${colors.softBg} ${colors.softText}`}>
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{attribute.name}</h3>
          <p className={`text-xs font-medium ${colors.softText}`}>{attribute.spectrum}</p>
        </div>
      </div>

      {/* Share of positive feedback */}
      <svg viewBox="0 0 200 50" preserveAspectRatio="none" className="mt-4 h-8 w-full">
        <path d={ARC} fill="none" className="stroke-slate-200" strokeWidth="4" strokeLinecap="round" pathLength="100" />
        <path
          d={ARC}
          fill="none"
          stroke={colors.arcColor}
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${positivePercent} 100`}
        />
      </svg>

      <dl className="mt-3 grid grid-cols-3 text-center">
        {counts.map((count) => (
          <div key={count.label}>
            <dd className={`text-xl font-semibold tabular-nums ${count.color}`}>{count.value}</dd>
            <dt className="text-xs text-slate-500">{count.label}</dt>
          </div>
        ))}
      </dl>

      <Link
        to={`/feedback/${attribute.id}`}
        className="mt-4 flex items-center gap-1 border-t border-slate-200 pt-3 text-sm font-medium text-brand-600 hover:underline"
      >
        View feedback
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

export default AttributeCard;
