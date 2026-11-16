import { feedbackSpectrum } from "@/constants/feedbackSpectrum";
import { getSpectrumColor } from "@/utils/dashboard/getSpectrumColor";

function SpectrumGuide({ attributes = [] }) {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-600">
        How your attributes are rated
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {feedbackSpectrum.map((item) => {
          const Icon = item.icon;
          const colors = getSpectrumColor(item.level);

          return (
            <div key={item.level} className="flex items-center gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-md ${colors.softBg} ${colors.softText}`}
              >
                <Icon size={20} />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  {item.level}
                </p>
                <p className={`text-2xl font-bold ${colors.softText}`}>
                  {attributes.filter(
                    (attribute) => attribute.spectrum === item.level
                  ).length}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SpectrumGuide;
