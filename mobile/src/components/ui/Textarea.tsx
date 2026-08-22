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
import { Theme } from '@/theme/tokens';

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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.container,
          { minHeight },
          isFocused && styles.focused,
          Boolean(error) && styles.errorContainer,
        ]}
      >
        <TextInput
          ref={ref}
          multiline
          textAlignVertical="top"
          style={[styles.input, inputStyle]}
          placeholderTextColor={Theme.colors.textSubtle}
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  container: {
    backgroundColor: Theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radii.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  focused: {
    borderColor: Theme.colors.primary,
  },
  errorContainer: {
    borderColor: Theme.colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Theme.colors.text,
    padding: 0,
    minHeight: 60,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
