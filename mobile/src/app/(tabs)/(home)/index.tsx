import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme, useTheme } from '@/theme/tokens';

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Living Aroma Map
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Your saved crumbs and curated food guides will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
