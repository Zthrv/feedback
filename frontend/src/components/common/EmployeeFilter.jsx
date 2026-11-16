import { useEffect, useState } from "react";

import FeedbackService from "@/services/feedbackService";

// Dropdown to show one employee's entries, or everyone's
function EmployeeFilter({ value, onChange }) {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    FeedbackService.getRecipients()
      .then(setEmployees)
      .catch((err) => console.error(err));
  }, []);

  return (
    <select
      aria-label="Employee"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-md border border-slate-200 bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <option value="">All employees</option>
      {employees.map((employee) => (
        <option key={employee.user_id} value={employee.user_id}>
          {employee.full_name}
        </option>
      ))}
    </select>
  );
}

export default EmployeeFilter;
