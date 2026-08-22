import { forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export interface SearchInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  onClear?: () => void;
}

export const SearchInput = forwardRef<TextInput, SearchInputProps>(
  function SearchInput(
    {
      value,
      onChangeText,
      onClear,
      placeholder = 'Search...',
      containerStyle,
      ...props
    },
    ref,
  ) {
    const handleClear = () => {
      haptics.tap();
      onChangeText?.('');
      onClear?.();
    };

    const hasValue = Boolean(value && value.length > 0);

    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          {...props}
        />
        {hasValue && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Theme.spacing.sm,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: Theme.spacing.xs,
  },
  clearText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    fontWeight: '700',
  },
});
