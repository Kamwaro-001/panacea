import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import { createUser, getAllUsers } from "@/services/adminService";
import { UserProfile, UserRole } from "@/types";
import { showAlert } from "@/utils/alert";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function UsersScreen() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("nurse");
  const [pin, setPin] = useState("");

  const fetchUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch {
      showAlert("Error", "Failed to fetch users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch users when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!staffId.trim() || !name.trim() || !role || !pin.trim()) {
      showAlert("Validation Error", "All fields are required");
      return;
    }

    setCreating(true);
    try {
      await createUser({
        staffId,
        name,
        role,
        pin,
      });
      showAlert("Success", "User created successfully");
      setStaffId("");
      setName("");
      setRole("nurse");
      setPin("");
      fetchUsers();
    } catch {
      showAlert("Error", "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={100}
      >
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          <View className="p-4">
            {/* Create User Form */}
            <View className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
              <Text className="text-xl font-bold mb-4 text-gray-900">
                Create New User
              </Text>
              <Input
                label="Staff ID"
                value={staffId}
                onChangeText={setStaffId}
                placeholder="e.g., ST001"
              />
              <Input
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
              />

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Role
                </Text>
                <View className="border border-gray-300 rounded-lg bg-gray-50">
                  {(
                    ["nurse", "doctor", "consultant", "admin"] as UserRole[]
                  ).map((roleOption) => (
                    <TouchableOpacity
                      key={roleOption}
                      onPress={() => setRole(roleOption)}
                      className={`p-4 border-b border-gray-200 ${
                        role === roleOption ? "bg-blue-100" : "bg-white"
                      }`}
                    >
                      <Text
                        className={`text-base capitalize ${
                          role === roleOption
                            ? "font-semibold text-blue-900"
                            : "text-gray-900"
                        }`}
                      >
                        {roleOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {role && (
                  <Text className="text-sm text-gray-600 mt-1">
                    Selected: {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                )}
              </View>

              <Input
                label="PIN"
                value={pin}
                onChangeText={setPin}
                placeholder="Enter 4 digit PIN"
                secureTextEntry
                keyboardType="numeric"
              />

              <Button
                label="Create User"
                onPress={handleCreateUser}
                isLoading={creating}
                disabled={creating}
              />
            </View>

            {/* Users List */}
            <Text className="text-xl font-bold mb-2 text-gray-900">
              All Users
            </Text>
            {users.length === 0 ? (
              <View className="items-center justify-center py-8">
                <Text className="text-gray-500">No users found</Text>
              </View>
            ) : (
              users.map((item) => (
                <View
                  key={item.id}
                  className="bg-white p-4 mb-2 rounded-lg border border-gray-200"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-lg font-semibold text-gray-900">
                      {item.name}
                    </Text>
                    <View
                      className={`px-2 py-1 rounded ${
                        item.role === "admin"
                          ? "bg-purple-100"
                          : item.role === "doctor"
                            ? "bg-blue-100"
                            : item.role === "consultant"
                              ? "bg-green-100"
                              : "bg-yellow-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          item.role === "admin"
                            ? "text-purple-800"
                            : item.role === "doctor"
                              ? "text-blue-800"
                              : item.role === "consultant"
                                ? "text-green-800"
                                : "text-yellow-800"
                        }`}
                      >
                        {item.role.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-sm text-gray-600 mt-1">
                    Staff ID: {item.staffId}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className={`px-2 py-1 rounded ${
                        item.isActive ? "bg-green-100" : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          item.isActive ? "text-green-800" : "text-red-800"
                        }`}
                      >
                        {item.isActive ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-400 mt-1">
                    ID: {item.id}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
