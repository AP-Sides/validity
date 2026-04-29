import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, Animated, Easing,
  Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppDrawer, HamburgerButton, useSwipeToOpenDrawer } from "@/components/AppDrawer";

const C = {
  BG: "#faf9f7", CARD: "#ffffff", CARD_TOP: "#f5f2ed",
  NAVY: "#1c3a5e", GOLD: "#c9a86c", STEEL: "#4a6fa5",
  BORDER: "#e8e0d5", TEXT: "#1a1a1a", TEXT_MUTED: "#8a7f72",
  TEXT_HINT: "#b5a898", DANGER: "#8b3a3a",
};
const BASE_URL = "https://cmuaesxcprg74u8g9gy7tas6czbaw9aw.app.specular.dev";

const EXAMPLE_CLAIMS = [
  "Creatine improves muscle strength",
  "Meditation reduces anxiety",
  "Coffee increases productivity",
  "Vitamin D deficiency causes depression",
  "Exercise improves cognitive function",
];

const LOADING_MESSAGES = [
  "Searching academic databases...",
  "Analyzing evidence...",
  "Generating verdict...",
];

export default function HypothesisAnalyzerScreen() {
  const [claim, setClaim] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [pressedChip, setPressedChip] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        Animated.timing(opacity, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translate, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, []
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
    return () => { if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current); };
  }, [loading, loadingMsgOpacity]);

  const handleValidate = useCallback(async () => {
    if (!claim.trim()) return;
    console.log("[HypothesisAnalyzer] Analyze Claim button pressed, claim:", claim.trim());
    setError(null);
    setLoading(true);
    try {
      console.log("[HypothesisAnalyzer] POST /api/validate-claim");
      const response = await fetch(`${BASE_URL}/api/validate-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claim.trim() }),
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      console.log("[HypothesisAnalyzer] Received response, navigating to results");
      router.push({ pathname: "/results", params: { claim: claim.trim(), data: JSON.stringify(data) } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError("Couldn't validate your claim. Check your connection and try again.");
      console.error("[HypothesisAnalyzer] Fetch failed:", message);
    } finally {
      setLoading(false);
    }
  }, [claim]);

  const handleChipPress = useCallback((text: string) => {
    console.log("[HypothesisAnalyzer] Example chip pressed:", text);
    setClaim(text);
    setPressedChip(text);
    setTimeout(() => setPressedChip(null), 600);
  }, []);

  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));
  const loadingMessage = LOADING_MESSAGES[loadingMsgIndex];
  const isDisabled = !claim.trim() || loading;
  const btnBg = isDisabled && !loading ? "#d4cfc9" : C.NAVY;
  const btnTextColor = isDisabled && !loading ? "#a09890" : "#ffffff";
  const inputBorderColor = isFocused ? C.NAVY : C.BORDER;

  return (
    <SafeAreaView {...swipeHandlers} style={{ flex: 1, backgroundColor: C.BG }} edges={["top", "bottom"]}>
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Gold accent bar */}
          <View style={{ height: 3, backgroundColor: C.GOLD }} />

          {/* Hamburger row */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" }}>
            <HamburgerButton onPress={() => setDrawerOpen(true)} />
          </View>

          {/* Hero */}
          <Animated.View style={{ alignItems: "center", paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24, opacity: headerAnim, transform: [{ translateY: headerSlide }] }}>
            <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 11, color: C.GOLD, letterSpacing: 3, textTransform: "uppercase", textAlign: "center" }}>
              EVIDENCE-BASED RESEARCH VALIDATION
            </Text>
            <View style={{ height: 16 }} />
            <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 52, color: C.NAVY, lineHeight: 56, textAlign: "center" }}>Hypothesis</Text>
            <Text style={{ fontFamily: "PlayfairDisplay_400Regular_Italic", fontSize: 52, color: C.STEEL, lineHeight: 56, marginTop: -4, textAlign: "center" }}>Analyzer</Text>
            <View style={{ height: 20 }} />
            <View style={{ width: 72, height: 1, backgroundColor: C.GOLD, opacity: 0.6 }} />
            <View style={{ height: 20 }} />
            <Text style={{ fontFamily: "SourceSans3_300Light", fontSize: 15, color: C.TEXT_MUTED, textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
              Submit any claim and receive analysis backed by peer-reviewed academic studies
            </Text>
          </Animated.View>

          {/* Input card */}
          <Animated.View style={{ marginHorizontal: 20, marginBottom: 16, opacity: cardAnim, transform: [{ translateY: cardSlide }] }}>
            <View style={{ backgroundColor: C.CARD, borderRadius: 20, borderWidth: 1, borderColor: C.BORDER, shadowColor: "#1c3a5e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4, overflow: "hidden" }}>
              {/* Browser bar */}
              <View style={{ backgroundColor: C.CARD_TOP, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#e8a090" }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#e8c870" }} />
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#90c870" }} />
                </View>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT, flex: 1, textAlign: "center" }}>Check for Validity</Text>
                <View style={{ width: 42 }} />
              </View>
              {/* Input */}
              <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 }}>
                <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 10, color: C.TEXT_MUTED, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>YOUR HYPOTHESIS OR CLAIM</Text>
                <TextInput
                  style={{ fontFamily: "PlayfairDisplay_400Regular", fontSize: 16, color: C.TEXT, minHeight: 90, textAlignVertical: "top", borderBottomWidth: 2, borderBottomColor: inputBorderColor, paddingBottom: 8, paddingTop: 0 }}
                  placeholder="e.g. Creatine supplementation improves athletic performance..."
                  placeholderTextColor={C.TEXT_HINT}
                  value={claim}
                  onChangeText={setClaim}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </View>
              {/* Footer */}
              <View style={{ paddingHorizontal: 18, paddingBottom: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT }}>Tap to analyze · ~15 seconds</Text>
                <Pressable
                  onPress={handleValidate}
                  disabled={isDisabled}
                  style={{ backgroundColor: btnBg, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#1c3a5e", shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDisabled && !loading ? 0 : 0.3, shadowRadius: 8, elevation: isDisabled && !loading ? 0 : 3 }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Animated.Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: "#ffffff", opacity: loadingMsgOpacity }}>{loadingMessage}</Animated.Text>
                    </>
                  ) : (
                    <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 14, color: btnTextColor }}>Analyze Claim →</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Example chips */}
          <Animated.View style={{ paddingHorizontal: 20, marginBottom: 24, flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", opacity: chipsAnim, transform: [{ translateY: chipsSlide }] }}>
            {EXAMPLE_CLAIMS.map((ex) => {
              const isPressed = pressedChip === ex;
              return (
                <Pressable key={ex} onPress={() => handleChipPress(ex)} disabled={loading} style={{ borderWidth: 1, borderColor: isPressed ? C.NAVY : C.BORDER, backgroundColor: isPressed ? C.NAVY : C.CARD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 13, color: isPressed ? "#ffffff" : C.TEXT_MUTED }}>{ex}</Text>
                </Pressable>
              );
            })}
          </Animated.View>

          {/* Error */}
          {error ? (
            <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(139,58,58,0.07)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "rgba(139,58,58,0.2)" }}>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 14, color: C.DANGER, lineHeight: 20 }}>{error}</Text>
            </View>
          ) : null}

          {/* Trust footer */}
          <Animated.View style={{ paddingBottom: 32, paddingTop: 8, alignItems: "center", opacity: footerAnim, transform: [{ translateY: footerSlide }] }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT }}>Live PubMed Data</Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT, marginHorizontal: 4 }}>·</Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT }}>36M+ Academic Citations</Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT, marginHorizontal: 4 }}>·</Text>
              <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 12, color: C.TEXT_HINT }}>Peer-Reviewed Sources</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
