import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
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
  const { colors } = useTheme();

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
          {
            backgroundColor:
              activeSegment === 'uncategorized'
                ? colors.primary
                : colors.inputBackground,
            borderColor:
              activeSegment === 'uncategorized'
                ? colors.primary
                : colors.inputBorder,
          },
        ]}
        onPress={() => handleSegmentPress('uncategorized')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Uncategorized crumbs filter, ${counts.uncategorized} items`}
      >
        <Text
          style={[
            styles.chipText,
            {
              color:
                activeSegment === 'uncategorized'
                  ? colors.onPrimary
                  : colors.text,
              fontWeight: activeSegment === 'uncategorized' ? '700' : '600',
            },
          ]}
        >
          ⚡ Uncategorized ({counts.uncategorized})
        </Text>
      </TouchableOpacity>

      {/* All */}
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor:
              activeSegment === 'all' ? colors.primary : colors.inputBackground,
            borderColor:
              activeSegment === 'all' ? colors.primary : colors.inputBorder,
          },
        ]}
        onPress={() => handleSegmentPress('all')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`All crumbs filter, ${counts.all} items`}
      >
        <Text
          style={[
            styles.chipText,
            {
              color: activeSegment === 'all' ? colors.onPrimary : colors.text,
              fontWeight: activeSegment === 'all' ? '700' : '600',
            },
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
  },
});
