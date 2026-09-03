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
import { StarIcon, CheckIcon } from 'phosphor-react-native';
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { restaurant, sourcePost } = crumb;
  const imageUrl = restaurant?.photoUrl || sourcePost?.mediaUrls?.[0] || null;

  useEffect(() => {
    setTracksViewChanges(true);
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.15 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 100,
    }).start(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // On Android, only stop tracking if image is already loaded or there is no image
      if (!imageUrl || isImageLoaded) {
        timerRef.current = setTimeout(
          () => {
            setTracksViewChanges(false);
          },
          Platform.OS === 'android' ? 500 : 250,
        );
      }
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isSelected, scaleAnim, imageUrl, isImageLoaded]);

  // Safety fallback: stop tracking after 8s to prevent background drain if remote image times out
  useEffect(() => {
    if (!imageUrl || isImageLoaded) return;
    const safetyTimer = setTimeout(() => {
      setIsImageLoaded(true);
      setTracksViewChanges(false);
    }, 8000);
    return () => clearTimeout(safetyTimer);
  }, [imageUrl, isImageLoaded]);

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Keep tracking for a few frames so Android Google Maps captures the decoded bitmap
    timerRef.current = setTimeout(
      () => {
        setTracksViewChanges(false);
      },
      Platform.OS === 'android' ? 500 : 250,
    );
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoaded(true);
    setTracksViewChanges(false);
  }, []);

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

  let statusColor = colors.primary;
  if (pinType === 'visited') {
    statusColor = colors.success;
  } else if (pinType === 'inbox') {
    statusColor = colors.accent;
  }

  const handlePress = () => {
    haptics.selection();
    onPress(crumb.id);
  };

  const formattedPrice = formatPriceLevel(restaurant.priceLevel);
  const ratingText = restaurant.rating ? `${restaurant.rating}★` : null;
  const heroDish = crumb.effectiveHeroDish;

  const shouldTrackChanges =
    tracksViewChanges || (Boolean(imageUrl) && !isImageLoaded) || isSelected;

  return (
    <Marker
      coordinate={{
        latitude,
        longitude,
      }}
      onPress={handlePress}
      anchor={{ x: 0.5, y: 1.0 }}
      zIndex={isSelected ? 999 : 10}
      tracksViewChanges={shouldTrackChanges}
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
            /* ── Selected: Premium Detail Card ── */
            <View style={styles.selectedContainer}>
              <View
                style={[
                  styles.selectedCardShadow,
                  {
                    shadowColor: statusColor,
                    shadowOpacity: isDark ? 0.5 : 0.3,
                  },
                ]}
              >
                <View
                  style={[
                    styles.selectedCardSurface,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  {/* Status accent stripe along the top with matching rounded top corners */}
                  <View
                    style={[
                      styles.accentStripe,
                      { backgroundColor: statusColor },
                    ]}
                  />

                  <View style={styles.selectedCardInner}>
                    {/* Rounded Square Photo */}
                    <View style={styles.selectedPhotoOuter}>
                      <View
                        style={[
                          styles.selectedPhotoWrapper,
                          {
                            backgroundColor: colors.inputBackground,
                          },
                        ]}
                      >
                        {/* Emoji fallback rendered underneath so image never flashes blank */}
                        <View
                          style={[
                            styles.emojiSquareFallback,
                            { backgroundColor: statusColor },
                          ]}
                        >
                          <Text style={styles.selectedEmojiFallback}>
                            {heroEmoji}
                          </Text>
                        </View>
                        {imageUrl && (
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.photoImage}
                            contentFit="cover"
                            transition={Platform.OS === 'android' ? 0 : 150}
                            cachePolicy="memory-disk"
                            priority="high"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                          />
                        )}
                      </View>

                      {/* Visited badge on selected photo */}
                      {pinType === 'visited' && (
                        <View
                          style={[
                            styles.selectedPhotoBadge,
                            { backgroundColor: colors.success },
                          ]}
                        >
                          <CheckIcon size={9} color="#FFFFFF" weight="bold" />
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

                      {/* Hero Dish Subtitle (3-tier resolved) */}
                      {Boolean(heroDish) && (
                        <Text
                          style={[
                            styles.selectedHeroDish,
                            { color: colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {heroDish}
                        </Text>
                      )}

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
                        {Boolean(formattedPrice) &&
                          Boolean(restaurant.rating) && (
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

                        {/* Visited pill in meta row */}
                        {pinType === 'visited' && (
                          <View
                            style={[
                              styles.visitedPill,
                              {
                                backgroundColor: colors.inputBackground,
                              },
                            ]}
                          >
                            <CheckIcon
                              size={8}
                              color={colors.success}
                              weight="bold"
                            />
                            <Text
                              style={[
                                styles.visitedPillText,
                                { color: colors.success },
                              ]}
                            >
                              Visited
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
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
            /* ── Unselected: Glazed Squircle Photo Pin ── */
            <View style={styles.unselectedContainer}>
              {/* Squircle Photo Tile */}
              <View
                style={[
                  styles.photoSquircle,
                  {
                    borderColor: statusColor,
                    backgroundColor: colors.cardBackground,
                    shadowColor: statusColor,
                    shadowOpacity: isDark ? 0.45 : 0.35,
                  },
                ]}
              >
                <View style={styles.photoInner}>
                  {/* Emoji fallback underneath so marker is never a blank square */}
                  <View
                    style={[
                      styles.emojiSquareFallback,
                      { backgroundColor: statusColor },
                    ]}
                  >
                    <Text style={styles.unselectedEmojiText}>{heroEmoji}</Text>
                  </View>
                  {imageUrl && (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.photoImage}
                      contentFit="cover"
                      transition={Platform.OS === 'android' ? 0 : 150}
                      cachePolicy="memory-disk"
                      priority="high"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  )}
                </View>

                {/* Visited ✓ badge overlay */}
                {pinType === 'visited' && (
                  <View style={styles.visitedBadge}>
                    <CheckIcon size={9} color="#FFFFFF" weight="bold" />
                  </View>
                )}

                {/* Inbox "new" dot */}
                {pinType === 'inbox' && <View style={styles.inboxDot} />}
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

              {/* Compact Name Capsule */}
              <View
                style={[
                  styles.nameCapsule,
                  {
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.nameCapsuleText,
                    {
                      color: colors.text,
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

  // ── Unselected Pin Styles ──
  unselectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 6,
  },
  photoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  emojiSquareFallback: {
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
  visitedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7C9070',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  inboxDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DFB064',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
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

  // ── Selected State Styles ──
  selectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCardShadow: {
    width: 218,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  selectedCardSurface: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  accentStripe: {
    height: 3,
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  selectedCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    gap: 9,
  },
  selectedPhotoOuter: {
    position: 'relative',
  },
  selectedPhotoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPhotoBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  selectedEmojiFallback: {
    fontSize: 22,
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
  selectedHeroDish: {
    fontSize: 10,
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 1,
  },
  selectedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
    flexWrap: 'wrap',
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
  visitedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 2,
  },
  visitedPillText: {
    fontSize: 9,
    fontWeight: '700',
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
