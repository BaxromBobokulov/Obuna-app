import "@/global.css"
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-xl font-bold text-success">
        Obuna-app
      </Text>
      <Link href="/onboarding" className="mt-4 rounded bg-primary text-white 
        p-4">Go to Onboarding</Link>

      <Link href="/(auth)/sign-in" className="mt-4 rounded bg-primary text-white 
        p-4">Go to Sign in</Link>
      <Link href="/(auth)/sign-up" className="mt-4 rounded bg-primary text-white 
        p-4">Go to Sign Up</Link>


      <Link href="/subscribtions/spotify">Spotify Subscriptions</Link>
      <Link href={{
        pathname: "/(tabs)/subscribtions/[id]",
        params: { id: "claude" },
      }}>
        Claude Max Subscription
      </Link>
    </View>
  );
}
