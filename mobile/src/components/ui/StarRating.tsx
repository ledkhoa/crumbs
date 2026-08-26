import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Theme } from '@/theme/tokens';

export interface StarRatingProps {
  rating: number;
  count?: number | null;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function StarRating({
  rating,
  count,
  size = 'md',
  style,
  textStyle,
}: StarRatingProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.star, styles[`star_${size}`]]}>★</Text>
      <Text style={[styles.ratingNumber, styles[`text_${size}`], textStyle]}>
        {rating.toFixed(1)}
      </Text>
      {count != null ? (
        <Text style={[styles.count, styles[`count_${size}`]]}>
          ({count.toLocaleString()})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  star: {
    color: Theme.colors.accent,
    includeFontPadding: false,
  },
  star_sm: {
    fontSize: 11,
  },
  star_md: {
    fontSize: 13,
  },
  star_lg: {
    fontSize: 15,
  },
  ratingNumber: {
    fontWeight: '700',
    color: Theme.colors.text,
    includeFontPadding: false,
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 12,
  },
  text_lg: {
    fontSize: 14,
  },
  count: {
    fontWeight: '500',
    color: Theme.colors.textMuted,
    includeFontPadding: false,
  },
  count_sm: {
    fontSize: 10,
  },
  count_md: {
    fontSize: 11,
  },
  count_lg: {
    fontSize: 13,
  },
});
