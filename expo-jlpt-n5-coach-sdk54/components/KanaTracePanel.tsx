import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { styles } from '../appStyles';
import type { KanaCard, TraceGuideArrow as TraceGuideArrowModel, TracePoint, TraceStroke } from '../models';

type TracePracticeMode = 'guide' | 'practice' | 'test';

const TRACE_GUIDES: Record<string, TraceGuideArrowModel[]> = {
  あ: [
    { label: '1', start: { x: 88, y: 76 }, end: { x: 214, y: 76 } },
    { label: '2', start: { x: 153, y: 44 }, end: { x: 126, y: 232 } },
    { label: '3', start: { x: 182, y: 132 }, end: { x: 94, y: 218 } },
  ],
  い: [
    { label: '1', start: { x: 106, y: 70 }, end: { x: 118, y: 218 } },
    { label: '2', start: { x: 196, y: 78 }, end: { x: 218, y: 182 } },
  ],
  う: [{ label: '1', start: { x: 92, y: 78 }, end: { x: 214, y: 196 } }],
  え: [
    { label: '1', start: { x: 98, y: 78 }, end: { x: 194, y: 78 } },
    { label: '2', start: { x: 96, y: 136 }, end: { x: 216, y: 214 } },
  ],
  お: [
    { label: '1', start: { x: 92, y: 80 }, end: { x: 210, y: 80 } },
    { label: '2', start: { x: 148, y: 46 }, end: { x: 128, y: 224 } },
    { label: '3', start: { x: 190, y: 56 }, end: { x: 224, y: 112 } },
  ],
  か: [
    { label: '1', start: { x: 92, y: 88 }, end: { x: 190, y: 220 } },
    { label: '2', start: { x: 164, y: 76 }, end: { x: 224, y: 172 } },
    { label: '3', start: { x: 216, y: 62 }, end: { x: 242, y: 106 } },
  ],
  き: [
    { label: '1', start: { x: 88, y: 70 }, end: { x: 214, y: 70 } },
    { label: '2', start: { x: 84, y: 118 }, end: { x: 220, y: 118 } },
    { label: '3', start: { x: 132, y: 42 }, end: { x: 176, y: 218 } },
  ],
  く: [{ label: '1', start: { x: 190, y: 54 }, end: { x: 96, y: 150 } }],
  け: [
    { label: '1', start: { x: 82, y: 70 }, end: { x: 80, y: 220 } },
    { label: '2', start: { x: 132, y: 90 }, end: { x: 226, y: 90 } },
    { label: '3', start: { x: 178, y: 58 }, end: { x: 156, y: 228 } },
  ],
  こ: [
    { label: '1', start: { x: 96, y: 96 }, end: { x: 208, y: 96 } },
    { label: '2', start: { x: 90, y: 198 }, end: { x: 216, y: 198 } },
  ],
};

function getTraceGuideArrows(character: string): TraceGuideArrowModel[] {
  const firstCharacter = character[0] ?? '';
  if (TRACE_GUIDES[firstCharacter]) return TRACE_GUIDES[firstCharacter];
  if (character.length > 1) {
    return [
      { label: '1', start: { x: 78, y: 88 }, end: { x: 142, y: 88 } },
      { label: '2', start: { x: 92, y: 142 }, end: { x: 148, y: 214 } },
      { label: '3', start: { x: 180, y: 86 }, end: { x: 224, y: 206 } },
    ];
  }
  return [
    { label: '1', start: { x: 92, y: 76 }, end: { x: 208, y: 76 } },
    { label: '2', start: { x: 112, y: 120 }, end: { x: 202, y: 210 } },
  ];
}

