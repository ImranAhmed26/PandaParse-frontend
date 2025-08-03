// Simple authentication storage utilities
// SSR-safe localStorage wrapper

import { TokenUtils } from "./tokenUtils";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: number; // 0=ADMIN, 1=INTERNAL, 2=USER
  userType: number; // 0=INDIVIDUAL_FREELANCER, 1=COMPANY_USER, 2=COMPANY_OWNER
  companyName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class AuthStorage {
  private static readonly ACCESS_TOKEN_KEY = "auth_access_token";
  private static readonly REFRESH_TOKEN_KEY = "auth_refresh_token";
  private static readonly USER_KEY = "auth_user";

  // Check if we're in browser environment
  private static isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  // Token management
  static getAccessToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static setAccessToken(token: string): void {
    console.log("🔍 [AuthStorage] setAccessToken called with:", token, typeof token);
    if (this.isBrowser()) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
      console.log("🔍 [AuthStorage] Token stored in localStorage:", localStorage.getItem(this.ACCESS_TOKEN_KEY));
    }
  }

  static getRefreshToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token: string): void {
    console.log("🔍 [AuthStorage] setRefreshToken called with:", token, typeof token);
    if (this.isBrowser()) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
      console.log("🔍 [AuthStorage] Refresh token stored in localStorage:", localStorage.getItem(this.REFRESH_TOKEN_KEY));
    }
  }

  // User data management
  static getUser(): StoredUser | null {
    if (!this.isBrowser()) return null;

    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      return null;
    }
  }

  static setUser(user: StoredUser): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  // Set all auth data at once (for login/register)
  static setAuthData(tokens: AuthTokens, user: StoredUser): void {
    console.log("🔍 [AuthStorage] setAuthData called with:", { tokens, user });
    console.log("🔍 [AuthStorage] accessToken:", tokens.accessToken);
    console.log("🔍 [AuthStorage] refreshToken:", tokens.refreshToken);

    this.setAccessToken(tokens.accessToken);
    this.setRefreshToken(tokens.refreshToken);
    this.setUser(user);

    // Verify what was actually stored
    console.log("🔍 [AuthStorage] Stored accessToken:", this.getAccessToken());
    console.log("🔍 [AuthStorage] Stored refreshToken:", this.getRefreshToken());
  }

  // Clear all auth data (for logout)
  static clearAuthData(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  // Check if user is authenticated (has valid token)
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getUser();

    if (!token || !user) return false;

    // Check if token is expired
    if (TokenUtils.isTokenExpired(token)) {
      console.log("🔍 [AuthStorage] Access token is expired");
      return false;
    }

    return true;
  }

  // Check if access token needs refresh (expires within 5 minutes)
  static needsTokenRefresh(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    return TokenUtils.willExpireSoon(token, 5);
  }

  // Get token expiration info
  static getTokenExpirationInfo(): {
    isExpired: boolean;
    willExpireSoon: boolean;
    timeUntilExpiration: number;
  } | null {
    const token = this.getAccessToken();
    if (!token) return null;

    return {
      isExpired: TokenUtils.isTokenExpired(token),
      willExpireSoon: TokenUtils.willExpireSoon(token, 5),
      timeUntilExpiration: TokenUtils.getTimeUntilExpiration(token),
    };
  }

  // Get all auth data
  static getAuthData(): { tokens: AuthTokens | null; user: StoredUser | null } {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const user = this.getUser();

    const tokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;

    return { tokens, user };
  }
}

export default AuthStorage;
