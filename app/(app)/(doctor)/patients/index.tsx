import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { useDoctorWardStore } from "@/stores/useDoctorWardStore";
import { usePatientStore } from "@/stores/usePatientStore";
import { PatientProfile } from "@/types";
import { Feather, MaterialIcons } from "@expo/vector-icons";
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

interface PatientsByWard {
  wardId: string;
  wardName: string;
  data: PatientProfile[];
  isExpanded: boolean;
}

export default function DoctorPatientsScreen() {
  const selectedWards = useDoctorWardStore((state) => state.selectedWards);
  const { patients, isLoading, error, fetchPatientsByWard, clearPatients } =
    usePatientStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientsByWard, setPatientsByWard] = useState<PatientsByWard[]>([]);
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedWards.length > 0) {
      // Fetch patients from all selected wards
      const fetchAllPatients = async () => {
        clearPatients();
        for (const ward of selectedWards) {
          await fetchPatientsByWard(ward.id);
        }
      };
      fetchAllPatients();
    } else {
      clearPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWards]);

  useEffect(() => {
    // Group patients by ward
    const grouped: PatientsByWard[] = [];
    const isSearching = searchQuery.trim().length > 0;

    selectedWards.forEach((ward) => {
      const wardPatients = patients.filter((p) => p.wardId === ward.id);
      if (wardPatients.length > 0) {
        grouped.push({
          wardId: ward.id,
          wardName: ward.name,
          data: wardPatients,
          // Auto-expand all wards when searching, otherwise use expandedWards state
          isExpanded: isSearching || expandedWards.has(ward.id),
        });
      }
    });

    setPatientsByWard(grouped);
  }, [patients, selectedWards, expandedWards, searchQuery]);

  // Filter patients based on search query
  const filteredPatientsByWard = patientsByWard
    .map((ward) => ({
      ...ward,
      data: ward.data.filter(
        (patient) =>
          patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient.bedNumber.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((ward) => ward.data.length > 0);

  const handlePatientPress = (patientId: string) => {
    router.push(`/(app)/(doctor)/patients/${patientId}` as any);
  };

  const toggleWardExpansion = (wardId: string) => {
    setExpandedWards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wardId)) {
        newSet.delete(wardId);
      } else {
        newSet.add(wardId);
      }
      return newSet;
    });
  };

  const handleSelectWards = () => {
    router.push("/(app)/ward-select");
  };

  const handleRetry = () => {
    if (selectedWards.length > 0) {
      const fetchAllPatients = async () => {
        clearPatients();
        for (const ward of selectedWards) {
          await fetchPatientsByWard(ward.id);
        }
      };
      fetchAllPatients();
    }
  };

  if (selectedWards.length === 0) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-xl text-gray-600 text-center">
          No Wards Selected
        </Text>
        <Text className="text-sm text-gray-500 text-center mt-2 mb-6">
          Please select wards to view patients
        </Text>
        <Button label="Select Wards" onPress={handleSelectWards} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
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
    <Screen className="px-4 pt-6">
      {/* Title */}
      <Text className="text-2xl font-bold text-center mb-2">My Patients</Text>
      <Text className="text-sm text-gray-600 text-center mb-4">
        {selectedWards.length} ward{selectedWards.length !== 1 ? "s" : ""}{" "}
        selected
      </Text>

      {/* Search Bar */}
      <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-1 mb-4 border border-gray-200">
        <Feather name="search" size={20} color="#9CA3AF" />
        <TextInput
          className="flex-1 ml-3 text-base py-1"
          placeholder="Search patient name or bed number"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Patients List Grouped by Ward */}
      <FlatList
        data={filteredPatientsByWard}
        keyExtractor={(ward) => ward.wardId}
        renderItem={({ item: ward }) => (
          <View className="mb-4">
            {/* Ward Header - Collapsible */}
            <Pressable
              className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 flex-row justify-between items-center active:bg-blue-100"
              onPress={() => toggleWardExpansion(ward.wardId)}
            >
              <View className="flex-1 flex-row items-center">
                <MaterialIcons
                  name={ward.isExpanded ? "expand-more" : "chevron-right"}
                  size={24}
                  color="#1E40AF"
                />
                <Text className="text-base font-bold text-blue-900 ml-2">
                  {ward.wardName}
                </Text>
              </View>
              <Text className="text-xs text-blue-700">
                {ward.data.length} patient
                {ward.data.length !== 1 ? "s" : ""}
              </Text>
            </Pressable>

            {/* Patients List - Only show when expanded */}
            {ward.isExpanded && (
              <View className="mt-2">
                {ward.data.map((patient) => (
                  <Pressable
                    key={patient.id}
                    className="bg-white rounded-lg p-4 mb-2 ml-2 border border-gray-200 active:bg-gray-50"
                    onPress={() => handlePatientPress(patient.id)}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900">
                          {patient.name}
                        </Text>
                        <Text className="text-sm text-gray-600 mt-1">
                          Bed: {patient.bedNumber}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={24} color="#9CA3AF" />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
