import { Text, View } from "react-native";

const BrandMark = () => (
  <View className="auth-logo-wrap" accessible accessibilityLabel="Sandq, smart billing">
    <View className="auth-logo-mark">
      <Text className="auth-logo-mark-text">S</Text>
    </View>
    <View>
      <Text className="auth-wordmark">Sandq</Text>
      <Text className="auth-wordmark-sub">Smart billing</Text>
    </View>
  </View>
);

export default BrandMark;
