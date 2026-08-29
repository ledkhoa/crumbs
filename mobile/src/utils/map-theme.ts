export const MAP_LIGHT_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#F7F4EF' }], // Background Buttercream
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#1E1915' }], // Deep Espresso text
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#736B63' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.fill',
    stylers: [{ color: '#EFE9DF' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#EDE5D8' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#E8E0D2' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#736B63' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }], // Hide third-party clutter
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#DCE8D6' }], // Subtle Pistachio/Sage Park tint
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }], // Clean crisp white roads
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#736B63' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FDFBF7' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#F2E8D8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#61584F' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'simplified' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7C9070' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#D6E4E5' }], // Soft Muted Blue-Grey Water
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5B7A7C' }],
  },
];

export const MAP_DARK_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#141210' }], // Deep Espresso background
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F5F2EC' }], // Light Ivory text
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#141210' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1F1B17' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1A1714' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#27221E' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#1B2418' }], // Deep Sage Park tint
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#231E1A' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#A69E93' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#332B25' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#10171D' }],
  },
];
