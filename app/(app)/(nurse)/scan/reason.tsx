import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import {
  AdminOutcome,
  ReasonCode,
  ScannedBarcodeResponse,
  VitalsData,
} from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface ReasonOption {
  code: ReasonCode;
  label: string;
  description?: string;
  requiresNote?: boolean;
  smartPrompts?: string[];
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    code: "PATIENT_NOT_IN_WARD",
    label: "Patient not in ward",
    smartPrompts: [
      "Follow-up in 30 min",
      "Follow-up in 1 hour",
      "Notify charge nurse",
    ],
  },
  {
    code: "PATIENT_ASLEEP",
    label: "Patient asleep",
  },
  {
    code: "PATIENT_REFUSED",
    label: "Patient refused",
  },
  {
    code: "NPO",
    label: "NPO/Fasting",
  },
  {
    code: "VITALS_UNSAFE",
    label: "Vitals unsafe",
    description: "Check vitals before proceeding",
  },
  {
    code: "ALLERGY_RISK",
    label: "Allergy risk",
  },
  {
    code: "IV_ACCESS_ISSUE",
    label: "IV access issue",
  },
  {
    code: "MED_STOCK_OUT",
    label: "Medication not available",
    smartPrompts: ["Notify pharmacy"],
  },
  {
    code: "MED_MISPLACED",
    label: "Medication misplaced",
  },
  {
    code: "PHARMACY_DELAY",
    label: "Pharmacy delay",
    smartPrompts: ["Notify pharmacy"],
  },
  {
    code: "ORDER_CLARIFY",
    label: "Order unclear",
    requiresNote: true,
    smartPrompts: ["Notify doctor", "Notify consultant"],
  },
  {
    code: "PRESCRIBER_WITHHELD",
    label: "Doctor withheld",
  },
  {
    code: "DUPLICATE_RISK",
    label: "Duplicate dose risk",
    description: "⚠️ Blocking warning",
  },
  {
    code: "TIME_WINDOW_MISS",
    label: "Wrong time window",
  },
  {
    code: "OTHER",
    label: "Other",
    requiresNote: true,
  },
];

export default function ReasonScreen() {
  const params = useLocalSearchParams();

  const scannedData: ScannedBarcodeResponse = params.data
    ? JSON.parse(params.data as string)
    : null;

  const vitals: VitalsData = params.vitals
    ? JSON.parse(params.vitals as string)
    : null;

  const outcome = params.outcome as AdminOutcome;
  const barcodeString = params.barcodeString as string | undefined;

  const [selectedReason, setSelectedReason] = useState<ReasonCode | null>(null);
  const [reasonNote, setReasonNote] = useState("");

  const selectedReasonOption = REASON_OPTIONS.find(
    (r) => r.code === selectedReason
  );

  const handleContinue = () => {
    if (!selectedReason) {
      return;
    }

    // Validate required note
    if (selectedReasonOption?.requiresNote && !reasonNote.trim()) {
      return;
    }

    // Validate note length
    if (reasonNote.length > 200) {
      return;
    }

    router.push({
      pathname: "/scan/record-final",
      params: {
        data: params.data,
        vitals: params.vitals,
        barcodeString: barcodeString || "",
        outcome: outcome,
        reasonCode: selectedReason,
        reasonNote: reasonNote || "",
      },
    });
  };

  if (!scannedData || !vitals || !outcome) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-gray-600 mb-4">Missing required data</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const canContinue =
    selectedReason &&
    (!selectedReasonOption?.requiresNote || reasonNote.trim().length > 0) &&
    reasonNote.length <= 200;

  return (
    <Screen scrollable>
      <View className="mb-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          {scannedData.patient.name}
        </Text>
        <View className="flex-row items-center">
          <View
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor:
                outcome === "delayed"
                  ? "#FEF3C7"
                  : outcome === "not_given"
                    ? "#FEE2E2"
                    : "#F3F4F6",
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{
                color:
                  outcome === "delayed"
                    ? "#F59E0B"
                    : outcome === "not_given"
                      ? "#EF4444"
                      : "#6B7280",
              }}
            >
              {outcome === "delayed"
                ? "Delayed"
                : outcome === "not_given"
                  ? "Not Given"
                  : "Refused"}
            </Text>
          </View>
        </View>
      </View>

      {/* Reason Selection */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Select Reason
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row flex-wrap -mx-1"
        >
          <View className="flex-row flex-wrap">
            {REASON_OPTIONS.map((reason) => (
              <TouchableOpacity
                key={reason.code}
                onPress={() => setSelectedReason(reason.code)}
                className={`m-1 px-4 py-2 rounded-full border ${
                  selectedReason === reason.code
                    ? "bg-teal-50 border-teal-500"
                    : "bg-white border-gray-300"
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedReason === reason.code
                      ? "text-teal-700"
                      : "text-gray-700"
                  }`}
                >
                  {reason.label}
                  {reason.requiresNote && " *"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* TODO: Re-enable the smart prompts */}
      {/* Smart Prompts */}
      {/* {selectedReasonOption?.smartPrompts && (
        <View className="bg-blue-50 rounded-lg p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons
              name="lightbulb-on"
              size={18}
              color="#3B82F6"
            />
            <Text className="text-sm font-semibold text-blue-900 ml-2">
              Suggested Actions
            </Text>
          </View>
          {selectedReasonOption.smartPrompts.map((prompt, index) => (
            <Text key={index} className="text-sm text-blue-800 ml-6">
              • {prompt}
            </Text>
          ))}
        </View>
      )} */}

      {/* Description/Warning */}
      {selectedReasonOption?.description && (
        <View
          className={`rounded-lg p-4 mb-6 ${
            selectedReason === "DUPLICATE_RISK" ? "bg-red-50" : "bg-yellow-50"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              selectedReason === "DUPLICATE_RISK"
                ? "text-red-800"
                : "text-yellow-800"
            }`}
          >
            {selectedReasonOption.description}
          </Text>
        </View>
      )}

      {/* Notes Input */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900">
            Additional Notes
            {selectedReasonOption?.requiresNote && (
              <Text className="text-red-500"> *</Text>
            )}
          </Text>
          <Text
            className={`text-sm ${
              reasonNote.length > 200 ? "text-red-500" : "text-gray-500"
            }`}
          >
            {reasonNote.length}/200
          </Text>
        </View>
        <Input
          multiline
          value={reasonNote}
          onChangeText={setReasonNote}
          placeholder={
            selectedReasonOption?.requiresNote
              ? "Please provide details..."
              : "Optional notes (max 200 characters)"
          }
          inputClassName="h-24"
          label=""
        />
        {selectedReasonOption?.requiresNote && !reasonNote.trim() && (
          <Text className="text-sm text-red-500 mt-1">
            Note is required for this reason
          </Text>
        )}
        {reasonNote.length > 200 && (
          <Text className="text-sm text-red-500 mt-1">
            Note must be 200 characters or less
          </Text>
        )}
      </View>

      {/* Continue Button */}
      <Button
        label="Continue"
        onPress={handleContinue}
        disabled={!canContinue}
      />
    </Screen>
  );
}
