import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Linking,
  Share,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

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

type Severity = "NONE" | "MILD" | "MODERATE" | "SEVERE";

interface Interaction {
  substance_a: string;
  substance_b: string;
  severity: Severity;
  mechanism: string;
  recommendation: string;
}

interface Study {
  title: string;
  authors: string;
  year: number;
  journal: string;
  key_finding: string;
  url: string;
  citation_count: number;
}

interface InteractionResult {
  severity: Severity;
  confidence: number;
  summary: string;
  interactions: Interaction[];
  studies: Study[];
}

const SEVERITY_BG: Record<Severity, string> = {
  SEVERE: "#6b2c2c",
  MODERATE: "#7a5200",
  MILD: "#4a5e2a",
  NONE: "#2d5a27",
};

const SEVERITY_BADGE_BG: Record<Severity, string> = {
  SEVERE: "rgba(139,58,58,0.15)",
  MODERATE: "rgba(122,82,0,0.15)",
  MILD: "rgba(74,94,42,0.15)",
  NONE: "rgba(45,90,39,0.15)",
};

const SEVERITY_BADGE_TEXT: Record<Severity, string> = {
  SEVERE: "#8b3a3a",
  MODERATE: "#7a5200",
  MILD: "#4a5e2a",
  NONE: "#2d5a27",
};

function BrowserCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
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
          {label}
        </Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={{ padding: 18 }}>{children}</View>
    </View>
  );
}

