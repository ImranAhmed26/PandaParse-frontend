"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import authApi, { type RegisterRequest } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/auth/authStore";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    companyName: z
      .string()
      .trim()
      .transform((val) => (val === "" ? undefined : val))
      .optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function useRegisterForm() {
  const { login } = useAuthStore();

  // Direct registration mutation - simple and straightforward
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterRequest) => {
      return await authApi.register(data);
    },
    onSuccess: (response) => {
      // Use auth context to handle login after registration
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
        }
      );
    },
    onError: (error: any) => {
      console.error("Registration failed:", error);
    },
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      companyName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    // Transform form data to API request format
    const registerData: RegisterRequest = {
      name: data.name,
      email: data.email,
      password: data.password,
      companyName: data.companyName || undefined,
    };

    try {
      await registerMutation.mutateAsync(registerData);
    } catch (error) {
      console.error("Register form error:", error);
    }
  });

  return {
    ...form,
    handleSubmit,
    isSubmitting: registerMutation.isPending,
    error: registerMutation.error,
    isSuccess: registerMutation.isSuccess,
  };
}
