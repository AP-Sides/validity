import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppDrawer, HamburgerButton } from "@/components/AppDrawer";

const C = {
  BG: "#faf9f7",
  CARD: "#ffffff",
  NAVY: "#1c3a5e",
  GOLD: "#c9a86c",
  STEEL: "#4a6fa5",
  BORDER: "#e8e0d5",
  TEXT: "#1a1a1a",
  TEXT_MUTED: "#8a7f72",
  TEXT_HINT: "#b5a898",
  ER_BG: "#8b1a1a",
  CLINIC_BG: "#7a5200",
  HOME_BG: "#2d5a27",
  GREEN_BORDER: "#2d5a27",
};

type Recommendation = "GO_TO_ER" | "GO_TO_CLINIC" | "TREAT_AT_HOME";

interface TriageData {
  recommendation: Recommendation;
  urgency_score: number;
  confidence: number;
  reasoning: string;
  warning_signs: string[];
  home_treatment: string[];
  disclaimer: string;
}

const RECOMMENDATION_CONFIG: Record<
  Recommendation,
  { bg: string; icon: string; label: string }
> = {
  GO_TO_ER: { bg: C.ER_BG, icon: "🚨", label: "GO TO THE ER" },
  GO_TO_CLINIC: { bg: C.CLINIC_BG, icon: "🏥", label: "VISIT A CLINIC" },
  TREAT_AT_HOME: { bg: C.HOME_BG, icon: "🏠", label: "TREAT AT HOME" },
};