export default function InteractionResultsScreen() {
  const params = useLocalSearchParams<{ substances: string; data: string }>();

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

  let substances: string[] = [];
  let data: InteractionResult | null = null;
  let parseError = false;

  try {
    if (params.substances) {
      substances = JSON.parse(params.substances) as string[];
    }
    if (params.data) {
      data = JSON.parse(params.data) as InteractionResult;
    }
  } catch {
    parseError = true;
  }

  useEffect(() => {
    console.log("[InteractionResults] Screen mounted, substances:", substances, "severity:", data?.severity);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = useCallback(async () => {
    if (!data) return;
    console.log("[InteractionResults] Share button pressed, substances:", substances);
    const substanceList = substances.join(" + ");
    const message = `Validity — Interaction Check\n\nSubstances: ${substanceList}\n\nSeverity: ${data.severity}\n\n${data.summary}\n\nPowered by Validity`;
    try {
      await Share.share({ message });
    } catch (e) {
      console.warn("[InteractionResults] Share failed:", e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.substances, params.data]);

  if (parseError || !data) {
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
            The interaction data could not be parsed. Please try again.
          </Text>
          <Pressable
            onPress={() => {
              console.log("[InteractionResults] Back to checker pressed (error state)");
              router.back();
            }}
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
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const severity = data.severity ?? "NONE";
  const confidence = Number(data.confidence) || 0;
  const confidenceStr = `${confidence}%`;
  const bannerBg = SEVERITY_BG[severity] ?? SEVERITY_BG.NONE;
  const substancesLabel = substances.join(" + ");
  const interactions = Array.isArray(data.interactions) ? data.interactions : [];
  const studies = Array.isArray(data.studies) ? data.studies : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.BG }} edges={["top", "bottom"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 60,
          gap: 16,
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            gap: 16,
          }}
        >
          {/* Back row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => {
                console.log("[InteractionResults] Back button pressed");
                router.back();
              }}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 14,
                  color: C.NAVY,
                }}
              >
                ← {substancesLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              style={{
                backgroundColor: "rgba(201,168,108,0.12)",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: "rgba(201,168,108,0.4)",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: C.GOLD,
                }}
              >
                Share ↗
              </Text>
            </Pressable>
          </View>

          {/* Severity banner */}
          <View
            style={{
              backgroundColor: bannerBg,
              borderRadius: 16,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 36,
                color: "#ffffff",
                letterSpacing: -0.5,
              }}
            >
              {severity}
            </Text>
            <Text
              style={{
                fontFamily: "SourceSans3_300Light",
                fontSize: 15,
                color: "rgba(255,255,255,0.9)",
                lineHeight: 22,
                marginTop: 8,
              }}
            >
              {data.summary}
            </Text>
            {/* Confidence bar */}
            <View style={{ marginTop: 14 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    width: confidenceStr,
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.8)",
                  marginTop: 4,
                }}
              >
                {confidenceStr} confidence
              </Text>
            </View>
          </View>

          {/* Interaction Breakdown card */}
          {interactions.length > 0 && (
            <BrowserCard label="Interaction Breakdown">
              {interactions.map((interaction, i) => {
                const isLast = i === interactions.length - 1;
                const badgeBg = SEVERITY_BADGE_BG[interaction.severity] ?? SEVERITY_BADGE_BG.NONE;
                const badgeText = SEVERITY_BADGE_TEXT[interaction.severity] ?? SEVERITY_BADGE_TEXT.NONE;
                const severityUpper = String(interaction.severity).toUpperCase();

                return (
                  <View key={i}>
                    {/* Substance tags + severity badge row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "rgba(28,58,94,0.1)",
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 12,
                            color: C.NAVY,
                          }}
                        >
                          {interaction.substance_a}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "SourceSans3_400Regular",
                          fontSize: 12,
                          color: C.TEXT_MUTED,
                        }}
                      >
                        +
                      </Text>
                      <View
                        style={{
                          backgroundColor: "rgba(28,58,94,0.1)",
                          borderRadius: 12,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 12,
                            color: C.NAVY,
                          }}
                        >
                          {interaction.substance_b}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <View
                        style={{
                          backgroundColor: badgeBg,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 10,
                            color: badgeText,
                            letterSpacing: 0.5,
                          }}
                        >
                          {severityUpper}
                        </Text>
                      </View>
                    </View>

                    {/* Mechanism */}
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 13,
                        color: C.TEXT_MUTED,
                        lineHeight: 18,
                        marginTop: 6,
                      }}
                    >
                      {interaction.mechanism}
                    </Text>

                    {/* Recommendation */}
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 13,
                        color: C.NAVY,
                        lineHeight: 18,
                        marginTop: 4,
                      }}
                    >
                      {interaction.recommendation}
                    </Text>

                    {/* Divider */}
                    {!isLast && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: C.BORDER,
                          marginVertical: 12,
                        }}
                      />
                    )}
                  </View>
                );
              })}
            </BrowserCard>
          )}

          {/* Supporting Studies card */}
          <BrowserCard label="Supporting Studies">
            {studies.length === 0 ? (
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: C.TEXT_HINT,
                  fontStyle: "italic",
                }}
              >
                No studies found for this combination
              </Text>
            ) : (
              studies.map((study, i) => {
                const isLast = i === studies.length - 1;
                const citationCount = Number(study.citation_count) || 0;
                const authorYearJournal = `${study.authors} · ${study.year} · ${study.journal}`;

                return (
                  <View key={i}>
                    <Text
                      style={{
                        fontFamily: "PlayfairDisplay_700Bold",
                        fontSize: 14,
                        color: C.NAVY,
                        lineHeight: 20,
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {study.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 11,
                        color: C.TEXT_MUTED,
                        lineHeight: 16,
                        marginBottom: 6,
                      }}
                    >
                      {authorYearJournal}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "SourceSans3_400Regular",
                        fontSize: 13,
                        color: C.TEXT,
                        lineHeight: 19,
                        marginBottom: 6,
                      }}
                    >
                      {study.key_finding}
                    </Text>
                    {citationCount > 0 && (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          backgroundColor: "rgba(201,168,108,0.15)",
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 11,
                            color: C.GOLD,
                          }}
                        >
                          {citationCount} citations
                        </Text>
                      </View>
                    )}
                    {study.url ? (
                      <Pressable
                        onPress={() => {
                          console.log("[InteractionResults] View Study pressed:", study.url);
                          Linking.openURL(study.url);
                        }}
                        style={{ alignSelf: "flex-start", paddingVertical: 2 }}
                      >
                        <Text
                          style={{
                            fontFamily: "SourceSans3_600SemiBold",
                            fontSize: 13,
                            color: C.TEAL,
                          }}
                        >
                          View Study →
                        </Text>
                      </Pressable>
                    ) : null}
                    {!isLast && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: C.BORDER,
                          marginVertical: 12,
                        }}
                      />
                    )}
                  </View>
                );
              })
            )}
          </BrowserCard>

          {/* Disclaimer */}
          <Text
            style={{
              fontFamily: "SourceSans3_300Light",
              fontSize: 12,
              color: C.TEXT_HINT,
              textAlign: "center",
              paddingHorizontal: 20,
              lineHeight: 18,
            }}
          >
            This tool is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
