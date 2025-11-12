// components/common/Button.tsx
import { Pressable, Text, ActivityIndicator } from "react-native";

// No 'styled' import needed!

interface ButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
}

export function Button({ label, onPress, isLoading = false }: ButtonProps) {
  return (
    // Just use the standard <Pressable> component
    <Pressable
      className="w-full h-14 bg-teal-600 rounded-lg items-center justify-center active:bg-teal-700"
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white text-base font-sans-bold">{label}</Text>
      )}
    </Pressable>
  );
}
