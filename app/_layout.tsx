import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Alert } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
} from "@expo-google-fonts/playfair-display";
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_300Light,
} from "@expo-google-fonts/source-sans-3";

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const networkState = useNetworkState();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_300Light,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      Alert.alert(
        "You are offline",
        "Check your connection and try again."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: "#1c3a5e",
      background: "#faf9f7",
      card: "#ffffff",
      text: "#1a1a1a",
      border: "#e8e0d5",
      notification: "rgb(255, 59, 48)",
    },
  };

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="dark" animated />
      <ThemeProvider value={CustomDefaultTheme}>
        <SafeAreaProvider>
          <WidgetProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen name="home" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="analyzer" options={{ headerShown: false }} />
                <Stack.Screen
                  name="results"
                  options={{
                    title: "Results",
                    headerBackTitle: "Back",
                    headerTintColor: "#1c3a5e",
                    headerStyle: { backgroundColor: "#faf9f7" },
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen name="emergency" options={{ headerShown: false }} />
                <Stack.Screen
                  name="emergency-assessment"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="emergency-results"
                  options={{
                    title: "Triage Result",
                    headerBackTitle: "Back",
                    headerTintColor: "#1c3a5e",
                    headerStyle: { backgroundColor: "#faf9f7" },
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen name="interactions" options={{ headerShown: false }} />
                <Stack.Screen name="interaction-results" options={{ headerShown: false }} />
                <Stack.Screen name="myths" options={{ headerShown: false }} />
                <Stack.Screen name="facts" options={{ headerShown: false }} />
                <Stack.Screen name="saved" options={{ headerShown: false }} />
              </Stack>
              <SystemBars style="dark" />
            </GestureHandlerRootView>
          </WidgetProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
