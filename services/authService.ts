import { LoginResponse, UserProfile } from "@/types";
import { apiClient } from "@/utils/apiClient";

interface LoginCredentials {
  staffId: string;
  pin: string;
}

export const login = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>(
      "/auth/login",
      credentials
    );
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred during login");
  }
};

// Get current user profile (call this after login to get full user details)
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
