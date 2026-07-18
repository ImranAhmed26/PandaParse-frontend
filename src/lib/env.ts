// Environment configuration and validation
interface EnvironmentConfig {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
  NODE_ENV: "development" | "production" | "test";
}

class Environment {
  private static instance: Environment;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.validateAndLoadConfig();
  }

  public static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  private validateAndLoadConfig(): EnvironmentConfig {
    const config = {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
    };

    // Validate required environment variables
    const errors: string[] = [];

    if (!config.NEXT_PUBLIC_API_URL) {
      errors.push("NEXT_PUBLIC_API_URL is required");
    } else if (!this.isValidUrl(config.NEXT_PUBLIC_API_URL)) {
      errors.push("NEXT_PUBLIC_API_URL must be a valid URL");
    }

    if (errors.length > 0) {
      console.error("❌ Environment Configuration Errors:");
      errors.forEach((error) => console.error(`  - ${error}`));

      // Provide fallback URLs based on environment
      if (!config.NEXT_PUBLIC_API_URL || !this.isValidUrl(config.NEXT_PUBLIC_API_URL)) {
        config.NEXT_PUBLIC_API_URL = this.getFallbackApiUrl(config.NODE_ENV);
        console.warn(`⚠️  Using fallback API URL: ${config.NEXT_PUBLIC_API_URL}`);
      }
    }

    // Log configuration in development
    if (config.NODE_ENV === "development") {
      console.log("🔧 Environment Configuration:");
      console.log(`  - NODE_ENV: ${config.NODE_ENV}`);
      console.log(`  - API_URL: ${config.NEXT_PUBLIC_API_URL}`);
    }

    return config;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getFallbackApiUrl(env: string): string {
    switch (env) {
      case "production":
        return "https://api.pandaparse.com/api"; // Replace with your actual production API
      case "development":
        return "http://localhost:8000/api";
      case "test":
        return "http://localhost:3001/api";
      default:
        return "http://localhost:8000/api";
    }
  }

  public get apiUrl(): string {
    return this.config.NEXT_PUBLIC_API_URL;
  }

  /** Google OAuth Web client ID. Empty string when Google sign-in is not configured. */
  public get googleClientId(): string {
    return this.config.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }

  public get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  public get isDevelopment(): boolean {
    return this.config.NODE_ENV === "development";
  }

  public get isProduction(): boolean {
    return this.config.NODE_ENV === "production";
  }

  public get isTest(): boolean {
    return this.config.NODE_ENV === "test";
  }
}

// Export singleton instance
export const env = Environment.getInstance();
export default env;
