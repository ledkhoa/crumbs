import { memo, useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '@/theme/tokens';
import { MAP_LIGHT_STYLE, MAP_DARK_STYLE } from '@/utils/map-theme';
import { CrumbMapMarker } from '@/components/map/CrumbMapMarker';
import type { EnrichedUserCrumb } from '@api/modules/crumbs/crumbs.types';
import type { MapRegion } from '@/types/map';

export interface LiveCravingsMapViewProps {
  mapRef: React.RefObject<MapView | null>;
  crumbs: EnrichedUserCrumb[];
  selectedCrumbId: string | null;
  onSelectCrumb: (crumbId: string) => void;
  onRegionChangeComplete?: (region: MapRegion) => void;
  initialRegion: MapRegion;
  showsUserLocation?: boolean;
}

export const LiveCravingsMapView = memo(function LiveCravingsMapView({
  mapRef,
  crumbs,
  selectedCrumbId,
  onSelectCrumb,
  onRegionChangeComplete,
  initialRegion,
  showsUserLocation = true,
}: LiveCravingsMapViewProps) {
  const { isDark } = useTheme();

  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      onRegionChangeComplete?.(region);
    },
    [onRegionChangeComplete],
  );

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      customMapStyle={isDark ? MAP_DARK_STYLE : MAP_LIGHT_STYLE}
      initialRegion={initialRegion}
      onRegionChangeComplete={handleRegionChangeComplete}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      showsCompass={false}
      showsScale={false}
      rotateEnabled={true}
      pitchEnabled={false}
      toolbarEnabled={false}
    >
      {crumbs.map((crumb) => {
        if (
          !Number.isFinite(crumb.restaurant?.latitude) ||
          !Number.isFinite(crumb.restaurant?.longitude)
        ) {
          return null;
        }

        return (
          <CrumbMapMarker
            key={crumb.id}
            crumb={crumb}
            isSelected={crumb.id === selectedCrumbId}
            onPress={onSelectCrumb}
          />
        );
      })}
    </MapView>
  );
});
