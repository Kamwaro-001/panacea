import { API_URL } from "@/config/api";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout for hospital network reliability
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth handlers - to be set by the auth store to avoid circular dependency
let getAuthToken: (() => Promise<string | null>) | null = null;
let refreshAuthToken: (() => Promise<string | null>) | null = null;
let handleLogout: (() => void) | null = null;

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

/**
 * Configure auth handlers (called by auth store on initialization)
 */
export const configureAuthHandlers = (
  tokenGetter: () => Promise<string | null>,
  tokenRefresher: () => Promise<string | null>,
  logoutHandler: () => void
) => {
  getAuthToken = tokenGetter;
  refreshAuthToken = tokenRefresher;
  handleLogout = logoutHandler;
};

/**
 * Subscribe to token refresh
 */
function subscribeTokenRefresh(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers of new token
 */
function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

// Request interceptor - automatically add auth token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    // Skip auth for login/refresh endpoints
    if (
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/refresh")
    ) {
      return config;
    }

    // Get token from configured getter
    const token = await getAuthToken?.();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response) {
      // Handle 401 Unauthorized - try to refresh token
      if (error.response.status === 401 && !originalRequest._retry) {
        if (originalRequest.url?.includes("/auth/refresh")) {
          // Refresh token itself is invalid, logout
          console.log("🚪 Refresh token invalid, logging out");
          handleLogout?.();
          return Promise.reject(
            new Error("Session expired. Please login again.")
          );
        }

        // Mark request as retried to avoid infinite loop
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            // Attempt to refresh token
            const newToken = await refreshAuthToken?.();

            if (newToken) {
              console.log("✅ Token refreshed, retrying request");
              isRefreshing = false;
              onTokenRefreshed(newToken);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return apiClient(originalRequest);
            } else {
              // Refresh failed, logout
              console.log("🚪 Token refresh failed, logging out");
              isRefreshing = false;
              onTokenRefreshed(null);
              handleLogout?.();
              return Promise.reject(
                new Error("Session expired. Please login again.")
              );
            }
          } catch (refreshError) {
            isRefreshing = false;
            onTokenRefreshed(null);
            handleLogout?.();
            return Promise.reject(
              new Error("Session expired. Please login again.")
            );
          }
        } else {
          // Wait for token refresh to complete
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token) => {
              if (token) {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(apiClient(originalRequest));
              } else {
                reject(new Error("Session expired. Please login again."));
              }
            });
          });
        }
      }

      // For other errors, preserve the original Axios error structure
      return Promise.reject(error);
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
