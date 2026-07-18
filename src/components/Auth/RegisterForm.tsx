"use client";

import MotionFadeIn from "./MotionFadeIn";
import AuthButton from "./AuthButton";
import AuthInput from "./AuthInput";
import { useRegisterForm } from "./Hooks/useRegisterForm";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/Wordmark";

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    isSubmitting,
    error,
    isSuccess,
  } = useRegisterForm();

  return (
    <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
      <MotionFadeIn delay={0.3} className="max-w-md mx-auto w-full">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Create your <Wordmark /> account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Show API error if exists */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error.message || "Registration failed. Please try again."}
            </div>
          )}

          {/* Show success message */}
          {isSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              Account created successfully! Redirecting to dashboard...
            </div>
          )}

          <AuthInput label="Full Name" placeholder="John Smith" error={errors.name} register={register("name")} />
          <AuthInput label="Email" placeholder="john@example.com" error={errors.email} register={register("email")} />
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-5 sm:space-y-0">
            <div className="flex-1">
              <AuthInput
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password}
                register={register("password")}
              />
            </div>
            <div className="flex-1">
              <AuthInput
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                error={errors.confirmPassword}
                register={register("confirmPassword")}
              />
            </div>
          </div>
          <AuthInput
            label="Company - To add team members"
            placeholder="Your Company Name (Optional)"
            error={errors.companyName}
            register={register("companyName")}
          />

          <AuthButton type="submit" isLoading={isSubmitting} delay={0.5}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </AuthButton>

          <MotionFadeIn delay={0.6} className="text-center">
            <span className="text-gray-600">Already have an account? </span>
            <Link href={"/auth/login"} type="button" className="text-indigo-500 hover:underline">
              Sign in
            </Link>
          </MotionFadeIn>
        </form>
      </MotionFadeIn>
    </div>
  );
}