function pointsToSvgPath(points: TracePoint[]): string {
  if (points.length === 0) return '';
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

function TraceGuideArrow({ arrow }: { arrow: TraceGuideArrowModel }) {
  const dx = arrow.end.x - arrow.start.x;
  const dy = arrow.end.y - arrow.start.y;
  const angle = Math.atan2(dy, dx);
  const headLength = 13;
  const left = {
    x: arrow.end.x - headLength * Math.cos(angle - Math.PI / 6),
    y: arrow.end.y - headLength * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: arrow.end.x - headLength * Math.cos(angle + Math.PI / 6),
    y: arrow.end.y - headLength * Math.sin(angle + Math.PI / 6),
  };

  return (
    <G>
      <Line
        x1={arrow.start.x}
        y1={arrow.start.y}
        x2={arrow.end.x}
        y2={arrow.end.y}
        stroke="#C83543"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.78"
      />
      <Polygon
        points={`${arrow.end.x},${arrow.end.y} ${left.x},${left.y} ${right.x},${right.y}`}
        fill="#C83543"
        opacity="0.9"
      />
      <Circle cx={arrow.start.x} cy={arrow.start.y} r="13" fill="#FFFFFF" stroke="#C83543" strokeWidth="3" />
      <SvgText x={arrow.start.x} y={arrow.start.y + 5} fill="#C83543" fontSize="13" fontWeight="900" textAnchor="middle">
        {arrow.label}
      </SvgText>
    </G>
  );
}

export function KanaTracePanel({
  card,
  onReview,
  onMastered,
}: {
  card: KanaCard;
  onReview?: () => void;
  onMastered?: () => void;
}) {
  const [strokes, setStrokes] = useState<TraceStroke[]>([]);
  const [practiceMode, setPracticeMode] = useState<TracePracticeMode>('guide');
  const [completedRepetitions, setCompletedRepetitions] = useState(0);
  const [padSize, setPadSize] = useState({ width: 300, height: 300 });
  const lastPointRef = useRef<TracePoint | null>(null);

  useEffect(() => {
    setStrokes([]);
    setCompletedRepetitions(0);
    setPracticeMode('guide');
    lastPointRef.current = null;
  }, [card.id]);

  const normalizeTracePoint = useCallback(
    (x: number, y: number): TracePoint => ({
      x: Math.max(0, Math.min(300, (x / Math.max(1, padSize.width)) * 300)),
      y: Math.max(0, Math.min(300, (y / Math.max(1, padSize.height)) * 300)),
    }),
    [padSize.height, padSize.width]
  );

  const traceResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const point = normalizeTracePoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          lastPointRef.current = point;
          setStrokes((current) => [...current.slice(-3), { id: `${Date.now()}-${Math.random()}`, points: [point] }]);
        },
        onPanResponderMove: (event) => {
          const point = normalizeTracePoint(event.nativeEvent.locationX, event.nativeEvent.locationY);
          const previous = lastPointRef.current;
          if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 5) return;
          lastPointRef.current = point;
          setStrokes((current) => {
            const next = [...current];
            const latest = next[next.length - 1];
            if (!latest) return [{ id: `${Date.now()}-${Math.random()}`, points: [point] }];
            next[next.length - 1] = {
              ...latest,
              points: [...latest.points.slice(-90), point],
            };
            return next;
          });
        },
        onPanResponderRelease: () => {
          lastPointRef.current = null;
          setCompletedRepetitions((count) => Math.min(3, count + 1));
        },
        onPanResponderTerminate: () => {
          lastPointRef.current = null;
        },
      }),
    [normalizeTracePoint]
  );
  const traceArrows = getTraceGuideArrows(card.character);
  const showGhost = practiceMode !== 'test';
  const showArrows = practiceMode === 'guide';
  const practicePrompt = getTracePracticePrompt(practiceMode, completedRepetitions);
  const handlePadLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPadSize({ width, height });
  }, []);

  return (
    <View style={styles.tracePanel}>
      <Text style={styles.traceTitle}>{card.character}</Text>
      <Text style={styles.traceSubtitle}>{practicePrompt}</Text>
      <View style={styles.traceModeRow}>
        <Pressable
          style={[styles.traceModeButton, practiceMode === 'guide' && styles.traceModeButtonActive]}
          onPress={() => setPracticeMode('guide')}
        >
          <Text style={[styles.traceModeText, practiceMode === 'guide' && styles.traceModeTextActive]}>Guide</Text>
        </Pressable>
        <Pressable
          style={[styles.traceModeButton, practiceMode === 'practice' && styles.traceModeButtonActive]}
          onPress={() => setPracticeMode('practice')}
        >
          <Text style={[styles.traceModeText, practiceMode === 'practice' && styles.traceModeTextActive]}>Pratique</Text>
        </Pressable>
        <Pressable
          style={[styles.traceModeButton, practiceMode === 'test' && styles.traceModeButtonActive]}
          onPress={() => setPracticeMode('test')}
        >
          <Text style={[styles.traceModeText, practiceMode === 'test' && styles.traceModeTextActive]}>Test</Text>
        </Pressable>
      </View>
      <View style={styles.traceProgressRow}>
        {[0, 1, 2].map((step) => (
          <View
            key={`${card.id}-trace-step-${step}`}
            style={[styles.traceProgressDot, completedRepetitions > step && styles.traceProgressDotDone]}
          />
        ))}
        <Text style={styles.traceProgressText}>{completedRepetitions}/3 traces</Text>
      </View>
      <View style={styles.tracePad} onLayout={handlePadLayout} {...traceResponder.panHandlers}>
        {showGhost && <Text style={styles.traceGhost}>{card.character}</Text>}
        <View style={styles.traceCenterLineVertical} />
        <View style={styles.traceCenterLineHorizontal} />
        <Svg width="100%" height="100%" viewBox="0 0 300 300" style={styles.traceSvg}>
          {showArrows &&
            traceArrows.map((arrow) => (
              <TraceGuideArrow key={`${card.character}-${arrow.label}`} arrow={arrow} />
            ))}
          {strokes.map((stroke) => {
            const path = pointsToSvgPath(stroke.points);
            return path ? (
              <Path
                key={stroke.id}
                d={path}
                fill="none"
                stroke="#A34B35"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null;
          })}
        </Svg>
      </View>
      <View style={styles.traceActions}>
        <Pressable style={styles.viewerNavButton} onPress={() => setStrokes([])}>
          <Text style={styles.viewerNavText}>Effacer</Text>
        </Pressable>
      </View>
      <View style={styles.traceSelfCheckCard}>
        <Text style={styles.traceSelfCheckTitle}>Auto-controle</Text>
        <Text style={styles.traceSelfCheckText}>
          Vérifie l’ordre, la direction, la taille et l’équilibre. Si tu hésites encore, marque la carte à revoir.
        </Text>
        <View style={styles.traceSelfCheckActions}>
          <Pressable style={styles.traceSelfCheckButton} onPress={onReview}>
            <Text style={styles.traceSelfCheckButtonText}>À revoir</Text>
          </Pressable>
          <Pressable
            style={[
              styles.traceSelfCheckButton,
              styles.traceSelfCheckButtonStrong,
              completedRepetitions < 3 && styles.primaryButtonDisabled,
            ]}
            disabled={completedRepetitions < 3}
            onPress={onMastered}
          >
            <Text style={[styles.traceSelfCheckButtonText, styles.traceSelfCheckButtonTextStrong]}>
              Maitrise
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function getTracePracticePrompt(mode: TracePracticeMode, repetitions: number): string {
  if (mode === 'guide') return 'Observe les fleches, puis trace lentement en respectant le sens.';
  if (mode === 'practice') return `Trace sans les fleches. Objectif : 3 repetitions propres (${repetitions}/3).`;
  return 'Mode test : le modele disparait. Ecris de memoire, puis compare mentalement.';
}
