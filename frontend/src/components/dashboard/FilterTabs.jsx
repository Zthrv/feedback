import { LayoutGrid } from "lucide-react";

import { feedbackSpectrum } from "@/constants/feedbackSpectrum";

// Excellent is shown in the spectrum guide but has no filter tab
const hiddenTabs = ["Excellent"];

const tabs = [
  { level: "All Attributes", icon: LayoutGrid },
  ...feedbackSpectrum.filter((item) => !hiddenTabs.includes(item.level)),
];

function FilterTabs({ activeFilter, onChange }) {
  return (
    <div className="mb-8 flex flex-wrap gap-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeFilter === tab.level;

        return (
          <button
            key={tab.level}
            type="button"
            onClick={() => onChange(tab.level)}
            className={`flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-brand-300 bg-brand-50 text-brand-600"
                : "border-slate-200 bg-card text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={16} />
            {tab.level}
          </button>
        );
      })}
    </div>
  );
}

export default FilterTabs;
