import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { styles } from '../appStyles';
import type {
  BadgeDifficulty,
  BadgeDomain,
  BadgeView,
  CoachQuest,
  DailyGoalDay,
  MasteryDomainStats,
  RewardSummary,
  SrsOverview,
} from '../models';
import { getBadgeGate } from '../services/badges';
import { formatDateKey, isQuestComplete } from '../services/goals';
import {
  CALENDAR_HISTORY_DAYS,
  LEAGUE_TIERS,
  MAX_LEVEL,
  getLeagueTier,
  getNextLeagueTier,
} from '../services/progress';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function CoachPremiumPanel({
  examReadiness,
  level,
  xpCurrentLevel,
  xpRequiredForLevel,
  xpToNextLevel,
  streakDays,
  quests,
  nextQuests = [],
  srsOverview,
  onOpenReview,
  goalCalendar,
  recommendedDomain,
  rewardSummary,
}: {
  examReadiness: number;
  level: number;
  xpCurrentLevel: number;
  xpRequiredForLevel: number;
  xpToNextLevel: number;
  streakDays: number;
  quests: CoachQuest[];
  nextQuests?: CoachQuest[];
  srsOverview?: SrsOverview;
  onOpenReview?: () => void;
  goalCalendar: DailyGoalDay[];
  recommendedDomain: MasteryDomainStats | null;
  rewardSummary: RewardSummary;
}) {
  const xpRate =
    xpRequiredForLevel > 0 ? Math.max(0, Math.min(100, Math.round((xpCurrentLevel / xpRequiredForLevel) * 100))) : 100;
  const league = getLeagueTier(level);
  const nextLeague = getNextLeagueTier(level);
  const recommendedRemaining = recommendedDomain
    ? Math.max(0, recommendedDomain.total - recommendedDomain.mastered)
    : 0;
  const completedQuests = quests.filter(isQuestComplete).length;
  const tomorrowUnlocked = quests.length > 0 && completedQuests === quests.length && nextQuests.length > 0;
  const recentDays = goalCalendar.slice(-7);
  const weekActiveDays = recentDays.filter(
    (day) => Number(day.attempts) > 0 || Number(day.quizAttempts) > 0 || Number(day.grammarActivities ?? 0) > 0
  ).length;
  const todayKey = formatDateKey(new Date());
  const todayAttendanceDay = goalCalendar.find((day) => day.day === todayKey);
  const todayIsActive =
    Number(todayAttendanceDay?.attempts ?? 0) > 0 ||
    Number(todayAttendanceDay?.quizAttempts ?? 0) > 0 ||
    Number(todayAttendanceDay?.grammarActivities ?? 0) > 0 ||
    completedQuests > 0;
  const attendanceRate = todayIsActive ? 100 : 0;
  const attendanceMilestones = [
    { days: 1, xp: 60, label: 'jour travaille' },
    { days: 3, xp: 260, label: 'serie 3 jours' },
    { days: 7, xp: 780, label: 'serie 7 jours' },
  ];
  const nextAttendanceMilestone = attendanceMilestones.find((milestone) => milestone.days > streakDays);
  return (
    <View style={styles.coachPanel}>
      <View style={styles.coachHero}>
        <View style={styles.coachHeroCopy}>
          <Text style={styles.coachKicker}>Coach JLPT N5</Text>
          <Text style={styles.coachTitle}>Plan du jour</Text>
          <Text style={styles.coachSubtitle}>
            Priorité : {recommendedDomain?.label ?? 'Kana'} · {recommendedRemaining} éléments restants
          </Text>
        </View>
        <View style={styles.readinessBadge}>
          <Text style={styles.readinessValue}>{examReadiness}%</Text>
          <Text style={styles.readinessLabel}>prêt N5</Text>
        </View>
      </View>

      <View style={styles.coachStatsRow}>
        <CoachMiniStat label="Série" value={`${streakDays} j`} />
        <CoachMiniStat label="Niveau" value={level} />
        <CoachMiniStat label="Ligue" value={league.name} />
      </View>

      <View style={styles.dailyTrackingCard}>
        <View style={styles.dailyTrackingHeader}>
          <View>
            <Text style={styles.dailyTrackingKicker}>Assiduité</Text>
            <Text style={styles.dailyTrackingTitle}>{streakDays} jour{streakDays > 1 ? 's' : ''} de suite</Text>
          </View>
          <Text style={styles.dailyTrackingBadge}>{todayIsActive ? '1/1' : '0/1'}</Text>
        </View>
        <View style={styles.attendanceStrip}>
          {recentDays.map((day) => {
            const active =
              Number(day.attempts) > 0 ||
              Number(day.quizAttempts) > 0 ||
              Number(day.grammarActivities ?? 0) > 0;
            return (
              <View
                key={day.day}
                style={[
                  styles.attendanceDot,
                  active && styles.attendanceDotComplete,
                ]}
              >
                <Text style={[styles.attendanceDotText, active && styles.attendanceDotTextActive]}>
                  {day.day.slice(8)}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={styles.attendanceProgressTrack}>
          <View style={[styles.attendanceProgressFill, { width: `${attendanceRate}%` }]} />
        </View>
        <Text style={styles.dailyTrackingMeta}>
          7 jours : {weekActiveDays}/7 actif{weekActiveDays > 1 ? 's' : ''}. Bonus : +60 XP aujourd'hui, +260 XP a 3 jours, +780 XP a 7 jours.
          {nextAttendanceMilestone
            ? ` Prochain palier : ${nextAttendanceMilestone.label}.`
            : ' Palier 7 jours obtenu.'}
          {' '}Objectifs du jour : {completedQuests}/{quests.length || 3}.
        </Text>
      </View>

      {srsOverview && (
        <View style={styles.dailyTrackingCard}>
          <View style={styles.dailyTrackingHeader}>
            <View>
              <Text style={styles.dailyTrackingKicker}>Memoire SRS</Text>
              <Text style={styles.dailyTrackingTitle}>{srsOverview.dueToday} revisions dues aujourd'hui</Text>
            </View>
            <Text style={styles.dailyTrackingBadge}>SRS</Text>
          </View>
          <View style={styles.dailyTrackingStats}>
            <View style={styles.dailyTrackingStat}>
              <Text style={styles.dailyTrackingValue}>{srsOverview.fragile}</Text>
              <Text style={styles.dailyTrackingLabel}>fragiles</Text>
            </View>
            <View style={styles.dailyTrackingStat}>
              <Text style={styles.dailyTrackingValue}>{srsOverview.solid}</Text>
              <Text style={styles.dailyTrackingLabel}>solides</Text>
            </View>
            <View style={styles.dailyTrackingStat}>
              <Text style={styles.dailyTrackingValue}>{srsOverview.mastered}</Text>
              <Text style={styles.dailyTrackingLabel}>maitrises</Text>
            </View>
          </View>
          <Text style={styles.dailyTrackingMeta}>
            {srsOverview.total} elements suivis. Les erreurs reviennent plus vite, les acquis s'espacent.
          </Text>
          {onOpenReview && (
            <Pressable style={styles.dailyTrackingAction} onPress={onOpenReview}>
              <Text style={styles.dailyTrackingActionText}>Ouvrir les revisions</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpTitle}>Ligue {league.name}</Text>
          <Text style={styles.xpValue}>
            {nextLeague ? `Prochaine : ${nextLeague.name} niv. ${nextLeague.minLevel}` : 'Ligue maximale'}
          </Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${xpRate}%` }]} />
        </View>
        <Text style={styles.xpLeagueMeta}>
          {xpCurrentLevel}/{xpRequiredForLevel} XP dans le niveau · {LEAGUE_TIERS.length} ligues jusqu'au niveau {MAX_LEVEL}
        </Text>
        <Text style={styles.xpComfortText}>
          Progression courte à chaque session, profondeur longue sur 365 jours.
        </Text>
      </View>

      <QuestGroup title="Objectifs quotidiens" detail="Rapides, pour garder le rythme." quests={quests} />
      {tomorrowUnlocked && (
        <QuestGroup title="Objectifs de demain debloques" detail="Apercu du prochain jour : nouveau theme, seuil plus ajuste." quests={nextQuests} />
      )}
    </View>
  );
}

export function CoachMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.coachMiniStat}>
      <Text style={styles.coachMiniLabel}>{label}</Text>
      <Text style={styles.coachMiniValue}>{value}</Text>
    </View>
  );
}

export function DailyQuestCard({ quest }: { quest: CoachQuest }) {
  const progressRate = Math.max(0, Math.min(100, Math.round((quest.progress / Math.max(1, quest.target)) * 100)));
  const complete = progressRate >= 100;
  const displayProgress =
    quest.unit === '%' ? `${Math.min(quest.progress, quest.target)}%/${quest.target}%` : `${Math.min(quest.progress, quest.target)}/${quest.target}`;

  return (
    <View style={[styles.questCard, complete && styles.questCardComplete]}>
      <View style={styles.questHeader}>
        <Text style={styles.questTitle}>{quest.title}</Text>
        <Text style={[styles.questReward, complete && styles.questRewardComplete]}>{complete ? 'Terminé' : quest.reward}</Text>
      </View>
      <Text style={styles.questDescription}>{quest.description}</Text>
      <View style={styles.questTrack}>
        <View style={[styles.questFill, complete && styles.questFillComplete, { width: `${progressRate}%` }]} />
      </View>
      <Text style={styles.questProgress}>{displayProgress}</Text>
    </View>
  );
}

export function QuestGroup({ title, detail, quests }: { title: string; detail: string; quests: CoachQuest[] }) {
  const completed = quests.filter(isQuestComplete).length;

  return (
    <View style={styles.questGroup}>
      <View style={styles.questGroupHeader}>
        <View style={styles.questGroupCopy}>
          <Text style={styles.questGroupTitle}>{title}</Text>
          <Text style={styles.questGroupDetail}>{detail}</Text>
        </View>
        <Text style={styles.questGroupCount}>{completed}/{quests.length}</Text>
      </View>
      <View style={styles.questGrid}>
        {quests.map((quest) => (
          <DailyQuestCard key={quest.id} quest={quest} />
        ))}
      </View>
    </View>
  );
}

export function DailyGoalCalendar({ days }: { days: DailyGoalDay[] }) {
  const visibleDays = days.slice(0, CALENDAR_HISTORY_DAYS);
  const completedDays = visibleDays.filter((day) => Number(day.completed) === Number(day.total)).length;
  const partialDays = visibleDays.filter((day) => Number(day.completed) > 0 && Number(day.completed) < Number(day.total)).length;

  return (
    <View style={styles.goalCalendarCard}>
      <View style={styles.goalCalendarHeader}>
        <View>
          <Text style={styles.goalCalendarTitle}>Calendrier badges · {CALENDAR_HISTORY_DAYS} jours</Text>
          <Text style={styles.goalCalendarMeta}>
            {completedDays} jours badge · {partialDays} jours en cours
          </Text>
        </View>
        <View style={styles.goalCalendarLegend}>
          <CalendarLegendDot color="#1F8A83" label="badge" />
          <CalendarLegendDot color="#D5B36A" label="partiel" />
          <CalendarLegendDot color="#E7DED1" label="0" />
        </View>
      </View>
      <View style={styles.goalCalendarGrid}>
        {visibleDays.map((day) => {
          const complete = Number(day.completed) === Number(day.total);
          const partial = Number(day.completed) > 0 && !complete;
          const today = day.day === formatDateKey(new Date());
          return (
            <View
              key={day.day}
              style={[
                styles.goalCalendarDay,
                complete && styles.goalCalendarDayComplete,
                partial && styles.goalCalendarDayPartial,
                today && styles.goalCalendarDayToday,
              ]}
            >
              <Text style={[styles.goalCalendarDayText, (complete || partial) && styles.goalCalendarDayTextActive]}>
                {day.completed}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.goalCalendarFooter}>
        <Text style={styles.goalCalendarFooterText}>Chaque case représente un jour. Une case verte indique un jour où le badge quotidien a été obtenu.</Text>
      </View>
    </View>
  );
}

export function BadgeCollection({ badges }: { badges: BadgeView[] }) {
  const displayedBadges = badges.filter((badge) => badge.domain !== 'quotidien');
  const displayedUnlockedCount = displayedBadges.filter((badge) => badge.unlocked).length;
  const domains: BadgeDomain[] = ['kana', 'quiz', 'vocabulaire', 'grammaire', 'kanji', 'jlpt', 'maitrise'];
  const difficulties: BadgeDifficulty[] = ['facile', 'moyen', 'difficile', 'expert', 'legendaire'];

  return (
    <View style={styles.badgeCollectionCard}>
      <View style={styles.badgeCollectionHeader}>
        <View>
          <Text style={styles.badgeCollectionTitle}>{displayedUnlockedCount}/{displayedBadges.length} badges</Text>
          <Text style={styles.badgeCollectionMeta}>Badges rares, ligues et accomplissements longs calibrés pour une année complète de pratique intensive.</Text>
        </View>
      </View>

      <View style={styles.badgeDifficultyGrid}>
        {difficulties.map((difficulty) => {
          const difficultyBadges = displayedBadges.filter((badge) => badge.difficulty === difficulty);
          const difficultyUnlocked = difficultyBadges.filter((badge) => badge.unlocked).length;
          const gate = getBadgeGate(difficulty);
          return (
            <View key={difficulty} style={styles.badgeDifficultyCard}>
              <Text style={styles.badgeDifficultyTitle}>{formatBadgeDifficulty(difficulty)}</Text>
              <Text style={styles.badgeDifficultyCount}>{difficultyUnlocked}/{difficultyBadges.length}</Text>
              <Text style={styles.badgeDifficultyMeta}>
                {gate.requiredLevel > 1 ? `Niv. ${gate.requiredLevel} · ${gate.requiredBadges} badges` : 'Ouvert'}
              </Text>
            </View>
          );
        })}
      </View>

      {domains.map((domain) => {
        const domainBadges = displayedBadges.filter((badge) => badge.domain === domain);
        if (domainBadges.length === 0) return null;
        const domainUnlocked = domainBadges.filter((badge) => badge.unlocked).length;
        return (
          <View key={domain} style={styles.badgeDomainBlock}>
            <View style={styles.badgeDomainHeader}>
              <Text style={styles.badgeDomainTitle}>{formatBadgeDomain(domain)}</Text>
              <Text style={styles.badgeDomainCount}>{domainUnlocked}/{domainBadges.length}</Text>
            </View>
            <View style={styles.badgeGrid}>
              {domainBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, badge.unlocked && styles.badgeCardUnlocked]}>
                  <Text style={[styles.badgeIcon, !badge.unlocked && styles.badgeIconLocked]}>{badge.unlocked ? badge.icon : '鍵'}</Text>
                  <Text style={[styles.badgeDifficultyPill, badge.unlocked && styles.badgeDifficultyPillUnlocked]}>
                    {formatBadgeDifficulty(badge.difficulty)}
                  </Text>
                  <Text style={[styles.badgeTitle, badge.unlocked && styles.badgeTitleUnlocked]}>{badge.title}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                  {badge.gateLocked && (
                    <Text style={styles.badgeGateText}>
                      Niv. {badge.requiredLevel} · {badge.requiredBadges} badges
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function formatBadgeDifficulty(difficulty: BadgeDifficulty): string {
  if (difficulty === 'facile') return 'Facile';
  if (difficulty === 'moyen') return 'Moyen';
  if (difficulty === 'difficile') return 'Difficile';
  if (difficulty === 'expert') return 'Expert';
  return 'Légendaire';
}

export function formatBadgeDomain(domain: BadgeDomain): string {
  if (domain === 'quotidien') return 'Objectifs';
  if (domain === 'kana') return 'Kana';
  if (domain === 'quiz') return 'Quiz';
  if (domain === 'vocabulaire') return 'Vocabulaire';
  if (domain === 'grammaire') return 'Grammaire';
  if (domain === 'kanji') return 'Kanji';
  if (domain === 'jlpt') return 'JLPT';
  return 'Maîtrise';
}

export function CalendarLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.calendarLegendItem}>
      <View style={[styles.calendarLegendDot, { backgroundColor: color }]} />
      <Text style={styles.calendarLegendText}>{label}</Text>
    </View>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function ProgressRow({
  label,
  detail,
  rate,
}: {
  label: string;
  detail: string;
  rate: number;
}) {
  const safeRate = Math.max(0, Math.min(100, Number(rate) || 0));
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressRate}>{safeRate}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safeRate}%` }]} />
      </View>
      <Text style={styles.progressDetail}>{detail}</Text>
    </View>
  );
}

export function MasteryDomainCard({ domain }: { domain: MasteryDomainStats }) {
  const total = Math.max(1, domain.total);
  const masteredRate = Math.round((domain.mastered / total) * 100);
  const knownRate = Math.round((domain.known / total) * 100);
  const reviewRate = Math.round((domain.review / total) * 100);
  const unseenRate = Math.max(0, 100 - masteredRate - knownRate - reviewRate);
  const remaining = Math.max(0, domain.total - domain.mastered);

  return (
    <View style={styles.masteryCard}>
      <View style={styles.masteryCardHeader}>
        <View>
          <Text style={styles.masteryTitle}>{domain.label}</Text>
          <Text style={styles.masterySubtitle}>
            {domain.mastered}/{domain.total} maîtrisés · {remaining} restants
          </Text>
        </View>
        <View style={styles.masteryPill}>
          <Text style={styles.masteryPillValue}>{masteredRate}%</Text>
        </View>
      </View>

      <View style={styles.masteryStack}>
        <View style={[styles.masteryStackMastered, { flex: masteredRate }]} />
        <View style={[styles.masteryStackKnown, { flex: knownRate }]} />
        <View style={[styles.masteryStackReview, { flex: reviewRate }]} />
        <View style={[styles.masteryStackUnseen, { flex: unseenRate }]} />
      </View>

      <View style={styles.masteryLegend}>
        <MasteryLegendItem color="#2A7A68" label="Maîtrisé" value={domain.mastered} />
        <MasteryLegendItem color="#5A8DCC" label="Connu" value={domain.known} />
        <MasteryLegendItem color="#B45A46" label="À revoir" value={domain.review} />
        <MasteryLegendItem color="#B7B1A8" label="Jamais vu" value={domain.unseen} />
      </View>
      <Text style={styles.masteryAccuracy}>
        Réussite sur exercices : {domain.rate}% · {domain.correct}/{domain.attempted} réponses justes
      </Text>
    </View>
  );
}

export function MasteryLegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.masteryLegendItem}>
      <View style={[styles.masteryLegendDot, { backgroundColor: color }]} />
      <Text style={styles.masteryLegendText}>{label}</Text>
      <Text style={styles.masteryLegendValue}>{value}</Text>
    </View>
  );
}

export function StatsLineChart({
  points,
  suffix = '',
  maxValue,
  color,
  xAxisLabel,
  yAxisLabel,
}: {
  points: { label: string; detail?: string; value: number }[];
  suffix?: string;
  maxValue?: number;
  color: string;
  xAxisLabel: string;
  yAxisLabel: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, points.length - 1));
  const width = 280;
  const height = 210;
  const paddingLeft = 36;
  const paddingRight = 10;
  const paddingTop = 24;
  const paddingBottom = 44;
  const values = points.map((point) => Number(point.value) || 0);
  const topValue = Math.max(maxValue ?? 0, ...values, 1);
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const yTicks = [topValue, topValue / 2, 0].map((value) => Math.round(value));
  const coordinates = points.map((point, index) => {
    const x = paddingLeft + (points.length <= 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
    const y = paddingTop + chartHeight - ((Number(point.value) || 0) / topValue) * chartHeight;
    return { ...point, x, y };
  });
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const latest = points[points.length - 1];
  const selected = coordinates[Math.min(selectedIndex, Math.max(0, coordinates.length - 1))] ?? latest;
  const xLabelIndexes = coordinates
    .map((_, index) => index)
    .filter((index) => coordinates.length <= 5 || index === 0 || index === coordinates.length - 1 || index % Math.ceil(coordinates.length / 4) === 0);

  return (
    <View style={styles.lineChartCard}>
      <View style={styles.lineChartHeader}>
        <Text style={styles.lineChartValue}>
          {latest ? `${latest.value}${suffix}` : '-'}
        </Text>
        <Text style={styles.lineChartMeta}>
          {points.length} point{points.length > 1 ? 's' : ''} de progression
        </Text>
      </View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {yTicks.map((tick) => {
          const y = paddingTop + chartHeight - (tick / topValue) * chartHeight;
          return (
            <G key={`tick-${tick}`}>
              <Line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#F0E8DD" strokeWidth="1" />
              <SvgText x={paddingLeft - 8} y={y + 4} fill="#63706A" fontSize="10" fontWeight="700" textAnchor="end">
                {tick}{suffix}
              </SvgText>
            </G>
          );
        })}
        <Line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#D8CEC0" strokeWidth="2" />
        <Line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#D8CEC0" strokeWidth="2" />
        <SvgText x={paddingLeft - 32} y={paddingTop - 8} fill="#63706A" fontSize="10" fontWeight="800">
          {yAxisLabel}
        </SvgText>
        <SvgText x={width - paddingRight} y={height - 8} fill="#63706A" fontSize="10" fontWeight="800" textAnchor="end">
          {xAxisLabel}
        </SvgText>
        {xLabelIndexes.map((index) => {
          const point = coordinates[index];
          return (
            <G key={`x-${point.label}-${index}`}>
              <Line x1={point.x} y1={height - paddingBottom} x2={point.x} y2={height - paddingBottom + 5} stroke="#D8CEC0" strokeWidth="2" />
              <SvgText x={point.x} y={height - paddingBottom + 20} fill="#63706A" fontSize="10" fontWeight="700" textAnchor="middle">
                {point.label}
              </SvgText>
            </G>
          );
        })}
        {path.length > 0 && <Path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {coordinates.map((point, index) => (
          <Circle
            key={`${point.label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={selected?.label === point.label && selected?.value === point.value ? '7' : '5'}
            fill="#FFFFFF"
            stroke={color}
            strokeWidth="3"
            onPress={() => setSelectedIndex(index)}
            onPressIn={() => setSelectedIndex(index)}
          />
        ))}
        {selected && (
          <>
            <Line x1={selected.x} y1={paddingTop} x2={selected.x} y2={height - paddingBottom} stroke={color} strokeDasharray={[4, 5]} strokeWidth="1.5" />
            <Circle cx={selected.x} cy={selected.y} r="11" fill={color} opacity="0.14" />
          </>
        )}
      </Svg>
      <View style={styles.lineChartTooltip}>
        <View>
          <Text style={styles.lineChartTooltipLabel}>Point sélectionné</Text>
          <Text style={styles.lineChartTooltipDate}>{selected?.detail ?? selected?.label ?? '-'}</Text>
        </View>
        <Text style={styles.lineChartTooltipValue}>
          {selected ? `${selected.value}${suffix}` : '-'}
        </Text>
      </View>
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#152B3A" />
      <Text style={styles.centerText}>Chargement de la base JLPT N5</Text>
    </View>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyTitle}>{title}</Text>
    </View>
  );
}

export function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}
