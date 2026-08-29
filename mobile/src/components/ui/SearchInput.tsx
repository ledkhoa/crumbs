import { forwardRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { MagnifyingGlassIcon, XCircleIcon } from 'phosphor-react-native';

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
    const { colors } = useTheme();

    const handleClear = () => {
      haptics.tap();
      onChangeText?.('');
      onClear?.();
    };

    const hasValue = Boolean(value && value.length > 0);

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          },
          containerStyle,
        ]}
      >
        <MagnifyingGlassIcon
          size={16}
          color={colors.textSubtle}
          weight="bold"
          style={styles.searchIcon}
        />
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
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
            <XCircleIcon size={16} color={colors.textSubtle} weight="fill" />
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
    borderWidth: 1,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Theme.spacing.sm,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 2,
  },
});
