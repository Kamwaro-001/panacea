import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import { MedicationOrderItem } from "@/components/patient/MedicationOrderItem";
import { PatientInformationCard } from "@/components/patient/PatientInformationCard";
import { useAuthStore } from "@/stores/useAuthStore";
import { ScannedBarcodeResponse, VitalsData } from "@/types";
import { showSimpleAlert } from "@/utils/alert";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";

export default function VerifyAdministrationScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuthStore();

  // Parse the scanned data from route params
  const scannedData: ScannedBarcodeResponse = params.data
    ? JSON.parse(params.data as string)
    : null;

  const barcodeString = params.barcodeString as string | undefined;

  // Vitals state
  const [vitals, setVitals] = useState<VitalsData>({
    bp: "",
    hr: "",
    temp: "",
    spo2: "",
    painScore: "",
  });

  const handleRecordAdministration = () => {
    if (!scannedData || !user) return;

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

    // Validate Blood Pressure format and range
    const bpMatch = vitals.bp.match(/^(\d+)\/(\d+)$/);
    if (!bpMatch) {
      showSimpleAlert(
        "Invalid Blood Pressure",
        "Please enter BP in format: systolic/diastolic (e.g., 120/80)"
      );
      return;
    }
    const systolic = parseInt(bpMatch[1]);
    const diastolic = parseInt(bpMatch[2]);
    if (systolic < 70 || systolic > 250) {
      showSimpleAlert(
        "Invalid Blood Pressure",
        "Systolic BP must be between 70 and 250 mmHg"
      );
      return;
    }
    if (diastolic < 40 || diastolic > 150) {
      showSimpleAlert(
        "Invalid Blood Pressure",
        "Diastolic BP must be between 40 and 150 mmHg"
      );
      return;
    }

    // Validate Heart Rate
    const hr = parseInt(vitals.hr);
    if (isNaN(hr) || hr < 30 || hr > 250) {
      showSimpleAlert(
        "Invalid Heart Rate",
        "Heart Rate must be between 30 and 250 bpm"
      );
      return;
    }

    // Validate Temperature
    const temp = parseFloat(vitals.temp);
    if (isNaN(temp) || temp < 35.0 || temp > 42.0) {
      showSimpleAlert(
        "Invalid Temperature",
        "Temperature must be between 35.0°C and 42.0°C"
      );
      return;
    }

    // Validate SpO2
    const spo2 = parseInt(vitals.spo2);
    if (isNaN(spo2) || spo2 < 70 || spo2 > 100) {
      showSimpleAlert(
        "Invalid Oxygen Saturation",
        "SpO₂ must be between 70% and 100%"
      );
      return;
    }

    // Validate Pain Score
    const painScore = parseInt(vitals.painScore);
    if (isNaN(painScore) || painScore < 0 || painScore > 10) {
      showSimpleAlert(
        "Invalid Pain Score",
        "Pain Score must be between 0 and 10"
      );
      return;
    }

    // Validate that there are orders to administer
    if (scannedData.activeOrders.length === 0) {
      showSimpleAlert("Error", "No active medication orders to administer");
      return;
    }

    // Navigate to outcome selection screen
    router.push({
      pathname: "/scan/outcome",
      params: {
        data: JSON.stringify(scannedData),
        vitals: JSON.stringify(vitals),
        barcodeString: barcodeString || "",
      },
    });
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={100}
    >
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
                  maxLength: 7,
                },
                {
                  label: "Heart Rate (HR)",
                  key: "hr" as keyof VitalsData,
                  placeholder: "72",
                  keyboardType: "numeric" as const,
                  maxLength: 3,
                },
                {
                  label: "Temperature (Temp)",
                  key: "temp" as keyof VitalsData,
                  placeholder: "37.5",
                  keyboardType: "decimal-pad" as const,
                  maxLength: 4,
                },
                {
                  label: "Oxygen Saturation (SpO₂)",
                  key: "spo2" as keyof VitalsData,
                  placeholder: "98",
                  keyboardType: "numeric" as const,
                  maxLength: 3,
                },
                {
                  label: "Pain Score",
                  key: "painScore" as keyof VitalsData,
                  placeholder: "0-10",
                  keyboardType: "numeric" as const,
                  maxLength: 2,
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
                    maxLength={field.maxLength}
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
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
