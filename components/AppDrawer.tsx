import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Pressable,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
} from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

const C = {
  NAVY: "#1c3a5e",
  GOLD: "#c9a86c",
  STEEL: "#4a6fa5",
  DRAWER_BG: "#1c3a5e",
  DRAWER_ITEM_ACTIVE_BG: "rgba(201,168,108,0.12)",
  DRAWER_ITEM_HOVER: "rgba(255,255,255,0.06)",
  MUTED_BLUE: "#7a9cc4",
  WHITE: "#ffffff",
};

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function AppDrawer({ visible, onClose }: AppDrawerProps) {
  const pathname = usePathname();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, overlayOpacity]);

  const isHome = pathname === "/home";
  const isAnalyzer = pathname === "/analyzer";
  const isEmergency = pathname === "/emergency";
  const isInteractions = pathname === "/interactions";

  const handleNavigate = (route: "/home" | "/analyzer" | "/emergency" | "/interactions") => {
    console.log("[AppDrawer] Menu item tapped, navigating to:", route);
    onClose();
    setTimeout(() => {
      router.push(route as never);
    }, 240);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1 }}>
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={() => {
          console.log("[AppDrawer] Overlay tapped, closing drawer");
          onClose();
        }}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: overlayOpacity,
            }}
          />
        </TouchableWithoutFeedback>

        {/* Drawer panel */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            backgroundColor: C.DRAWER_BG,
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 16,
          }}
        >
          <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom", "left"]}>
            {/* Header */}
            <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}>
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_700Bold",
                  fontSize: 28,
                  color: C.WHITE,
                  letterSpacing: -0.3,
                }}
              >
                Validity
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_300Light",
                  fontSize: 13,
                  color: C.GOLD,
                  marginTop: 4,
                  letterSpacing: 0.5,
                }}
              >
                Research Tools
              </Text>
            </View>

            {/* Gold divider */}
            <View
              style={{
                height: 1,
                backgroundColor: C.GOLD,
                opacity: 0.35,
                marginHorizontal: 24,
                marginBottom: 24,
              }}
            />

            {/* Section label: Navigation */}
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 10,
                color: C.GOLD,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                paddingHorizontal: 24,
                marginBottom: 8,
              }}
            >
              NAVIGATION
            </Text>

            {/* Home */}
            <Pressable
              onPress={() => handleNavigate("/home")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                marginHorizontal: 8,
                borderRadius: 12,
                borderLeftWidth: isHome ? 3 : 0,
                borderLeftColor: C.GOLD,
                backgroundColor: isHome
                  ? C.DRAWER_ITEM_ACTIVE_BG
                  : pressed
                  ? C.DRAWER_ITEM_HOVER
                  : "transparent",
              })}
            >
              <Text style={{ fontSize: 22, marginRight: 14 }}>🏠</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: C.WHITE,
                    marginBottom: 2,
                  }}
                >
                  Home
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: C.MUTED_BLUE,
                    lineHeight: 17,
                  }}
                >
                  Back to the main page
                </Text>
              </View>
            </Pressable>

            {/* Spacer before TOOLS */}
            <View style={{ height: 16 }} />

            {/* Section label: Tools */}
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 10,
                color: C.GOLD,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                paddingHorizontal: 24,
                marginBottom: 8,
              }}
            >
              TOOLS
            </Text>

            {/* Menu item: Hypothesis Analyzer */}
            <Pressable
              onPress={() => handleNavigate("/analyzer")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                marginHorizontal: 8,
                borderRadius: 12,
                borderLeftWidth: isAnalyzer ? 3 : 0,
                borderLeftColor: C.GOLD,
                backgroundColor: isAnalyzer
                  ? C.DRAWER_ITEM_ACTIVE_BG
                  : pressed
                  ? C.DRAWER_ITEM_HOVER
                  : "transparent",
              })}
            >
              <Text style={{ fontSize: 22, marginRight: 14 }}>🔬</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: C.WHITE,
                    marginBottom: 2,
                  }}
                >
                  Hypothesis Analyzer
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: C.MUTED_BLUE,
                    lineHeight: 17,
                  }}
                >
                  Validate claims with academic evidence
                </Text>
              </View>
            </Pressable>

            {/* Menu item: Emergency Check */}
            <Pressable
              onPress={() => handleNavigate("/emergency")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                marginHorizontal: 8,
                borderRadius: 12,
                borderLeftWidth: isEmergency ? 3 : 0,
                borderLeftColor: C.GOLD,
                backgroundColor: isEmergency
                  ? C.DRAWER_ITEM_ACTIVE_BG
                  : pressed
                  ? C.DRAWER_ITEM_HOVER
                  : "transparent",
              })}
            >
              <Text style={{ fontSize: 22, marginRight: 14 }}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: C.WHITE,
                    marginBottom: 2,
                  }}
                >
                  Emergency Check
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: C.MUTED_BLUE,
                    lineHeight: 17,
                  }}
                >
                  Get triage guidance for your situation
                </Text>
              </View>
            </Pressable>

            {/* Menu item: Interaction Checker */}
            <Pressable
              onPress={() => handleNavigate("/interactions")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 14,
                marginHorizontal: 8,
                borderRadius: 12,
                borderLeftWidth: isInteractions ? 3 : 0,
                borderLeftColor: C.GOLD,
                backgroundColor: isInteractions
                  ? C.DRAWER_ITEM_ACTIVE_BG
                  : pressed
                  ? C.DRAWER_ITEM_HOVER
                  : "transparent",
              })}
            >
              <Text style={{ fontSize: 22, marginRight: 14 }}>⚗️</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: C.WHITE,
                    marginBottom: 2,
                  }}
                >
                  Interaction Checker
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: C.MUTED_BLUE,
                    lineHeight: 17,
                  }}
                >
                  Check substance interaction safety
                </Text>
              </View>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function useSwipeToOpenDrawer(onOpen: () => void) {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.moveX < 80 &&
          gestureState.dx > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          console.log("[AppDrawer] Swipe-right gesture detected, opening drawer");
          onOpen();
        }
      },
    })
  ).current;

  return panResponder.panHandlers;
}

interface HamburgerButtonProps {
  onPress: () => void;
}

export function HamburgerButton({ onPress }: HamburgerButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
      }}
    >
      <Pressable
        onPress={() => {
          console.log("[AppDrawer] Hamburger menu button pressed");
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel="Open menu"
        accessibilityRole="button"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: "#ffffff",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#1c3a5e",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <View style={{ gap: 4 }}>
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: "#1c3a5e" }} />
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: "#1c3a5e" }} />
          <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: "#1c3a5e" }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
