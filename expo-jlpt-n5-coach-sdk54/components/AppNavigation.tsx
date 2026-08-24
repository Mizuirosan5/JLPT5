import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { styles } from '../appStyles';
import type { Screen } from '../models';

type NavGroupId = 'all' | 'path' | 'learn' | 'quiz' | 'settings';
type BottomNavGroupId = 'path' | 'learn' | 'quiz';
type NavigationItem = { screen: Screen; icon: string; label: string; description: string };

const NAV_GROUPS: Array<{
  id: BottomNavGroupId;
  label: string;
  icon: string;
  subtitle: string;
  items: NavigationItem[];
}> = [
  {
    id: 'path',
    label: 'Parcours',
    icon: '道',
    subtitle: 'Suivre les progrès et savoir quoi travailler.',
    items: [
      { screen: 'today', icon: '今', label: 'Aujourd’hui', description: 'Session recommandée et priorités du jour.' },
      { screen: 'dashboard', icon: '数', label: 'Statistiques', description: 'Scores, progression et points faibles.' },
      { screen: 'path', icon: '道', label: 'Parcours guidé', description: 'Étapes conseillées pour avancer.' },
      { screen: 'aptitudeTest', icon: '診', label: 'Diagnostic', description: 'Test initial en trois niveaux.' },
      { screen: 'aptitudeReport', icon: '報', label: 'Rapport', description: 'Forces, faiblesses et modules recommandés.' },
      { screen: 'review', icon: '復', label: 'Révisions', description: 'File SRS du jour et notions à revoir.' },
      { screen: 'errors', icon: '誤', label: 'Mes erreurs', description: 'Cartes créées depuis les mauvaises réponses.' },
    ],
  },
  {
    id: 'learn',
    label: 'Apprendre',
    icon: '学',
    subtitle: 'Les leçons et cartes de révision N5.',
    items: [
      { screen: 'kana', icon: '仮', label: 'Kana', description: 'Hiragana, katakana, cartes et tracé.' },
      { screen: 'kanjiDetail', icon: '字', label: 'Kanji', description: 'Composants, lectures et mnémoniques.' },
      { screen: 'vocabulary', icon: '語', label: 'Vocabulaire', description: 'Mots, kanji et lectures utiles.' },
      { screen: 'grammar', icon: '文', label: 'Grammaire', description: 'Leçons, exemples et exercices.' },
      { screen: 'immersion', icon: '読', label: 'Immersion', description: 'Textes N5 cliquables et compréhension.' },
      { screen: 'stories', icon: '会', label: 'Dialogues', description: 'Dialogues N5 courts et cliquables.' },
      { screen: 'writing', icon: '書', label: 'Journal', description: 'Phrases courtes, analyse et historique.' },
    ],
  },
  {
    id: 'quiz',
    label: "S’entraîner",
    icon: '問',
    subtitle: 'Quiz rapides et simulation JLPT.',
    items: [
      { screen: 'quick', icon: '速', label: '5 min', description: 'Session rapide adaptée au jour.' },
      { screen: 'quiz', icon: '問', label: 'Quiz', description: 'Questions mélangées et entraînement.' },
      { screen: 'exam', icon: '試', label: 'Test JLPT', description: 'Mode examen N5 complet.' },
    ],
  },
];

const ALL_MENU_GROUP: {
  id: 'all';
  label: string;
  icon: string;
  subtitle: string;
  items: NavigationItem[];
} = {
  id: 'all',
  label: 'Tous les menus',
  icon: '☰',
  subtitle: 'Accès direct à toutes les zones de l’app.',
  items: [
    ...NAV_GROUPS.flatMap((group) => group.items),
    { screen: 'preferences', icon: '設', label: 'Préférences', description: 'Romaji, difficulté, session et parcours.' },
  ],
};

