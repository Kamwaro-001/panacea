import {
  getUserProfile,
  login as loginService,
  logout as logoutService,
  getAccessToken,
  refreshAccessToken,
} from "@/services/authService";
import { registerDevice, performInitialSync } from "@/services/syncService";
import {
  initDatabase,
  isFirstLaunchWithOffline,
  clearAllData,
} from "@/database";
import { initNetworkMonitor } from "@/utils/networkMonitor";
import { UserProfile } from "@/types";
import { configureAuthHandlers } from "@/utils/apiClient";
import { create } from "zustand";

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  wardId: string | null;
  login: (
    credentials: { staffId: string; pin: string },
    wardId?: string
  ) => Promise<void>;
  initialize: () => Promise<void>;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  setWardId: (wardId: string | null) => void;
};

let networkMonitorCleanup: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  wardId: null,

  // Initialize database and restore session
  initialize: async () => {
    try {
      console.log("🚀 Initializing offline-first system...");

      // Initialize database
      await initDatabase();

      // Try to restore session from SecureStore
      const token = await getAccessToken();

      if (token) {
        console.log("🔑 Found saved token, restoring session");
        set({ token, isLoading: true });

        try {
          // Fetch user profile
          const userProfile = await getUserProfile();
          set({ user: userProfile });

          // Start network monitor
          const wardId = get().wardId;
          networkMonitorCleanup = initNetworkMonitor(wardId || undefined);

          console.log("✅ Session restored");
        } catch (error) {
          console.warn("Failed to restore session, token may be expired");
          set({ token: null });
        }
      }

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      console.error("Failed to initialize:", error);
      set({ isInitialized: true, isLoading: false });
    }
  },

  // Login action with offline-first setup
  login: async (credentials, wardId) => {
    set({ isLoading: true, error: null });
    try {
      // Step 1: Authenticate and get tokens
      const response = await loginService(credentials);

      // Step 2: Set token first so subsequent API calls are authenticated
      set({ token: response.accessToken });

      // Step 3: Fetch user profile
      const userProfile = await getUserProfile();
      set({ user: userProfile, wardId: wardId || null });

      // Step 4: Register device with backend
      await registerDevice(userProfile.id);

      // Step 5: Check if this is first launch with offline support
      const isFirstLaunch = await isFirstLaunchWithOffline();

      if (isFirstLaunch) {
        console.log("📥 First launch detected, downloading initial data...");
        // Perform initial sync with ward filtering
        await performInitialSync(wardId);
        console.log("✅ Initial data sync complete");
      }

      // Step 6: Start network monitor for automatic sync
      networkMonitorCleanup = initNetworkMonitor(wardId);

      set({ isLoading: false });
      console.log("✅ Login complete with offline-first setup");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      set({ error: errorMessage, isLoading: false, token: null, user: null });
      throw error; // Re-throw so component can handle it
    }
  },

  // Direct setter for auth state (if needed)
  setAuth: (token, user) => set({ token, user }),

  // Logout action with cleanup
  logout: async () => {
    try {
      // Stop network monitor
      if (networkMonitorCleanup) {
        networkMonitorCleanup();
        networkMonitorCleanup = null;
      }

      // Logout from server and clear tokens
      await logoutService();

      // Clear local data
      await clearAllData();

      set({ token: null, user: null, error: null, wardId: null });

      console.log("✅ Logged out and cleared local data");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state
      set({ token: null, user: null, error: null, wardId: null });
    }
  },

  // Set ward ID for filtering
  setWardId: (wardId) => {
    set({ wardId });

    // Restart network monitor with new ward filter
    if (networkMonitorCleanup) {
      networkMonitorCleanup();
      networkMonitorCleanup = initNetworkMonitor(wardId || undefined);
    }
  },
}));

// Configure apiClient with auth handlers to avoid circular dependency
configureAuthHandlers(
  async () => useAuthStore.getState().token,
  refreshAccessToken,
  () => useAuthStore.getState().logout()
);
