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

const BASE_URL = "https://q26sfuevvv3f37eb5vv7wtvdysnmg7m3.app.specular.dev";

interface Study {
  title: string;
  journal: string;
  year: number;
  url: string;
}

interface Myth {
  id: string;
  claim: string;
  verdict: "BUSTED" | "CONFIRMED" | "COMPLICATED";
  one_liner: string;
  explanation: string;
  studies: Study[];
}

type FilterType = "ALL" | "BUSTED" | "CONFIRMED" | "COMPLICATED";

const FILTER_PILLS: FilterType[] = ["ALL", "BUSTED", "CONFIRMED", "COMPLICATED"];

function VerdictBadge({ verdict }: { verdict: Myth["verdict"] }) {
  const badgeLabel =
    verdict === "BUSTED"
      ? "✗ Busted"
      : verdict === "CONFIRMED"
      ? "✓ Confirmed"
      : "~ Complicated";

  const badgeBg =
    verdict === "BUSTED"
      ? "rgba(139,58,58,0.12)"
      : verdict === "CONFIRMED"
      ? "rgba(45,90,39,0.1)"
      : "rgba(122,82,0,0.1)";

  const badgeColor =
    verdict === "BUSTED"
      ? "#8b3a3a"
      : verdict === "CONFIRMED"
      ? "#2d5a27"
      : "#7a5200";

  return (
    <View
      style={{
        backgroundColor: badgeBg,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontFamily: "SourceSans3_600SemiBold",
          fontSize: 12,
          color: badgeColor,
        }}
      >
        {badgeLabel}
      </Text>
    </View>
  );
}

function StudyRow({ study, isLast }: { study: Study; isLast: boolean }) {
  const journalYear = `${study.journal} · ${study.year}`;

  const handlePress = useCallback(() => {
    if (study.url) {
      console.log("[Myths] Study link pressed:", study.url);
      Linking.openURL(study.url);
    }
  }, [study.url]);

  const inner = (
    <View>
      <Text
        style={{
          fontFamily: "PlayfairDisplay_700Bold",
          fontSize: 13,
          color: C.NAVY,
        }}
        numberOfLines={2}
      >
        {study.title}
      </Text>
      <Text
        style={{
          fontFamily: "SourceSans3_400Regular",
          fontSize: 11,
          color: C.TEXT_HINT,
          marginTop: 2,
        }}
      >
        {journalYear}
      </Text>
    </View>
  );

  return (
    <>
      {study.url ? (
        <Pressable onPress={handlePress}>{inner}</Pressable>
      ) : (
        inner
      )}
      {!isLast && (
        <View
          style={{
            height: 1,
            backgroundColor: C.BORDER,
            marginVertical: 8,
          }}
        />
      )}
    </>
  );
}

