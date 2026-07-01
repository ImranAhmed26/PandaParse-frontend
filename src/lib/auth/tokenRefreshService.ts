// Automatic token refresh service
import AuthStorage from "./storage";
import { authEvents } from "./authEvents";

class TokenRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  /**
   * Start automatic token refresh monitoring
   */
  start(): void {
    if (typeof window === "undefined") return; // SSR safety

    this.scheduleNextRefresh();
    console.log("🔄 [TokenRefreshService] Started automatic token refresh monitoring");
  }

  /**
   * Stop automatic token refresh monitoring
   */
  stop(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    console.log("🔄 [TokenRefreshService] Stopped automatic token refresh monitoring");
  }

  /**
   * Schedule the next token refresh check
   */
  private scheduleNextRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const tokenInfo = AuthStorage.getTokenExpirationInfo();
    if (!tokenInfo) {
      // No token, check again in 30 seconds
      this.refreshTimer = setTimeout(() => this.scheduleNextRefresh(), 30000);
      return;
    }

    let checkInterval: number;

    if (tokenInfo.isExpired) {
      // Token is expired, try to refresh immediately
      this.performTokenRefresh();
      return;
    } else if (tokenInfo.willExpireSoon) {
      // Token expires soon, refresh now
      this.performTokenRefresh();
      return;
    } else {
      // Token is valid, check again when it's close to expiring
      // Check 6 minutes before expiration, or in 1 minute if expiration is sooner
      const timeUntilRefreshCheck = Math.max(
        tokenInfo.timeUntilExpiration - 6 * 60 * 1000, // 6 minutes before expiration
        60 * 1000 // At least 1 minute
      );
      checkInterval = timeUntilRefreshCheck;
    }

    this.refreshTimer = setTimeout(() => this.scheduleNextRefresh(), checkInterval);
  }

  /**
   * Perform token refresh. Returns true if the token was refreshed, false if
   * the session ended (expired/invalid refresh token) and the user was logged out.
   */
  private async performTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log("🔄 [TokenRefreshService] Refresh already in progress, skipping");
      return false;
    }

    this.isRefreshing = true;

    try {
      const refreshToken = AuthStorage.getRefreshToken();
      if (!refreshToken) {
        console.log("🔄 [TokenRefreshService] No refresh token available, logging out");
        this.logout("No refresh token available");
        return false;
      }

      // Use fetch directly to avoid circular dependency with API client
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        // Expired/invalid refresh token is an expected condition, not an error.
        // Just log the user out cleanly.
        console.log(`🔄 [TokenRefreshService] Refresh token rejected (${response.status}), logging out`);
        this.logout("Refresh token expired");
        return false;
      }

      const data = await response.json();

      // Backend returns direct response format: { access_token, refresh_token, user }
      const { access_token, refresh_token } = data;

      if (!access_token) {
        throw new Error("No access token in refresh response");
      }

      // Update tokens
      AuthStorage.setAccessToken(access_token);
      if (refresh_token) {
        AuthStorage.setRefreshToken(refresh_token);
      }

      // Schedule next refresh
      this.scheduleNextRefresh();
      return true;
    } catch (error) {
      // Reaching here means a network/parsing failure (not an auth rejection).
      // Log out to be safe.
      console.warn("🔄 [TokenRefreshService] Token refresh request failed, logging out:", error);
      this.logout("Token refresh failed");
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Clear the session and notify the app to log the user out.
   */
  private logout(reason: string): void {
    this.stop();
    AuthStorage.clearAuthData();
    authEvents.emit("TOKEN_EXPIRED", reason);
  }

  /**
   * Force refresh token now. Resolves to true on success, false if the user was logged out.
   */
  async forceRefresh(): Promise<boolean> {
    return this.performTokenRefresh();
  }
}

// Create singleton instance
export const tokenRefreshService = new TokenRefreshService();

// Auto-start the service when the module is loaded (client-side only)
if (typeof window !== "undefined") {
  // Start after a short delay to ensure auth is initialized
  setTimeout(() => {
    if (AuthStorage.isAuthenticated()) {
      tokenRefreshService.start();
    }
  }, 1000);
}
