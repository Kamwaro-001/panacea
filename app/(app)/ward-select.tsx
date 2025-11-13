import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Button } from "../../components/common/Button";
import { Screen } from "../../components/common/Screen";
import { useWardStore } from "../../stores/useWardStore";

export default function WardSelectScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const { wards, selectedWard, isLoading, error, fetchWards, selectWard } =
    useWardStore();

  useEffect(() => {
    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Pre-select the current ward if one is already selected
    if (selectedWard) {
      setSelected(selectedWard.id);
    }
  }, [selectedWard]);

  const handleConfirm = async () => {
    if (selected) {
      setIsSelecting(true);
      try {
        await selectWard(selected);
        // After selecting, redirect back to the (app) root or go back if changing
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(app)");
        }
      } catch {
        // Error is handled by the store
        setIsSelecting(false);
      }
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 mt-4">Loading wards...</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <Button label="Retry" onPress={fetchWards} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        <Text className="text-3xl font-sans-bold text-center mb-4">
          Select Your Ward
        </Text>

        {selectedWard && (
          <Text className="text-sm text-gray-600 text-center mb-6">
            Currently in: <Text className="font-bold">{selectedWard.name}</Text>
          </Text>
        )}

        <View className="space-y-3">
          {wards.map((ward) => (
            <Pressable
              key={ward.id}
              onPress={() => setSelected(ward.id)}
              className={`
                w-full p-6 border rounded-lg
                ${selected === ward.id ? "bg-teal-100 border-teal-600" : "bg-white border-gray-300"}
              `}
            >
              <Text className="text-lg font-sans-bold">{ward.name}</Text>
              {ward.description && (
                <Text className="text-sm text-gray-600 mt-1">
                  {ward.description}
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        {wards.length === 0 && (
          <Text className="text-center text-gray-600 mt-4">
            No wards available
          </Text>
        )}

        <View className="mt-10 space-y-3">
          <Button
            label="Confirm Ward"
            onPress={handleConfirm}
            isLoading={isSelecting}
            disabled={!selected}
          />
          {selectedWard && (
            <Pressable
              onPress={handleCancel}
              className="py-2 bg-gray-200 rounded-lg active:bg-gray-300"
            >
              <Text className="text-center text-gray-700 text-base">
                Cancel
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Screen>
  );
}
