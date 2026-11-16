import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import AuthService from "@/services/authService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/layout/ThemeToggle";

function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [message, setMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setMessage("");
    setRequestError("");
    setIsSubmitting(true);

    try {
      const response = await AuthService.forgotPassword(data.email);
      setMessage(response.message);
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
          "Unable to reach the server. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <ThemeToggle className="fixed top-4 right-4" />

      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">
            Forgot Password
          </CardTitle>

          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we will issue a link to reset your password.
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>

              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                {...register("email", {
                  required: "Email is required",
                })}
              />

              {errors.email && (
                <p className="text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {message && (
              <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </p>
            )}

            {requestError && (
              <p className="text-center text-sm text-red-500">
                {requestError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>

            <p className="text-center text-sm">
              <Link to="/" className="text-brand-600 hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPassword;
