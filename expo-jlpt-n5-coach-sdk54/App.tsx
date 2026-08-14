import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { styles } from './appStyles';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppNavigation } from './components/AppNavigation';
import { AptitudeReportScreen } from './components/AptitudeReportScreen';
import { AptitudeTestScreen } from './components/AptitudeTestScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { ExamScreen } from './components/ExamScreen';
import { ErrorFlashcardsScreen } from './components/ErrorFlashcardsScreen';
import { GrammarLessonsScreen } from './components/GrammarLessonsScreen';
import { KanaScreen } from './components/KanaScreen';
import { LearningPathScreen } from './components/LearningPathScreen';
import { LearningPreferencesScreen } from './components/LearningPreferencesScreen';
import { QuickSessionScreen } from './components/QuickSessionScreen';
import { QuizScreen } from './components/QuizScreen';
import { ReviewQueueScreen } from './components/ReviewQueueScreen';
import { VocabularyScreen } from './components/VocabularyScreen';
import { HeaderJapanScene } from './components/shellUi';
import { initializeDatabase } from './services/database';
import type { Screen } from './models';
type NavGroupId = 'all' | 'path' | 'learn' | 'quiz' | 'settings';
export default function App() {
  return (
    <AppErrorBoundary>
      <SQLiteProvider
        databaseName="jlpt_n5_mobile_v7.db"
        assetSource={{
          assetId: require('./assets/database/jlpt_n5_mobile.db'),
          forceOverwrite: false,
        }}
        onInit={initializeDatabase}
      >
        <MainApp />
      </SQLiteProvider>
    </AppErrorBoundary>
  );
}
function MainApp() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [drawerGroup, setDrawerGroup] = useState<NavGroupId | null>(null);
  const [childCanGoBack, setChildCanGoBack] = useState(false);
  const [childBackSignal, setChildBackSignal] = useState(0);
  function navigateTo(nextScreen: Screen) {
    setScreen((currentScreen) => {
      if (currentScreen === nextScreen) return currentScreen;
      setScreenHistory((history) => [...history, currentScreen].slice(-20));
      return nextScreen;
    });
    setDrawerGroup(null);
  }
  useEffect(() => {
    if (screen !== 'quiz') setChildCanGoBack(false);
  }, [screen]);
  function goBack() {
    if (drawerGroup) {
      setDrawerGroup(null);
      return;
    }
    if (childCanGoBack) {
      setChildBackSignal((value) => value + 1);
      return;
    }
    setScreenHistory((history) => {
      const previous = history[history.length - 1] ?? 'dashboard';
      setScreen(previous);
      return history.slice(0, -1);
    });
  }
  const canGoBack = !!drawerGroup || childCanGoBack || screenHistory.length > 0 || screen !== 'dashboard';
  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <HeaderJapanScene />
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>JLPT N5</Text>
          <Text style={styles.title}>Coach Japonais</Text>
          <Text style={styles.headerSubtitle}>日本語を楽しく · Objectif reussite</Text>
        </View>
        <View style={styles.headerBadgeStack}>
          <Text style={styles.badge}>N5</Text>
          <Text style={styles.headerBadgeCaption}>mobile</Text>
        </View>
      </View>
      <View style={styles.screenStage}>
        {screen === 'dashboard' && <DashboardScreen onNavigate={navigateTo} />}
        {screen === 'path' && <LearningPathScreen onNavigate={navigateTo} />}
        {screen === 'aptitudeTest' && <AptitudeTestScreen onNavigate={navigateTo} />}
        {screen === 'aptitudeReport' && <AptitudeReportScreen onNavigate={navigateTo} />}
        {screen === 'review' && <ReviewQueueScreen />}
        {screen === 'errors' && <ErrorFlashcardsScreen />}
        {screen === 'kana' && <KanaScreen />}
        {screen === 'vocabulary' && <VocabularyScreen />}
        {screen === 'grammar' && <GrammarLessonsScreen />}
        {screen === 'preferences' && <LearningPreferencesScreen />}
        {screen === 'quick' && <QuickSessionScreen />}
        {screen === 'quiz' && <QuizScreen backSignal={childBackSignal} onBackStateChange={setChildCanGoBack} />}
        {screen === 'exam' && <ExamScreen />}
      </View>
      <AppNavigation
        drawerGroup={drawerGroup}
        canGoBack={canGoBack}
        screen={screen}
        onBack={goBack}
        onClose={() => setDrawerGroup(null)}
        onNavigate={navigateTo}
        onOpen={setDrawerGroup}
      />
    </SafeAreaView>
  );
}
