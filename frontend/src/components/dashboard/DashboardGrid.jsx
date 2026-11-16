import AttributeCard from "./AttributeCard";

const tabForSpectrum = {
  Excellent: "Good",
};

function DashboardGrid({
  attributes = [],
  activeFilter = "All Attributes",
}) {

  // Attributes with no feedback at all only appear under the Balanced tab
  const filteredAttributes = attributes.filter((attribute) => {

    const hasFeedback = attribute.total > 0;

    if (activeFilter === "All Attributes") {
      return hasFeedback;
    }

    if (activeFilter === "Balanced") {
      return attribute.spectrum === "Balanced" || !hasFeedback;
    }

    // Excellent has no tab of its own, so it sits with Good
    const tab = tabForSpectrum[attribute.spectrum] ?? attribute.spectrum;

    return hasFeedback && tab === activeFilter;

  });

  if (filteredAttributes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-card p-10 text-center text-sm text-slate-500">
        {attributes.some((attribute) => attribute.total > 0)
          ? "No attributes here."
          : "No feedback yet."}
      </div>
    );
  }

  return (
    <div
      className="
        grid
        gap-5
        grid-cols-1
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-5
      "
    >
      {filteredAttributes.map((attribute) => (
        <AttributeCard
          key={attribute.id}
          attribute={attribute}
        />
      ))}
    </div>
  );

}

export default DashboardGrid;