import { memo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { StarIcon } from 'phosphor-react-native';
import { Theme, useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { deduceHeroEmoji, getCrumbPinType } from '@/utils/map-filter';
import { formatPriceLevel } from '@/utils/price';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export interface CrumbMapMarkerProps {
  crumb: EnrichedUserCrumb;
  isSelected: boolean;
  onPress: (crumbId: string) => void;
}

export const CrumbMapMarker = memo(function CrumbMapMarker({
  crumb,
  isSelected,
  onPress,
}: CrumbMapMarkerProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.15 : 1)).current;
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // Manage tracksViewChanges to guarantee image bitmap decoding without permanent render loops
  useEffect(() => {
    setTracksViewChanges(true);
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.15 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start(() => {
      // Settle marker texture after spring animation
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 250);
      return () => clearTimeout(timer);
    });
  }, [isSelected, scaleAnim]);

  const handleImageLoad = useCallback(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const { restaurant, sourcePost } = crumb;
  const latitude = restaurant?.latitude;
  const longitude = restaurant?.longitude;

  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const pinType = getCrumbPinType(crumb);
  const heroEmoji = deduceHeroEmoji(crumb);
  const imageUrl = restaurant?.photoUrl || sourcePost?.mediaUrls?.[0] || null;

  let statusColor = colors.primary; // Saved -> Terracotta (#C45B3E)
  if (pinType === 'visited') {
    statusColor = colors.success; // Visited -> Sage (#4A7C59)
  } else if (pinType === 'inbox') {
    statusColor = colors.accent; // Inbox -> Warm Gold (#D99B26)
  }

  const handlePress = () => {
    haptics.selection();
    onPress(crumb.id);
  };

  const formattedPrice = formatPriceLevel(restaurant.priceLevel);
  const ratingText = restaurant.rating ? `${restaurant.rating}★` : null;
  const metaParts = [formattedPrice, ratingText].filter(Boolean).join(' · ');

  return (
    <Marker
      coordinate={{
        latitude,
        longitude,
      }}
      onPress={handlePress}
      anchor={{ x: 0.5, y: 1.0 }}
      zIndex={isSelected ? 999 : 10}
      tracksViewChanges={tracksViewChanges || isSelected}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.touchableWrapper}
        accessibilityRole="button"
        accessibilityLabel={`${restaurant.name}, ${heroEmoji}${
          formattedPrice ? `, ${formattedPrice}` : ''
        }${ratingText ? `, ${ratingText}` : ''}`}
      >
        <Animated.View
          style={[
            styles.pinContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {isSelected ? (
            /* Selected Expanded Card View (Option 2: Adaptive Card) */
            <View style={styles.selectedContainer}>
              <View
                style={[
                  styles.selectedCard,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: statusColor,
                    shadowOpacity: isDark ? 0.45 : 0.2,
                  },
                ]}
              >
                {/* Rounded Square Photo / Emoji */}
                <View
                  style={[
                    styles.selectedPhotoWrapper,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: statusColor,
                    },
                  ]}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={150}
                      onLoad={handleImageLoad}
                    />
                  ) : (
                    <View
                      style={[
                        styles.emojiCircleFallback,
                        { backgroundColor: statusColor },
                      ]}
                    >
                      <Text style={styles.selectedEmojiFallback}>
                        {heroEmoji}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Details Column */}
                <View style={styles.selectedInfoColumn}>
                  <Text
                    style={[styles.selectedTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {restaurant.name}
                  </Text>
                  <View style={styles.selectedMetaRow}>
                    {Boolean(formattedPrice) && (
                      <Text
                        style={[
                          styles.selectedPriceText,
                          { color: colors.textMuted },
                        ]}
                      >
                        {formattedPrice}
                      </Text>
                    )}
                    {Boolean(formattedPrice) && Boolean(restaurant.rating) && (
                      <Text
                        style={[
                          styles.selectedDotText,
                          { color: colors.textSubtle },
                        ]}
                      >
                        ·
                      </Text>
                    )}
                    {Boolean(restaurant.rating) && (
                      <View style={styles.selectedRatingBadge}>
                        <StarIcon
                          size={11}
                          color={colors.accent}
                          weight="fill"
                        />
                        <Text
                          style={[
                            styles.selectedRatingText,
                            { color: colors.text },
                          ]}
                        >
                          {restaurant.rating!.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Triangle Pointer */}
              <View
                style={[
                  styles.trianglePointerSelected,
                  {
                    borderTopColor: colors.cardBackground,
                  },
                ]}
              />
            </View>
          ) : (
            /* Unselected Photo-First Pin View */
            <View style={styles.unselectedContainer}>
              {/* Circular Photo Badge */}
              <View
                style={[
                  styles.photoCircle,
                  {
                    borderColor: statusColor,
                    backgroundColor: isDark
                      ? colors.inputBackground
                      : colors.cardBackground,
                  },
                ]}
              >
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={150}
                    onLoad={handleImageLoad}
                  />
                ) : (
                  <View
                    style={[
                      styles.emojiCircleFallback,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    <Text style={styles.unselectedEmojiText}>{heroEmoji}</Text>
                  </View>
                )}
              </View>

              {/* Triangle Pointer */}
              <View
                style={[
                  styles.trianglePointer,
                  {
                    borderTopColor: statusColor,
                  },
                ]}
              />

              {/* Compact Name Capsule Below Marker */}
              <View
                style={[
                  styles.nameCapsule,
                  {
                    backgroundColor: isDark
                      ? 'rgba(28, 25, 23, 0.92)'
                      : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(0, 0, 0, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nameCapsuleText,
                    {
                      color: isDark ? '#FFFFFF' : '#1C1917',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {restaurant.name}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Marker>
  );
});

const styles = StyleSheet.create({
  touchableWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emojiCircleFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedEmojiText: {
    fontSize: 18,
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4.5,
    borderRightWidth: 4.5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
  nameCapsule: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 110,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  nameCapsuleText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    textAlign: 'center',
  },

  // Selected State Styles
  selectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    width: 190,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  selectedPhotoWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEmojiFallback: {
    fontSize: 20,
  },
  selectedInfoColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 2,
  },
  selectedTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  selectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  selectedPriceText: {
    fontSize: 10,
    fontWeight: '700',
  },
  selectedDotText: {
    fontSize: 9,
  },
  selectedRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  selectedRatingText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trianglePointerSelected: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
});
