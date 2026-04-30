import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  Easing,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppDrawer, HamburgerButton, useSwipeToOpenDrawer } from "@/components/AppDrawer";
import { useBookmarks, Bookmark } from "@/utils/useBookmarks";

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

function TagBadge({ tag }: { tag: "Overturned" | "Surprising" | "Confirmed" }) {
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
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 10, color: badgeColor }}>
        {tag}
      </Text>
    </View>
  );
}

function VerdictBadge({ verdict }: { verdict: "BUSTED" | "CONFIRMED" | "COMPLICATED" }) {
  const badgeLabel =
    verdict === "BUSTED" ? "✗ Busted" : verdict === "CONFIRMED" ? "✓ Confirmed" : "~ Complicated";

  const badgeBg =
    verdict === "BUSTED"
      ? "rgba(139,58,58,0.12)"
      : verdict === "CONFIRMED"
      ? "rgba(45,90,39,0.1)"
      : "rgba(122,82,0,0.1)";

  const badgeColor =
    verdict === "BUSTED" ? "#8b3a3a" : verdict === "CONFIRMED" ? "#2d5a27" : "#7a5200";

  return (
    <View
      style={{
        backgroundColor: badgeBg,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 10, color: badgeColor }}>
        {badgeLabel}
      </Text>
    </View>
  );
}

