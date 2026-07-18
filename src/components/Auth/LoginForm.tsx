"use client";

import MotionFadeIn from "./MotionFadeIn";
import AuthButton from "./AuthButton";
import AuthInput from "./AuthInput";
import { useLoginForm } from "./Hooks/useLoginForm";
import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/Wordmark";
import GoogleAuthButton from "./GoogleAuthButton";
import AuthDivider from "./AuthDivider";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    isSubmitting,
    error,
    isSuccess,
  } = useLoginForm();

  return (
    <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
      <MotionFadeIn delay={0.3} className="max-w-md mx-auto w-full">
        <h2 className="text-2xl font-bold text-center mb-10 text-gray-800">
          Welcome back to <Wordmark />
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Show API error if exists */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error.message || "Login failed. Please try again."}
            </div>
          )}

          {/* Show success message */}
          {isSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              Login successful! Redirecting to dashboard...
            </div>
          )}

          <MotionFadeIn delay={0.4}>
            <AuthInput
              label="Your Email"
              type="email"
              placeholder="john@example.com"
              error={errors.email}
              register={register("email")}
            />
          </MotionFadeIn>

          <MotionFadeIn delay={0.5}>
            <AuthInput
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password}
              register={register("password")}
            />
            <div className="text-right mt-1">
              <button type="button" className="text-sm text-indigo-500 hover:underline">
                Forgot password?
              </button>
            </div>
          </MotionFadeIn>

          <AuthButton type="submit" isLoading={isSubmitting} delay={0.6}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </AuthButton>

          <MotionFadeIn delay={0.65}>
            <AuthDivider />
            <GoogleAuthButton text="continue_with" />
          </MotionFadeIn>

          <MotionFadeIn delay={0.7} className="text-center">
            <span className="text-gray-600">New here? </span>
            <Link href={"/auth/register"} type="button" className="text-indigo-500 hover:underline">
              Create an Account
            </Link>
          </MotionFadeIn>
        </form>
      </MotionFadeIn>
    </div>
  );
}
