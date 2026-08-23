import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export type InboxFilterSegment = 'uncategorized' | 'all';

export interface InboxFilterBarProps {
  activeSegment: InboxFilterSegment;
  onSelectSegment: (segment: InboxFilterSegment) => void;
  counts: {
    all: number;
    uncategorized: number;
  };
}

export function InboxFilterBar({
  activeSegment,
  onSelectSegment,
  counts,
}: InboxFilterBarProps) {
  const handleSegmentPress = (segment: InboxFilterSegment) => {
    haptics.selection();
    onSelectSegment(segment);
  };

  return (
    <View style={styles.container}>
      {/* Uncategorized (Default) */}
      <TouchableOpacity
        style={[
          styles.chip,
          activeSegment === 'uncategorized' && styles.activeChip,
        ]}
        onPress={() => handleSegmentPress('uncategorized')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Uncategorized crumbs filter, ${counts.uncategorized} items`}
      >
        <Text
          style={[
            styles.chipText,
            activeSegment === 'uncategorized' && styles.activeChipText,
          ]}
        >
          ⚡ Uncategorized ({counts.uncategorized})
        </Text>
      </TouchableOpacity>

      {/* All */}
      <TouchableOpacity
        style={[styles.chip, activeSegment === 'all' && styles.activeChip]}
        onPress={() => handleSegmentPress('all')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`All crumbs filter, ${counts.all} items`}
      >
        <Text
          style={[
            styles.chipText,
            activeSegment === 'all' && styles.activeChipText,
          ]}
        >
          All ({counts.all})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs + 2,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.xs,
  },
  chip: {
    height: 34,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radii.pill,
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  activeChipText: {
    color: Theme.colors.onPrimary,
    fontWeight: '700',
  },
});
