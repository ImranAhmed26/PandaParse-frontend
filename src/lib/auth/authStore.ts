import { create } from "zustand";
import { persist } from "zustand/middleware";
import AuthStorage, { type StoredUser } from "./storage";
import { authEvents } from "./authEvents";
import { tokenRefreshService } from "./tokenRefreshService";

interface AuthState {
  // State
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (tokens: { accessToken: string; refreshToken: string }, user: StoredUser) => void;
  logout: () => void;
  updateUser: (user: StoredUser) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
  handleTokenExpiration: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      login: (tokens, userData) => {
        console.log("🔐 AuthStore: Logging in user:", userData);
        console.log("🔐 AuthStore: Logging in token:", tokens);

        // Store in localStorage
        AuthStorage.setAuthData(tokens, userData);

        // Update Zustand state
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });

        // Start token refresh service
        tokenRefreshService.start();

        // Redirect to dashboard after successful login
        if (typeof window !== "undefined") {
          // Use window.location for client-side redirects in Zustand store
          // This maintains the current locale automatically
          window.location.href = "/dashboard";
        }
      },

      logout: () => {
        console.log("🔐 AuthStore: Logging out user");

        // Stop token refresh service
        tokenRefreshService.stop();

        // Clear localStorage
        AuthStorage.clearAuthData();

        // Update Zustand state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Redirect to home (using window.location for simplicity)
        // if (typeof window !== "undefined") {
        //   window.location.href = "/";
        // }
      },

      updateUser: (userData) => {
        console.log("🔐 AuthStore: Updating user data");

        // Update localStorage
        AuthStorage.setUser(userData);

        // Update Zustand state
        set({
          user: userData,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      initializeAuth: () => {
        try {
          const { user: storedUser } = AuthStorage.getAuthData();
          const tokenInfo = AuthStorage.getTokenExpirationInfo();

          if (storedUser && AuthStorage.isAuthenticated()) {
            set({
              user: storedUser,
              isAuthenticated: true,
              isLoading: false,
            });

            // Start token refresh service for authenticated users
            tokenRefreshService.start();

            // Log token status for debugging
            if (tokenInfo) {
              console.log("🔐 AuthStore: Token status:", {
                isExpired: tokenInfo.isExpired,
                willExpireSoon: tokenInfo.willExpireSoon,
                timeUntilExpiration: Math.round(tokenInfo.timeUntilExpiration / 1000 / 60) + " minutes",
              });
            }
          } else {
            // Clear invalid/expired auth data
            console.log("🔐 AuthStore: Clearing invalid/expired auth data");
            AuthStorage.clearAuthData();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error("Error initializing auth:", error);
          AuthStorage.clearAuthData();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      handleTokenExpiration: () => {
        console.log("🔐 AuthStore: Handling token expiration");

        // Clear localStorage
        AuthStorage.clearAuthData();

        // Update Zustand state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Redirect to login page
        if (typeof window !== "undefined") {
          // Use window.location for client-side redirects in Zustand store
          // This maintains the current locale automatically
          window.location.href = "/auth/login";
        }
      },
    }),
    {
      name: "auth-store",
      // Only persist user data, not loading state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth on app start
if (typeof window !== "undefined") {
  useAuthStore.getState().initializeAuth();

  // Subscribe to auth events
  authEvents.subscribe((event) => {
    if (event.type === "TOKEN_EXPIRED" || event.type === "UNAUTHORIZED") {
      useAuthStore.getState().handleTokenExpiration();
    }
  });
}

// Export a simple hook for easier usage (optional - you can use useAuthStore directly)
export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login: store.login,
    logout: store.logout,
    updateUser: store.updateUser,
    handleTokenExpiration: store.handleTokenExpiration,
  };
};
