import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import { createWard, getAllWards } from "@/services/adminService";
import { Ward } from "@/types";
import { showAlert } from "@/utils/alert";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

export default function WardsScreen() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchWards = async () => {
    try {
      const data = await getAllWards();
      setWards(data);
    } catch {
      showAlert("Error", "Failed to fetch wards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWards();
  };

  const handleCreateWard = async () => {
    if (!name.trim()) {
      showAlert("Validation Error", "Ward name is required");
      return;
    }

    setCreating(true);
    try {
      await createWard({ name, description });
      showAlert("Success", "Ward created successfully");
      setName("");
      setDescription("");
      fetchWards();
    } catch {
      showAlert("Error", "Failed to create ward");
    } finally {
      setCreating(false);
    }
  };

  const renderWardItem = ({ item }: { item: Ward }) => (
    <View className="bg-white p-4 mb-2 rounded-lg border border-gray-200">
      <Text className="text-lg font-semibold text-gray-900">{item.name}</Text>
      {item.description && (
        <Text className="text-sm text-gray-600 mt-1">{item.description}</Text>
      )}
      <Text className="text-xs text-gray-400 mt-1">ID: {item.id}</Text>
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
        {/* Create Ward Form */}
        <View className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
          <Text className="text-xl font-bold mb-4 text-gray-900">
            Create New Ward
          </Text>
          <Input
            label="Ward Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g., ICU, General Ward"
          />
          <Input
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description of the ward"
            multiline
          />
          <Button
            label="Create Ward"
            onPress={handleCreateWard}
            isLoading={creating}
            disabled={creating}
          />
        </View>

        {/* Wards List */}
        <Text className="text-xl font-bold mb-2 text-gray-900">All Wards</Text>
        <FlatList
          data={wards}
          keyExtractor={(item) => item.id}
          renderItem={renderWardItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500">No wards found</Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}
