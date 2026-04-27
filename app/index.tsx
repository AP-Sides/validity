import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

const COLORS = {
  background: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceSecondary: "#EEF0F5",
  text: "#1F2937",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  primary: "#4F46E5",
  primaryMuted: "rgba(79,70,229,0.10)",
  border: "rgba(31,41,55,0.10)",
  danger: "#EF4444",
};

const BASE_URL = "https://cmuaesxcprg74u8g9gy7tas6czbaw9aw.app.specular.dev";

const EXAMPLE_CLAIMS = [
  "Creatine improves muscle strength",
  "Meditation reduces anxiety",
  "Coffee increases productivity",
];

const LOADING_MESSAGES = [
  "Searching academic databases...",
  "Analyzing evidence...",
  "Generating verdict...",
];

function BrainIcon({ size = 32, color = "#4F46E5" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.5 2C8.12 2 7 3.12 7 4.5c0 .17.02.34.05.5H7C5.34 5 4 6.34 4 8c0 1.1.56 2.08 1.41 2.65C5.16 10.93 5 11.45 5 12c0 1.1.56 2.08 1.41 2.65C6.16 14.93 6 15.45 6 16c0 1.66 1.34 3 3 3h.5v1.5a.5.5 0 001 0V19H12v1.5a.5.5 0 001 0V19h.5c1.66 0 3-1.34 3-3 0-.55-.16-1.07-.41-1.35C17.44 14.08 18 13.1 18 12c0-.55-.16-1.07-.41-1.35C18.44 10.08 19 9.1 19 8c0-1.66-1.34-3-3-3h-.05c.03-.16.05-.33.05-.5C16 3.12 14.88 2 13.5 2c-.74 0-1.41.3-1.9.79A2.49 2.49 0 009.5 2z"
        fill={color}
        opacity={0.9}
      />
    </Svg>
  );
}

function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
}: {
  onPress?: () => void;
  style?: object | object[];
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);
  const animateOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);
  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
      <Pressable
        onPressIn={animateIn}
        onPressOut={animateOut}
        onPress={onPress}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const [claim, setClaim] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const loadingMsgOpacity = useRef(new Animated.Value(1)).current;
  const loadingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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

  const handleValidate = useCallback(async () => {
    if (!claim.trim()) return;
    console.log("[ClaimCheck] Validate button pressed, claim:", claim.trim());
    setError(null);
    setLoading(true);
    try {
      console.log("[ClaimCheck] POST /api/validate-claim →", BASE_URL);
      const response = await fetch(`${BASE_URL}/api/validate-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claim.trim() }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("[ClaimCheck] API error", response.status, text);
        throw new Error(`Server error ${response.status}`);
      }
      const data = await response.json();
      console.log("[ClaimCheck] API response received, verdict:", data.verdict);
      router.push({
        pathname: "/results",
        params: { claim: claim.trim(), data: JSON.stringify(data) },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[ClaimCheck] Fetch failed:", message);
      setError("Couldn't validate your claim. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [claim]);

  const handleChipPress = useCallback((text: string) => {
    console.log("[ClaimCheck] Example chip tapped:", text);
    setClaim(text);
  }, []);

  const loadingMessage = LOADING_MESSAGES[loadingMsgIndex];
  const isDisabled = !claim.trim() || loading;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.logoRow}>
              <View style={styles.iconWrap}>
                <BrainIcon size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>ClaimCheck</Text>
            </View>
            <Text style={styles.tagline}>Evidence-based fact checking</Text>
          </Animated.View>

          {/* Input Card */}
          <Animated.View
            style={[styles.inputCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.inputLabel}>Your claim or hypothesis</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your claim or hypothesis..."
              placeholderTextColor={COLORS.textTertiary}
              value={claim}
              onChangeText={setClaim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </Animated.View>

          {/* Example chips */}
          <Animated.View style={[styles.chipsSection, { opacity: fadeAnim }]}>
            <Text style={styles.chipsLabel}>Try an example</Text>
            <View style={styles.chipsRow}>
              {EXAMPLE_CLAIMS.map((ex) => (
                <AnimatedPressable
                  key={ex}
                  onPress={() => handleChipPress(ex)}
                  style={styles.chip}
                  disabled={loading}
                >
                  <Text style={styles.chipText}>{ex}</Text>
                </AnimatedPressable>
              ))}
            </View>
          </Animated.View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Validate Button */}
          <View style={styles.buttonSection}>
            <AnimatedPressable
              onPress={handleValidate}
              disabled={isDisabled}
              style={[styles.validateButton, isDisabled && styles.validateButtonDisabled]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Animated.Text style={[styles.loadingMsg, { opacity: loadingMsgOpacity }]}>
                    {loadingMessage}
                  </Animated.Text>
                </View>
              ) : (
                <Text style={styles.validateButtonText}>Validate Claim</Text>
              )}
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "400",
    letterSpacing: 0.1,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  textInput: {
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    maxHeight: 180,
    lineHeight: 24,
    paddingTop: 0,
  },
  chipsSection: {
    marginBottom: 24,
  },
  chipsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.18)",
  },
  chipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    lineHeight: 20,
  },
  buttonSection: {
    marginTop: 8,
  },
  validateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    minHeight: 54,
  },
  validateButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  validateButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingMsg: {
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
});
