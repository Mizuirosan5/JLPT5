import { Component, ReactNode } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App runtime error', error);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.app}>
          <View style={styles.errorScreen}>
            <Text style={styles.errorKicker}>Erreur détectée</Text>
            <Text style={styles.errorTitle}>L'app a protégé la session</Text>
            <Text style={styles.errorText}>
              Une erreur est survenue, mais l'application ne s'est pas fermée. Relance l'écran et envoie-moi ce message si cela revient.
            </Text>
            <Text style={styles.errorDetail}>{this.state.error.message}</Text>
            <Pressable style={styles.primaryButton} onPress={this.reset}>
              <Text style={styles.primaryButtonText}>Reprendre</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#FFF8EF',
    overflow: 'hidden',
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorKicker: {
    color: '#C83543',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  errorTitle: {
    color: '#152B3A',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  errorText: {
    color: '#52636A',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 10,
  },
  errorDetail: {
    backgroundColor: '#FFFDF8',
    borderColor: '#E9CFB5',
    borderRadius: 8,
    borderWidth: 1,
    color: '#7A3B2D',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 18,
    marginTop: 16,
    padding: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C83543',
    borderRadius: 8,
    elevation: 4,
    justifyContent: 'center',
    minWidth: 0,
    padding: 14,
    shadowColor: '#8A2D36',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
