import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { barcodeService } from "@/services/barcodeService";
import { usePatientStore } from "@/stores/usePatientStore";
import { useWardStore } from "@/stores/useWardStore";
import { PatientProfile } from "@/types";
import { showAlert, showSimpleAlert } from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LinkPatientScreen() {
  const params = useLocalSearchParams<{ barcodeString: string }>();
  const barcodeString = params.barcodeString;

  const { selectedWard } = useWardStore();
  const { patients, isLoading, error, fetchPatientsByWard } = usePatientStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(
    null
  );
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    // Fetch patients from the currently active ward
    if (selectedWard?.id) {
      fetchPatientsByWard(selectedWard.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.id]);

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.bedNumber.toLowerCase().includes(query)
    );
  });

  const handleLinkPatient = async () => {
    if (!selectedPatient || !barcodeString) return;

    setIsLinking(true);
    try {
      await barcodeService.linkBarcode(barcodeString, selectedPatient.id);
      showAlert("Success", "Barcode linked to patient successfully", [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to scan page
            router.replace("/scan");
          },
        },
      ]);
    } catch (err) {
      showSimpleAlert(
        "Error",
        err instanceof Error ? err.message : "Failed to link barcode"
      );
    } finally {
      setIsLinking(false);
    }
  };

  const renderPatientItem = ({ item }: { item: PatientProfile }) => {
    const isSelected = selectedPatient?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedPatient(item)}
        className={`mb-3 p-4 rounded-lg border-2 ${
          isSelected ? "bg-teal-50 border-teal-500" : "bg-white border-gray-200"
        }`}
      >
        {/* Name */}
        <Text
          className={`text-base font-bold ${
            isSelected ? "text-teal-900" : "text-gray-900"
          }`}
        >
          {item.name}
        </Text>

        {/* Ward and Bed Number */}
        <View className="flex-row items-center mt-1">
          <Feather
            name="map-pin"
            size={14}
            color={isSelected ? "#0F766E" : "#6B7280"}
          />
          <Text
            className={`text-sm ml-1 ${
              isSelected ? "text-teal-700" : "text-gray-600"
            }`}
          >
            {item.ward.name} • Bed {item.bedNumber}
          </Text>
        </View>

        {/* Diagnosis */}
        <Text
          className={`text-sm mt-1 ${
            isSelected ? "text-teal-600" : "text-gray-500"
          }`}
        >
          {item.diagnosis}
        </Text>
      </TouchableOpacity>
    );
  };

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
        <Button label="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={100}
    >
      <Screen noPadding>
        <View className="flex-1 px-6 pt-6">
          {/* Search Box */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-4 h-12">
              <Feather name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-3 text-base"
                placeholder="Search by name or bed number"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Patients List */}
          {filteredPatients.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Feather name="users" size={64} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4 text-center">
                {searchQuery ? "No patients found" : "No patients in this ward"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredPatients}
              renderItem={renderPatientItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 128 }}
            />
          )}

          {/* Floating Link Button */}
          {selectedPatient && (
            <View className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4 bg-gradient-to-t from-white">
              <View className="bg-white rounded-lg shadow-lg p-4">
                <Button
                  label="Link Patient"
                  onPress={handleLinkPatient}
                  disabled={isLinking}
                />
              </View>
            </View>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
