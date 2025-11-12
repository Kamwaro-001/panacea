import { getUserProfile, login as loginService } from "@/services/authService";
import { UserProfile } from "@/types";
import { configureAuthHandlers } from "@/utils/apiClient";
import { create } from "zustand";

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: { staffId: string; pin: string }) => Promise<void>;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  // Login action that calls the API
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Authenticate and get token
      const response = await loginService(credentials);

      // Step 2: Set token first so subsequent API calls are authenticated
      set({ token: response.accessToken });

      // Step 3: Fetch user profile with the new token
      const userProfile = await getUserProfile();

      // Step 4: Set user profile and complete loading
      set({ user: userProfile, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      set({ error: errorMessage, isLoading: false, token: null, user: null });
      throw error; // Re-throw so component can handle it
    }
  },

  // Direct setter for auth state (if needed)
  setAuth: (token, user) => set({ token, user }),

  // Logout action
  logout: () => set({ token: null, user: null, error: null }),
}));

// Configure apiClient with auth handlers to avoid circular dependency
configureAuthHandlers(
  () => useAuthStore.getState().token,
  () => useAuthStore.getState().logout()
);
