import { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Marker } from 'react-native-maps';
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
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.22 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.22 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 90,
    }).start();
  }, [isSelected, scaleAnim]);

  const { restaurant } = crumb;
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

  let badgeBgColor = colors.primary; // Saved -> Terracotta
  if (pinType === 'visited') {
    badgeBgColor = colors.success; // Visited -> Sage
  } else if (pinType === 'inbox') {
    badgeBgColor = colors.accent; // Inbox -> Warm Gold
  }

  const handlePress = () => {
    haptics.selection();
    onPress(crumb.id);
  };

  const formattedPrice = formatPriceLevel(restaurant.priceLevel);
  const ratingText = restaurant.rating ? `${restaurant.rating}★` : null;

  return (
    <Marker
      coordinate={{
        latitude,
        longitude,
      }}
      onPress={handlePress}
      anchor={{ x: 0.5, y: 1.0 }}
      zIndex={isSelected ? 999 : 10}
      tracksViewChanges={isSelected}
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
          {/* Main Pill Badge */}
          <View
            style={[
              styles.pillBadge,
              {
                backgroundColor: badgeBgColor,
                borderColor: isSelected
                  ? '#FFFFFF'
                  : 'rgba(255, 255, 255, 0.4)',
                borderWidth: isSelected ? 2 : 1,
                shadowColor: '#000000',
              },
              isSelected && styles.pillBadgeSelected,
            ]}
          >
            <Text style={styles.emojiText}>{heroEmoji}</Text>
            <Text
              style={[
                styles.nameText,
                { color: '#FFFFFF' },
                isSelected && styles.nameTextSelected,
              ]}
              numberOfLines={1}
            >
              {restaurant.name}
            </Text>

            {isSelected && (formattedPrice || ratingText) && (
              <View style={styles.selectedMetaBadge}>
                {formattedPrice && (
                  <Text style={styles.selectedMetaText}>{formattedPrice}</Text>
                )}
                {formattedPrice && ratingText && (
                  <Text style={styles.selectedMetaDot}>·</Text>
                )}
                {ratingText && (
                  <Text style={styles.selectedMetaText}>{ratingText}</Text>
                )}
              </View>
            )}
          </View>

          {/* Pointer Triangle */}
          <View
            style={[
              styles.trianglePointer,
              {
                borderTopColor: badgeBgColor,
              },
            ]}
          />
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
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.radii.pill,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 200,
    gap: 4,
  },
  pillBadgeSelected: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  emojiText: {
    fontSize: 12,
  },
  nameText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  nameTextSelected: {
    fontSize: 12,
    fontWeight: '800',
  },
  selectedMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Theme.radii.sm,
    marginLeft: 2,
    gap: 2,
  },
  selectedMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedMetaDot: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
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
});
