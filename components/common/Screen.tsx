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
  noPadding = false,
  className,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const innerViewClassName =
    `flex-1 ${noPadding ? "" : "p-6"} ${className || ""}`.trim();

  const safeAreaStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const content = (
    <View className={innerViewClassName} {...props}>
      {children}
    </View>
  );

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? { contentContainerStyle: { flexGrow: 1 } }
    : {};

  return (
    <>
      <Container
        className="flex-1 bg-gray-50"
        style={safeAreaStyle}
        {...containerProps}
      >
        {content}
      </Container>
    </>
  );
}
