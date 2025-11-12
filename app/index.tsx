import { useAuthStore } from "@/stores/useAuthStore";
import { Redirect } from "expo-router";

export default function Index() {
  const { token } = useAuthStore();

  if (token) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
