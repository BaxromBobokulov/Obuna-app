import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

const COOLDOWN_SECONDS = 30;

interface ResendCodeProps {
  onResend: () => Promise<boolean>;
}

/** "Didn't get it? Resend" with a cooldown so users can't spam the inbox. */
const ResendCode = ({ onResend }: ResendCodeProps) => {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = async () => {
    setSending(true);
    const sent = await onResend();
    setSending(false);
    if (sent) setSecondsLeft(COOLDOWN_SECONDS);
  };

  const waiting = secondsLeft > 0;

  return (
    <View className="auth-link-row mt-1">
      <Text className="auth-link-copy">Didn&apos;t get it?</Text>
      <Pressable onPress={handleResend} disabled={waiting || sending} hitSlop={8} accessibilityRole="button">
        <Text className={waiting || sending ? "auth-link-copy" : "auth-link"}>
          {sending ? "Sending…" : waiting ? `Resend in 0:${String(secondsLeft).padStart(2, "0")}` : "Resend code"}
        </Text>
      </Pressable>
    </View>
  );
};

export default ResendCode;
