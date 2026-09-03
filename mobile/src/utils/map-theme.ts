/**
 * Clean Map Style
 * Suppresses third-party commercial POIs (businesses, shops, etc.) and transit icons
 * so the user's saved crumbs stand out as the primary points on the map.
 * Preserves Google Maps' authentic native rendering across both light and dark modes.
 */
export const CLEAN_MAP_STYLE = [
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];
