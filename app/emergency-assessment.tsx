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
import { router, useLocalSearchParams } from "expo-router";
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

const BASE_URL = "https://cmuaesxcprg74u8g9gy7tas6czbaw9aw.app.specular.dev";

type Question = {
  id: string;
  category: string;
  question: string;
  type: "scale" | "choice" | "text";
  scale_min: number | null;
  scale_max: number | null;
  options: string[] | null;
};

type Answer = {
  question: string;
  answer: string;
};

// ── Scale answer row ──────────────────────────────────────────────────────────
function ScaleInput({
  min,
  max,
  selected,
  onSelect,
}: {
  min: number;
  max: number;
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  const values: number[] = [];
  for (let i = min; i <= max; i++) values.push(i);

  const topRow = values.slice(0, Math.ceil(values.length / 2));
  const bottomRow = values.slice(Math.ceil(values.length / 2));

  const renderBtn = (v: number) => {
    const isSelected = selected === String(v);
    return (
      <Pressable
        key={v}
        onPress={() => {
          console.log("[Assessment] Scale value selected:", v);
          onSelect(String(v));
        }}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: isSelected ? C.NAVY : C.BORDER,
          backgroundColor: isSelected ? C.NAVY : C.CARD,
          alignItems: "center",
          justifyContent: "center",
          margin: 3,
        }}
      >
        <Text
          style={{
            fontFamily: "SourceSans3_600SemiBold",
            fontSize: 14,
            color: isSelected ? "#ffffff" : C.TEXT_MUTED,
          }}
        >
          {v}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {topRow.map(renderBtn)}
      </View>
      {bottomRow.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {bottomRow.map(renderBtn)}
        </View>
      )}
    </View>
  );
}

