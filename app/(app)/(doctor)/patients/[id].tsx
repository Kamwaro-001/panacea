import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import { PatientInformationCard } from "@/components/patient/PatientInformationCard";
import { createOrder, stopOrder, updateOrder } from "@/services/orderService";
import { useOrderStore } from "@/stores/useOrderStore";
import { usePatientStore } from "@/stores/usePatientStore";
import { MedicationOrder } from "@/types";
import { showAlert } from "@/utils/alert";
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function DoctorPatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedPatient, isLoading, error, fetchPatientById } =
    usePatientStore();
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    fetchOrdersByPatient,
  } = useOrderStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MedicationOrder | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    drug: "",
    dose: "",
    route: "",
    frequency: "",
  });

  useEffect(() => {
    if (id) {
      fetchPatientById(id);
      fetchOrdersByPatient(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRetry = () => {
    if (id) {
      fetchPatientById(id);
      fetchOrdersByPatient(id);
    }
  };

  const handleStopOrder = async (order: MedicationOrder) => {
    showAlert(
      "Stop Medication Order",
      `Are you sure you want to stop "${order.drug}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Stop",
          style: "destructive",
          onPress: async () => {
            try {
              await stopOrder(order.id);
              showAlert("Success", "Medication order stopped successfully");
              if (id) {
                fetchOrdersByPatient(id);
              }
            } catch (error) {
              showAlert(
                "Error",
                error instanceof Error ? error.message : "Failed to stop order"
              );
            }
          },
        },
      ]
    );
  };

  const handleEditOrder = (order: MedicationOrder) => {
    setEditingOrder(order);
    setFormData({
      drug: order.drug,
      dose: order.dose,
      route: order.route,
      frequency: order.frequency,
    });
    setShowEditModal(true);
  };

  const handleAddOrder = () => {
    setFormData({
      drug: "",
      dose: "",
      route: "",
      frequency: "",
    });
    setShowAddModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder || !id) return;

    if (
      !formData.drug ||
      !formData.dose ||
      !formData.route ||
      !formData.frequency
    ) {
      showAlert("Validation Error", "All fields are required");
      return;
    }

    setIsSaving(true);
    try {
      await updateOrder(editingOrder.id, formData);
      showAlert("Success", "Medication order updated successfully");
      setShowEditModal(false);
      setEditingOrder(null);
      fetchOrdersByPatient(id);
    } catch (error) {
      showAlert(
        "Error",
        error instanceof Error ? error.message : "Failed to update order"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNew = async () => {
    if (!id) return;

    if (
      !formData.drug ||
      !formData.dose ||
      !formData.route ||
      !formData.frequency
    ) {
      showAlert("Validation Error", "All fields are required");
      return;
    }

    setIsSaving(true);
    try {
      await createOrder({
        patientId: id,
        ...formData,
        startTime: new Date(),
        status: "active",
      });
      showAlert("Success", "Medication order added successfully");
      setShowAddModal(false);
      fetchOrdersByPatient(id);
    } catch (error) {
      showAlert(
        "Error",
        error instanceof Error ? error.message : "Failed to create order"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading patient details...</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen className="justify-center items-center px-6">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <Button label="Retry" onPress={handleRetry} />
      </Screen>
    );
  }

  if (!selectedPatient) {
    return (
      <Screen className="justify-center items-center">
        <Text className="text-gray-600">Patient not found</Text>
      </Screen>
    );
  }

  const activeOrders = orders.filter((order) => order.status === "active");

  return (
    <>
      <Screen scrollable noPadding>
        <View className="px-6 pt-6 pb-24">
          {/* Patient Photo/Avatar */}
          <View className="items-center mb-6">
            {selectedPatient.photo ? (
              <View className="w-24 h-24 rounded-full bg-gray-200">
                <Image
                  source={selectedPatient.photo}
                  className="w-24 h-24 rounded-full"
                />
              </View>
            ) : (
              <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center">
                <Feather name="user" size={48} color="#3B82F6" />
              </View>
            )}
          </View>

          {/* Patient Name */}
          <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
            {selectedPatient.name}
          </Text>

          {/* Patient Details Card */}
          <PatientInformationCard patient={selectedPatient} />

          {/* Active Medication Orders Card */}
          <View className="bg-white rounded-lg p-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons name="pill" size={20} color="#3B82F6" />
              <Text className="text-lg font-bold text-gray-900 ml-2">
                Active Medication Orders
              </Text>
            </View>

            {ordersLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-gray-500 mt-2">Loading orders...</Text>
              </View>
            ) : ordersError ? (
              <View className="py-4">
                <Text className="text-red-600 text-center mb-2">
                  {ordersError}
                </Text>
              </View>
            ) : activeOrders.length === 0 ? (
              <View className="py-8 items-center">
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={48}
                  color="#9CA3AF"
                />
                <Text className="text-gray-500 mt-2">
                  No active medication orders
                </Text>
              </View>
            ) : (
              <View>
                {activeOrders.map((order, index) => (
                  <View
                    key={order.id}
                    className={`p-3 rounded-lg border border-gray-200 ${index > 0 ? "mt-3" : ""}`}
                  >
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-sm font-bold text-gray-900 flex-1">
                        {order.drug} • {order.dose}
                      </Text>
                    </View>

                    <View className="mb-2">
                      <Text className="text-xs text-gray-600">
                        Route: {order.route} • Frequency: {order.frequency}
                      </Text>
                    </View>

                    <View className="flex-row items-center pt-2 border-t border-gray-100 mb-2">
                      <Feather name="clock" size={12} color="#6B7280" />
                      <Text className="text-xs text-gray-600 ml-1">
                        Started:{" "}
                        {new Date(order.startTime).toLocaleDateString()}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-2">
                      <Pressable
                        className="flex-1 bg-blue-50 border border-blue-200 rounded-lg py-2 px-3 active:bg-blue-100"
                        onPress={() => handleEditOrder(order)}
                      >
                        <View className="flex-row items-center justify-center">
                          <Feather name="edit-2" size={14} color="#3B82F6" />
                          <Text className="text-blue-600 font-semibold ml-1 text-xs">
                            Edit
                          </Text>
                        </View>
                      </Pressable>

                      <Pressable
                        className="flex-1 bg-red-50 border border-red-200 rounded-lg py-2 px-3 active:bg-red-100"
                        onPress={() => handleStopOrder(order)}
                      >
                        <View className="flex-row items-center justify-center">
                          <MaterialIcons
                            name="stop-circle"
                            size={16}
                            color="#DC2626"
                          />
                          <Text className="text-red-600 font-semibold ml-1 text-xs">
                            Stop
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Screen>

      {/* Floating Add Button */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 items-center justify-center shadow-lg active:bg-blue-700"
        onPress={handleAddOrder}
      >
        <Feather name="plus" size={28} color="white" />
      </Pressable>

      {/* Add Order Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900">
                  Add Medication Order
                </Text>
                <Pressable onPress={() => setShowAddModal(false)}>
                  <Feather name="x" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Input
                  label="Drug"
                  value={formData.drug}
                  onChangeText={(text) =>
                    setFormData({ ...formData, drug: text })
                  }
                  placeholder="Enter drug name"
                />

                <Input
                  label="Dose"
                  value={formData.dose}
                  onChangeText={(text) =>
                    setFormData({ ...formData, dose: text })
                  }
                  placeholder="e.g., 500mg"
                />

                <Input
                  label="Route"
                  value={formData.route}
                  onChangeText={(text) =>
                    setFormData({ ...formData, route: text })
                  }
                  placeholder="e.g., PO, IV, IM"
                />

                <Input
                  label="Frequency"
                  value={formData.frequency}
                  onChangeText={(text) =>
                    setFormData({ ...formData, frequency: text })
                  }
                  placeholder="e.g., BID, TID, QID"
                />

                <View className="mt-6">
                  <Button
                    label="Save"
                    onPress={handleSaveNew}
                    isLoading={isSaving}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[90%]">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900">
                  Edit Medication Order
                </Text>
                <Pressable onPress={() => setShowEditModal(false)}>
                  <Feather name="x" size={24} color="#6B7280" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Input
                  label="Drug"
                  value={formData.drug}
                  onChangeText={(text) =>
                    setFormData({ ...formData, drug: text })
                  }
                  placeholder="Enter drug name"
                />

                <Input
                  label="Dose"
                  value={formData.dose}
                  onChangeText={(text) =>
                    setFormData({ ...formData, dose: text })
                  }
                  placeholder="e.g., 500mg"
                />

                <Input
                  label="Route"
                  value={formData.route}
                  onChangeText={(text) =>
                    setFormData({ ...formData, route: text })
                  }
                  placeholder="e.g., PO, IV, IM"
                />

                <Input
                  label="Frequency"
                  value={formData.frequency}
                  onChangeText={(text) =>
                    setFormData({ ...formData, frequency: text })
                  }
                  placeholder="e.g., BID, TID, QID"
                />

                <View className="mt-6">
                  <Button
                    label="Update"
                    onPress={handleSaveEdit}
                    isLoading={isSaving}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
