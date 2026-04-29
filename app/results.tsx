import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";

const COLORS = {
  background: "#FAF7F2",
  surface: "#FFFDF9",
  surfaceSecondary: "#F5EFE6",
  summaryBg: "#F5EFE6",
  text: "#2C1810",
  textSecondary: "#8B7355",
  textTertiary: "#9E8E7A",
  primary: "#C17F3E",
  primaryMuted: "#F0E4D0",
  border: "#E8DDD0",
  green: "#5C8A5C",
  red: "#B85450",
  gray: "#9E8E7A",
  gold: "#c9a86c",
  navy: "#1c3a5e",
};

interface Study {
  title: string;
  authors: string;
  year: number;
  journal: string;
  stance: "supports" | "refutes" | "neutral";
  key_finding: string;
  quote: string;
  url: string;
  weight: number;
  citation_count: number;
  is_peer_reviewed: boolean;
}

interface ValidationResult {
  verdict: "VALID" | "INVALID" | "INCONCLUSIVE";
  confidence: number;
  supporting_count: number;
  refuting_count: number;
  neutral_count: number;
  total_count: number;
  supporting_pct: number;
  refuting_pct: number;
  neutral_pct: number;
  studies: Study[];
  summary: string;
}

type TabStance = "supports" | "refutes" | "neutral";

// ─── Donut Chart ─────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number
): string {
  const clampedEnd = Math.min(endDeg, startDeg + 359.99);
  const outerStart = polarToCartesian(cx, cy, outerR, clampedEnd);
  const outerEnd = polarToCartesian(cx, cy, outerR, startDeg);
  const innerStart = polarToCartesian(cx, cy, innerR, startDeg);
  const innerEnd = polarToCartesian(cx, cy, innerR, clampedEnd);
  const largeArc = clampedEnd - startDeg > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function DonutChart({
  supportingPct,
  refutingPct,
  neutralPct,
  confidence,
}: {
  supportingPct: number;
  refutingPct: number;
  neutralPct: number;
  confidence: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
  }, [opacity]);

  const cx = 90;
  const cy = 90;
  const outerR = 80;
  const innerR = 55;

  const supportDeg = (supportingPct / 100) * 360;
  const refuteDeg = (refutingPct / 100) * 360;
  const neutralDeg = (neutralPct / 100) * 360;

  const s0 = 0;
  const s1 = s0 + supportDeg;
  const s2 = s1 + refuteDeg;
  const s3 = s2 + neutralDeg;

  const confidenceText = `${confidence}%`;

  return (
    <Animated.View style={{ alignItems: "center", opacity }}>
      <Svg width={180} height={180}>
        {supportDeg > 0 && (
          <Path d={donutSegmentPath(cx, cy, outerR, innerR, s0, s1)} fill={COLORS.green} />
        )}
        {refuteDeg > 0 && (
          <Path d={donutSegmentPath(cx, cy, outerR, innerR, s1, s2)} fill={COLORS.red} />
        )}
        {neutralDeg > 0 && (
          <Path d={donutSegmentPath(cx, cy, outerR, innerR, s2, s3)} fill={COLORS.gray} />
        )}
        {/* Center hole */}
        <Circle cx={cx} cy={cy} r={innerR - 2} fill={COLORS.surface} />
      </Svg>
      {/* Center label — positioned absolutely over SVG */}
      <View style={styles.donutCenter} pointerEvents="none">
        <Text style={styles.donutConfidence}>{confidenceText}</Text>
        <Text style={styles.donutLabel}>confidence</Text>
      </View>
    </Animated.View>
  );
}

// ─── Animated List Item ───────────────────────────────────────────────────────

function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, index]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Weight Bar ───────────────────────────────────────────────────────────────

function WeightBar({ study }: { study: Study }) {
  const weight = Number(study.weight) || 0;
  const citationCount = Number(study.citation_count) || 0;
  const weightDisplay = weight.toFixed(2);
  const fillPercent = Math.min(Math.max(weight, 0), 1) * 100;
  const fillPercentStr = `${fillPercent}%`;

  const peerLabel = study.is_peer_reviewed ? "Peer-reviewed" : "Not peer-reviewed";
  const citationLabel = citationCount > 0 ? `${citationCount} citations` : null;

  const metaParts: string[] = [`Weight: ${weightDisplay}`];
  if (citationLabel) metaParts.push(citationLabel);
  if (study.is_peer_reviewed) metaParts.push(peerLabel);
  const metaText = metaParts.join(" · ");

  return (
    <View style={styles.weightContainer}>
      <View style={styles.weightTrack}>
        <View style={[styles.weightFill, { width: fillPercentStr }]} />
      </View>
      <Text style={styles.weightLabel}>{metaText}</Text>
    </View>
  );
}

