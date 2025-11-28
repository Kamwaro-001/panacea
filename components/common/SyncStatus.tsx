/**
 * Sync Status Component
 *
 * Shows sync status, pending operations count, and last sync time
 */

import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  onSyncStatusChange,
  onNetworkStatusChange,
  triggerSync,
  type SyncStatus,
} from "@/utils/networkMonitor";
import { useAuthStore } from "@/stores/useAuthStore";

interface SyncStatusBannerProps {
  compact?: boolean;
}

export function SyncStatusBanner({ compact = false }: SyncStatusBannerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const wardId = useAuthStore((state) => state.wardId);

  useEffect(() => {
    // Subscribe to network status
    const unsubNetwork = onNetworkStatusChange(setIsOnline);

    // Subscribe to sync status
    const unsubSync = onSyncStatusChange(setSyncStatus);

    return () => {
      unsubNetwork();
      unsubSync();
    };
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing || !isOnline) return;

    setIsManualSyncing(true);
    try {
      await triggerSync(wardId || undefined);
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Never";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;

    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <View className="flex-row items-center gap-2 px-4 py-2">
        {!isOnline ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="cloud-offline" size={16} color="#f59e0b" />
            <Text className="text-xs text-amber-600">Offline</Text>
          </View>
        ) : syncStatus.isSyncing ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="text-xs text-blue-600">Syncing...</Text>
          </View>
        ) : syncStatus.pendingCount > 0 ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="cloud-upload-outline" size={16} color="#f59e0b" />
            <Text className="text-xs text-amber-600">
              {syncStatus.pendingCount} pending
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-2">
            <Ionicons name="cloud-done" size={16} color="#10b981" />
            <Text className="text-xs text-emerald-600">Synced</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="bg-white border-b border-gray-200">
      <View className="px-4 py-3 flex-row items-center justify-between">
        {/* Status indicator */}
        <View className="flex-1 flex-row items-center gap-3">
          {!isOnline ? (
            <>
              <Ionicons name="cloud-offline" size={24} color="#f59e0b" />
              <View className="flex-1">
                <Text className="font-semibold text-amber-700">
                  Offline Mode
                </Text>
                <Text className="text-xs text-gray-600">
                  {syncStatus.pendingCount} operation
                  {syncStatus.pendingCount !== 1 ? "s" : ""} queued
                </Text>
              </View>
            </>
          ) : syncStatus.isSyncing || isManualSyncing ? (
            <>
              <ActivityIndicator size="small" color="#3b82f6" />
              <View className="flex-1">
                <Text className="font-semibold text-blue-700">Syncing...</Text>
                <Text className="text-xs text-gray-600">
                  {syncStatus.pendingCount} remaining
                </Text>
              </View>
            </>
          ) : syncStatus.error ? (
            <>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <View className="flex-1">
                <Text className="font-semibold text-red-700">Sync Error</Text>
                <Text className="text-xs text-gray-600">
                  {syncStatus.error}
                </Text>
              </View>
            </>
          ) : syncStatus.pendingCount > 0 ? (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color="#f59e0b" />
              <View className="flex-1">
                <Text className="font-semibold text-amber-700">
                  Pending Sync
                </Text>
                <Text className="text-xs text-gray-600">
                  {syncStatus.pendingCount} operation
                  {syncStatus.pendingCount !== 1 ? "s" : ""} queued
                </Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="cloud-done" size={24} color="#10b981" />
              <View className="flex-1">
                <Text className="font-semibold text-emerald-700">
                  All Synced
                </Text>
                <Text className="text-xs text-gray-600">
                  Last sync: {formatLastSync(syncStatus.lastSyncTime)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Manual sync button */}
        {isOnline && !syncStatus.isSyncing && (
          <Pressable
            onPress={handleManualSync}
            disabled={isManualSyncing}
            className={`px-3 py-1.5 rounded-md ${
              isManualSyncing ? "bg-gray-200" : "bg-blue-500"
            }`}
          >
            {isManualSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-sm font-medium">Sync Now</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Connection Status Indicator (for navigation bars)
 */
export function ConnectionIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = onNetworkStatusChange(setIsOnline);
    return unsubscribe;
  }, []);

  if (isOnline) return null;

  return (
    <View className="bg-amber-500 px-2 py-1 flex-row items-center gap-1">
      <Ionicons name="cloud-offline" size={12} color="#fff" />
      <Text className="text-white text-xs font-medium">OFFLINE</Text>
    </View>
  );
}
