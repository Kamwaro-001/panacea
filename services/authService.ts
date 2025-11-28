import * as SecureStore from "expo-secure-store";
import { LoginResponse, UserProfile } from "@/types";
import { apiClient } from "@/utils/apiClient";
import { getDeviceId, registerDevice } from "./syncService";

interface LoginCredentials {
  staffId: string;
  pin: string;
}

// Token storage keys
const ACCESS_TOKEN_KEY = "panacea_access_token";
const REFRESH_TOKEN_KEY = "panacea_refresh_token";

/**
 * Login with credentials and device registration
 */
export const login = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  try {
    // Get device ID for device registration
    const deviceId = await getDeviceId();

    // Login with device ID
    const response = await apiClient.post<LoginResponse>("/auth/login", {
      ...credentials,
      deviceId,
    });

    const { accessToken, refreshToken } = response.data;

    // Store tokens securely
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }

    console.log("✅ Login successful, tokens stored");

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred during login");
  }
};

/**
 * Get current user profile (call this after login to get full user details)
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await apiClient.get<UserProfile>("/auth/profile");
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch user profile");
  }
};

/**
 * Get stored access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get access token:", error);
    return null;
  }
};

/**
 * Get stored refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to get refresh token:", error);
    return null;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.post<{ accessToken: string }>(
      "/auth/refresh",
      { refreshToken }
    );

    const { accessToken } = response.data;

    // Store new access token
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

    console.log("✅ Access token refreshed");

    return accessToken;
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    // Clear tokens on refresh failure
    await clearTokens();
    return null;
  }
};

/**
 * Logout - revoke refresh token and clear local tokens
 */
export const logout = async (): Promise<void> => {
  try {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      // Attempt to revoke on server (best effort)
      try {
        await apiClient.post("/auth/logout", { refreshToken });
      } catch (error) {
        console.warn("Failed to revoke token on server:", error);
      }
    }

    // Clear local tokens
    await clearTokens();

    console.log("✅ Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local tokens even if server call fails
    await clearTokens();
  }
};

/**
 * Clear stored tokens
 */
export const clearTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear tokens:", error);
  }
};
