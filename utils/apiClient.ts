import { API_URL } from "@/config/api";
import axios, { AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout for hospital network reliability
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth state getters - to be set by the auth store to avoid circular dependency
let getAuthToken: (() => string | null) | null = null;
let handleLogout: (() => void) | null = null;

// Function to configure auth handlers (called by auth store)
export const configureAuthHandlers = (
  tokenGetter: () => string | null,
  logoutHandler: () => void
) => {
  getAuthToken = tokenGetter;
  handleLogout = logoutHandler;
};

// Request interceptor - automatically add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    // Get token from configured getter
    const token = getAuthToken?.();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.response.status === 401) {
        // Clear auth state on unauthorized
        handleLogout?.();
        return Promise.reject(
          new Error("Session expired. Please login again.")
        );
      }

      // Server responded with error status
      const message =
        (error.response.data as any)?.message || "An error occurred";
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Request was made but no response received
      return Promise.reject(
        new Error("No response from server. Please check your connection.")
      );
    } else {
      // Something else happened
      return Promise.reject(new Error(error.message || "An error occurred"));
    }
  }
);
