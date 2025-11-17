// components/common/Screen.tsx
import { ScrollView, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  noPadding?: boolean; // Add this new prop
}

export function Screen({
  children,
  scrollable = false,
  noPadding = false, // Default to false (padding)
  className, // Explicitly pull out className
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  // Conditionally build the className for the inner view
  const innerViewClassName = `
    flex-1
    ${noPadding ? "" : "p-6"} 
    ${className || ""}
  `;

  if (scrollable) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1 bg-gray-50"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <View className={innerViewClassName.trim()} {...props}>
          {children}
        </View>
      </ScrollView>
    );
  }

  return (
    <View
      className="flex-1 bg-gray-50"
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <View className={innerViewClassName.trim()} {...props}>
        {children}
      </View>
    </View>
  );
}