// ─── Study Card ───────────────────────────────────────────────────────────────

function StanceBadge({ stance }: { stance: Study["stance"] }) {
  const badgeStyle =
    stance === "supports"
      ? styles.badgeGreen
      : stance === "refutes"
      ? styles.badgeRed
      : styles.badgeGray;
  const textStyle =
    stance === "supports"
      ? styles.badgeTextGreen
      : stance === "refutes"
      ? styles.badgeTextRed
      : styles.badgeTextGray;
  const emoji = stance === "supports" ? "✅" : stance === "refutes" ? "❌" : "⚖️";
  const label = stance === "supports" ? "Supports" : stance === "refutes" ? "Refutes" : "Neutral";

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={[styles.badgeText, textStyle]}>
        {emoji} {label}
      </Text>
    </View>
  );
}

function StudyCard({ study, index }: { study: Study; index: number }) {
  const handleViewStudy = useCallback(() => {
    console.log("[Validity] View Study pressed:", study.url);
    Linking.openURL(study.url);
  }, [study.url]);

  const authorYearJournal = `${study.authors} · ${study.year} · ${study.journal}`;

  return (
    <AnimatedListItem index={index}>
      <View style={styles.studyCard}>
        <View style={styles.studyHeader}>
          <Text style={styles.studyTitle} numberOfLines={2}>
            {study.title}
          </Text>
          <StanceBadge stance={study.stance} />
        </View>
        <Text style={styles.studyMeta} numberOfLines={2}>
          {authorYearJournal}
        </Text>
        <Text style={styles.studyFinding}>{study.key_finding}</Text>
        {study.quote ? (
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteText}>"{study.quote}"</Text>
          </View>
        ) : null}
        <WeightBar study={study} />
        {study.url ? (
          <Pressable onPress={handleViewStudy} style={styles.viewStudyBtn}>
            <Text style={styles.viewStudyText}>View Study →</Text>
          </Pressable>
        ) : null}
      </View>
    </AnimatedListItem>
  );
}

// ─── Evidence Tabs ────────────────────────────────────────────────────────────

const TAB_CONFIG: { stance: TabStance; emoji: string; label: string; color: string }[] = [
  { stance: "supports", emoji: "✅", label: "Supports", color: COLORS.green },
  { stance: "refutes", emoji: "❌", label: "Refutes", color: COLORS.red },
  { stance: "neutral", emoji: "⚖️", label: "Neutral", color: COLORS.gray },
];

