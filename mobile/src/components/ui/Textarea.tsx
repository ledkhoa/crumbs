import { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';

export interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  minHeight?: number;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(function Textarea(
  {
    label,
    error,
    containerStyle,
    inputStyle,
    minHeight = 80,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <View
        style={[
          styles.container,
          {
            minHeight,
            backgroundColor: colors.inputBackground,
            borderColor: isFocused
              ? colors.primary
              : error
                ? colors.error
                : colors.inputBorder,
          },
        ]}
      >
        <TextInput
          ref={ref}
          multiline
          textAlignVertical="top"
          style={[styles.input, { color: colors.text }, inputStyle]}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  container: {
    borderWidth: 1,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    minHeight: 60,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
