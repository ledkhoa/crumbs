import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '@/theme/tokens';
import { CLEAN_MAP_STYLE } from '@/utils/map-theme';
import { CrumbMapMarker } from '@/components/map/CrumbMapMarker';
import { CrumbClusterMarker } from '@/components/map/CrumbClusterMarker';
import {
  getClusteredCrumbs,
  getClusterExpansionRegion,
} from '@/utils/map-clustering';
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
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(initialRegion);

  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      setCurrentRegion(region);
      onRegionChangeComplete?.(region);
    },
    [onRegionChangeComplete],
  );

  // Compute visible clusters / points based on current viewport & zoom
  const clusterItems = useMemo(() => {
    return getClusteredCrumbs(crumbs, currentRegion);
  }, [crumbs, currentRegion]);

  // Handle zooming into a cluster on tap
  const handlePressCluster = useCallback(
    (clusterCrumbs: EnrichedUserCrumb[], lat: number, lng: number) => {
      const expansionRegion = getClusterExpansionRegion(clusterCrumbs);

      if (expansionRegion && mapRef.current) {
        mapRef.current.animateToRegion(expansionRegion, 400);
        setCurrentRegion(expansionRegion);
      } else if (mapRef.current) {
        const fallbackRegion: MapRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: currentRegion.latitudeDelta * 0.5,
          longitudeDelta: currentRegion.longitudeDelta * 0.5,
        };
        mapRef.current.animateToRegion(fallbackRegion, 400);
        setCurrentRegion(fallbackRegion);
      }
    },
    [currentRegion, mapRef],
  );

  // Locate the selected crumb if it is currently hidden inside a cluster
  const selectedCrumb = useMemo(() => {
    if (!selectedCrumbId) return null;
    return crumbs.find((c) => c.id === selectedCrumbId) || null;
  }, [selectedCrumbId, crumbs]);

  const isSelectedCrumbInClusterItems = useMemo(() => {
    if (!selectedCrumbId) return true;
    return clusterItems.some(
      (item) =>
        !item.properties.cluster && item.properties.crumbId === selectedCrumbId,
    );
  }, [selectedCrumbId, clusterItems]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      customMapStyle={CLEAN_MAP_STYLE}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
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
      {clusterItems.map((item) => {
        if (item.properties.cluster) {
          const [lng, lat] = item.geometry.coordinates;
          return (
            <CrumbClusterMarker
              key={item.properties.cluster_id}
              clusterId={item.properties.cluster_id}
              latitude={lat}
              longitude={lng}
              pointCount={item.properties.point_count}
              crumbs={item.properties.crumbs}
              onPressCluster={handlePressCluster}
            />
          );
        }

        const { crumb } = item.properties;
        return (
          <CrumbMapMarker
            key={crumb.id}
            crumb={crumb}
            isSelected={crumb.id === selectedCrumbId}
            onPress={onSelectCrumb}
          />
        );
      })}

      {/* Guarantee selected crumb is always visible even if viewport is zoomed out */}
      {selectedCrumb && !isSelectedCrumbInClusterItems && (
        <CrumbMapMarker
          key={`selected-${selectedCrumb.id}`}
          crumb={selectedCrumb}
          isSelected={true}
          onPress={onSelectCrumb}
        />
      )}
    </MapView>
  );
});
