import { Text, TextInput, TextInputProps, View } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
  compact?: boolean;
  labelClassName?: string;
  inputClassName?: string;
}

export function Input({
  label,
  compact = false,
  labelClassName,
  inputClassName,
  ...props
}: InputProps) {
  return (
    <View className="w-full mb-4">
      <View
        className={`${compact ? "mb-1" : "mb-2"} ` + ` ${labelClassName || ""}`}
      >
        <Text className="text-sm font-sans-bold text-gray-700">{label}</Text>
      </View>
      <TextInput
        className={`w-full ${compact ? "h-10" : "h-14"} bg-white border border-gray-300 rounded-lg ${compact ? "px-3" : "px-4"} text-base text-black`}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );
}
