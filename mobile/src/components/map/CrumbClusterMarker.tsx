import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { useTheme } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';

export interface CrumbClusterMarkerProps {
  clusterId: string;
  latitude: number;
  longitude: number;
  pointCount: number;
  crumbs: EnrichedUserCrumb[];
  onPressCluster: (
    crumbs: EnrichedUserCrumb[],
    lat: number,
    lng: number,
  ) => void;
}

export const CrumbClusterMarker = memo(function CrumbClusterMarker({
  clusterId: _clusterId,
  latitude,
  longitude,
  pointCount,
  crumbs,
  onPressCluster,
}: CrumbClusterMarkerProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    haptics.selection();
    onPressCluster(crumbs, latitude, longitude);
  };

  // Determine cluster size based on density
  const size = pointCount < 10 ? 38 : pointCount < 50 ? 44 : 50;
  const fontSize = pointCount < 10 ? 13 : pointCount < 50 ? 14 : 15;

  return (
    <Marker
      coordinate={{
        latitude,
        longitude,
      }}
      onPress={handlePress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      zIndex={50}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={styles.touchableWrapper}
        accessibilityRole="button"
        accessibilityLabel={`${pointCount} crumbs cluster, tap to zoom`}
      >
        <View
          style={[
            styles.clusterBubble,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primary,
              borderColor: '#FFFFFF',
            },
          ]}
        >
          <Text style={[styles.clusterText, { fontSize }]}>{pointCount}</Text>
        </View>
      </TouchableOpacity>
    </Marker>
  );
});

const styles = StyleSheet.create({
  touchableWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  clusterBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  clusterText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
