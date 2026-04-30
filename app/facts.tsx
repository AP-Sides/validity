import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  Easing,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppDrawer, HamburgerButton, useSwipeToOpenDrawer } from "@/components/AppDrawer";
import { useBookmarks } from "@/utils/useBookmarks";

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

interface Fact {
  id: string;
  headline: string;
  body: string;
  tag: "Overturned" | "Surprising" | "Confirmed";
  journal: string;
  year: number;
  url: string;
}

const CATEGORIES = [
  { key: "medical", label: "Medical", dot: "#8b3a3a" },
  { key: "physics", label: "Physics", dot: "#2d5a27" },
  { key: "music", label: "Music", dot: "#c9a86c" },
  { key: "computer-science", label: "Comp Sci", dot: "#4a6fa5" },
  { key: "psychology", label: "Psychology", dot: "#9370db" },
  { key: "nature", label: "Nature", dot: "#2a6b5e" },
];

function TagBadge({ tag }: { tag: Fact["tag"] }) {
  const badgeLabel =
    tag === "Overturned" ? "Overturned" : tag === "Surprising" ? "Surprising" : "Confirmed";

  const badgeBg =
    tag === "Overturned"
      ? "rgba(139,58,58,0.1)"
      : tag === "Surprising"
      ? "rgba(28,58,94,0.08)"
      : "rgba(45,90,39,0.1)";

  const badgeColor =
    tag === "Overturned" ? "#8b3a3a" : tag === "Surprising" ? C.NAVY : "#2d5a27";

  return (
    <View
      style={{
        backgroundColor: badgeBg,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontFamily: "SourceSans3_600SemiBold",
          fontSize: 11,
          color: badgeColor,
        }}
      >
        {badgeLabel}
      </Text>
    </View>
  );
}

