import { Trophy, Smile, Scale, TrendingUp } from "lucide-react";

export const feedbackSpectrum = [
  {
    level: "Excellent",
    icon: Trophy,
    description: "5+ more positive",
  },
  {
    level: "Good",
    icon: Smile,
    description: "1 – 4 more positive",
  },
  {
    level: "Balanced",
    icon: Scale,
    description: "Equal positive & negative",
  },
  {
    level: "Needs Improvement",
    icon: TrendingUp,
    description: "1 or more negative than positive",
  },
];
