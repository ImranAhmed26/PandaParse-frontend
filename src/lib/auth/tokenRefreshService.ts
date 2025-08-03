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
   * Perform token refresh
   */
  private async performTokenRefresh(): Promise<void> {
    if (this.isRefreshing) {
      console.log("🔄 [TokenRefreshService] Refresh already in progress, skipping");
      return;
    }

    this.isRefreshing = true;

    try {
      const refreshToken = AuthStorage.getRefreshToken();
      if (!refreshToken) {
        console.warn("🔄 [TokenRefreshService] No refresh token available");
        authEvents.emit("TOKEN_EXPIRED", "No refresh token available");
        return;
      }

      console.log("🔄 [TokenRefreshService] Refreshing token...");

      // Use fetch directly to avoid circular dependency with API client
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const { access_token, refresh_token } = data;

      // Update tokens
      AuthStorage.setAccessToken(access_token);
      if (refresh_token) {
        AuthStorage.setRefreshToken(refresh_token);
      }

      console.log("🔄 [TokenRefreshService] Token refreshed successfully");

      // Schedule next refresh
      this.scheduleNextRefresh();
    } catch (error) {
      console.error("🔄 [TokenRefreshService] Token refresh failed:", error);

      // Clear tokens and emit event
      AuthStorage.clearAuthData();
      authEvents.emit("TOKEN_EXPIRED", "Token refresh failed");
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Force refresh token now
   */
  async forceRefresh(): Promise<boolean> {
    try {
      await this.performTokenRefresh();
      return true;
    } catch (error) {
      console.error("🔄 [TokenRefreshService] Force refresh failed:", error);
      return false;
    }
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
