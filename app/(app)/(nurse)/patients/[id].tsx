import { Button } from "@/components/common/Button";
import { Screen } from "@/components/common/Screen";
import { MedicationOrderItem } from "@/components/patient/MedicationOrderItem";
import { PatientInformationCard } from "@/components/patient/PatientInformationCard";
import { useOrderStore } from "@/stores/useOrderStore";
import { usePatientStore } from "@/stores/usePatientStore";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedPatient, isLoading, error, fetchPatientById } =
    usePatientStore();
  const {
    orders,
    isLoading: ordersLoading,
    error: ordersError,
    fetchOrdersByPatient,
    clearOrders,
  } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);

  // Load patient and orders immediately when ID changes
  useEffect(() => {
    if (id) {
      Promise.all([fetchPatientById(id), fetchOrdersByPatient(id)]);
    }
  }, [id, fetchPatientById, fetchOrdersByPatient]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (id) {
        Promise.all([fetchPatientById(id), fetchOrdersByPatient(id)]);
      }
    }, [id, fetchPatientById, fetchOrdersByPatient])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    if (!id) return;

    setRefreshing(true);
    try {
      await Promise.all([fetchPatientById(id), fetchOrdersByPatient(id)]);
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchPatientById, fetchOrdersByPatient]);

  const handleRetry = () => {
    if (id) {
      fetchPatientById(id);
    }
  };

  if ((isLoading || ordersLoading) && !selectedPatient) {
    return (
      <Screen className="justify-center items-center">
        <ActivityIndicator size="large" color="#14B8A6" />
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

  return (
    <Screen noPadding>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#14B8A6"]}
            tintColor="#14B8A6"
          />
        }
      >
        <View>
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
              <View className="w-24 h-24 rounded-full bg-teal-100 items-center justify-center">
                <Feather name="user" size={48} color="#14B8A6" />
              </View>
            )}
          </View>

          {/* Patient Name */}
          <Text className="text-2xl font-bold text-gray-900 text-center mb-6">
            {selectedPatient.name}
          </Text>

          {/* Patient Details Card */}
          <PatientInformationCard patient={selectedPatient} />

          {/* Medication Orders Card */}
          <View className="bg-white rounded-lg p-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <MaterialCommunityIcons name="pill" size={20} color="#14B8A6" />
              <Text className="text-lg font-bold text-gray-900 ml-2">
                Medication Orders
              </Text>
            </View>

            {ordersLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#14B8A6" />
                <Text className="text-gray-500 mt-2">Loading orders...</Text>
              </View>
            ) : ordersError ? (
              <View className="py-4">
                <Text className="text-red-600 text-center mb-2">
                  {ordersError}
                </Text>
              </View>
            ) : orders.length === 0 ? (
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
                {orders.map((order, index) => (
                  <View key={order.id} className={index > 0 ? "mt-2" : ""}>
                    <MedicationOrderItem order={order} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
