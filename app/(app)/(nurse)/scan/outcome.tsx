import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { PatientInformationCard } from "@/components/patient/PatientInformationCard";
import { AdminOutcome, ScannedBarcodeResponse, VitalsData } from "@/types";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function OutcomeScreen() {
  const params = useLocalSearchParams();

  // Parse the scanned data from route params
  const scannedData: ScannedBarcodeResponse = params.data
    ? JSON.parse(params.data as string)
    : null;

  const vitals: VitalsData = params.vitals
    ? JSON.parse(params.vitals as string)
    : null;

  const barcodeString = params.barcodeString as string | undefined;

  const handleOutcomeSelect = (outcome: AdminOutcome) => {
    if (outcome === "given") {
      // Navigate directly to final recording for "given"
      router.push({
        pathname: "/scan/record-final",
        params: {
          data: params.data,
          vitals: params.vitals,
          barcodeString: barcodeString || "",
          outcome: outcome,
        },
      });
    } else {
      // Navigate to reason & notes screen for other outcomes
      router.push({
        pathname: "/scan/reason",
        params: {
          data: params.data,
          vitals: params.vitals,
          barcodeString: barcodeString || "",
          outcome: outcome,
        },
      });
    }
  };

  if (!scannedData || !vitals) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-gray-600 mb-4">Missing required data</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const outcomeButtons: {
    outcome: AdminOutcome;
    label: string;
    icon: string;
    color: string;
  }[] = [
    {
      outcome: "given",
      label: "Given",
      icon: "check-circle",
      color: "#10B981",
    },
    {
      outcome: "delayed",
      label: "Delayed",
      icon: "clock",
      color: "#F59E0B",
    },
    {
      outcome: "not_given",
      label: "Not Given",
      icon: "x-circle",
      color: "#EF4444",
    },
    {
      outcome: "refused",
      label: "Refused",
      icon: "slash",
      color: "#6B7280",
    },
  ];

  return (
    <Screen scrollable>
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
      <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
        {scannedData.patient.name}
      </Text>

      <Text className="text-center text-gray-600 mb-6">
        Select administration outcome
      </Text>

      {/* Patient Details Card */}
      <PatientInformationCard patient={scannedData.patient} />

      {/* Vitals Summary */}
      <View className="bg-white rounded-lg p-4 shadow-sm mb-6">
        <View className="flex-row items-center mb-3">
          <MaterialCommunityIcons
            name="heart-pulse"
            size={18}
            color="#14B8A6"
          />
          <Text className="text-base font-semibold text-gray-900 ml-2">
            Recorded Vitals
          </Text>
        </View>
        <View className="flex-row flex-wrap">
          <Text className="text-sm text-gray-600 w-1/2 mb-1">
            BP: {vitals.bp}
          </Text>
          <Text className="text-sm text-gray-600 w-1/2 mb-1">
            HR: {vitals.hr}
          </Text>
          <Text className="text-sm text-gray-600 w-1/2 mb-1">
            Temp: {vitals.temp}
          </Text>
          <Text className="text-sm text-gray-600 w-1/2 mb-1">
            SpO₂: {vitals.spo2}
          </Text>
          <Text className="text-sm text-gray-600 w-1/2 mb-1">
            Pain: {vitals.painScore}
          </Text>
        </View>
      </View>

      {/* Outcome Buttons */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Outcome
        </Text>
        {outcomeButtons.map((button) => (
          <TouchableOpacity
            key={button.outcome}
            onPress={() => handleOutcomeSelect(button.outcome)}
            className="bg-white rounded-lg p-4 border border-gray-200 mb-3"
            activeOpacity={0.6}
          >
            <View className="flex-row items-center">
              <Feather
                name={button.icon as any}
                size={24}
                color={button.color}
              />
              <Text
                className="text-lg font-medium ml-3"
                style={{ color: button.color }}
              >
                {button.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}
