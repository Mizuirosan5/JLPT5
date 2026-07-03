import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { styles } from './appStyles';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { DashboardScreen } from './components/DashboardScreen';
import { ExamScreen } from './components/ExamScreen';
import { GrammarLessonsScreen } from './components/GrammarLessonsScreen';
import { KanaScreen } from './components/KanaScreen';
import { LearningPathScreen } from './components/LearningPathScreen';
import { QuizScreen } from './components/QuizScreen';
import { VocabularyScreen } from './components/VocabularyScreen';
import { HeaderJapanScene, TabButton } from './components/shellUi';
import { initializeDatabase } from './services/database';
import type { Screen } from './models';

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

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <HeaderJapanScene />
        <View style={styles.headerTextBlock}>
          <Text style={styles.kicker}>JLPT N5</Text>
          <Text style={styles.title}>Coach Japonais</Text>
          <Text style={styles.headerSubtitle}>日本語を楽しく · Objectif réussite</Text>
        </View>
        <View style={styles.headerBadgeStack}>
          <Text style={styles.badge}>N5</Text>
          <Text style={styles.headerBadgeCaption}>mobile</Text>
        </View>
      </View>

      <View style={styles.screenStage}>
        {screen === 'dashboard' && <DashboardScreen />}
        {screen === 'path' && <LearningPathScreen onNavigate={setScreen} />}
        {screen === 'kana' && <KanaScreen />}
        {screen === 'vocabulary' && <VocabularyScreen />}
        {screen === 'grammar' && <GrammarLessonsScreen />}
        {screen === 'quiz' && <QuizScreen />}
        {screen === 'exam' && <ExamScreen />}
      </View>

      <View style={styles.tabs}>
        <TabButton icon="数" label="Stats" active={screen === 'dashboard'} onPress={() => setScreen('dashboard')} />
        <TabButton icon="道" label="Parcours" active={screen === 'path'} onPress={() => setScreen('path')} />
        <TabButton icon="仮" label="Kana" active={screen === 'kana'} onPress={() => setScreen('kana')} />
        <TabButton icon="語" label="Vocab" active={screen === 'vocabulary'} onPress={() => setScreen('vocabulary')} />
        <TabButton icon="文" label="Grammaire" active={screen === 'grammar'} onPress={() => setScreen('grammar')} />
        <TabButton icon="問" label="Quiz" active={screen === 'quiz'} onPress={() => setScreen('quiz')} />
        <TabButton icon="試" label="JLPT" active={screen === 'exam'} onPress={() => setScreen('exam')} />
      </View>
    </SafeAreaView>
  );
}
