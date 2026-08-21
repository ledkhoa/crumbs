import * as Haptics from 'expo-haptics';

/**
 * Standardized Haptic Feedback Pattern for Crumbs.
 *
 * Rules:
 * - `haptics.tap()`: Light tactile taps on buttons, cards, pills, icon buttons, filters, list rows.
 * - `haptics.primary()`: Medium impact on primary intent actions (e.g. Save, Create, Book, Decide Now).
 * - `haptics.heavy()`: Heavy impact on destructive operations (Delete, Remove, Sign Out).
 * - `haptics.selection()`: Selection changes on tabs, pickers, checkboxes, switches, emoji pickers.
 * - `haptics.success()`: Async operation success (Created, Saved, Authenticated).
 * - `haptics.error()`: Async operation failure or validation errors.
 * - `haptics.warning()`: Alerts, limits reached, unsaved warning prompts.
 */
export const haptics = {
  /** Light tactile tap for standard interactive UI elements (cards, icon buttons, list items, filters) */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  /** Medium impact for high-intent primary CTA buttons (Save Crumb, Create Guide, Book, Decide For Me) */
  primary: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  /** Heavy impact for destructive actions (Delete Guide, Remove Spot, Sign Out) */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  /** Selection tick for discrete choices (Tabs, Segmented Controls, Switches, Checkboxes, Emoji Pickers) */
  selection: () => Haptics.selectionAsync(),

  /** Notification vibration for successful async completion (Guide created, Crumb saved, Login succeeded) */
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),

  /** Notification vibration for errors & failed validations */
  error: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  /** Notification vibration for warnings & confirmation prompts */
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
