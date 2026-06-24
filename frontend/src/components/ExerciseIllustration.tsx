// LevelUp exercise illustrations.
// Lightweight animated stick-figure SVG drawings, no external assets.
// One file, ~9 archetypes. Match an exercise name to an archetype by keyword.

import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { colors } from "@/src/theme";

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const FG = "#FFFFFF";
const STROKE = 3;

export type ExerciseKind =
  | "squat"
  | "push"
  | "pull"
  | "hinge"
  | "plank"
  | "lunge"
  | "cardio"
  | "stretch"
  | "rest"
  | "default";

const KEYWORDS: { kind: ExerciseKind; words: string[] }[] = [
  { kind: "squat", words: ["squat", "goblet", "wall sit"] },
  { kind: "push", words: ["push", "press", "bench", "dip", "shoulder"] },
  { kind: "pull", words: ["pull", "row", "chin", "lat", "pulldown"] },
  { kind: "hinge", words: ["deadlift", "rdl", "hinge", "swing", "kettlebell", "good morning"] },
  { kind: "plank", words: ["plank", "hollow", "core", "ab", "bird dog", "bridge"] },
  { kind: "lunge", words: ["lunge", "split squat", "step up", "step-up"] },
  { kind: "cardio", words: ["run", "jog", "sprint", "row erg", "bike", "z2", "cardio", "burpee", "jump", "jumping", "conditioning", "carry", "march"] },
  { kind: "stretch", words: ["stretch", "mobility", "warmup", "warm up", "warm-up", "activation", "world's greatest", "down-reg", "cooldown", "cool-down", "cool down", "yoga"] },
  { kind: "rest", words: ["rest", "recover", "break"] },
];

export function pickKind(label: string): ExerciseKind {
  const l = (label || "").toLowerCase();
  for (const r of KEYWORDS) {
    if (r.words.some((w) => l.includes(w))) return r.kind;
  }
  return "default";
}

interface Props {
  kind: ExerciseKind;
  playing: boolean;
  size?: number;
  accent?: string;
}

export function ExerciseIllustration({
  kind,
  playing,
  size = 200,
  accent = colors.accent,
}: Props) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    t.stopAnimation();
    if (!playing) {
      Animated.timing(t, { toValue: 0, duration: 250, useNativeDriver: false }).start();
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: kind === "cardio" ? 600 : 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: kind === "cardio" ? 600 : 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [kind, playing]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {renderArchetype(kind, t, accent)}
      </Svg>
    </View>
  );
}

function renderArchetype(kind: ExerciseKind, t: Animated.Value, accent: string) {
  switch (kind) {
    case "squat":
      return <Squat t={t} accent={accent} />;
    case "push":
      return <Push t={t} accent={accent} />;
    case "pull":
      return <Pull t={t} accent={accent} />;
    case "hinge":
      return <Hinge t={t} accent={accent} />;
    case "plank":
      return <Plank t={t} accent={accent} />;
    case "lunge":
      return <Lunge t={t} accent={accent} />;
    case "cardio":
      return <Cardio t={t} accent={accent} />;
    case "stretch":
      return <Stretch t={t} accent={accent} />;
    case "rest":
      return <Rest t={t} accent={accent} />;
    default:
      return <DefaultFig t={t} accent={accent} />;
  }
}

// Floor line shared
function Ground({ accent }: { accent: string }) {
  return (
    <Line
      x1={20}
      y1={170}
      x2={180}
      y2={170}
      stroke={accent}
      strokeOpacity={0.4}
      strokeWidth={1}
      strokeDasharray="4 6"
    />
  );
}

/* ----- archetypes ----- */

