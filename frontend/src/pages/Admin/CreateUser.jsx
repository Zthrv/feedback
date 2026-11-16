import { useState } from "react";
import { useForm } from "react-hook-form";

import AdminService from "@/services/adminService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fields = [
  { name: "fullName", label: "Full Name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "department", label: "Department" },
  { name: "designation", label: "Designation" },
];

function CreateUser() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: { role: "Employee" } });

  const [saveError, setSaveError] = useState("");
  const [created, setCreated] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSaveError("");
    setCreated("");
    setIsSubmitting(true);

    try {
      const result = await AdminService.createUser(data);

      setCreated(`Account created for ${result.data.full_name}. Employee ID: ${result.data.employee_id}`);
      reset();
    } catch (error) {
      setSaveError(
        error.response?.data?.message ||
          "Unable to create the account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-8">
      <Card className="max-w-xl mx-auto rounded-xl shadow-sm border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold text-slate-900">
            Add Account
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="mb-6 text-sm text-slate-500">The Employee ID is assigned automatically.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {fields.map((field) => (
              <div key={field.name} className="space-y-3">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                </Label>

                <Input
                  id={field.name}
                  type={field.type || "text"}
                  className="h-11"
                  {...register(field.name, {
                    required: field.required && `${field.label} is required`,
                  })}
                />

                {errors[field.name] && (
                  <p className="text-sm text-red-500">
                    {errors[field.name].message}
                  </p>
                )}
              </div>
            ))}

            {/* Role */}
            <div className="space-y-3">
              <Label htmlFor="role">Role</Label>

              <select
                id="role"
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                {...register("role")}
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Starting password */}
            <div className="space-y-3">
              <Label htmlFor="password">
                Starting Password <span className="text-red-500">*</span>
              </Label>

              <Input
                id="password"
                type="password"
                className="h-11"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...register("password", {
                  required: "Starting password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />

              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {created && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {created}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Creating..." : "Create Account"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateUser;
