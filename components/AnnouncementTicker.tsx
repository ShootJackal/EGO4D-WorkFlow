import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

export interface TickerSegment {
  label: string;
  color: string;
  items: string[];
  speed: number;
}

const CHAR_WIDTH_EST = 6.2;

interface AnnouncementTickerProps {
  segments: TickerSegment[];
  prioritySegmentIds?: string[];
}

export default function AnnouncementTicker({ segments, prioritySegmentIds = [] }: AnnouncementTickerProps) {
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(280);
  const scrollX = useRef(new Animated.Value(280)).current;
  const pillSlide = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seg = segments[activeIndex] ?? segments[0];
  const hasPriority = seg && prioritySegmentIds.includes(seg.label);

  const startScroll = useCallback(
    (segIndex: number) => {
      const segment = segments[segIndex];
      if (!segment) return;

      const tickerText = segment.items.join("     |     ");
      const textWidth = Math.max(tickerText.length * CHAR_WIDTH_EST, scrollWidth * 1.5);
      const charSpeed = segment.speed || 28;
      const duration = Math.max(textWidth * charSpeed, 8000);

      scrollX.setValue(scrollWidth + 40);

      if (animRef.current) animRef.current.stop();

      const scrollAnim = Animated.timing(scrollX, {
        toValue: -textWidth + scrollWidth * 0.2,
        duration,
        useNativeDriver: true,
      });

      animRef.current = scrollAnim;

      scrollAnim.start(({ finished }) => {
        if (finished && segments.length > 1) {
          const nextIdx = (segIndex + 1) % segments.length;
          Animated.timing(pillSlide, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setActiveIndex(nextIdx);
            pillSlide.setValue(0);
            timerRef.current = setTimeout(() => startScroll(nextIdx), 400);
          });
        } else if (finished && segments.length <= 1) {
          timerRef.current = setTimeout(() => startScroll(segIndex), 2000);
        }
      });
    },
    [segments, scrollX, pillSlide, scrollWidth]
  );

  useEffect(() => {
    setActiveIndex(0);
    pillSlide.setValue(0);
    startScroll(0);
    return () => {
      if (animRef.current) animRef.current.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [segments.length]);

  if (!seg) return null;

  const tickerText = seg.items.join("   |   ");
  const containerBg = colors.headerBg ?? (isDark ? "#161618" : "#F8F6F0");
  const borderColor = colors.border;
  const separatorColor = isDark ? "#2E2E34" : "#E0DCD0";

  const fadeOpacity = scrollX.interpolate({
    inputRange: [scrollWidth * 0.6, scrollWidth + 40],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderBottomColor: hasPriority ? seg.color + "40" : borderColor,
          borderBottomWidth: hasPriority ? 2 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pillWrap,
          {
            opacity: pillSlide.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] }),
          },
        ]}
      >
        <View style={[styles.pill, { backgroundColor: seg.color + "22" }]}>
          <View style={[styles.pillDot, { backgroundColor: seg.color }]} />
          <Text style={[styles.pillText, { color: seg.color, fontFamily: FONT_MONO }]}>{seg.label}</Text>
        </View>
      </Animated.View>
      <View style={[styles.separator, { backgroundColor: separatorColor }]} />
      <View
        style={styles.scrollWrap}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setScrollWidth(w);
        }}
      >
        <View style={[styles.scrollHighlight, { backgroundColor: seg.color + (isDark ? "12" : "0A") }]} />
        <Animated.Text
          style={[
            styles.scrollText,
            {
              color: seg.color,
              fontFamily: FONT_MONO,
              opacity: fadeOpacity,
              transform: [{ translateX: scrollX }],
            },
          ]}
          numberOfLines={1}
        >
          {tickerText}
        </Animated.Text>
        <View style={[styles.fadeEdgeLeft, { backgroundColor: containerBg }]} pointerEvents="none" />
        <View style={[styles.fadeEdgeRight, { backgroundColor: containerBg }]} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    overflow: "hidden",
  },
  pillWrap: { paddingHorizontal: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 8, fontWeight: "800" as const, letterSpacing: 1.2 },
  separator: { width: 1, height: 16 },
  scrollWrap: {
    flex: 1,
    overflow: "hidden",
    height: 34,
    justifyContent: "center",
    marginLeft: 8,
    position: "relative" as const,
  },
  scrollHighlight: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 },
  scrollText: { fontSize: 10, letterSpacing: 0.3 },
  fadeEdgeLeft: { position: "absolute" as const, top: 0, left: 0, bottom: 0, width: 20, opacity: 0.92 },
  fadeEdgeRight: { position: "absolute" as const, top: 0, right: 0, bottom: 0, width: 28, opacity: 0.95 },
});
