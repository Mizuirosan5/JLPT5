import { Text, View } from 'react-native';
import { styles } from '../appStyles';
import { buildQuizFeedbackInsights, type WrongAnswerExplanations } from '../services/quizFeedback';

type SmartCorrectionInsightCardProps = {
  selectedAnswer: string;
  expectedAnswer: string;
  explanation?: string | null;
  japanese?: string | null;
  translation?: string | null;
  wrongAnswerExplanations?: WrongAnswerExplanations | null;
};

export function SmartCorrectionInsightCard({
  selectedAnswer,
  expectedAnswer,
  explanation,
  japanese,
  translation,
  wrongAnswerExplanations,
}: SmartCorrectionInsightCardProps) {
  return (
    <View style={styles.correctionInsightCard}>
      <Text style={styles.correctionInsightKicker}>Analyse</Text>
      {buildQuizFeedbackInsights({
        selectedAnswer,
        expectedAnswer,
        explanation,
        japanese,
        translation,
        wrongAnswerExplanations,
      }).map((insight) => (
        <View key={insight.title} style={styles.correctionInsightBlock}>
          <Text style={styles.correctionInsightLabel}>{insight.title}</Text>
          <Text style={styles.correctionInsightText}>{insight.detail}</Text>
        </View>
      ))}
    </View>
  );
}
