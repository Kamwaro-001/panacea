import { Redirect } from "expo-router";
import { useAuthStore } from "../../stores/useAuthStore";
import { useWardStore } from "../../stores/useWardStore";
import { Loading } from "../../components/common/Loading";

export default function AppGatekeeper() {
  const { user } = useAuthStore();
  const { selectedWard } = useWardStore();

  if (!user) {
    // Auth store isn't loaded? Or user is invalid. Back to login.
    return <Redirect href="/(auth)/login" />;
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

  // if (role === "doctor") {
  //   return <Redirect href="/(app)/(doctor)" />;
  // }
  //
  // if (role === "admin") {
  //   return <Redirect href="/(app)/(admin)" />;
  // }

  // Fallback in case of an unknown role
  return <Loading />;
}