function SavedFactCard({
  item,
  onRemove,
}: {
  item: Bookmark;
  onRemove: () => void;
}) {
  const leftBorderColor =
    item.tag === "Overturned"
      ? "#8b3a3a"
      : item.tag === "Surprising"
      ? "#c9a86c"
      : "#2d5a27";

  const journalYear = item.journal && item.year ? `${item.journal} · ${item.year}` : item.journal ?? "";
  const hasUrl = Boolean(item.url);

  const handleReadPaper = useCallback(() => {
    if (item.url) {
      console.log("[Saved] Read paper pressed:", item.url);
      Linking.openURL(item.url);
    }
  }, [item.url]);

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: C.CARD,
        borderRadius: 16,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 3,
        borderTopColor: C.BORDER,
        borderRightColor: C.BORDER,
        borderBottomColor: C.BORDER,
        borderLeftColor: leftBorderColor,
        shadowColor: C.NAVY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        overflow: "hidden",
      }}
    >
      {/* Browser bar */}
      <View
        style={{
          backgroundColor: C.CARD_TOP,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#e8a090" }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#e8c870" }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#90c870" }} />
        </View>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 11,
            color: C.TEXT_HINT,
            flex: 1,
            textAlign: "center",
          }}
        >
          Fact
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Body */}
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            {item.tag && <TagBadge tag={item.tag} />}
            <View style={{ height: 6 }} />
            <Text
              style={{
                fontFamily: "PlayfairDisplay_700Bold",
                fontSize: 15,
                color: C.NAVY,
                lineHeight: 21,
              }}
            >
              {item.headline}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              console.log("[Saved] Remove bookmark pressed for fact:", item.id);
              onRemove();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 18, color: C.GOLD }}>★</Text>
          </Pressable>
        </View>
        {item.body ? (
          <Text
            style={{
              fontFamily: "SourceSans3_300Light",
              fontSize: 13,
              color: C.TEXT_MUTED,
              lineHeight: 19,
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: "SourceSans3_400Regular", fontSize: 11, color: C.TEXT_HINT }}>
            {journalYear}
          </Text>
          {hasUrl && (
            <Pressable onPress={handleReadPaper}>
              <Text style={{ fontFamily: "SourceSans3_600SemiBold", fontSize: 12, color: C.STEEL }}>
                Read paper →
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function SavedMythCard({
  item,
  onRemove,
}: {
  item: Bookmark;
  onRemove: () => void;
}) {
  const leftBorderColor =
    item.verdict === "BUSTED"
      ? "#8b3a3a"
      : item.verdict === "CONFIRMED"
      ? "#2d5a27"
      : "#c9a86c";

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: C.CARD,
        borderRadius: 16,
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 3,
        borderTopColor: C.BORDER,
        borderRightColor: C.BORDER,
        borderBottomColor: C.BORDER,
        borderLeftColor: leftBorderColor,
        shadowColor: C.NAVY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        overflow: "hidden",
      }}
    >
      {/* Browser bar */}
      <View
        style={{
          backgroundColor: C.CARD_TOP,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#e8a090" }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#e8c870" }} />
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#90c870" }} />
        </View>
        <Text
          style={{
            fontFamily: "SourceSans3_400Regular",
            fontSize: 11,
            color: C.TEXT_HINT,
            flex: 1,
            textAlign: "center",
          }}
        >
          Myth
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Body */}
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          <Text
            style={{
              fontFamily: "PlayfairDisplay_700Bold",
              fontSize: 15,
              color: C.NAVY,
              lineHeight: 21,
              flex: 1,
              marginRight: 8,
            }}
          >
            {item.claim}
          </Text>
          <Pressable
            onPress={() => {
              console.log("[Saved] Remove bookmark pressed for myth:", item.id);
              onRemove();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 18, color: C.GOLD }}>★</Text>
          </Pressable>
        </View>
        {item.one_liner ? (
          <Text
            style={{
              fontFamily: "SourceSans3_400Regular",
              fontSize: 13,
              color: C.TEXT_MUTED,
              lineHeight: 19,
              marginBottom: 8,
            }}
            numberOfLines={2}
          >
            {item.one_liner}
          </Text>
        ) : null}
        {item.verdict && <VerdictBadge verdict={item.verdict} />}
      </View>
    </View>
  );
}

export default function SavedScreen() {
  const { bookmarks, toggle } = useBookmarks();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(20)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;
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
    animateSection(contentAnim, contentSlide, 180);
    animateSection(footerAnim, footerSlide, 320);
  }, [animateSection, heroAnim, heroSlide, contentAnim, contentSlide, footerAnim, footerSlide]);

  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));

  const savedFacts = bookmarks.filter((b) => b.type === "fact");
  const savedMyths = bookmarks.filter((b) => b.type === "myth");
  const isEmpty = bookmarks.length === 0;

  const factsLabel = `FACTS (${savedFacts.length})`;
  const mythsLabel = `MYTHS (${savedMyths.length})`;

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
              console.log("[Saved] Hamburger menu pressed");
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
            COLLECTION
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
            Saved
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
            Items
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
            Your bookmarked facts and myths
          </Text>
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentSlide }],
          }}
        >
          {isEmpty ? (
            <View style={{ alignItems: "center", paddingTop: 32, paddingHorizontal: 40 }}>
              <Text style={{ fontSize: 48, color: C.GOLD, marginBottom: 16 }}>☆</Text>
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_700Bold",
                  fontSize: 22,
                  color: C.NAVY,
                  textAlign: "center",
                  marginBottom: 10,
                }}
              >
                Nothing saved yet
              </Text>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 14,
                  color: C.TEXT_MUTED,
                  textAlign: "center",
                  lineHeight: 21,
                }}
              >
                Tap ☆ on any fact or myth card to save it here
              </Text>
            </View>
          ) : (
            <>
              {savedFacts.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 10,
                      color: C.GOLD,
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      paddingHorizontal: 24,
                      marginBottom: 12,
                    }}
                  >
                    {factsLabel}
                  </Text>
                  {savedFacts.map((item) => (
                    <SavedFactCard
                      key={item.id}
                      item={item}
                      onRemove={() => toggle(item)}
                    />
                  ))}
                </View>
              )}

              {savedMyths.length > 0 && (
                <View style={{ marginBottom: 8, marginTop: savedFacts.length > 0 ? 16 : 0 }}>
                  <Text
                    style={{
                      fontFamily: "SourceSans3_600SemiBold",
                      fontSize: 10,
                      color: C.GOLD,
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      paddingHorizontal: 24,
                      marginBottom: 12,
                    }}
                  >
                    {mythsLabel}
                  </Text>
                  {savedMyths.map((item) => (
                    <SavedMythCard
                      key={item.id}
                      item={item}
                      onRemove={() => toggle(item)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </Animated.View>

        {/* Trust footer */}
        <Animated.View
          style={{
            paddingBottom: 32,
            paddingTop: 24,
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
            Saved locally on your device
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}