function getActiveGroup(screen: Screen): NavGroupId {
  if (
    screen === 'today' ||
    screen === 'dashboard' ||
    screen === 'path' ||
    screen === 'aptitudeTest' ||
    screen === 'aptitudeReport' ||
    screen === 'review' ||
    screen === 'errors'
  ) return 'path';
  if (
    screen === 'kana' ||
    screen === 'kanjiDetail' ||
    screen === 'vocabulary' ||
    screen === 'grammar' ||
    screen === 'immersion' ||
    screen === 'stories' ||
    screen === 'writing'
  ) return 'learn';
  if (screen === 'quiz' || screen === 'exam' || screen === 'quick') return 'quiz';
  return 'path';
}

export function AppNavigation({
  drawerGroup,
  canGoBack,
  screen,
  onBack,
  onClose,
  onNavigate,
  onOpen,
}: {
  drawerGroup: NavGroupId | null;
  canGoBack: boolean;
  screen: Screen;
  onBack: () => void;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onOpen: (group: NavGroupId) => void;
}) {
  const activeGroup = getActiveGroup(screen);
  const selectedGroup = drawerGroup === 'all' ? ALL_MENU_GROUP : NAV_GROUPS.find((group) => group.id === drawerGroup);

  return (
    <>
      <View style={styles.utilityDock}>
        <Pressable
          accessibilityLabel="Retour"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canGoBack }}
          disabled={!canGoBack}
          onPress={onBack}
          style={({ pressed }) => [styles.globalBackButton, !canGoBack && styles.globalBackButtonDisabled, pressed && styles.controlPressed]}
        >
          <Text style={styles.globalBackIcon}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Ouvrir tous les menus"
          accessibilityRole="button"
          onPress={() => onOpen('all')}
          style={({ pressed }) => [styles.fullMenuButton, pressed && styles.controlPressed]}
        >
          <Text style={styles.fullMenuIcon}>☰</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {NAV_GROUPS.map((group) => (
          <Pressable
            key={group.id}
            accessibilityLabel={`Ouvrir ${group.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activeGroup === group.id }}
            onPress={() => onOpen(group.id)}
            style={({ pressed }) => [styles.navGroupButton, activeGroup === group.id && styles.navGroupButtonActive, pressed && styles.controlPressed]}
          >
            <Text style={[styles.navGroupIcon, activeGroup === group.id && styles.navGroupIconActive]}>{group.icon}</Text>
            <Text style={[styles.navGroupText, activeGroup === group.id && styles.navGroupTextActive]}>{group.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal transparent visible={!!selectedGroup} animationType="fade" onRequestClose={onClose}>
        <View style={styles.drawerOverlay}>
          <Pressable accessibilityLabel="Fermer le menu" style={styles.drawerBackdrop} onPress={onClose} />
          {!!selectedGroup && (
            <View style={styles.sideDrawer}>
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.drawerKicker}>Menu</Text>
                  <Text style={styles.drawerTitle}>{selectedGroup.label}</Text>
                </View>
                <Pressable accessibilityLabel="Fermer le menu" accessibilityRole="button" style={({ pressed }) => [styles.drawerCloseButton, pressed && styles.controlPressed]} onPress={onClose}>
                  <Text style={styles.drawerCloseText}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.drawerSubtitle}>{selectedGroup.subtitle}</Text>
              <ScrollView style={styles.drawerItemScroller} contentContainerStyle={styles.drawerItemList} showsVerticalScrollIndicator={false}>
                {selectedGroup.items.map((item) => (
                  <Pressable
                    key={item.screen}
                    accessibilityLabel={`Aller vers ${item.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: screen === item.screen }}
                    onPress={() => onNavigate(item.screen)}
                    style={({ pressed }) => [styles.drawerItem, screen === item.screen && styles.drawerItemActive, pressed && styles.controlPressed]}
                  >
                    <Text style={[styles.drawerItemIcon, screen === item.screen && styles.drawerItemIconActive]}>{item.icon}</Text>
                    <View style={styles.drawerItemBody}>
                      <Text style={[styles.drawerItemTitle, screen === item.screen && styles.drawerItemTitleActive]}>{item.label}</Text>
                      <Text style={[styles.drawerItemDescription, screen === item.screen && styles.drawerItemDescriptionActive]}>
                        {item.description}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
