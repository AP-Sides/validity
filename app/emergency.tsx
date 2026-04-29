import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppDrawer, HamburgerButton } from "@/components/AppDrawer";

const C = {
  BG: "#faf9f7",
  CARD: "#ffffff",
  CARD_TOP: "#f5f2ed",
  NAVY: "#1c3a5e",
  GOLD: "#c9a86c",
  STEEL: "#4a6fa5",
  BORDER: "#e8e0d5",
  TEXT: "#1a1a1a",
  TEXT_MUTED: "#8a7f72",
  TEXT_HINT: "#b5a898",
  DANGER: "#8b3a3a",
};

const BASE_URL = "https://cmuaesxcprg74u8g9gy7tas6czbaw9aw.app.specular.dev";

const EXAMPLE_CHIPS = [
  "Fell down stairs, leg pain 8/10",
  "Chest tightness for 2 hours",
  "Deep cut on hand, bleeding",
  "High fever for 3 days",
  "Twisted ankle, mild swelling",
];

const LOADING_MESSAGES = [
  "Assessing symptoms...",
  "Evaluating severity...",
  "Generating recommendation...",
];

export default function EmergencyScreen() {
  const [situation, setSituation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [pressedChip, setPressedChip] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Staggered mount animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(20)).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const chipsSlide = useRef(new Animated.Value(20)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const footerSlide = useRef(new Animated.Value(20)).current;

  const loadingMsgOpacity = useRef(new Animated.Value(1)).current;
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animateSection = useCallback(
    (opacity: Animated.Value, translate: Animated.Value, delay: number) => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: 500,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    },
    []
  );

  useEffect(() => {
    animateSection(headerAnim, headerSlide, 0);
    animateSection(cardAnim, cardSlide, 150);
    animateSection(chipsAnim, chipsSlide, 280);
    animateSection(footerAnim, footerSlide, 400);
  }, [animateSection, headerAnim, headerSlide, cardAnim, cardSlide, chipsAnim, chipsSlide, footerAnim, footerSlide]);

  useEffect(() => {
    if (loading) {
      setLoadingMsgIndex(0);
      loadingIntervalRef.current = setInterval(() => {
        Animated.sequence([
          Animated.timing(loadingMsgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(loadingMsgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1800);
    } else {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [loading, loadingMsgOpacity]);

  const handleSubmit = useCallback(async () => {
    if (!situation.trim()) return;
    console.log("[Emergency] Get Triage button pressed, situation:", situation.trim());
    setError(null);
    setLoading(true);
    try {
      console.log("[Emergency] POST /api/emergency-check →", BASE_URL);
      const response = await fetch(`${BASE_URL}/api/emergency-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: situation.trim() }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("[Emergency] API error", response.status, text);
        throw new Error(`Server error ${response.status}`);
      }
      const data = await response.json();
      console.log("[Emergency] API response received, recommendation:", data.recommendation);
      router.push({
        pathname: "/emergency-results",
        params: { situation: situation.trim(), data: JSON.stringify(data) },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Emergency] Fetch failed:", message);
      setError("Couldn't get triage guidance. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [situation]);

  const handleChipPress = useCallback((text: string) => {
    console.log("[Emergency] Example chip tapped:", text);
    setSituation(text);
    setPressedChip(text);
    setTimeout(() => setPressedChip(null), 600);
  }, []);

  const loadingMessage = LOADING_MESSAGES[loadingMsgIndex];
  const isDisabled = !situation.trim() || loading;

  const btnBg = isDisabled && !loading ? "#d4cfc9" : C.NAVY;
  const btnTextColor = isDisabled && !loading ? "#a09890" : "#ffffff";
  const inputBorderColor = isFocused ? C.NAVY : C.BORDER;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.BG }} edges={["top", "bottom"]}>
      {/* Hamburger button — absolute over content */}
      <SafeAreaView
        edges={["top", "left"]}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 100, paddingTop: 12, paddingLeft: 16 }}
        pointerEvents="box-none"
      >
        <HamburgerButton onPress={() => setDrawerOpen(true)} />
      </SafeAreaView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top accent bar */}
          <View style={{ height: 3, backgroundColor: C.GOLD }} />

          {/* Hero header */}
          <Animated.View
            style={{
              alignItems: "center",
              paddingTop: 56,
              paddingBottom: 40,
              paddingHorizontal: 24,
              opacity: headerAnim,
              transform: [{ translateY: headerSlide }],
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 11,
                color: C.GOLD,
                letterSpacing: 3,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              MEDICAL TRIAGE ASSISTANT
            </Text>

            <View style={{ height: 16 }} />

            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 52,
                color: C.NAVY,
                lineHeight: 56,
                textAlign: "center",
              }}
            >
              Emergency
            </Text>
            <Text
              style={{
                fontFamily: "PlayfairDisplay_400Regular_Italic",
                fontSize: 52,
                color: C.STEEL,
                lineHeight: 56,
                marginTop: -4,
                textAlign: "center",
              }}
            >
              Check
            </Text>

            <View style={{ height: 20 }} />

            <View
              style={{
                width: 72,
                height: 1,
                backgroundColor: C.GOLD,
                opacity: 0.6,
              }}
            />

            <View style={{ height: 20 }} />

            <Text
              style={{
                fontFamily: "SourceSans3_300Light",
                fontSize: 15,
                color: C.TEXT_MUTED,
                textAlign: "center",
                lineHeight: 22,
                maxWidth: 300,
              }}
            >
              Describe your situation and receive immediate triage guidance — ER, clinic, or home treatment
            </Text>
          </Animated.View>

          {/* Input card */}
          <Animated.View
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              opacity: cardAnim,
              transform: [{ translateY: cardSlide }],
            }}
          >
            <View
              style={{
                backgroundColor: C.CARD,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: C.BORDER,
                shadowColor: "#1c3a5e",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 24,
                elevation: 4,
                overflow: "hidden",
              }}
            >
              {/* Mock browser bar */}
              <View
                style={{
                  backgroundColor: C.CARD_TOP,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#e8a090" }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#e8c870" }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#90c870" }} />
                </View>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: C.TEXT_HINT,
                    flex: 1,
                    textAlign: "center",
                  }}
                >
                  emergency-triage.ai
                </Text>
                <View style={{ width: 42 }} />
              </View>

              {/* Input area */}
              <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 }}>
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 10,
                    color: C.TEXT_MUTED,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  DESCRIBE YOUR SITUATION
                </Text>
                <TextInput
                  style={{
                    fontFamily: "PlayfairDisplay_400Regular",
                    fontSize: 16,
                    color: C.TEXT,
                    minHeight: 90,
                    textAlignVertical: "top",
                    borderBottomWidth: 2,
                    borderBottomColor: inputBorderColor,
                    paddingBottom: 8,
                    paddingTop: 0,
                  }}
                  placeholder="e.g. I fell down two flights of stairs and my leg hurts 8/10..."
                  placeholderTextColor={C.TEXT_HINT}
                  value={situation}
                  onChangeText={setSituation}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                  onFocus={() => {
                    console.log("[Emergency] TextInput focused");
                    setIsFocused(true);
                  }}
                  onBlur={() => setIsFocused(false)}
                />
              </View>

              {/* Card footer row */}
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingBottom: 16,
                  paddingTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 12,
                    color: C.TEXT_HINT,
                  }}
                >
                  Tap to assess · ~10 seconds
                </Text>

                <Pressable
                  onPress={() => {
                    console.log("[Emergency] Get Triage button pressed");
                    handleSubmit();
                  }}
                  disabled={isDisabled}
                  style={{
                    backgroundColor: btnBg,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    shadowColor: "#1c3a5e",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDisabled && !loading ? 0 : 0.3,
                    shadowRadius: 8,
                    elevation: isDisabled && !loading ? 0 : 3,
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Animated.Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: "#ffffff",
                          opacity: loadingMsgOpacity,
                        }}
                      >
                        {loadingMessage}
                      </Animated.Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: btnTextColor,
                      }}
                    >
                      Get Triage →
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Example chips */}
          <Animated.View
            style={{
              paddingHorizontal: 20,
              marginBottom: 24,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              opacity: chipsAnim,
              transform: [{ translateY: chipsSlide }],
            }}
          >
            {EXAMPLE_CHIPS.map((ex) => {
              const isPressed = pressedChip === ex;
              return (
                <Pressable
                  key={ex}
                  onPress={() => handleChipPress(ex)}
                  disabled={loading}
                  style={{
                    borderWidth: 1,
                    borderColor: isPressed ? C.NAVY : C.BORDER,
                    backgroundColor: isPressed ? C.NAVY : C.CARD,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 13,
                      color: isPressed ? "#ffffff" : C.TEXT_MUTED,
                    }}
                  >
                    {ex}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>

          {/* Error box */}
          {error ? (
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 16,
                backgroundColor: "rgba(139,58,58,0.07)",
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(139,58,58,0.2)",
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: C.DANGER,
                  lineHeight: 20,
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Trust footer */}
          <Animated.View
            style={{
              paddingBottom: 32,
              paddingTop: 8,
              alignItems: "center",
              opacity: footerAnim,
              transform: [{ translateY: footerSlide }],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_HINT,
                  textAlign: "center",
                }}
              >
                Evidence-Based Triage
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_HINT,
                  marginHorizontal: 4,
                }}
              >
                ·
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_HINT,
                  textAlign: "center",
                }}
              >
                Emergency Medicine Guidelines
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_HINT,
                  marginHorizontal: 4,
                }}
              >
                ·
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_HINT,
                  textAlign: "center",
                }}
              >
                Not a substitute for 911
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
