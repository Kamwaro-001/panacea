import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import { BarcodeError, barcodeService } from "@/services/barcodeService";
import { showAlert, showSimpleAlert } from "@/utils/alert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function ScanScreen() {
  // TODO: Remove testing barcode input field and button before production
  const [testBarcodeInput, setTestBarcodeInput] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScanBarcode = async (barcodeString: string) => {
    if (!barcodeString.trim()) {
      showSimpleAlert("Error", "Please enter a barcode");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const data = await barcodeService.scanBarcode(barcodeString);
      // Navigate to verify page with scanned data
      router.push({
        pathname: "/scan/verify",
        params: {
          data: JSON.stringify(data),
        },
      });
      // Reset test input
      setTestBarcodeInput("");
    } catch (err) {
      console.log("Scan error caught:", err);
      console.log("Is BarcodeError?", err instanceof BarcodeError);

      if (err instanceof BarcodeError) {
        console.log("Error code:", err.errorCode);
        console.log("Error message:", err.message);

        // Handle special barcode error codes
        if (err.errorCode === "BARCODE_NOT_FOUND") {
          console.log("Showing BARCODE_NOT_FOUND alert");
          // Barcode not linked to a patient - ask to link
          showAlert(
            "Barcode Not Linked",
            "This barcode is not linked to any patient. Would you like to link it to a patient?",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  console.log("Cancel pressed");
                  setError(err.message);
                },
              },
              {
                text: "OK",
                onPress: () => {
                  console.log("OK pressed - navigating to link-patient");
                  // Navigate to link patient page
                  router.push({
                    pathname: "/scan/link-patient",
                    params: {
                      barcodeString: barcodeString,
                    },
                  });
                },
              },
            ]
          );
        } else if (err.errorCode === "BARCODE_ARCHIVED") {
          // Barcode is archived - just show error
          console.log("Barcode archived, showing error");
          setError(err.message);
        } else {
          // Other barcode errors
          console.log("Other barcode error");
          setError(err.message);
        }
      } else {
        console.log("Not a BarcodeError, generic error handling");
        setError(err instanceof Error ? err.message : "Failed to scan barcode");
      }
    } finally {
      setIsScanning(false);
    }
  };

  if (isScanning) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
        <Text className="text-gray-600 mt-4">Scanning barcode...</Text>
      </Screen>
    );
  }

  return (
    <Screen scrollable noPadding>
      <View className="px-6 pt-6 pb-20">
        {/* TODO: Remove this testing section before production */}
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <Text className="text-yellow-800 font-bold mb-2">
            ⚠️ Testing Mode
          </Text>
          <Text className="text-yellow-700 text-sm mb-3">
            Enter a barcode string manually for testing
          </Text>
          <Input
            compact
            label="Test Barcode Input"
            value={testBarcodeInput}
            onChangeText={setTestBarcodeInput}
            placeholder="Enter barcode string"
            autoCapitalize="none"
          />
          <Button
            label="Scan Test Barcode"
            onPress={() => handleScanBarcode(testBarcodeInput)}
            disabled={!testBarcodeInput.trim()}
          />
        </View>

        {/* Camera Scan Section - To be implemented */}
        <View className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons
              name="barcode-scan"
              size={24}
              color="#14B8A6"
            />
            <Text className="text-lg font-bold text-gray-900 ml-2">
              Barcode Scanner
            </Text>
          </View>
          <View className="items-center py-8 bg-gray-50 rounded-lg">
            <MaterialCommunityIcons name="camera" size={64} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4 text-center">
              Camera barcode scanning
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-1">
              (Supports Code128/QR codes)
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-1">
              To be implemented
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
