import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { BarcodeError, barcodeService } from "@/services/barcodeService";
import { useWardStore } from "@/stores/useWardStore";
import { showAlert, showSimpleAlert } from "@/utils/alert";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function ScanScreen() {
  // TODO: Remove testing barcode input field and button before production
  const [testBarcodeInput, setTestBarcodeInput] = useState("");

  const { selectedWard } = useWardStore();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanningRef = useRef(false);

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    // Prevent multiple scans while processing
    if (scanningRef.current) return;

    scanningRef.current = true;
    const barcodeString = result.data;

    await handleScanBarcode(barcodeString);

    // Reset after a delay to allow for navigation
    setTimeout(() => {
      scanningRef.current = false;
    }, 2000);
  };

  const handleScanBarcode = async (barcodeString: string) => {
    if (!barcodeString.trim()) {
      showSimpleAlert("Error", "Please enter a barcode");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const data = await barcodeService.scanBarcode(barcodeString);

      // Validate that the patient belongs to the selected ward
      if (selectedWard && data.patient.wardId !== selectedWard.id) {
        // Get ward name for display
        const patientWardName = data.patient.ward?.name || "a different ward";

        showAlert(
          "Wrong Ward",
          `This patient belongs to ${patientWardName}, but you have ${selectedWard.name} selected. Please scan a patient from ${selectedWard.name} or switch to the correct ward.`,
          [
            {
              text: "OK",
              onPress: () => {
                setError(
                  `Patient belongs to ${patientWardName}. Please scan a barcode from ${selectedWard.name}.`
                );
              },
            },
          ]
        );
        return;
      }

      // Close camera before navigation
      setIsCameraActive(false);
      // Navigate to verify page with scanned data
      router.push({
        pathname: "/scan/verify",
        params: {
          data: JSON.stringify(data),
          barcodeString: barcodeString,
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
      <View className="flex-1 justify-center px-6 py-20">
        {/* TODO: Remove this testing section before production */}
        {/* <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
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
        </View> */}

        {/* Camera Scan Section */}
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

          {!permission ? (
            <View className="items-center py-8 bg-gray-50 rounded-lg">
              <ActivityIndicator size="small" color="#14B8A6" />
              <Text className="text-gray-500 mt-4 text-center">
                Loading camera...
              </Text>
            </View>
          ) : !permission.granted ? (
            <View className="items-center py-8 bg-gray-50 rounded-lg">
              <MaterialCommunityIcons
                name="camera-off"
                size={64}
                color="#9CA3AF"
              />
              <Text className="text-gray-600 mt-4 text-center font-semibold">
                Camera Permission Required
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-2 mb-4">
                Allow camera access to scan barcodes
              </Text>
              <Button label="Grant Permission" onPress={requestPermission} />
            </View>
          ) : !isCameraActive ? (
            <View className="items-center py-8 bg-gray-50 rounded-lg">
              <MaterialCommunityIcons name="camera" size={64} color="#14B8A6" />
              <Text className="text-gray-600 mt-4 text-center font-semibold">
                Ready to Scan
              </Text>
              <Text className="text-gray-500 text-sm text-center mt-2 mb-4">
                Supports Code128 and QR codes
              </Text>
              <Button
                label="Open Camera"
                onPress={() => {
                  setError(null);
                  setIsCameraActive(true);
                }}
              />
            </View>
          ) : (
            <View className="overflow-hidden rounded-lg">
              <View className="aspect-[4/3] bg-black">
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr", "code128"],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                >
                  {/* Scanning overlay */}
                  <View className="flex-1 justify-center items-center">
                    <View className="border-2 border-teal-400 rounded-lg w-64 h-48" />
                    <Text className="text-white text-center mt-4 bg-black/50 px-4 py-2 rounded-lg">
                      Position barcode within frame
                    </Text>
                  </View>
                </CameraView>
              </View>
              <View className="bg-gray-100 p-4">
                <Button
                  label="Close Camera"
                  onPress={() => setIsCameraActive(false)}
                />
              </View>
            </View>
          )}
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