function MythCard({
  myth,
  expanded,
  onToggleExpand,
  isBookmarked,
  onToggleBookmark,
}: {
  myth: Myth;
  expanded: boolean;
  onToggleExpand: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  const studiesOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(studiesOpacity, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [expanded, studiesOpacity]);

  const verdictLabel =
    myth.verdict === "BUSTED"
      ? "BUSTED"
      : myth.verdict === "CONFIRMED"
      ? "CONFIRMED"
      : "COMPLICATED";

  const studiesLabel = expanded ? "Hide studies ↑" : "See studies →";

  const leftBorderColor =
    myth.verdict === "BUSTED"
      ? "#8b3a3a"
      : myth.verdict === "CONFIRMED"
      ? "#2d5a27"
      : "#c9a86c";

  const bookmarkChar = isBookmarked ? "★" : "☆";
  const bookmarkColor = isBookmarked ? C.GOLD : C.TEXT_HINT;

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
          {verdictLabel}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {/* Card body */}
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 }}>
        {/* Claim + bookmark row */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 18,
              color: C.NAVY,
              lineHeight: 24,
              flex: 1,
              marginRight: 8,
            }}
          >
            {myth.claim}
          </Text>
          <Pressable
            onPress={() => {
              console.log("[Myths] Bookmark pressed for myth:", myth.id, "currently saved:", isBookmarked);
              onToggleBookmark();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 20, color: bookmarkColor }}>{bookmarkChar}</Text>
          </Pressable>
        </View>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 14,
            color: C.TEXT_MUTED,
            lineHeight: 20,
            marginBottom: 12,
          }}
        >
          {myth.one_liner}
        </Text>
        <VerdictBadge verdict={myth.verdict} />
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 13,
            color: C.TEXT,
            lineHeight: 19,
            marginTop: 10,
          }}
        >
          {myth.explanation}
        </Text>
        <Pressable
          onPress={() => {
            console.log("[Myths] Toggle studies for myth:", myth.id, "expanded:", !expanded);
            onToggleExpand();
          }}
          style={{ marginTop: 10 }}
        >
          <Text
            style={{
              fontFamily: "SourceSans3_600SemiBold",
              fontSize: 13,
              color: C.STEEL,
            }}
          >
            {studiesLabel}
          </Text>
        </Pressable>

        {/* Studies list */}
        {expanded && (
          <Animated.View style={{ opacity: studiesOpacity, marginTop: 12 }}>
            {myth.studies.map((study, idx) => (
              <StudyRow
                key={idx}
                study={study}
                isLast={idx === myth.studies.length - 1}
              />
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export default function MythsScreen() {
  const [myths, setMyths] = useState<Myth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

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

  useEffect(() => {
    const loadMyths = async () => {
      console.log("[Myths] Fetching nutrition myths from API");
      try {
        const res = await fetch(`${BASE_URL}/api/nutrition-myths`);
        if (!res.ok) {
          const text = await res.text();
          console.error("[Myths] Fetch failed:", res.status, text);
          throw new Error(`Server error ${res.status}`);
        }
        const data = await res.json();
        console.log("[Myths] Fetched", (data.myths || data).length, "myths");
        setMyths(data.myths || data);
      } catch (e) {
        console.error("[Myths] Error loading myths:", e);
        setError("Couldn't load myths. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    };
    loadMyths();
  }, []);

  const handleFilterPress = useCallback((f: FilterType) => {
    console.log("[Myths] Filter pill pressed:", f);
    setFilter(f);
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log("[Myths] Refresh button pressed");
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/nutrition-myths/refresh`, { method: "POST" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const updated = data.myths || data;
      console.log("[Myths] Refreshed, now", updated.length, "myths");
      setMyths(updated);
      setRefreshed(true);
    } catch (e) {
      console.error("[Myths] Refresh error:", e);
      setRefreshError("Couldn't refresh myths. Try again.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));

  const filteredMyths =
    filter === "ALL" ? myths : myths.filter((m) => m.verdict === filter);

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
              console.log("[Myths] Hamburger menu pressed");
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
            EDITORIAL
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
            Nutrition
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
            Myth Buster
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
            Swipe through popular claims — backed by peer-reviewed research
          </Text>
        </Animated.View>

        {/* Filter pills */}
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
              gap: 8,
            }}
          >
            {FILTER_PILLS.map((pill) => {
              const isActive = filter === pill;
              return (
                <Pressable
                  key={pill}
                  onPress={() => handleFilterPress(pill)}
                  style={{
                    backgroundColor: isActive ? C.NAVY : C.CARD,
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: C.BORDER,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 13,
                      color: isActive ? "#ffffff" : C.TEXT_MUTED,
                    }}
                  >
                    {pill}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Refresh button */}
        <Animated.View
          style={{
            opacity: pillsAnim,
            transform: [{ translateY: pillsSlide }],
          }}
        >
          <View style={{ paddingHorizontal: 20, alignItems: "flex-end", marginBottom: 8 }}>
            <Pressable
              onPress={handleRefresh}
              disabled={refreshing || loading}
              style={{
                backgroundColor: refreshed ? "rgba(201,168,108,0.12)" : C.CARD,
                borderWidth: 1,
                borderColor: refreshed ? C.GOLD : C.BORDER,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                opacity: refreshing || loading ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 13,
                  color: refreshed ? C.GOLD : C.TEXT_MUTED,
                }}
              >
                {refreshing ? "Searching..." : refreshed ? "✓ Refreshed" : "Refresh myths ↻"}
              </Text>
            </Pressable>
          </View>
          {refreshError && (
            <View
              style={{
                backgroundColor: "rgba(139,58,58,0.07)",
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: "rgba(139,58,58,0.2)",
                marginHorizontal: 20,
                marginBottom: 8,
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
                {refreshError}
              </Text>
            </View>
          )}
        </Animated.View>

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

        {/* Myth cards */}
        {!loading && !error && (
          <Animated.View
            style={{
              opacity: cardsAnim,
              transform: [{ translateY: cardsSlide }],
            }}
          >
            {filteredMyths.map((myth) => (
              <MythCard
                key={myth.id}
                myth={myth}
                expanded={expandedIds.has(myth.id)}
                onToggleExpand={() => handleToggleExpand(myth.id)}
                isBookmarked={isBookmarked(myth.id)}
                onToggleBookmark={() =>
                  toggle({
                    id: myth.id,
                    type: "myth",
                    savedAt: new Date().toISOString(),
                    claim: myth.claim,
                    verdict: myth.verdict,
                    one_liner: myth.one_liner,
                    explanation: myth.explanation,
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
            Live PubMed Data · 36M+ Academic Citations · Peer-Reviewed Sources
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
