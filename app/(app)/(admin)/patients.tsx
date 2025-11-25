import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Screen } from "@/components/common/Screen";
import {
  createPatientProfile,
  getPatientsByWard,
} from "@/services/adminService";
import { getWards } from "@/services/wardService";
import { PatientProfile, Ward } from "@/types";
import { showAlert } from "@/utils/alert";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PatientsScreen() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [wardId, setWardId] = useState("");

  const fetchData = async () => {
    try {
      // First fetch all wards
      const wardsData = await getWards();
      setWards(wardsData);

      // Then fetch patients from all wards
      const patientPromises = wardsData.map((ward) =>
        getPatientsByWard(ward.id)
      );
      const patientsArrays = await Promise.all(patientPromises);

      // Flatten the array of arrays into a single array
      const allPatients = patientsArrays.flat();
      setPatients(allPatients);
    } catch {
      showAlert("Error", "Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreatePatient = async () => {
    if (!name.trim() || !bedNumber.trim() || !diagnosis.trim() || !wardId) {
      showAlert(
        "Validation Error",
        "All fields are required except attending doctors"
      );
      return;
    }

    setCreating(true);
    try {
      await createPatientProfile({
        name,
        bedNumber,
        diagnosis,
        wardId,
      });
      showAlert("Success", "Patient created successfully");
      setName("");
      setBedNumber("");
      setDiagnosis("");
      setWardId("");
      fetchData();
    } catch {
      showAlert("Error", "Failed to create patient");
    } finally {
      setCreating(false);
    }
  };

  const getWardName = (id: string) => {
    const ward = wards.find((w) => w.id === id);
    return ward?.name || "Unknown Ward";
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

  const selectedWardName = wardId
    ? wards.find((w) => w.id === wardId)?.name || "Select a ward"
    : "Select a ward";

  return (
    <Screen>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {/* Create Patient Form */}
          <View className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <Text className="text-xl font-bold mb-4 text-gray-900">
              Add New Patient
            </Text>
            <Input
              label="Patient Name"
              value={name}
              onChangeText={setName}
              placeholder="Full name"
            />
            <Input
              label="Bed Number"
              value={bedNumber}
              onChangeText={setBedNumber}
              placeholder="e.g., A101"
            />
            <Input
              label="Diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholder="Primary diagnosis"
              multiline
            />

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Ward
              </Text>
              <ScrollView
                className="border border-gray-300 rounded-lg bg-gray-50 max-h-48"
                nestedScrollEnabled
              >
                {wards.length === 0 ? (
                  <View className="p-4">
                    <Text className="text-gray-500 text-center">
                      No wards available
                    </Text>
                  </View>
                ) : (
                  wards.map((ward) => (
                    <TouchableOpacity
                      key={ward.id}
                      onPress={() => setWardId(ward.id)}
                      className={`p-4 border-b border-gray-200 ${
                        wardId === ward.id ? "bg-blue-100" : "bg-white"
                      }`}
                    >
                      <Text
                        className={`text-base ${
                          wardId === ward.id
                            ? "font-semibold text-blue-900"
                            : "text-gray-900"
                        }`}
                      >
                        {ward.name}
                      </Text>
                      {ward.description && (
                        <Text className="text-sm text-gray-600 mt-1">
                          {ward.description}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              {wardId && (
                <Text className="text-sm text-gray-600 mt-1">
                  Selected: {selectedWardName}
                </Text>
              )}
            </View>

            <Button
              label="Add Patient"
              onPress={handleCreatePatient}
              isLoading={creating}
              disabled={creating}
            />
          </View>

          {/* Patients List */}
          <Text className="text-lg font-bold mb-2 text-gray-900">
            All Patients
          </Text>
          {patients.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Text className="text-gray-500">No patients found</Text>
            </View>
          ) : (
            patients.map((item) => (
              <View
                key={item.id}
                className="bg-white p-4 mb-2 rounded-lg border border-gray-200"
              >
                <Text className="text-lg font-semibold text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  Bed: {item.bedNumber} | Ward: {getWardName(item.wardId)}
                </Text>
                <Text className="text-sm text-gray-600">
                  Diagnosis: {item.diagnosis}
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  ID: {item.id}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
