// JWT Token utilities for expiration checking
export interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: any;
}

export class TokenUtils {
  /**
   * Decode JWT token without verification (client-side only)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decoded);
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    // Add 30 second buffer to account for clock skew
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const bufferTime = 30 * 1000; // 30 seconds

    return currentTime >= expirationTime - bufferTime;
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  static getTimeUntilExpiration(token: string): number {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();

    return Math.max(0, expirationTime - currentTime);
  }

  /**
   * Check if token will expire soon (within specified minutes)
   */
  static willExpireSoon(token: string, minutesThreshold: number = 5): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration(token);
    const thresholdMs = minutesThreshold * 60 * 1000;

    return timeUntilExpiration <= thresholdMs;
  }
}
