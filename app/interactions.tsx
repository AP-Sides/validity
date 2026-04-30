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
import { AppDrawer, HamburgerButton, useSwipeToOpenDrawer } from "@/components/AppDrawer";

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
  TEAL: "#2a6b5e",
};

const BASE_URL = "https://q26sfuevvv3f37eb5vv7wtvdysnmg7m3.app.specular.dev";

const EXAMPLE_CHIPS = [
  "Aspirin + Ibuprofen",
  "Warfarin + Vitamin K",
  "Alcohol + Acetaminophen",
  "SSRIs + Tramadol",
  "Metformin + Alcohol",
];

const LOADING_MESSAGES = [
  "Searching academic databases...",
  "Analyzing interactions...",
  "Generating safety report...",
];

export default function InteractionsScreen() {
  const [substances, setSubstances] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pressedChip, setPressedChip] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Staggered mount animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(20)).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const chipsSlide = useRef(new Animated.Value(20)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;
  const footerSlide = useRef(new Animated.Value(20)).current;

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
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [loading]);

  const addSubstance = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (substances.includes(trimmed)) {
      setInputValue("");
      return;
    }
    console.log("[Interactions] Adding substance:", trimmed);
    setSubstances((prev) => [...prev, trimmed]);
    setInputValue("");
  }, [inputValue, substances]);

  const removeSubstance = useCallback((substance: string) => {
    console.log("[Interactions] Removing substance:", substance);
    setSubstances((prev) => prev.filter((s) => s !== substance));
  }, []);

  const handleChipPress = useCallback((chip: string) => {
    console.log("[Interactions] Example chip tapped:", chip);
    const parts = chip.split(" + ").map((s) => s.trim()).filter(Boolean);
    setSubstances(parts);
    setPressedChip(chip);
    setTimeout(() => setPressedChip(null), 600);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (substances.length < 2 || loading) return;
    console.log("[Interactions] Check Interactions pressed, substances:", substances);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/drug-interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ substances }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.log("[Interactions] API error:", response.status, errText);
        setError("Failed to check interactions. Please try again.");
        setLoading(false);
        return;
      }
      const responseData = await response.json();
      console.log("[Interactions] API response received, severity:", responseData.severity);
      setLoading(false);
      router.push({
        pathname: "/interaction-results",
        params: {
          substances: JSON.stringify(substances),
          data: JSON.stringify(responseData),
        },
      });
    } catch (err) {
      console.log("[Interactions] Fetch error:", err);
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }, [substances, loading]);

  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));

  const isDisabled = substances.length < 2 || loading;
  const btnBg = isDisabled ? "#d4cfc9" : C.TEAL;
  const btnTextColor = isDisabled ? "#a09890" : "#ffffff";
  const inputBorderColor = isFocused ? C.NAVY : C.BORDER;
  const loadingMessage = LOADING_MESSAGES[loadingMsgIndex];

  return (
    <SafeAreaView {...swipeHandlers} style={{ flex: 1, backgroundColor: C.BG }} edges={["top", "bottom"]}>
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

          {/* Hamburger row */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" }}>
            <HamburgerButton onPress={() => {
              console.log("[Interactions] Hamburger menu pressed");
              setDrawerOpen(true);
            }} />
          </View>

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
              SUBSTANCE SAFETY RESEARCH
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
              Interaction
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
              Checker
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
              Check for dangerous interactions between medications, supplements, and substances
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
                  Interaction Checker
                </Text>
                <View style={{ width: 42 }} />
              </View>

              {/* Card body */}
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
                  SUBSTANCES TO CHECK
                </Text>

                {/* Substance pills */}
                {substances.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {substances.map((substance) => (
                      <View
                        key={substance}
                        style={{
                          backgroundColor: C.NAVY,
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 13,
                            color: "#fff",
                            marginRight: 6,
                          }}
                        >
                          {substance}
                        </Text>
                        <Pressable
                          onPress={() => removeSubstance(substance)}
                          hitSlop={8}
                        >
                          <Text
                            style={{
                              fontFamily: "SourceSans3_600SemiBold",
                              fontSize: 14,
                              color: "rgba(255,255,255,0.7)",
                              lineHeight: 16,
                            }}
                          >
                            ×
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* Input row */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 15,
                      color: C.TEXT,
                      borderBottomWidth: 2,
                      borderBottomColor: inputBorderColor,
                      paddingBottom: 8,
                      paddingTop: 4,
                    }}
                    placeholder="Add a substance..."
                    placeholderTextColor={C.TEXT_HINT}
                    value={inputValue}
                    onChangeText={setInputValue}
                    onFocus={() => {
                      console.log("[Interactions] TextInput focused");
                      setIsFocused(true);
                    }}
                    onBlur={() => setIsFocused(false)}
                    onSubmitEditing={addSubstance}
                    returnKeyType="done"
                    blurOnSubmit={false}
                  />
                  <Pressable
                    onPress={() => {
                      console.log("[Interactions] Add substance button pressed, value:", inputValue.trim());
                      addSubstance();
                    }}
                    style={{
                      backgroundColor: C.NAVY,
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: "#ffffff",
                      }}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>
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
                {loading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <ActivityIndicator size="small" color={C.TEAL} />
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 12,
                        color: C.TEXT_MUTED,
                      }}
                    >
                      {loadingMessage}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 12,
                      color: C.TEXT_HINT,
                    }}
                  >
                    {substances.length < 2 ? "Add at least 2 substances" : "Ready to check"}
                  </Text>
                )}

                <Pressable
                  onPress={() => {
                    console.log("[Interactions] Check Interactions button pressed");
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
                    shadowColor: C.TEAL,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDisabled ? 0 : 0.3,
                    shadowRadius: 8,
                    elevation: isDisabled ? 0 : 3,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 14,
                      color: btnTextColor,
                    }}
                  >
                    Check Interactions →
                  </Text>
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
            {EXAMPLE_CHIPS.map((chip) => {
              const isPressed = pressedChip === chip;
              return (
                <Pressable
                  key={chip}
                  onPress={() => handleChipPress(chip)}
                  style={{
                    borderWidth: 1,
                    borderColor: isPressed ? C.TEAL : C.BORDER,
                    backgroundColor: isPressed ? C.TEAL : C.CARD,
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
                    {chip}
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
                Live PubMed Data
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
                36M+ Academic Citations
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
                Not a substitute for medical advice
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
