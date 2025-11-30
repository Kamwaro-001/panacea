import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { recordAdministration } from "@/services/eventService";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  AdminOutcome,
  ReasonCode,
  ScannedBarcodeResponse,
  VitalsData,
} from "@/types";
import { showAlert, showSimpleAlert } from "@/utils/alert";
import { getNetworkStatus } from "@/utils/networkMonitor";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function RecordFinalScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuthStore();

  const scannedData: ScannedBarcodeResponse = params.data
    ? JSON.parse(params.data as string)
    : null;

  const vitals: VitalsData = params.vitals
    ? JSON.parse(params.vitals as string)
    : null;

  const outcome = params.outcome as AdminOutcome;
  const reasonCode = params.reasonCode as ReasonCode | undefined;
  const reasonNote = params.reasonNote as string | undefined;
  const barcodeString = params.barcodeString as string | undefined;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);

  // Auto-record on mount
  useEffect(() => {
    handleRecordAdministration();
  }, []);

  const handleRecordAdministration = async () => {
    if (!scannedData || !user || recordingComplete) return;

    setIsRecording(true);
    try {
      // Get barcode ID from local database if barcode was scanned
      let scannedBarcodeId: string | undefined;
      if (barcodeString) {
        const { getBarcodeByStringLocal } = await import("@/database/helpers");
        const barcode = await getBarcodeByStringLocal(barcodeString);
        scannedBarcodeId = barcode?.id;
      }

      // Check network status
      const isOnline = await getNetworkStatus();

      // Record administration for each active order
      for (const order of scannedData.activeOrders) {
        await recordAdministration({
          orderId: order.id,
          patientId: scannedData.patient.id,
          nurseId: user.id,
          outcome: outcome,
          vitalsBp: vitals.bp,
          vitalsHr: vitals.hr,
          vitalsTemp: vitals.temp,
          vitalsSpo2: vitals.spo2,
          vitalsPain: vitals.painScore,
          scannedBarcodeId,
          reasonCode,
          reasonNote,
        });
      }

      setRecordingComplete(true);

      const orderCount = scannedData.activeOrders.length;
      const recordText = orderCount > 1 ? "All records" : "Record";
      const syncMessage = isOnline
        ? `${recordText} synced successfully.`
        : `${recordText} will sync when online.`;

      const outcomeText =
        outcome === "given"
          ? "Medication administered"
          : outcome === "delayed"
            ? "Administration delayed"
            : outcome === "not_given"
              ? "Medication not given"
              : "Patient refused medication";

      showAlert(
        "Success",
        `${outcomeText} for ${orderCount} order(s). ${syncMessage}`,
        [
          {
            text: "OK",
            onPress: () => {
              router.push("/scan");
            },
          },
        ]
      );
    } catch (err) {
      showSimpleAlert(
        "Error",
        err instanceof Error ? err.message : "Failed to record administration"
      );
      setIsRecording(false);
    }
  };

  if (!scannedData || !vitals || !outcome) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-gray-600 mb-4">Missing required data</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const outcomeConfig = {
    given: {
      icon: "check-circle",
      color: "#10B981",
      bgColor: "#D1FAE5",
      label: "Given",
    },
    delayed: {
      icon: "clock",
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      label: "Delayed",
    },
    not_given: {
      icon: "x-circle",
      color: "#EF4444",
      bgColor: "#FEE2E2",
      label: "Not Given",
    },
    refused: {
      icon: "slash",
      color: "#6B7280",
      bgColor: "#F3F4F6",
      label: "Refused",
    },
  }[outcome];

  return (
    <Screen className="justify-center items-center px-6">
      {isRecording && !recordingComplete ? (
        <>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text className="text-lg text-gray-700 mt-4 text-center">
            Recording administration...
          </Text>
          <Text className="text-sm text-gray-500 mt-2 text-center">
            Please wait while we save your record
          </Text>
        </>
      ) : (
        <>
          {/* Success Icon */}
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: outcomeConfig.bgColor }}
          >
            <Feather
              name={outcomeConfig.icon as any}
              size={48}
              color={outcomeConfig.color}
            />
          </View>

          {/* Patient Info */}
          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {scannedData.patient.name}
          </Text>

          <View
            className="px-4 py-2 rounded-full mb-6"
            style={{ backgroundColor: outcomeConfig.bgColor }}
          >
            <Text
              className="text-lg font-semibold"
              style={{ color: outcomeConfig.color }}
            >
              {outcomeConfig.label}
            </Text>
          </View>

          {/* Medication Count */}
          <View className="bg-white rounded-lg p-6 shadow-sm mb-6 w-full">
            <View className="flex-row items-center justify-center">
              <MaterialCommunityIcons name="pill" size={24} color="#14B8A6" />
              <Text className="text-lg text-gray-700 ml-2">
                {scannedData.activeOrders.length}{" "}
                {scannedData.activeOrders.length === 1
                  ? "medication"
                  : "medications"}{" "}
                recorded
              </Text>
            </View>
          </View>

          {/* Reason (if applicable) */}
          {reasonCode && (
            <View className="bg-gray-50 rounded-lg p-4 w-full mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-1">
                Reason:
              </Text>
              <Text className="text-base text-gray-900">
                {reasonCode.replace(/_/g, " ")}
              </Text>
              {reasonNote && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mt-3 mb-1">
                    Note:
                  </Text>
                  <Text className="text-base text-gray-900">{reasonNote}</Text>
                </>
              )}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
