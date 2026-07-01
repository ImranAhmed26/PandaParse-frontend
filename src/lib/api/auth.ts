import api from "./api";
import type { ApiResponse } from "./api";
import AuthStorage from "@/lib/auth/storage";

// Authentication Types
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  companyName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  role: number; // 0=ADMIN, 1=INTERNAL, 2=USER
  userType: number; // 0=INDIVIDUAL_FREELANCER, 1=COMPANY_USER, 2=COMPANY_OWNER
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// Authentication API Functions
export const authApi = {
  // Register new user
  register: async (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<AuthResponse>("/auth/register", data);

    // Note: Token storage is now handled by the auth context
    // The forms will handle storing tokens and user data

    return response;
  },

  // Login user
  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post<AuthResponse>("/auth/login", data);

    // Note: Token storage is now handled by the auth context
    // The forms will handle storing tokens and user data

    return response;
  },

  // Logout user
  logout: async (): Promise<ApiResponse<{ message: string }>> => {
    try {
      const response = await api.post<{ message: string }>("/auth/logout");
      return response;
    } finally {
      // Always clear tokens, even if logout request fails
      AuthStorage.clearAuthData();
    }
  },

  // Get current user profile
  getProfile: async (): Promise<ApiResponse<User>> => {
    return api.get<User>("/auth/profile");
  },

  // Refresh access token
  refreshToken: async (): Promise<ApiResponse<RefreshTokenResponse>> => {
    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await api.post<RefreshTokenResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });

    // Update stored tokens
    if (response.success) {
      AuthStorage.setAccessToken(response.data.access_token);
      AuthStorage.setRefreshToken(response.data.refresh_token);
    }

    return response;
  },

  // Verify email
  verifyEmail: async (token: string): Promise<ApiResponse<{ message: string }>> => {
    return api.post<{ message: string }>("/auth/verify-email", { token });
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    return api.post<{ message: string }>("/auth/forgot-password", { email });
  },

  // Reset password
  resetPassword: async (token: string, password: string): Promise<ApiResponse<{ message: string }>> => {
    return api.post<{ message: string }>("/auth/reset-password", {
      token,
      password,
    });
  },
};

export default authApi;
