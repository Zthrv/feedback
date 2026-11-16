export function getSpectrumColor(status) {
  switch (status) {
    case "Excellent":
      return {
        softBg: "bg-green-100",
        softText: "text-green-600 dark:text-green-400",
        arcColor: "#16a34a",
      };

    case "Good":
      return {
        softBg: "bg-emerald-100",
        softText: "text-emerald-600",
        arcColor: "#10b981",
      };

    case "Balanced":
      return {
        softBg: "bg-yellow-100",
        softText: "text-yellow-600",
        arcColor: "#eab308",
      };

    case "Needs Improvement":
      return {
        softBg: "bg-[#ffe0d6] dark:bg-[#4c2a22]",
        softText: "text-[#e5431f] dark:text-[#ff8a6b]",
        arcColor: "#f4512c",
      };

    default:
      return {
        softBg: "bg-red-100",
        softText: "text-red-600",
        arcColor: "#ef4444",
      };
  }
}