function FactCard({
  fact,
  isBookmarked,
  onToggleBookmark,
}: {
  fact: Fact;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const browserLabel =
    fact.tag === "Overturned"
      ? "Overturns Conventional Wisdom"
      : fact.tag === "Surprising"
      ? "Surprising Finding"
      : "Confirmed by Research";

  const journalYear = `${fact.journal} · ${fact.year}`;
  const hasUrl = Boolean(fact.url);

  const leftBorderColor =
    fact.tag === "Overturned"
      ? "#8b3a3a"
      : fact.tag === "Surprising"
      ? "#c9a86c"
      : "#2d5a27";

  const bookmarkChar = isBookmarked ? "★" : "☆";
  const bookmarkColor = isBookmarked ? C.GOLD : C.TEXT_HINT;

  const handleReadPaper = useCallback(() => {
    if (fact.url) {
      console.log("[Facts] Read paper pressed:", fact.url);
      Linking.openURL(fact.url);
    }
  }, [fact.url]);

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: C.CARD,
        borderRadius: 20,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 3,
        borderTopColor: C.BORDER,
        borderRightColor: C.BORDER,
        borderBottomColor: C.BORDER,
        borderLeftColor: leftBorderColor,
        shadowColor: C.NAVY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
        overflow: "hidden",
      }}
    >
      {/* Browser bar */}
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
          {browserLabel}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Card body */}
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
        {/* Tag + bookmark row */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <TagBadge tag={fact.tag} />
          <Pressable
            onPress={() => {
              console.log("[Facts] Bookmark pressed for fact:", fact.id, "currently saved:", isBookmarked);
              onToggleBookmark();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 20, color: bookmarkColor }}>{bookmarkChar}</Text>
          </Pressable>
        </View>
        <Text
          style={{
            fontFamily: "PlayfairDisplay_700Bold",
            fontSize: 18,
            color: C.NAVY,
            lineHeight: 24,
            marginBottom: 8,
          }}
        >
          {fact.headline}
        </Text>
        <Text
          style={{
            fontFamily: "SourceSans3_300Light",
            fontSize: 14,
            color: C.TEXT_MUTED,
            lineHeight: 21,
            marginBottom: 12,
          }}
        >
          {fact.body}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 11,
              color: C.TEXT_HINT,
            }}
          >
            {journalYear}
          </Text>
          <Pressable
            onPress={handleReadPaper}
            disabled={!hasUrl}
            style={{ opacity: hasUrl ? 1 : 0.4 }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: C.STEEL,
              }}
            >
              Read paper →
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function FactsScreen() {
  const [activeCategory, setActiveCategory] = useState("medical");
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchNumber, setBatchNumber] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const seenIdsByCategory = useRef<Record<string, string[]>>({});

  const { toggle, isBookmarked } = useBookmarks();

  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const pillsAnim = useRef(new Animated.Value(0)).current;
  const pillsSlide = useRef(new Animated.Value(20)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const cardsSlide = useRef(new Animated.Value(20)).current;
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
    animateSection(pillsAnim, pillsSlide, 150);
    animateSection(cardsAnim, cardsSlide, 280);
    animateSection(footerAnim, footerSlide, 400);
  }, [animateSection, heroAnim, heroSlide, pillsAnim, pillsSlide, cardsAnim, cardsSlide, footerAnim, footerSlide]);

  const persistSeenIds = useCallback(async () => {
    try {
      await AsyncStorage.setItem("validity_seen_facts", JSON.stringify(seenIdsByCategory.current));
    } catch (e) {
      console.warn("[Facts] Failed to persist seen IDs:", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("validity_seen_facts");
        if (stored) {
          const parsed: Record<string, string[]> = JSON.parse(stored);
          Object.keys(parsed).forEach((cat) => {
            seenIdsByCategory.current[cat] = parsed[cat];
          });
          console.log("[Facts] Loaded persisted seen IDs from AsyncStorage");
        }
      } catch (e) {
        console.warn("[Facts] Failed to load persisted seen IDs:", e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFacts = useCallback(async (category: string, isNewBatch: boolean) => {
    console.log("[Facts] Fetching facts for category:", category, "isNewBatch:", isNewBatch);
    setLoading(true);
    setError(null);
    const seenIds = seenIdsByCategory.current[category] || [];
    try {
      const res = await fetch(`${BASE_URL}/api/fun-facts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, seenIds }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[Facts] Fetch failed:", res.status, text);
        throw new Error(`Server error ${res.status}`);
      }
      const data = await res.json();
      const newFacts: Fact[] = data.facts || [];
      console.log("[Facts] Received", newFacts.length, "facts");
      const newIds = newFacts.map((f: Fact) => f.id);
      seenIdsByCategory.current[category] = [...seenIds, ...newIds];
      setFacts(newFacts);
      if (isNewBatch) {
        setBatchNumber((prev) => prev + 1);
      }
      await persistSeenIds();
    } catch (e) {
      console.error("[Facts] Error loading facts:", e);
      setError("Couldn't load facts. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [persistSeenIds]);

  useEffect(() => {
    fetchFacts("medical", false);
  }, [fetchFacts]);

  const handleCategoryPress = useCallback(
    (key: string) => {
      if (key === activeCategory) return;
      console.log("[Facts] Category pill pressed:", key);
      setActiveCategory(key);
      setFacts([]);
      setBatchNumber(1);
      fetchFacts(key, false);
    },
    [activeCategory, fetchFacts]
  );

  const handleNewBatch = useCallback(() => {
    console.log("[Facts] New batch button pressed for category:", activeCategory);
    fetchFacts(activeCategory, true);
  }, [activeCategory, fetchFacts]);

  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));

  const excludedCount = (seenIdsByCategory.current[activeCategory] ?? []).length;
  const factsCountText = `Batch ${batchNumber} · ${excludedCount} excluded`;

  return (
    <SafeAreaView
      {...swipeHandlers}
      style={{ flex: 1, backgroundColor: C.BG }}
      edges={["top", "bottom"]}
    >
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Gold accent bar */}
        <View style={{ height: 3, backgroundColor: C.GOLD }} />

        {/* Hamburger row */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" }}>
          <HamburgerButton
            onPress={() => {
              console.log("[Facts] Hamburger menu pressed");
              setDrawerOpen(true);
            }}
          />
        </View>

        {/* Hero */}
        <Animated.View
          style={{
            alignItems: "center",
            paddingTop: 40,
            paddingBottom: 32,
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
            RECENT DISCOVERIES
          </Text>
          <View style={{ height: 12 }} />
          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 52,
              color: C.NAVY,
              lineHeight: 56,
              textAlign: "center",
            }}
          >
            Did You
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
            Know?
          </Text>
          <View style={{ marginVertical: 16 }}>
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
            Surprising findings from peer-reviewed research — tap any card to read the paper
          </Text>
        </Animated.View>

        {/* Category pills */}
        <Animated.View
          style={{
            opacity: pillsAnim,
            transform: [{ translateY: pillsSlide }],
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => handleCategoryPress(cat.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: isActive ? C.NAVY : C.CARD,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: C.BORDER,
                    marginRight: 8,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: cat.dot,
                    }}
                  />
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: isActive ? "#ffffff" : C.TEXT_MUTED,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Toolbar row */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 8,
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
            {factsCountText}
          </Text>
          <Pressable
            onPress={handleNewBatch}
            disabled={loading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: C.GOLD,
                borderTopColor: "transparent",
              }}
            />
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 13,
                color: C.GOLD,
              }}
            >
              New batch
            </Text>
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <ActivityIndicator
            size="large"
            color={C.NAVY}
            style={{ marginTop: 60 }}
          />
        )}

        {/* Error */}
        {!loading && error && (
          <View
            style={{
              backgroundColor: "rgba(139,58,58,0.07)",
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: "rgba(139,58,58,0.2)",
              marginHorizontal: 20,
              marginTop: 16,
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
        )}

        {/* Fact cards */}
        {!loading && !error && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsSlide }],
            }}
          >
            {facts.map((fact) => (
              <FactCard
                key={fact.id}
                fact={fact}
                isBookmarked={isBookmarked(fact.id)}
                onToggleBookmark={() =>
                  toggle({
                    id: fact.id,
                    type: "fact",
                    savedAt: new Date().toISOString(),
                    headline: fact.headline,
                    body: fact.body,
                    tag: fact.tag,
                    journal: fact.journal,
                    year: fact.year,
                    url: fact.url,
                  })
                }
              />
            ))}
          </Animated.View>
        )}

        {/* Trust footer */}
        <Animated.View
          style={{
            paddingBottom: 32,
            paddingTop: 16,
            alignItems: "center",
            opacity: footerAnim,
            transform: [{ translateY: footerSlide }],
          }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 12,
              color: C.TEXT_HINT,
              textAlign: "center",
            }}
          >
            Sourced from peer-reviewed journals · Tap any card to read the original paper
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
