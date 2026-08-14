import { Modal, Pressable, Text, View } from 'react-native';
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
    subtitle: 'Suivre les progres et savoir quoi travailler.',
    items: [
      { screen: 'dashboard', icon: '数', label: 'Stats', description: 'Scores, progression et points faibles.' },
      { screen: 'path', icon: '道', label: 'Parcours guide', description: 'Etapes conseillees pour avancer.' },
      { screen: 'aptitudeTest', icon: 'DIA', label: 'Diagnostic', description: 'Test initial en trois niveaux.' },
      { screen: 'aptitudeReport', icon: 'REP', label: 'Rapport', description: 'Forces, faiblesses et modules recommandes.' },
      { screen: 'review', icon: '記', label: 'Revisions', description: 'File SRS du jour et notions a revoir.' },
      { screen: 'errors', icon: 'ERR', label: 'Mes erreurs', description: 'Cartes creees depuis les mauvaises reponses.' },
    ],
  },
  {
    id: 'learn',
    label: 'Apprendre',
    icon: '学',
    subtitle: 'Les lecons et cartes de revision N5.',
    items: [
      { screen: 'kana', icon: '仮', label: 'Kana', description: 'Hiragana, katakana, cartes et trace.' },
      { screen: 'kanjiDetail', icon: '字', label: 'Kanji', description: 'Composants, lectures et mnemoniques.' },
      { screen: 'vocabulary', icon: '語', label: 'Vocabulaire', description: 'Mots, kanji et lectures utiles.' },
      { screen: 'grammar', icon: '文', label: 'Grammaire', description: 'Lecons, exemples et exercices.' },
      { screen: 'immersion', icon: '読', label: 'Immersion', description: 'Textes N5 cliquables et comprehension.' },
      { screen: 'writing', icon: '書', label: 'Journal', description: 'Phrases courtes, analyse et historique.' },
    ],
  },
  {
    id: 'quiz',
    label: "S'entrainer",
    icon: '問',
    subtitle: 'Quiz rapides et simulation JLPT.',
    items: [
      { screen: 'quick', icon: '速', label: '5 min', description: 'Session rapide adaptee au jour.' },
      { screen: 'quiz', icon: '問', label: 'Quiz', description: 'Questions melangees et entrainement.' },
      { screen: 'exam', icon: '試', label: 'Test JLPT', description: 'Mode examen N5 complet.' },
    ],
  }
];

const ALL_MENU_GROUP: {
  id: 'all';
  label: string;
  icon: string;
  subtitle: string;
  items: NavigationItem[];
} = {
  id: 'all' as const,
  label: 'Tous les menus',
  icon: '☰',
  subtitle: 'Acces direct a toutes les zones de l app.',
  items: [
    ...NAV_GROUPS.flatMap((group) => group.items),
    { screen: 'preferences', icon: '設', label: 'Preferences', description: 'Romaji, difficulte, session et parcours.' },
  ],
};

function getActiveGroup(screen: Screen): NavGroupId {
  if (
    screen === 'dashboard' ||
    screen === 'path' ||
    screen === 'aptitudeTest' ||
    screen === 'aptitudeReport' ||
    screen === 'review' ||
    screen === 'errors'
  ) return 'path';
  if (screen === 'kana' || screen === 'kanjiDetail' || screen === 'vocabulary' || screen === 'grammar' || screen === 'immersion' || screen === 'writing') return 'learn';
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
      <Pressable
        disabled={!canGoBack}
        onPress={onBack}
        style={[styles.globalBackButton, !canGoBack && styles.globalBackButtonDisabled]}
      >
        <Text style={styles.globalBackIcon}>{'<'}</Text>
      </Pressable>

      <Pressable onPress={() => onOpen('all')} style={styles.fullMenuButton}>
        <Text style={styles.fullMenuIcon}>☰</Text>
      </Pressable>

      <View style={styles.tabs}>
        {NAV_GROUPS.map((group) => (
          <Pressable
            key={group.id}
            onPress={() => onOpen(group.id)}
            style={[styles.navGroupButton, activeGroup === group.id && styles.navGroupButtonActive]}
          >
            <Text style={[styles.navGroupIcon, activeGroup === group.id && styles.navGroupIconActive]}>{group.icon}</Text>
            <Text style={[styles.navGroupText, activeGroup === group.id && styles.navGroupTextActive]}>{group.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal transparent visible={!!selectedGroup} animationType="fade" onRequestClose={onClose}>
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={onClose} />
          {!!selectedGroup && (
            <View style={styles.sideDrawer}>
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.drawerKicker}>Menu</Text>
                  <Text style={styles.drawerTitle}>{selectedGroup.label}</Text>
                </View>
                <Pressable style={styles.drawerCloseButton} onPress={onClose}>
                  <Text style={styles.drawerCloseText}>x</Text>
                </Pressable>
              </View>
              <Text style={styles.drawerSubtitle}>{selectedGroup.subtitle}</Text>
              <View style={styles.drawerItemList}>
                {selectedGroup.items.map((item) => (
                  <Pressable
                    key={item.screen}
                    onPress={() => onNavigate(item.screen)}
                    style={[styles.drawerItem, screen === item.screen && styles.drawerItemActive]}
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
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
