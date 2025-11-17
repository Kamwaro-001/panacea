import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import { MedicationOrderItem } from "@/components/patient/MedicationOrderItem";
import { PatientInformationCard } from "@/components/patient/PatientInformationCard";
import { ScannedBarcodeResponse, VitalsData } from "@/types";
import { showAlert, showSimpleAlert } from "@/utils/alert";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function VerifyAdministrationScreen() {
  const params = useLocalSearchParams();

  // Parse the scanned data from route params
  const scannedData: ScannedBarcodeResponse = params.data
    ? JSON.parse(params.data as string)
    : null;

  // Vitals state
  const [vitals, setVitals] = useState<VitalsData>({
    bp: "",
    hr: "",
    temp: "",
    spo2: "",
    painScore: "",
  });
  const [isRecording, setIsRecording] = useState(false);

  const handleRecordAdministration = async () => {
    if (!scannedData) return;

    // Validate vitals
    if (
      !vitals.bp ||
      !vitals.hr ||
      !vitals.temp ||
      !vitals.spo2 ||
      !vitals.painScore
    ) {
      showSimpleAlert("Error", "Please fill in all vital signs");
      return;
    }

    setIsRecording(true);
    try {
      // TODO: Implement the actual API call to record administration
      // await administrationService.recordAdministration({
      //   patientId: scannedData.patient.id,
      //   vitals: vitals,
      // });

      showAlert("Success", "Vitals recorded successfully", [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to scan page
            router.back();
          },
        },
      ]);
    } catch (err) {
      showSimpleAlert(
        "Error",
        err instanceof Error ? err.message : "Failed to record vitals"
      );
    } finally {
      setIsRecording(false);
    }
  };

  if (!scannedData) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-gray-600 mb-4">No patient data available</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scrollable noPadding>
      <View className="px-6 pt-6 pb-20">
        {/* Patient Photo/Avatar */}
        <View className="items-center mb-6">
          {scannedData.patient.photo ? (
            <View className="w-24 h-24 rounded-full bg-gray-200">
              <Text className="text-xs text-center mt-10">Photo</Text>
            </View>
          ) : (
            <View className="w-24 h-24 rounded-full bg-teal-100 items-center justify-center">
              <Feather name="user" size={48} color="#14B8A6" />
            </View>
          )}
        </View>

        {/* Patient Name */}
        <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
          {scannedData.patient.name}
        </Text>

        {/* Patient Details Card */}
        <PatientInformationCard patient={scannedData.patient} />

        {/* Medication Orders Card */}
        <View className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons name="pill" size={20} color="#14B8A6" />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Medication Orders
            </Text>
          </View>

          {scannedData.activeOrders.length === 0 ? (
            <View className="py-8 items-center">
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={48}
                color="#9CA3AF"
              />
              <Text className="text-gray-500 mt-2">No medication orders</Text>
            </View>
          ) : (
            <View className="space-y-">
              {scannedData.activeOrders.map((order, index) => (
                <View key={order.id} className={index > 0 ? "mt-2" : ""}>
                  <MedicationOrderItem order={order} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Vitals Recording Section */}
        <View className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons
              name="heart-pulse"
              size={20}
              color="#14B8A6"
            />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Record Vitals
            </Text>
          </View>

          {/* Vitals Grid - 2 columns */}
          <View className="flex-row flex-wrap -mx-2">
            {[
              {
                label: "Blood Pressure (BP)",
                key: "bp" as keyof VitalsData,
                placeholder: "120/80",
                keyboardType: "default" as const,
              },
              {
                label: "Heart Rate (HR)",
                key: "hr" as keyof VitalsData,
                placeholder: "72 bpm",
                keyboardType: "numeric" as const,
              },
              {
                label: "Temperature (Temp)",
                key: "temp" as keyof VitalsData,
                placeholder: "37.5°C",
                keyboardType: "decimal-pad" as const,
              },
              {
                label: "Oxygen Saturation (SpO₂)",
                key: "spo2" as keyof VitalsData,
                placeholder: "98%",
                keyboardType: "numeric" as const,
              },
              {
                label: "Pain Score",
                key: "painScore" as keyof VitalsData,
                placeholder: "0-10",
                keyboardType: "numeric" as const,
              },
            ].map((field) => (
              <View key={field.key} className="w-1/2 px-2">
                <Input
                  compact
                  label={field.label}
                  value={vitals[field.key]}
                  onChangeText={(text) =>
                    setVitals({ ...vitals, [field.key]: text })
                  }
                  placeholder={field.placeholder}
                  keyboardType={field.keyboardType}
                  labelClassName="h-10"
                  inputClassName="h-11"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Record Administration Button */}
        <Button
          label="Record Administration"
          onPress={handleRecordAdministration}
          disabled={isRecording}
        />
      </View>
    </Screen>
  );
}
