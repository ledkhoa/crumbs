import { Platform } from 'react-native';
import {
  KeyboardToolbar as RNCKeyboardToolbar,
  type KeyboardToolbarProps,
} from 'react-native-keyboard-controller';
import { LightColors, DarkColors } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

export type AppKeyboardToolbarTheme = NonNullable<
  KeyboardToolbarProps['theme']
>;

export const keyboardToolbarTheme: AppKeyboardToolbarTheme = {
  light: {
    primary: LightColors.primary,
    disabled: LightColors.textSubtle,
    background: LightColors.cardBackground,
    ripple: 'rgba(196, 91, 62, 0.12)',
  },
  dark: {
    primary: DarkColors.primary,
    disabled: DarkColors.textSubtle,
    background: DarkColors.cardBackground,
    ripple: 'rgba(214, 104, 75, 0.15)',
  },
};

export interface AppKeyboardToolbarProps extends Partial<KeyboardToolbarProps> {}

/**
 * System-themed keyboard accessory toolbar matching Crumbs design system tokens
 * with reduced padding above the keyboard and integrated tactile haptic feedback.
 */
export function AppKeyboardToolbar({
  theme = keyboardToolbarTheme,
  offset = {
    closed: 0,
    // On iOS with rounded corners, react-native-keyboard-controller adds an extra -11px gap.
    // Setting opened to 11 brings the toolbar snug against the top of the software keyboard.
    opened: Platform.OS === 'ios' ? 11 : 0,
  },
  onDoneCallback,
  onNextCallback,
  onPrevCallback,
  ...rest
}: AppKeyboardToolbarProps) {
  return (
    <RNCKeyboardToolbar
      theme={theme}
      offset={offset}
      doneText="Done"
      onDoneCallback={(e) => {
        haptics.tap();
        onDoneCallback?.(e);
      }}
      onNextCallback={(e) => {
        haptics.selection();
        onNextCallback?.(e);
      }}
      onPrevCallback={(e) => {
        haptics.selection();
        onPrevCallback?.(e);
      }}
      {...rest}
    />
  );
}
