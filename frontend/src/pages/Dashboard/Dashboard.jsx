import { useEffect, useState } from "react";

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import FilterTabs from "@/components/dashboard/FilterTabs";
import SpectrumGuide from "@/components/dashboard/SpectrumGuide";

import DashboardService from "@/services/dashboardService";

function Dashboard() {

  const [activeFilter, setActiveFilter] = useState("All Attributes");

  const [attributes, setAttributes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {

    const fetchDashboard = async () => {

      try {

        const response = await DashboardService.getDashboardData();
        if (response.success) {

          setAttributes(response.data);

        }

      } catch (err) {

        setError("Unable to load dashboard data.");

        console.error(err);

      } finally {

        setLoading(false);

      }

    };

    fetchDashboard();

  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-100 px-10 py-8">

      <SpectrumGuide attributes={attributes} />

      <FilterTabs
        activeFilter={activeFilter}
        onChange={setActiveFilter}
      />

      <DashboardGrid
        attributes={attributes}
        activeFilter={activeFilter}
      />

    </div>
  );

}

export default Dashboard;