export default function EmergencyResultsScreen() {
  const params = useLocalSearchParams<{ situation: string; data: string }>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  let triageData: TriageData | null = null;
  let parseError = false;

  try {
    if (params.data) {
      triageData = JSON.parse(params.data) as TriageData;
    }
  } catch {
    parseError = true;
  }

  const recommendation = triageData?.recommendation ?? "GO_TO_ER";
  const config = RECOMMENDATION_CONFIG[recommendation] ?? RECOMMENDATION_CONFIG.GO_TO_ER;

  const urgencyScore = Number(triageData?.urgency_score ?? 0);
  const confidence = Number(triageData?.confidence ?? 0);
  const confidenceDisplay = confidence > 1 ? confidence : Math.round(confidence * 100);
  const urgencyBarPercent = Math.min(100, (urgencyScore / 10) * 100);

  const reasoning = String(triageData?.reasoning ?? "");
  const warningSigns: string[] = Array.isArray(triageData?.warning_signs)
    ? triageData!.warning_signs
    : [];
  const homeTreatment: string[] = Array.isArray(triageData?.home_treatment)
    ? triageData!.home_treatment
    : [];
  const disclaimer = String(triageData?.disclaimer ?? "");

  const showWaitingNote =
    recommendation === "GO_TO_ER" || recommendation === "GO_TO_CLINIC";

  const handleNewCheck = () => {
    console.log("[EmergencyResults] New Check button pressed");
    router.push("/emergency");
  };

  if (parseError || !triageData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.BG }} edges={["bottom"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 22,
              color: C.NAVY,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Couldn't load results
          </Text>
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 15,
              color: C.TEXT_MUTED,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            The triage data could not be parsed. Please try again.
          </Text>
          <Pressable
            onPress={handleNewCheck}
            style={{
              backgroundColor: C.NAVY,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 15,
                color: "#ffffff",
              }}
            >
              New Check
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.BG }} edges={["bottom"]}>
      {/* Hamburger button */}
      <SafeAreaView
        edges={["top", "left"]}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 100, paddingTop: 20, paddingLeft: 20 }}
        pointerEvents="box-none"
      >
        <HamburgerButton onPress={() => setDrawerOpen(true)} />
      </SafeAreaView>

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Top gold accent */}
        <View style={{ height: 3, backgroundColor: C.GOLD }} />

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* ── A. Recommendation Banner ── */}
          <View
            style={{
              backgroundColor: config.bg,
              marginHorizontal: 20,
              marginTop: 20,
              borderRadius: 20,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            {/* Icon + label row */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>{config.icon}</Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 20,
                  color: "#ffffff",
                  letterSpacing: 1,
                }}
              >
                {config.label}
              </Text>
            </View>

            {/* Urgency bar */}
            <View style={{ marginBottom: 12 }}>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 6,
                }}
              >
                Urgency:
                <Text style={{ fontFamily: "SourceSans3_400Regular" }}>
                  {" "}
                  {urgencyScore}
                </Text>
                <Text style={{ fontFamily: "SourceSans3_400Regular" }}>/10</Text>
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: `${urgencyBarPercent}%`,
                    backgroundColor: "rgba(255,255,255,0.85)",
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>

            {/* Confidence */}
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              Confidence: {confidenceDisplay}%
            </Text>
          </View>

          {/* ── B. Reasoning Card ── */}
          {reasoning ? (
            <View
              style={{
                backgroundColor: C.CARD,
                marginHorizontal: 20,
                marginTop: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.BORDER,
                borderLeftWidth: 4,
                borderLeftColor: C.NAVY,
                padding: 18,
                shadowColor: "#1c3a5e",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_700Bold",
                  fontSize: 17,
                  color: C.NAVY,
                  marginBottom: 10,
                }}
              >
                Clinical Reasoning
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: C.TEXT,
                  lineHeight: 23,
                }}
              >
                {reasoning}
              </Text>
            </View>
          ) : null}

          {/* ── C. Warning Signs Card ── */}
          {warningSigns.length > 0 ? (
            <View
              style={{
                backgroundColor: C.CARD,
                marginHorizontal: 20,
                marginTop: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.BORDER,
                borderLeftWidth: 4,
                borderLeftColor: C.GOLD,
                padding: 18,
                shadowColor: "#1c3a5e",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_700Bold",
                  fontSize: 17,
                  color: C.NAVY,
                  marginBottom: 12,
                }}
              >
                ⚠️ Watch For These Signs
              </Text>
              {warningSigns.map((sign, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: i < warningSigns.length - 1 ? 8 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 15,
                      color: C.GOLD,
                      marginRight: 8,
                      marginTop: 1,
                    }}
                  >
                    •
                  </Text>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 15,
                      color: C.TEXT,
                      lineHeight: 22,
                      flex: 1,
                    }}
                  >
                    {sign}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── D. Home Treatment Card ── */}
          {homeTreatment.length > 0 ? (
            <View
              style={{
                backgroundColor: C.CARD,
                marginHorizontal: 20,
                marginTop: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.BORDER,
                borderLeftWidth: 4,
                borderLeftColor: C.GREEN_BORDER,
                padding: 18,
                shadowColor: "#1c3a5e",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_700Bold",
                  fontSize: 17,
                  color: C.NAVY,
                  marginBottom: showWaitingNote ? 6 : 12,
                }}
              >
                🏠 Home Treatment Steps
              </Text>
              {showWaitingNote ? (
                <Text
                  style={{
                    fontFamily: "SourceSans3_300Light",
                    fontSize: 13,
                    color: C.TEXT_MUTED,
                    fontStyle: "italic",
                    marginBottom: 12,
                  }}
                >
                  While you wait / travel:
                </Text>
              ) : null}
              {homeTreatment.map((step, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginBottom: i < homeTreatment.length - 1 ? 10 : 0,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: "rgba(45,90,39,0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                      marginTop: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 11,
                        color: C.GREEN_BORDER,
                      }}
                    >
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 15,
                      color: C.TEXT,
                      lineHeight: 22,
                      flex: 1,
                    }}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── E. Disclaimer ── */}
          {disclaimer ? (
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 12,
                color: C.TEXT_HINT,
                textAlign: "center",
                lineHeight: 18,
                marginHorizontal: 28,
                marginTop: 20,
              }}
            >
              {disclaimer}
            </Text>
          ) : null}

          {/* ── F. New Check Button ── */}
          <View style={{ marginHorizontal: 20, marginTop: 24 }}>
            <Pressable
              onPress={handleNewCheck}
              style={({ pressed }) => ({
                backgroundColor: C.NAVY,
                paddingVertical: 16,
                borderRadius: 14,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
                shadowColor: "#1c3a5e",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              })}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 16,
                  color: "#ffffff",
                  letterSpacing: 0.3,
                }}
              >
                New Check
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