// ── Choice answer list ────────────────────────────────────────────────────────
function ChoiceInput({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      {options.map((opt) => {
        const isSelected = selected === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              console.log("[Assessment] Choice selected:", opt);
              onSelect(opt);
            }}
            style={{
              borderWidth: 1.5,
              borderColor: isSelected ? C.NAVY : C.BORDER,
              backgroundColor: isSelected ? C.NAVY : C.CARD,
              borderRadius: 50,
              paddingHorizontal: 18,
              paddingVertical: 13,
            }}
          >
            <Text
              style={{
                fontFamily: "SourceSans3_400Regular",
                fontSize: 15,
                color: isSelected ? "#ffffff" : C.TEXT_MUTED,
                textAlign: "center",
              }}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Text answer input ─────────────────────────────────────────────────────────
function TextAnswerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? C.NAVY : C.BORDER;

  return (
    <TextInput
      style={{
        fontFamily: "PlayfairDisplay_400Regular",
        fontSize: 16,
        color: C.TEXT,
        minHeight: 80,
        textAlignVertical: "top",
        borderBottomWidth: 2,
        borderBottomColor: borderColor,
        paddingBottom: 8,
        paddingTop: 8,
        marginTop: 12,
      }}
      placeholder="Type your answer here..."
      placeholderTextColor={C.TEXT_HINT}
      value={value}
      onChangeText={(t) => {
        onChange(t);
      }}
      multiline
      textAlignVertical="top"
      onFocus={() => {
        console.log("[Assessment] Text input focused");
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EmergencyAssessmentScreen() {
  const params = useLocalSearchParams<{ situation: string; questions: string }>();

  // Parse questions from params
  let parsedQuestions: Question[] = [];
  let parseError = false;
  try {
    if (params.questions) {
      parsedQuestions = JSON.parse(params.questions) as Question[];
    } else {
      parseError = true;
    }
  } catch {
    parseError = true;
  }

  const situation = params.situation ?? "";

  const [questions] = useState<Question[]>(parsedQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [situationExpanded, setSituationExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const swipeHandlers = useSwipeToOpenDrawer(() => setDrawerOpen(true));

  // Card slide/fade animation
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(60)).current;

  // Header fade-in on mount
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslate, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerOpacity, headerTranslate]);

  const animateCardIn = useCallback(() => {
    cardOpacity.setValue(0);
    cardTranslate.setValue(60);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslate]);

  useEffect(() => {
    animateCardIn();
  }, [currentIndex, animateCardIn]);

  const submitAssessment = useCallback(
    async (finalAnswers: Answer[]) => {
      console.log("[Assessment] Submitting assessment, answers count:", finalAnswers.length);
      setLoading(true);
      setError(null);
      try {
        console.log("[Assessment] POST /api/emergency-check →", BASE_URL);
        const response = await fetch(`${BASE_URL}/api/emergency-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ situation, answers: finalAnswers }),
        });
        if (!response.ok) {
          const text = await response.text();
          console.error("[Assessment] API error", response.status, text);
          throw new Error(`Server error ${response.status}`);
        }
        const data = await response.json();
        console.log("[Assessment] Triage response received, recommendation:", data.recommendation);
        router.push({
          pathname: "/emergency-results",
          params: { situation, data: JSON.stringify(data) },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[Assessment] Submit failed:", message);
        setError("Couldn't get triage guidance. Check your connection and try again.");
        setLoading(false);
      }
    },
    [situation]
  );

  const advanceQuestion = useCallback(
    (answer: string) => {
      const question = questions[currentIndex];
      const newAnswers = [...answers, { question: question.question, answer }];
      setAnswers(newAnswers);
      setCurrentAnswer(null);

      if (currentIndex < questions.length - 1) {
        // Slide current card out to left, then advance
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslate, {
            toValue: -60,
            duration: 200,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentIndex((prev) => prev + 1);
          // Collapse situation summary after first question
          setSituationExpanded(false);
        });
      } else {
        // Last question — submit
        submitAssessment(newAnswers);
      }
    },
    [answers, currentIndex, questions, cardOpacity, cardTranslate, submitAssessment]
  );

  const handleNext = useCallback(() => {
    if (!currentAnswer) return;
    console.log("[Assessment] Next pressed, answer:", currentAnswer);
    advanceQuestion(currentAnswer);
  }, [currentAnswer, advanceQuestion]);

  const handleSkip = useCallback(() => {
    console.log("[Assessment] Skip pressed for question:", questions[currentIndex]?.question);
    advanceQuestion("Not answered");
  }, [advanceQuestion, currentIndex, questions]);

  // ── Parse error state ──────────────────────────────────────────────────────
  if (parseError || questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.BG }} edges={["top", "bottom"]}>
        <View style={{ height: 3, backgroundColor: C.GOLD }} />
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
            Couldn't load questions
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
            The assessment questions could not be loaded. Please go back and try again.
          </Text>
          <Pressable
            onPress={() => {
              console.log("[Assessment] Go Back pressed from error state");
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

  const question = questions[currentIndex];
  const total = questions.length;
  const progressPercent = total > 0 ? (currentIndex / total) * 100 : 0;
  const progressLabel = `Question ${currentIndex + 1} of ${total}`;
  const isLastQuestion = currentIndex === questions.length - 1;
  const nextLabel = isLastQuestion ? "Get Triage →" : "Next →";

  const scaleMin = question.scale_min ?? 0;
  const scaleMax = question.scale_max ?? 10;
  const choiceOptions = question.options ?? [];

  const canProceed =
    question.type === "text" ? true : currentAnswer !== null;

  const nextBtnBg = !canProceed || loading ? "#d4cfc9" : C.NAVY;
  const nextBtnTextColor = !canProceed || loading ? "#a09890" : "#ffffff";

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
          {/* Top gold accent bar */}
          <View style={{ height: 3, backgroundColor: C.GOLD }} />

          {/* Hamburger row */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" }}>
            <HamburgerButton onPress={() => setDrawerOpen(true)} />
          </View>

          {/* Header section */}
          <Animated.View
            style={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslate }],
            }}
          >
            {/* Back button */}
            <Pressable
              onPress={() => {
                console.log("[Assessment] Back button pressed");
                router.back();
              }}
              style={{ marginBottom: 16, alignSelf: "flex-start" }}
            >
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 15,
                  color: C.TEXT_MUTED,
                }}
              >
                ← Back
              </Text>
            </Pressable>

            {/* Gold label */}
            <Text
              style={{
                fontFamily: "SourceSans3_600SemiBold",
                fontSize: 11,
                color: C.GOLD,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              HEAD-TO-TOE ASSESSMENT
            </Text>

            {/* Progress bar row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: 4,
                  backgroundColor: C.BORDER,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 4,
                    width: `${progressPercent}%`,
                    backgroundColor: C.NAVY,
                    borderRadius: 2,
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: "SourceSans3_400Regular",
                  fontSize: 12,
                  color: C.TEXT_MUTED,
                  flexShrink: 0,
                }}
              >
                {progressLabel}
              </Text>
            </View>
          </Animated.View>

          {/* Situation summary (collapsible) */}
          <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
            <Pressable
              onPress={() => {
                console.log("[Assessment] Situation summary toggled, expanded:", !situationExpanded);
                setSituationExpanded((prev) => !prev);
              }}
              style={{
                backgroundColor: C.CARD_TOP,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.BORDER,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: "SourceSans3_600SemiBold",
                    fontSize: 11,
                    color: C.TEXT_MUTED,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                  }}
                >
                  Your Situation
                </Text>
                <Text
                  style={{
                    fontFamily: "SourceSans3_400Regular",
                    fontSize: 13,
                    color: C.TEXT_HINT,
                  }}
                >
                  {situationExpanded ? "▲" : "▼"}
                </Text>
              </View>
              {situationExpanded ? (
                <Text
                  style={{
                    fontFamily: "PlayfairDisplay_400Regular_Italic",
                    fontSize: 14,
                    color: C.TEXT_MUTED,
                    lineHeight: 20,
                    marginTop: 6,
                  }}
                >
                  {situation}
                </Text>
              ) : null}
            </Pressable>
          </View>

          {/* Question card */}
          <Animated.View
            style={{
              marginHorizontal: 20,
              opacity: cardOpacity,
              transform: [{ translateX: cardTranslate }],
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
                padding: 20,
              }}
            >
              {/* Category label */}
              <Text
                style={{
                  fontFamily: "SourceSans3_600SemiBold",
                  fontSize: 10,
                  color: C.GOLD,
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                {question.category}
              </Text>

              {/* Question text */}
              <Text
                style={{
                  fontFamily: "PlayfairDisplay_400Regular",
                  fontSize: 18,
                  color: C.NAVY,
                  lineHeight: 28,
                  marginBottom: 4,
                }}
              >
                {question.question}
              </Text>

              {/* Answer input */}
              {question.type === "scale" ? (
                <ScaleInput
                  min={scaleMin}
                  max={scaleMax}
                  selected={currentAnswer}
                  onSelect={setCurrentAnswer}
                />
              ) : question.type === "choice" ? (
                <ChoiceInput
                  options={choiceOptions}
                  selected={currentAnswer}
                  onSelect={setCurrentAnswer}
                />
              ) : (
                <TextAnswerInput
                  value={currentAnswer ?? ""}
                  onChange={setCurrentAnswer}
                />
              )}

              {/* Navigation row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 24,
                }}
              >
                <Pressable
                  onPress={handleSkip}
                  disabled={loading}
                  style={{ paddingVertical: 8, paddingHorizontal: 4 }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 14,
                      color: loading ? C.TEXT_HINT : C.TEXT_MUTED,
                    }}
                  >
                    Skip
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleNext}
                  disabled={!canProceed || loading}
                  style={{
                    backgroundColor: nextBtnBg,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    shadowColor: "#1c3a5e",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: !canProceed || loading ? 0 : 0.3,
                    shadowRadius: 8,
                    elevation: !canProceed || loading ? 0 : 3,
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text
                        style={{
                          fontFamily: "SourceSans3_600SemiBold",
                          fontSize: 14,
                          color: "#ffffff",
                        }}
                      >
                        Analyzing...
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontFamily: "SourceSans3_600SemiBold",
                        fontSize: 14,
                        color: nextBtnTextColor,
                      }}
                    >
                      {nextLabel}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Inline error */}
              {error ? (
                <View
                  style={{
                    marginTop: 12,
                    backgroundColor: "rgba(139,58,58,0.07)",
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "rgba(139,58,58,0.2)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "SourceSans3_400Regular",
                      fontSize: 13,
                      color: C.DANGER,
                      lineHeight: 19,
                    }}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
