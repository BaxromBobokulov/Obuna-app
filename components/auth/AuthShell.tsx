import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";
import { styled } from "nativewind";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import BrandMark from "./BrandMark";

const SafeAreaView = styled(RNSafeAreaView);

/** Space kept between the focused input and the keyboard, so error/helper text stays visible too. */
const KEYBOARD_GAP = 48;

type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

/** Lets fields inside the shell ask to be scrolled above the keyboard when they gain focus. */
const KeyboardScrollContext = createContext<(() => void) | null>(null);
export const useScrollFocusedIntoView = () => useContext(KeyboardScrollContext);

/** Lets content inside the shell (e.g. an error that just appeared) scroll itself into view. */
const RevealContext = createContext<((view: Measurable | null) => void) | null>(null);
export const useRevealInShell = () => useContext(RevealContext);

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Rendered under the card, e.g. "New to Sandq? Create an account". */
  footer?: ReactNode;
}

const AuthShell = ({ title, subtitle, children, footer }: AuthShellProps) => {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollOffset = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  /** Scrolls just enough that `view` sits above the keyboard (or the screen bottom). */
  const scrollViewIntoView = useCallback((view: Measurable, gap: number) => {
    view.measureInWindow((_x, y, _width, height) => {
      const visibleBottom = keyboardTop.current ?? Dimensions.get("window").height;
      const overlap = y + height + gap - visibleBottom;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollOffset.current + overlap, animated: true });
      }
    });
  }, []);

  const scrollFocusedIntoView = useCallback(() => {
    // Wait a moment so the keyboard-avoiding padding is applied before measuring.
    setTimeout(() => {
      // No on-screen keyboard (e.g. web) → nothing to avoid. `State` doesn't exist on react-native-web.
      if (keyboardTop.current === null) return;
      const input = TextInput.State?.currentlyFocusedInput?.();
      if (input) scrollViewIntoView(input, KEYBOARD_GAP);
    }, 80);
  }, [scrollViewIntoView]);

  const revealView = useCallback(
    (view: Measurable | null) => {
      // Wait for the new content to lay out (and the keyboard to finish closing) before measuring.
      setTimeout(() => view && scrollViewIntoView(view, 24), 300);
    },
    [scrollViewIntoView],
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      scrollFocusedIntoView();
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTop.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollFocusedIntoView]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  return (
    <KeyboardScrollContext.Provider value={scrollFocusedIntoView}>
     <RevealContext.Provider value={revealView}>
      <SafeAreaView className="auth-safe-area" edges={["top", "bottom"]}>
        {/* "padding" on both platforms: Android runs edge-to-edge, so the window no longer resizes for the keyboard. */}
        <KeyboardAvoidingView className="auth-screen" behavior="padding">
          <ScrollView
            ref={scrollRef}
            className="auth-scroll"
            contentContainerClassName="auth-content"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View className="auth-brand-block">
              <BrandMark />
              <Text className="auth-title" accessibilityRole="header">
                {title}
              </Text>
              {subtitle ? <Text className="auth-subtitle">{subtitle}</Text> : null}
            </View>

            <View className="auth-card">{children}</View>

            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
     </RevealContext.Provider>
    </KeyboardScrollContext.Provider>
  );
};

export default AuthShell;