function EvidenceTabs({
  studies,
  activeTab,
  onTabChange,
}: {
  studies: Study[];
  activeTab: TabStance;
  onTabChange: (tab: TabStance) => void;
}) {
  const supportCount = studies.filter((s) => s.stance === "supports").length;
  const refuteCount = studies.filter((s) => s.stance === "refutes").length;
  const neutralCount = studies.filter((s) => s.stance === "neutral").length;

  const counts: Record<TabStance, number> = {
    supports: supportCount,
    refutes: refuteCount,
    neutral: neutralCount,
  };

  return (
    <View style={styles.tabBar}>
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.stance;
        const count = counts[tab.stance];
        const tabLabel = `${tab.emoji} ${tab.label} (${count})`;

        return (
          <Pressable
            key={tab.stance}
            style={[
              styles.tabPill,
              isActive
                ? { backgroundColor: tab.color, borderColor: tab.color }
                : styles.tabPillInactive,
            ]}
            onPress={() => {
              console.log("[Validity] Evidence tab pressed:", tab.stance);
              onTabChange(tab.stance);
            }}
          >
            <Text
              style={[
                styles.tabPillText,
                isActive ? styles.tabPillTextActive : { color: COLORS.textTertiary },
              ]}
              numberOfLines={1}
            >
              {tabLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const claim = params.claim as string;
  const data: ValidationResult = JSON.parse(params.data as string);

  const studies = data.studies ?? [];

  const supportCount = studies.filter((s) => s.stance === "supports").length;
  const refuteCount = studies.filter((s) => s.stance === "refutes").length;
  const neutralCount = studies.filter((s) => s.stance === "neutral").length;

  const defaultTab: TabStance =
    supportCount >= refuteCount && supportCount >= neutralCount
      ? "supports"
      : refuteCount >= neutralCount
      ? "refutes"
      : "neutral";

  const [activeTab, setActiveTab] = useState<TabStance>(defaultTab);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    console.log("[Validity] Results screen mounted, verdict:", data.verdict, "confidence:", data.confidence);
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerOpacity, headerSlide]);

  const verdictColor =
    data.verdict === "VALID"
      ? COLORS.green
      : data.verdict === "INVALID"
      ? COLORS.red
      : COLORS.gray;

  const verdictLabel =
    data.verdict === "VALID"
      ? "Evidence leans toward: VALID"
      : data.verdict === "INVALID"
      ? "Evidence leans toward: INVALID"
      : "Evidence is: INCONCLUSIVE";

  const supportingPct = Number(data.supporting_pct) || 0;
  const refutingPct = Number(data.refuting_pct) || 0;
  const neutralPct = Number(data.neutral_pct) || 0;
  const confidence = Number(data.confidence) || 0;

  const activeTabConfig = TAB_CONFIG.find((t) => t.stance === activeTab)!;
  const activeStudies = studies.filter((s) => s.stance === activeTab);
  const activeCount = activeStudies.length;
  const sectionTitle = `${activeTabConfig.label} · ${activeCount} ${activeCount === 1 ? "study" : "studies"}`;

  const handleTabChange = (tab: TabStance) => {
    setActiveTab(tab);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Verdict Banner */}
      <Animated.View
        style={[
          styles.verdictBanner,
          { backgroundColor: verdictColor, opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <Text style={styles.verdictText}>{verdictLabel}</Text>
        <Text style={styles.verdictClaim} numberOfLines={3}>
          "{claim}"
        </Text>
      </Animated.View>

      {/* Confidence Donut */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Evidence Breakdown</Text>
        <View style={styles.donutWrapper}>
          <DonutChart
            supportingPct={supportingPct}
            refutingPct={refutingPct}
            neutralPct={neutralPct}
            confidence={confidence}
          />
        </View>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
            <Text style={styles.legendText}>{supportingPct}% Supporting</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
            <Text style={styles.legendText}>{refutingPct}% Refuting</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.gray }]} />
            <Text style={styles.legendText}>{neutralPct}% Neutral</Text>
          </View>
        </View>
      </View>

      {/* Evidence Tabs */}
      <EvidenceTabs studies={studies} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Section Title */}
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {/* Study Cards */}
      {activeStudies.length > 0 ? (
        activeStudies.map((study, i) => (
          <StudyCard key={`${activeTab}-${i}`} study={study} index={i} />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No {activeTabConfig.label.toLowerCase()} studies found
          </Text>
        </View>
      )}

      {/* Summary */}
      {data.summary ? (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>What the Evidence Says</Text>
          <Text style={styles.summaryText}>{data.summary}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 16,
  },

  // Verdict Banner
  verdictBanner: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  verdictText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  verdictClaim: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontStyle: "italic",
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    alignSelf: "flex-start",
  },

  // Donut
  donutWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
  },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  donutConfidence: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  donutLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
    marginTop: 2,
  },

  // Legend
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    gap: 8,
  },
  tabPill: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tabPillInactive: {
    backgroundColor: "transparent",
    borderColor: COLORS.border,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "SourceSans3_600SemiBold",
  },
  tabPillTextActive: {
    color: "#FFFFFF",
  },

  // Section title
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.2,
    marginBottom: -4,
  },

  // Empty state
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    fontFamily: "SourceSans3_400Regular",
  },

  // Study Card
  studyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  studyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  studyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 21,
  },
  studyMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  studyFinding: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: "#C17F3E",
    paddingLeft: 12,
    paddingVertical: 4,
    backgroundColor: "#F0E4D0",
    borderRadius: 4,
  },
  quoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    lineHeight: 19,
  },
  viewStudyBtn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  viewStudyText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Weight bar
  weightContainer: {
    gap: 4,
  },
  weightTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  weightFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  weightLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: "SourceSans3_400Regular",
  },

  // Stance badges
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeGreen: {
    backgroundColor: "rgba(92,138,92,0.15)",
  },
  badgeRed: {
    backgroundColor: "rgba(184,84,80,0.15)",
  },
  badgeGray: {
    backgroundColor: "rgba(158,142,122,0.15)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextGreen: {
    color: COLORS.green,
  },
  badgeTextRed: {
    color: COLORS.red,
  },
  badgeTextGray: {
    color: COLORS.gray,
  },

  // Summary
  summaryCard: {
    backgroundColor: "#F5EFE6",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8DDD0",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 23,
  },
});
