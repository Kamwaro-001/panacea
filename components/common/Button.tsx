// components/common/Button.tsx
import { ActivityIndicator, Pressable, Text } from "react-native";

interface ButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  isLoading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = isLoading || disabled;

  return (
    <Pressable
      className={`w-full h-10 rounded-lg items-center justify-center ${
        isDisabled ? "bg-gray-400" : "bg-teal-600 active:bg-teal-700"
      }`}
      onPress={onPress}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-white text-base font-sans-bold">{label}</Text>
      )}
    </Pressable>
  );
}
