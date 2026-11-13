const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = withNativewind(getDefaultConfig(__dirname));

/**
 * Workaround: NativeWind v5 (react-native-css 3.1.0-rc.1) redirects every
 * `import ... from "react-native"` to its own wrapper, and that wrapper doesn't
 * re-export `AssetRegistry` (public since RN 0.88). expo-asset needs it to load
 * every required font/image, so without this fonts and icons fail with
 * "Cannot read property 'getAssetByID' of undefined".
 *
 * These packages don't use `className`, so they can safely get the real module.
 * Remove once react-native-css re-exports AssetRegistry.
 */
const BYPASS_CSS_WRAPPER = ["expo-asset", "expo-image"].map(
  (pkg) => `${path.sep}node_modules${path.sep}${pkg}${path.sep}`,
);

const nativewindResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native" && BYPASS_CSS_WRAPPER.some((dir) => context.originModulePath.includes(dir))) {
    return context.resolveRequest(context, moduleName, platform);
  }
  return nativewindResolveRequest
    ? nativewindResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
