import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { Loading } from "../../components/common/Loading";
import { useAuthStore } from "../../stores/useAuthStore";
import { useDoctorWardStore } from "../../stores/useDoctorWardStore";
import { useWardStore } from "../../stores/useWardStore";

export default function AppGatekeeper() {
  const { user, isInitialSyncing } = useAuthStore();
  const { selectedWard } = useWardStore();
  const { selectedWards } = useDoctorWardStore();

  if (!user) {
    // Auth store isn't loaded? Or user is invalid. Back to login.
    return <Redirect href="/(auth)/login" />;
  }

  // Wait for initial sync to complete before navigating
  if (isInitialSyncing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Loading />
        <Text style={{ marginTop: 16, color: "#6b7280" }}>
          Downloading initial data...
        </Text>
      </View>
    );
  }

  const { role } = user;

  // Redirect logic

  if (role === "nurse") {
    if (!selectedWard) {
      // Nurse, but no ward? Go to ward-select.
      return <Redirect href="/(app)/ward-select" />;
    }
    // Nurse with a ward? Go to nurse dashboard.
    return <Redirect href="/(app)/(nurse)" />;
  }

  if (role === "doctor" || role === "consultant") {
    if (selectedWards.length === 0) {
      // Doctor, but no wards? Go to ward-select.
      return <Redirect href="/(app)/ward-select" />;
    }
    // Doctor with wards? Go to doctor dashboard.
    return <Redirect href={"/(app)/(doctor)" as any} />;
  }

  if (role === "admin") {
    return <Redirect href="/(app)/(admin)" />;
  }

  // Fallback in case of an unknown role
  return <Loading />;
}
