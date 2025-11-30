import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { useDoctorWardStore } from "@/stores/useDoctorWardStore";
import { usePatientStore } from "@/stores/usePatientStore";
import { PatientProfile } from "@/types";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
  const { patients, isLoading, error, fetchPatientsByWards, clearPatients } =
    usePatientStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientsByWard, setPatientsByWard] = useState<PatientsByWard[]>([]);
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const lastWardIds = useRef<string>("");
  const REFETCH_THRESHOLD = 30000; // 30 seconds

  // Load patients when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (selectedWards.length > 0) {
        const selectedWardIds = selectedWards.map((w) => w.id);
        const wardIdsKey = selectedWardIds.sort().join(",");
        const timeSinceLastFetch = Date.now() - lastFetchTime.current;
        const wardsChanged = lastWardIds.current !== wardIdsKey;

        // Fetch if: wards changed OR data is stale OR first time
        if (
          wardsChanged ||
          timeSinceLastFetch > REFETCH_THRESHOLD ||
          lastFetchTime.current === 0
        ) {
          fetchPatientsByWards(selectedWardIds);
          lastFetchTime.current = Date.now();
          lastWardIds.current = wardIdsKey;
        }
      } else {
        clearPatients();
        lastWardIds.current = "";
      }
    }, [selectedWards, fetchPatientsByWards, clearPatients])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    if (selectedWards.length === 0) return;

    setRefreshing(true);
    try {
      const selectedWardIds = selectedWards.map((w) => w.id);
      await fetchPatientsByWards(selectedWardIds);
      lastFetchTime.current = Date.now();
    } finally {
      setRefreshing(false);
    }
  }, [selectedWards, fetchPatientsByWards]);

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
      const selectedWardIds = selectedWards.map((w) => w.id);
      fetchPatientsByWards(selectedWardIds);
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

  // Only show loading screen if we have no data at all and are loading
  // This supports offline-first: show cached data immediately even while syncing
  if (isLoading && patients.length === 0) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 mt-4">Loading patients...</Text>
      </Screen>
    );
  }

  // Show error only if we have no data to display
  if (error && patients.length === 0) {
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
        data={filteredPatientsByWard}
        keyExtractor={(ward) => ward.wardId}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingBottom: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#14B8A6"]}
            tintColor="#14B8A6"
          />
        }
        ListHeaderComponent={
          <>
            {/* Title */}
            <Text className="text-2xl font-bold text-center mb-2">
              My Patients
            </Text>
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
          </>
        }
        renderItem={({ item: ward }) => (
          <View className="mb-4">
            {/* Ward Header - Collapsible */}
            <Pressable
              className="bg-teal-50 px-4 py-3 rounded-lg border border-teal-200 flex-row justify-between items-center active:bg-teal-100"
              onPress={() => toggleWardExpansion(ward.wardId)}
            >
              <View className="flex-1 flex-row items-center">
                <MaterialIcons
                  name={ward.isExpanded ? "expand-more" : "chevron-right"}
                  size={24}
                  color="#0F766E"
                />
                <Text className="text-base font-bold text-teal-900 ml-2">
                  {ward.wardName}
                </Text>
              </View>
              <Text className="text-xs text-teal-700">
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
