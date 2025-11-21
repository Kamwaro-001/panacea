import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Button } from "../../components/common/Button";
import { Screen } from "../../components/common/Screen";
import { useAuthStore } from "../../stores/useAuthStore";
import { useDoctorWardStore } from "../../stores/useDoctorWardStore";
import { useWardStore } from "../../stores/useWardStore";

export default function WardSelectScreen() {
  const { user } = useAuthStore();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const isDoctor = user?.role === "doctor" || user?.role === "consultant";

  // Nurse single-selection
  const [selected, setSelected] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const {
    wards: nurseWards,
    selectedWard,
    isLoading: nurseLoading,
    error: nurseError,
    fetchWards: fetchNurseWards,
    selectWard,
  } = useWardStore();

  // Doctor multi-selection
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const {
    wards: doctorWards,
    selectedWards,
    isLoading: doctorLoading,
    error: doctorError,
    fetchWards: fetchDoctorWards,
    setSelectedWards,
  } = useDoctorWardStore();

  // Use appropriate store based on role
  const wards = isDoctor ? doctorWards : nurseWards;
  const isLoading = isDoctor ? doctorLoading : nurseLoading;
  const error = isDoctor ? doctorError : nurseError;

  useEffect(() => {
    if (isDoctor) {
      fetchDoctorWards();
    } else {
      fetchNurseWards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor]);

  useEffect(() => {
    if (isDoctor) {
      // Pre-select the current wards for doctor
      setSelectedMultiple(selectedWards.map((w) => w.id));
    } else {
      // Pre-select the current ward for nurse
      if (selectedWard) {
        setSelected(selectedWard.id);
      }
    }
  }, [isDoctor, selectedWard, selectedWards]);

  const toggleWardSelection = (wardId: string) => {
    if (selectedMultiple.includes(wardId)) {
      setSelectedMultiple(selectedMultiple.filter((id) => id !== wardId));
    } else {
      setSelectedMultiple([...selectedMultiple, wardId]);
    }
  };

  const handleConfirm = async () => {
    setIsSelecting(true);
    try {
      if (isDoctor) {
        if (selectedMultiple.length > 0) {
          await setSelectedWards(selectedMultiple);
        }
      } else {
        if (selected) {
          await selectWard(selected);
        }
      }

      // After selecting, redirect based on returnTo parameter
      if (returnTo === "patients") {
        if (isDoctor) {
          router.replace("/(app)/(doctor)/patients" as any);
        } else {
          router.replace("/(app)/(nurse)/patients" as any);
        }
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)");
      }
    } catch {
      // Error is handled by the store
      setIsSelecting(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleRetry = () => {
    if (isDoctor) {
      fetchDoctorWards();
    } else {
      fetchNurseWards();
    }
  };

  if (isLoading) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator
          size="large"
          color={isDoctor ? "#3B82F6" : "#14B8A6"}
        />
        <Text className="text-gray-600 mt-4">Loading wards...</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <Button label="Retry" onPress={handleRetry} />
      </Screen>
    );
  }

  const canConfirm = isDoctor ? selectedMultiple.length > 0 : selected !== null;
  const hasCurrentSelection = isDoctor
    ? selectedWards.length > 0
    : selectedWard !== null;

  return (
    <>
      <Screen>
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-sans-bold text-center mb-2">
            {isDoctor ? "Select Your Wards" : "Select Your Ward"}
          </Text>

          {isDoctor && (
            <Text className="text-sm text-gray-500 text-center mb-4">
              You can select multiple wards
            </Text>
          )}

          {hasCurrentSelection && (
            <Text className="text-sm text-gray-600 text-center mb-6">
              {isDoctor ? (
                <>
                  Currently selected:{" "}
                  <Text className="font-bold">
                    {selectedWards.map((w) => w.name).join(", ")}
                  </Text>
                </>
              ) : (
                <>
                  Currently in:{" "}
                  <Text className="font-bold">{selectedWard?.name}</Text>
                </>
              )}
            </Text>
          )}

          <View>
            {wards.map((ward, index) => {
              const isSelected = isDoctor
                ? selectedMultiple.includes(ward.id)
                : selected === ward.id;

              return (
                <Pressable
                  key={ward.id}
                  onPress={() => {
                    if (isDoctor) {
                      toggleWardSelection(ward.id);
                    } else {
                      setSelected(ward.id);
                    }
                  }}
                  className={`
                  w-full p-6 border rounded-lg 
                  ${
                    isSelected
                      ? isDoctor
                        ? "bg-blue-100 border-blue-600"
                        : "bg-teal-100 border-teal-600"
                      : "bg-white border-gray-300"
                  }
                  ${index > 0 ? "mt-3" : ""}
                `}
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="text-lg font-sans-bold">
                        {ward.name}
                      </Text>
                      {ward.description && (
                        <Text className="text-sm text-gray-600 mt-1">
                          {ward.description}
                        </Text>
                      )}
                    </View>
                    {isDoctor && isSelected && (
                      <Feather name="check-circle" size={24} color="#3B82F6" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {wards.length === 0 && (
            <Text className="text-center text-gray-600 mt-4">
              No wards available
            </Text>
          )}

          <View className="mt-10">
            <Button
              label={isDoctor ? "Confirm Wards" : "Confirm Ward"}
              onPress={handleConfirm}
              isLoading={isSelecting}
              disabled={!canConfirm}
            />
            {hasCurrentSelection && (
              <Pressable
                onPress={handleCancel}
                className="py-2 bg-gray-200 rounded-lg active:bg-gray-300 mt-3"
              >
                <Text className="text-center text-gray-700 text-base">
                  Cancel
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Screen>
    </>
  );
}
