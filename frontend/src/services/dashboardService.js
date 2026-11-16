import {
  Trophy,
  TrendingUp,
  Scale,
  Handshake,
  Flag,
  Sprout,
  MessageCircle,
  Lightbulb,
  ClipboardCheck,
  Clock3,
} from "lucide-react";

import api from "./api";

const iconMap = {
  Leadership: Trophy,
  Productivity: TrendingUp,
  "Work Quality": Scale,
  Teamwork: Handshake,
  Reliability: Flag,
  Adaptability: Sprout,
  Communication: MessageCircle,
  Innovation: Lightbulb,
  Accountability: ClipboardCheck,
  "Time Management": Clock3,
};

class DashboardService {
  static async getDashboardData() {
    const { success, message, data } = (await api.get("/dashboard")).data;

    return {
      success,
      message,
      data: data.map((attribute) => ({
        id: attribute.attribute_id,
        name: attribute.attribute_name,
        icon: iconMap[attribute.attribute_name],
        positive: attribute.positive,
        negative: attribute.negative,
        neutral: attribute.neutral,
        total: attribute.total,
        description: attribute.description,
        spectrum: attribute.spectrum,
      })),
    };
  }
}

export default DashboardService;
