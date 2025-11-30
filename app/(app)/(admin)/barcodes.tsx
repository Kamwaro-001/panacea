import { Screen } from "@/components/common/Screen";
import { getAllBarcodes } from "@/services/adminService";
import { Barcode } from "@/types";
import { showAlert } from "@/utils/alert";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function BarcodesScreen() {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBarcodes = async () => {
    try {
      const data = await getAllBarcodes();
      setBarcodes(data);
    } catch {
      showAlert("Error", "Failed to fetch barcodes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch barcodes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBarcodes();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBarcodes();
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showAlert("Copied", "Barcode copied to clipboard");
  };

  const renderBarcodeItem = ({ item }: { item: Barcode }) => (
    <View className="bg-white p-4 mb-2 rounded-lg border border-gray-200 flex-row items-center justify-between">
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-lg font-semibold text-gray-900 flex-1">
            {item.barcodeIdString}
          </Text>
          <TouchableOpacity
            onPress={() => copyToClipboard(item.barcodeIdString)}
            className="p-2"
          >
            <Ionicons name="copy" size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
        <View className="flex-row mt-2">
          <View
            className={`px-2 py-1 rounded ${
              item.status === "active" ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.status === "active" ? "text-green-800" : "text-gray-800"
              }`}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        {item.patientId && (
          <Text className="text-sm text-gray-600 mt-1">
            Patient ID: {item.patientId}
          </Text>
        )}
        <Text className="text-xs text-gray-400 mt-1">ID: {item.id}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 p-4">
        <View className="mb-4">
          <Text className="text-xl font-bold text-gray-900">
            Testing Barcodes
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            Tap the copy icon to copy a barcode for testing
          </Text>
        </View>

        <FlatList
          data={barcodes}
          keyExtractor={(item) => item.id}
          renderItem={renderBarcodeItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500">No barcodes found</Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}