function Squat({ t, accent }: { t: Animated.Value; accent: string }) {
  // hips drop and knees bend
  const hipY = t.interpolate({ inputRange: [0, 1], outputRange: [110, 135] });
  const headY = t.interpolate({ inputRange: [0, 1], outputRange: [50, 70] });
  const kneeY = t.interpolate({ inputRange: [0, 1], outputRange: [145, 152] });
  const kneeOffset = t.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={100} cy={headY} r={12} stroke={FG} strokeWidth={STROKE} fill="none" />
      {/* torso */}
      <AnimatedLine x1={100} y1={Animated.add(headY, new Animated.Value(12)) as any} x2={100} y2={hipY} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* arms forward */}
      <AnimatedLine x1={100} y1={Animated.add(headY, new Animated.Value(25)) as any} x2={140} y2={Animated.add(headY, new Animated.Value(20)) as any} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={100} y1={Animated.add(headY, new Animated.Value(25)) as any} x2={60} y2={Animated.add(headY, new Animated.Value(20)) as any} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* legs to knees (forward offset) */}
      <AnimatedLine x1={100} y1={hipY} x2={Animated.subtract(new Animated.Value(85), kneeOffset) as any} y2={kneeY} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={100} y1={hipY} x2={Animated.add(new Animated.Value(115), kneeOffset) as any} y2={kneeY} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      {/* shins to feet */}
      <AnimatedLine x1={Animated.subtract(new Animated.Value(85), kneeOffset) as any} y1={kneeY} x2={85} y2={170} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={Animated.add(new Animated.Value(115), kneeOffset) as any} y1={kneeY} x2={115} y2={170} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Push({ t, accent }: { t: Animated.Value; accent: string }) {
  // body horizontal, elbows bend
  const bodyY = t.interpolate({ inputRange: [0, 1], outputRange: [110, 130] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={55} cy={bodyY} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      {/* torso */}
      <AnimatedLine x1={66} y1={bodyY} x2={150} y2={Animated.add(bodyY, new Animated.Value(10)) as any} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* arm bent — down to ground */}
      <AnimatedLine x1={85} y1={Animated.add(bodyY, new Animated.Value(2)) as any} x2={90} y2={Animated.add(bodyY, new Animated.Value(35)) as any} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={90} y1={Animated.add(bodyY, new Animated.Value(35)) as any} x2={95} y2={168} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      {/* legs */}
      <AnimatedLine x1={150} y1={Animated.add(bodyY, new Animated.Value(10)) as any} x2={170} y2={168} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Pull({ t, accent }: { t: Animated.Value; accent: string }) {
  // hanging body, knees up, head moves up to bar
  const headY = t.interpolate({ inputRange: [0, 1], outputRange: [80, 60] });
  const torsoBottomY = t.interpolate({ inputRange: [0, 1], outputRange: [130, 110] });
  return (
    <>
      {/* bar */}
      <Line x1={50} y1={40} x2={150} y2={40} stroke={accent} strokeWidth={3} strokeLinecap="round" />
      <AnimatedCircle cx={100} cy={headY} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      <AnimatedLine x1={100} y1={Animated.add(headY, new Animated.Value(11)) as any} x2={100} y2={torsoBottomY} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* arms up to bar */}
      <AnimatedLine x1={85} y1={Animated.add(headY, new Animated.Value(8)) as any} x2={75} y2={40} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={115} y1={Animated.add(headY, new Animated.Value(8)) as any} x2={125} y2={40} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      {/* knees up */}
      <AnimatedLine x1={100} y1={torsoBottomY} x2={85} y2={Animated.add(torsoBottomY, new Animated.Value(20)) as any} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={100} y1={torsoBottomY} x2={115} y2={Animated.add(torsoBottomY, new Animated.Value(20)) as any} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Hinge({ t, accent }: { t: Animated.Value; accent: string }) {
  // bow at hip
  const torsoEnd = t.interpolate({ inputRange: [0, 1], outputRange: [60, 30] });
  const torsoEndX = t.interpolate({ inputRange: [0, 1], outputRange: [100, 145] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={torsoEndX} cy={torsoEnd} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      {/* torso from hip to head */}
      <AnimatedLine x1={100} y1={120} x2={torsoEndX} y2={torsoEnd} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* arms hang holding bar */}
      <AnimatedLine x1={torsoEndX} y1={Animated.add(torsoEnd, new Animated.Value(10)) as any} x2={Animated.add(torsoEndX, new Animated.Value(0)) as any} y2={Animated.add(torsoEnd, new Animated.Value(60)) as any} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={120} y1={130} x2={170} y2={130} stroke={accent} strokeWidth={2} strokeLinecap="round" />
      {/* legs straight */}
      <Line x1={100} y1={120} x2={90} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={120} x2={110} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Plank({ t, accent }: { t: Animated.Value; accent: string }) {
  // body horizontal, slight breath rise
  const offset = t.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={Animated.add(new Animated.Value(45), offset) as any} cy={130} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      <AnimatedLine x1={55} y1={130} x2={160} y2={140} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      {/* forearm */}
      <Line x1={60} y1={138} x2={60} y2={168} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={50} y1={168} x2={70} y2={168} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* legs */}
      <Line x1={160} y1={140} x2={175} y2={168} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Lunge({ t, accent }: { t: Animated.Value; accent: string }) {
  const dropY = t.interpolate({ inputRange: [0, 1], outputRange: [115, 140] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={100} cy={t.interpolate({ inputRange: [0, 1], outputRange: [60, 75] })} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      <AnimatedLine x1={100} y1={t.interpolate({ inputRange: [0, 1], outputRange: [71, 86] })} x2={100} y2={dropY} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* front leg bent down */}
      <AnimatedLine x1={100} y1={dropY} x2={130} y2={155} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={130} y1={155} x2={140} y2={170} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      {/* back leg extended */}
      <AnimatedLine x1={100} y1={dropY} x2={70} y2={160} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={70} y1={160} x2={55} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Cardio({ t, accent }: { t: Animated.Value; accent: string }) {
  // running figure — arms and legs swap
  const frontLegX = t.interpolate({ inputRange: [0, 1], outputRange: [85, 130] });
  const backLegX = t.interpolate({ inputRange: [0, 1], outputRange: [115, 70] });
  const frontArmX = t.interpolate({ inputRange: [0, 1], outputRange: [120, 85] });
  const backArmX = t.interpolate({ inputRange: [0, 1], outputRange: [80, 125] });
  return (
    <>
      <Ground accent={accent} />
      <Circle cx={100} cy={60} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      <Line x1={100} y1={71} x2={100} y2={120} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* legs */}
      <AnimatedLine x1={100} y1={120} x2={frontLegX} y2={170} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={100} y1={120} x2={backLegX} y2={170} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      {/* arms */}
      <AnimatedLine x1={100} y1={85} x2={frontArmX} y2={115} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <AnimatedLine x1={100} y1={85} x2={backArmX} y2={115} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Stretch({ t, accent }: { t: Animated.Value; accent: string }) {
  // gentle side bend
  const headX = t.interpolate({ inputRange: [0, 1], outputRange: [100, 115] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={headX} cy={60} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      <AnimatedLine x1={headX} y1={71} x2={100} y2={120} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      {/* arm up over head */}
      <AnimatedLine x1={headX} y1={71} x2={140} y2={50} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={120} x2={88} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={120} x2={112} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

function Rest({ t, accent }: { t: Animated.Value; accent: string }) {
  // breath circle expands
  const r = t.interpolate({ inputRange: [0, 1], outputRange: [38, 56] });
  return (
    <>
      <AnimatedCircle cx={100} cy={100} r={r} stroke={accent} strokeOpacity={0.6} strokeWidth={1.5} fill="none" />
      <AnimatedCircle cx={100} cy={100} r={Animated.multiply(r, new Animated.Value(0.55)) as any} stroke={accent} strokeOpacity={0.4} strokeWidth={1} fill="none" />
      <Circle cx={100} cy={100} r={14} stroke={FG} strokeWidth={STROKE} fill="none" />
      <Path d="M93 100 L100 107 L108 96" stroke={FG} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function DefaultFig({ t, accent }: { t: Animated.Value; accent: string }) {
  const offset = t.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  return (
    <>
      <Ground accent={accent} />
      <AnimatedCircle cx={100} cy={Animated.add(new Animated.Value(60), offset) as any} r={11} stroke={FG} strokeWidth={STROKE} fill="none" />
      <AnimatedLine x1={100} y1={Animated.add(new Animated.Value(71), offset) as any} x2={100} y2={130} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={85} x2={70} y2={115} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={85} x2={130} y2={115} stroke={accent} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={130} x2={85} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={100} y1={130} x2={115} y2={170} stroke={FG} strokeWidth={STROKE} strokeLinecap="round" />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
