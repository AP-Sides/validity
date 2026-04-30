import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Pressable,
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
};

// Compact grid card for the 2-column layout
function GridCard({
  label,
  title,
  description,
  accentColor,
  onPress,
}: {
  label: string;
  title: string;
  description: string;
  accentColor: string;
  onPress: () => void;
}) {
  return (
    <View
      style={{
        width: "47%",
        backgroundColor: C.CARD,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.BORDER,
        shadowColor: C.NAVY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
        overflow: "hidden",
        minHeight: 140,
      }}
    >
      {/* Browser bar */}
      <View
        style={{
          backgroundColor: C.CARD_TOP,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 10,
          paddingVertical: 7,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#e8a090" }} />
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#e8c870" }} />
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#90c870" }} />
        </View>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 10,
            color: C.TEXT_HINT,
            flex: 1,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View style={{ width: 25 }} />
      </View>

      {/* Card body */}
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }}>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_700Bold",
            fontSize: 15,
            color: C.NAVY,
            marginBottom: 4,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 12,
            color: C.TEXT_MUTED,
            lineHeight: 17,
            flex: 1,
          }}
          numberOfLines={3}
        >
          {description}
        </Text>
        <Pressable
          onPress={onPress}
          style={{ marginTop: 8, alignSelf: "flex-start" }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 12,
              color: accentColor,
            }}
          >
            Open →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewFocused, setReviewFocused] = useState(false);
  const [thankYouVisible, setThankYouVisible] = useState(false);
  const thankYouOpacity = useRef(new Animated.Value(0)).current;

  // Staggered mount animations — compressed to ~490ms
  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const emergencyAnim = useRef(new Animated.Value(0)).current;
  const emergencySlide = useRef(new Animated.Value(20)).current;
  const gridAnim = useRef(new Animated.Value(0)).current;
  const gridSlide = useRef(new Animated.Value(20)).current;
  const reviewAnim = useRef(new Animated.Value(0)).current;
  const reviewSlide = useRef(new Animated.Value(20)).current;
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
    animateSection(heroAnim, heroSlide, 0);
    animateSection(emergencyAnim, emergencySlide, 80);
    animateSection(gridAnim, gridSlide, 160);
    animateSection(reviewAnim, reviewSlide, 280);
    animateSection(footerAnim, footerSlide, 390);
  }, [
    animateSection,
    heroAnim, heroSlide,
    emergencyAnim, emergencySlide,
    gridAnim, gridSlide,
    reviewAnim, reviewSlide,
    footerAnim, footerSlide,
  ]);

  const handleStarPress = useCallback((n: number) => {
    console.log("[Home] Star rating tapped:", n);
    setStarRating(n);
  }, []);

  const BASE_URL = "https://cmuaesxcprg74u8g9gy7tas6czbaw9aw.app.specular.dev";

  const handleSubmitReview = useCallback(async () => {
    if (starRating === 0) return;
    console.log("[Review] Submitting review", { starRating, reviewText });
    try {
      const response = await fetch(`${BASE_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: starRating, review: reviewText }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("[Review] Submit failed:", response.status, text);
      } else {
        console.log("[Review] Submit succeeded");
      }
    } catch (e) {
      console.error("[Review] Submit failed:", e);
    }
    setStarRating(0);
    setReviewText("");
    setThankYouVisible(true);
    Animated.sequence([
      Animated.timing(thankYouOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1700),
      Animated.timing(thankYouOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setThankYouVisible(false));
  }, [starRating, reviewText, thankYouOpacity]);

  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));

  const reviewBorderColor = reviewFocused ? C.NAVY : C.BORDER;

  return (
    <SafeAreaView {...swipeHandlers} style={{ flex: 1, backgroundColor: C.BG }} edges={["top", "bottom"]}>
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top accent bar */}
        <View style={{ height: 3, backgroundColor: C.GOLD }} />

        {/* Hamburger row */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" }}>
          <HamburgerButton onPress={() => {
            console.log("[Home] Hamburger menu pressed");
            setDrawerOpen(true);
          }} />
        </View>

        {/* Hero section */}
        <Animated.View
          style={{
            alignItems: "center",
            paddingTop: 48,
            paddingBottom: 40,
            paddingHorizontal: 24,
            opacity: heroAnim,
            transform: [{ translateY: heroSlide }],
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
            CLINICAL &amp; RESEARCH TOOLS
          </Text>

          <View style={{ height: 16 }} />

          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 64,
              color: C.NAVY,
              lineHeight: 68,
              textAlign: "center",
            }}
          >
            Validity
          </Text>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_400Regular_Italic",
              fontSize: 40,
              color: C.STEEL,
              lineHeight: 44,
              marginTop: -8,
              textAlign: "center",
            }}
          >
            by evidence
          </Text>

          <View style={{ marginVertical: 20 }}>
            <View
              style={{
                width: 72,
                height: 1,
                backgroundColor: C.GOLD,
                opacity: 0.6,
              }}
            />
          </View>

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
            Evidence-based tools for smarter health and research decisions.
          </Text>
        </Animated.View>

        {/* Emergency Checker card — full width */}
        <Animated.View
          style={{
            marginHorizontal: 20,
            marginBottom: 16,
            opacity: emergencyAnim,
            transform: [{ translateY: emergencySlide }],
          }}
        >
          <View
            style={{
              backgroundColor: C.CARD,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.BORDER,
              shadowColor: C.NAVY,
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
                Emergency Checker
              </Text>
              <View style={{ width: 42 }} />
            </View>

            {/* Card body */}
            <View style={{ flexDirection: "row", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 }}>
              <View
                style={{
                  width: 3,
                  backgroundColor: C.DANGER,
                  borderRadius: 2,
                  alignSelf: "stretch",
                }}
              />
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text
                  style={{
                    fontFamily: "PlayfairDisplay_700Bold",
                    fontSize: 20,
                    color: C.DANGER,
                    marginBottom: 6,
                  }}
                >
                  Emergency Checker
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: C.TEXT_MUTED,
                    lineHeight: 20,
                  }}
                >
                  Describe your symptoms and get a guided triage assessment — ER, urgent care, or treat at home.
                </Text>
              </View>
            </View>

            {/* Card footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 18,
                paddingBottom: 16,
                paddingTop: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_HINT,
                }}
              >
                Guided assessment · Triage
              </Text>
              <Pressable
                onPress={() => {
                  console.log("[Home] Open Emergency Checker pressed");
                  router.push("/emergency");
                }}
                style={{
                  backgroundColor: C.DANGER,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  shadowColor: C.DANGER,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 14,
                    color: "#ffffff",
                  }}
                >
                  Open Tool →
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* 2-column grid of remaining tools */}
        <Animated.View
          style={{
            opacity: gridAnim,
            transform: [{ translateY: gridSlide }],
            paddingHorizontal: 20,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <GridCard
              label="Hypothesis Analyzer"
              title="Hypothesis Analyzer"
              description="Submit any scientific claim and receive a verdict backed by peer-reviewed research."
              accentColor={C.NAVY}
              onPress={() => {
                console.log("[Home] Open Hypothesis Analyzer pressed");
                router.push("/analyzer");
              }}
            />
            <GridCard
              label="Interaction Checker"
              title="Interaction Checker"
              description="Check for dangerous interactions between medications, supplements, and substances."
              accentColor="#2a6b5e"
              onPress={() => {
                console.log("[Home] Open Interaction Checker pressed");
                router.push("/interactions");
              }}
            />
            <GridCard
              label="Myth Buster"
              title="Myth Buster"
              description="Browse popular nutrition claims rated against peer-reviewed evidence."
              accentColor={C.NAVY}
              onPress={() => {
                console.log("[Home] Browse Myth Buster pressed");
                router.push("/myths");
              }}
            />
            <GridCard
              label="Did You Know?"
              title="Did You Know?"
              description="Surprising recent discoveries from peer-reviewed journals across science and medicine."
              accentColor={C.NAVY}
              onPress={() => {
                console.log("[Home] Explore Facts pressed");
                router.push("/facts");
              }}
            />
          </View>
        </Animated.View>

        {/* Leave a Review card */}
        <Animated.View
          style={{
            marginHorizontal: 20,
            marginBottom: 16,
            opacity: reviewAnim,
            transform: [{ translateY: reviewSlide }],
          }}
        >
          <View
            style={{
              backgroundColor: C.CARD,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: C.BORDER,
              shadowColor: C.NAVY,
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
                Leave a Review
              </Text>
              <View style={{ width: 42 }} />
            </View>

            {/* Card body */}
            <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 10,
                  color: C.TEXT_MUTED,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                YOUR EXPERIENCE
              </Text>

              {/* Stars */}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const isFilled = n <= starRating;
                  const starChar = isFilled ? "★" : "☆";
                  const starColor = isFilled ? C.GOLD : C.TEXT_HINT;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => handleStarPress(n)}
                    >
                      <Text style={{ fontSize: 28, color: starColor }}>
                        {starChar}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Review text input */}
              <TextInput
                style={{
                  fontFamily: "PlayfairDisplay_400Regular",
                  fontSize: 15,
                  color: C.TEXT,
                  minHeight: 80,
                  textAlignVertical: "top",
                  borderBottomWidth: 2,
                  borderBottomColor: reviewBorderColor,
                  paddingBottom: 8,
                  paddingTop: 0,
                  marginTop: 16,
                }}
                placeholder="Share your thoughts about Validity..."
                placeholderTextColor={C.TEXT_HINT}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                onFocus={() => {
                  console.log("[Review] Text input focused");
                  setReviewFocused(true);
                }}
                onBlur={() => setReviewFocused(false)}
              />

              {/* Submit button */}
              <Pressable
                onPress={handleSubmitReview}
                style={{
                  backgroundColor: C.NAVY,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginTop: 16,
                  shadowColor: C.NAVY,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 15,
                    color: "#ffffff",
                  }}
                >
                  Submit Review
                </Text>
              </Pressable>

              {/* Thank you message */}
              {thankYouVisible && (
                <Animated.Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 14,
                    color: C.GOLD,
                    textAlign: "center",
                    marginTop: 10,
                    opacity: thankYouOpacity,
                  }}
                >
                  Thank you!
                </Animated.Text>
              )}
            </View>
          </View>
        </Animated.View>

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
              36M+ Citations
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
              Peer-Reviewed
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
