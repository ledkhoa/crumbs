import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { extractSocialUrl, isValidSocialUrl } from '@/utils/social-url';
import { LinkIcon, XCircleIcon, ArrowRightIcon } from 'phosphor-react-native';

export interface SocialLinkPasteInputProps {
  onSubmit: (url: string) => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
}

/**
 * Reusable text input row for pasting and validating Instagram / TikTok video links.
 * Supports standard card layout (compact=false) and sleek inline one-liner (compact=true).
 */
export function SocialLinkPasteInput({
  onSubmit,
  placeholder = 'Paste Instagram or TikTok link...',
  disabled = false,
  compact = false,
  style,
  autoFocus = false,
}: SocialLinkPasteInputProps) {
  const { colors } = useTheme();
  const [pasteUrlText, setPasteUrlText] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (disabled || !pasteUrlText.trim()) return;
    const extracted = extractSocialUrl(pasteUrlText);
    if (extracted.url && isValidSocialUrl(extracted.url)) {
      setUrlError(null);
      haptics.success();
      onSubmit(extracted.url);
      setPasteUrlText('');
    } else {
      haptics.error();
      setUrlError('Please enter a valid Instagram or TikTok video link');
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactWrapper, style]}>
        <View
          style={[
            styles.compactContainer,
            {
              backgroundColor: colors.inputBackground,
              borderColor: urlError ? colors.error : colors.inputBorder,
            },
          ]}
        >
          <LinkIcon size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.compactTextInput, { color: colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={pasteUrlText}
            onChangeText={(text) => {
              setPasteUrlText(text);
              if (urlError) setUrlError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            editable={!disabled}
            autoFocus={autoFocus}
            onSubmitEditing={handleSubmit}
          />
          {pasteUrlText.length > 0 && !disabled && (
            <TouchableOpacity
              onPress={() => {
                setPasteUrlText('');
                setUrlError(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.compactClearButton}
            >
              <XCircleIcon size={16} color={colors.textMuted} weight="fill" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.compactSubmitButton,
              {
                backgroundColor: colors.primary,
                opacity: pasteUrlText.trim().length > 0 && !disabled ? 1 : 0.45,
              },
            ]}
            onPress={handleSubmit}
            disabled={disabled || !pasteUrlText.trim()}
            activeOpacity={0.85}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Add crumb from link"
          >
            <ArrowRightIcon size={14} color={colors.onPrimary} weight="bold" />
          </TouchableOpacity>
        </View>

        {urlError && (
          <Text style={[styles.compactErrorText, { color: colors.error }]}>
            {urlError}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.inputRow}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.cardBackground,
              borderColor: urlError ? colors.error : colors.inputBorder,
            },
          ]}
        >
          <LinkIcon size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={pasteUrlText}
            onChangeText={(text) => {
              setPasteUrlText(text);
              if (urlError) setUrlError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            editable={!disabled}
            autoFocus={autoFocus}
            onSubmitEditing={handleSubmit}
          />
          {pasteUrlText.length > 0 && !disabled && (
            <TouchableOpacity
              onPress={() => {
                setPasteUrlText('');
                setUrlError(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <XCircleIcon size={16} color={colors.textMuted} weight="fill" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              opacity: pasteUrlText.trim().length > 0 && !disabled ? 1 : 0.6,
            },
          ]}
          onPress={handleSubmit}
          disabled={disabled || !pasteUrlText.trim()}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add crumb from link"
        >
          <ArrowRightIcon size={18} color={colors.onPrimary} weight="bold" />
        </TouchableOpacity>
      </View>

      {urlError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {urlError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.sm,
    gap: Theme.spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  // Compact One-Liner Styles
  compactWrapper: {
    width: '100%',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  compactTextInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  compactClearButton: {
    paddingHorizontal: 2,
  },
  compactSubmitButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  compactErrorText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: Theme.spacing.xs,
  },
});
