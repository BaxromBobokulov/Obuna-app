import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { colors } from "@/constants/theme";
import { toAuthFailure } from "@/lib/auth";

// Closes the in-app browser and hands the OAuth result back to the app (needed on web).
WebBrowser.maybeCompleteAuthSession();

/** Pre-loads the Android custom tab so the Google screen opens instantly. */
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

interface GoogleAuthButtonProps {
  /** Same button signs in existing users and creates accounts for new ones. */
  label?: string;
  disabled?: boolean;
  onError: (message: string) => void;
  /** Lets the parent screen disable its own form while Google is in progress. */
  onBusyChange?: (busy: boolean) => void;
}

const GoogleAuthButton = ({
  label = "Continue with Google",
  disabled,
  onError,
  onBusyChange,
}: GoogleAuthButtonProps) => {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);

  const setBusy = (busy: boolean) => {
    setLoading(busy);
    onBusyChange?.(busy);
  };

  const handlePress = async () => {
    if (loading || disabled) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      // User closed the Google window — not an error, just stay on this screen.
      if (authSessionResult && authSessionResult.type !== "success") return;

      if (createdSessionId && setActive) {
        // The root layout's route guard moves the user into the app once the session is active.
        await setActive({ session: createdSessionId });
        return;
      }

      onError("We couldn't finish signing you in with Google. Please try again or use your email.");
    } catch (error) {
      onError(toAuthFailure(error).form ?? "Google sign-in failed. Please try again or use your email.");
    } finally {
      setBusy(false);
    }
  };

  const inactive = loading || disabled;

  return (
    <View>
      <Pressable
        onPress={handlePress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!inactive, busy: loading }}
        className={clsx("auth-google-button active:opacity-80", inactive && "opacity-60")}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.primary} />
            <Text className="auth-google-button-text">{label}</Text>
          </>
        )}
      </Pressable>

      <View className="auth-divider-row">
        <View className="auth-divider-line" />
        <Text className="auth-divider-text">or with email</Text>
        <View className="auth-divider-line" />
      </View>
    </View>
  );
};

export default GoogleAuthButton;
