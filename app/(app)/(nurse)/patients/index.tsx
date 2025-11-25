import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { usePatientStore } from "@/stores/usePatientStore";
import { useWardStore } from "@/stores/useWardStore";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export default function PatientsScreen() {
  const selectedWard = useWardStore((state) => state.selectedWard);
  const { patients, isLoading, error, fetchPatientsByWard, clearPatients } =
    usePatientStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (selectedWard?.id) {
      fetchPatientsByWard(selectedWard.id);
    } else {
      // Clear patients if no ward is selected
      clearPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.id]);

  // Filter patients based on search query
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.bedNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePatientPress = (patientId: string) => {
    router.push(`/(app)/(nurse)/patients/${patientId}` as any);
  };

  const handleRetry = () => {
    if (selectedWard?.id) {
      fetchPatientsByWard(selectedWard.id);
    }
  };

  if (!selectedWard) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-xl text-gray-600 text-center">
          No Ward Selected
        </Text>
        <Text className="text-sm text-gray-500 text-center mt-2">
          Please select a ward to view patients
        </Text>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 mt-4">Loading patients...</Text>
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

  return (
    <Screen className="pt-6" noPadding>
      <FlatList
        data={filteredPatients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListHeaderComponent={
          <>
            {/* Ward Name - Centered */}
            <Text className="text-2xl font-bold text-center mb-6">
              {selectedWard.name}
            </Text>

            {/* Search Bar */}
            <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-1 mb-6 border border-gray-200">
              <Feather name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base py-1"
                placeholder="Search patient name or bed number"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            className="bg-white rounded-lg p-4 mb-3 border border-gray-200 active:bg-gray-50"
            onPress={() => handlePatientPress(item.id)}
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Bed: {item.bedNumber}
                </Text>
              </View>
              <Feather name="chevron-right" size={24} color="#9CA3AF" />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-gray-500 text-base">No patients found</Text>
          </View>
        }
      />
    </Screen>
  );
}
