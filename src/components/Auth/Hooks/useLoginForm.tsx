"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import authApi, { type LoginRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/authStore";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function useLoginForm() {
  const { login } = useAuthStore();

  // Direct login mutation - simple and straightforward
  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      return await authApi.login(data);
    },
    onSuccess: (response) => {
      // Use auth context to handle login
      login(
        {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        },
        {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
          userType: response.data.user.userType,
          companyName: response.data.user.companyName,
          image: response.data.user.image,
        }
      );
    },
    onError: (error: any) => {
      console.error("Login failed:", error);
    },
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    // Transform form data to API request format
    const loginData: LoginRequest = {
      email: data.email,
      password: data.password,
    };

    try {
      await loginMutation.mutateAsync(loginData);
    } catch (error) {
      console.error("Login form error:", error);
    }
  });

  return {
    ...form,
    handleSubmit,
    isSubmitting: loginMutation.isPending,
    error: loginMutation.error,
    isSuccess: loginMutation.isSuccess,
  };
}
