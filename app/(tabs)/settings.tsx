import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import images from "@/constants/images";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [loggingOut, setLoggingOut] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  // Only the "First name" the user entered at sign-up — never last name, email or other sources.
  const name = user?.firstName?.trim() ?? "";

  // The root layout's route guard sends the user back to sign-in once the session ends.
  const logOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      setLoggingOut(false);
      Alert.alert("Couldn't log out", "Check your connection and try again.");
    }
  };

  const confirmLogOut = () =>
    Alert.alert("Log out?", "You'll need to sign in again to see your subscriptions.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logOut },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-background p-5" edges={["top"]}>
      <Text className="list-title mb-5">Settings</Text>

      <View className="settings-account">
        <Image source={user?.hasImage ? { uri: user.imageUrl } : images.avatar} className="settings-avatar" />
        <View className="sub-copy">
          <Text numberOfLines={1} className="sub-title">
            {name}
          </Text>
          <Text numberOfLines={1} className="sub-meta">
            {email}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={confirmLogOut}
        disabled={loggingOut}
        accessibilityRole="button"
        accessibilityLabel="Log out"
        accessibilityState={{ disabled: loggingOut, busy: loggingOut }}
        className={clsx("settings-logout active:opacity-80", loggingOut && "opacity-60")}
      >
        {loggingOut ? (
          <ActivityIndicator color={colors.destructive} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
            <Text className="settings-logout-text">Log out</Text>
          </>
        )}
      </Pressable>
    </SafeAreaView>
  );
};

export default Settings;
