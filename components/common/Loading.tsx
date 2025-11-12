// components/common/Loading.tsx
import { ActivityIndicator } from "react-native";
import { Screen } from "./Screen";

export function Loading() {
  return (
    <Screen className="items-center justify-center">
      <ActivityIndicator size="large" color="#0D9488" />
    </Screen>
  );
}
