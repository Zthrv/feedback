import { useState } from "react";
import { useForm } from "react-hook-form";

import ProfileService from "@/services/profileService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function ChangePassword() {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm();

  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSaveError("");
    setSaved(false);
    setIsSubmitting(true);

    try {
      await ProfileService.changePassword(
        data.currentPassword,
        data.newPassword
      );

      setSaved(true);
      reset();
    } catch (error) {
      setSaveError(
        error.response?.data?.message ||
          "Unable to change your password. Please try again."
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
            Change Password
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Current Password */}
            <div className="space-y-3">
              <Label htmlFor="currentPassword">
                Current Password <span className="text-red-500">*</span>
              </Label>

              <Input
                id="currentPassword"
                type="password"
                className="h-11"
                autoComplete="current-password"
                {...register("currentPassword", {
                  required: "Current password is required",
                })}
              />

              {errors.currentPassword && (
                <p className="text-sm text-red-500">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-3">
              <Label htmlFor="newPassword">
                New Password <span className="text-red-500">*</span>
              </Label>

              <Input
                id="newPassword"
                type="password"
                className="h-11"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...register("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                  validate: (value) =>
                    value !== getValues("currentPassword") ||
                    "New password must be different from the current password",
                })}
              />

              {errors.newPassword && (
                <p className="text-sm text-red-500">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-3">
              <Label htmlFor="confirmPassword">
                Confirm New Password <span className="text-red-500">*</span>
              </Label>

              <Input
                id="confirmPassword"
                type="password"
                className="h-11"
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Please confirm the new password",
                  validate: (value) =>
                    value === getValues("newPassword") ||
                    "Passwords do not match",
                })}
              />

              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saved && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Password changed. Any other devices have been signed out.
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-lg bg-primary text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Saving..." : "Change Password"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChangePassword;
