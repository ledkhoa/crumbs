import { Linking, Platform } from 'react-native';
import { getMapsUrl, type OpenMapsParams } from './maps-url';

export { getMapsUrl, type OpenMapsParams };

/**
 * Opens the native default maps application with the destination address/name.
 */
export async function openDefaultMaps(params: OpenMapsParams): Promise<void> {
  const url = getMapsUrl({
    ...params,
    platform: params.platform || Platform.OS,
  });
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      const fallbackQuery = encodeURIComponent(
        [params.name, params.address].filter(Boolean).join(', ') ||
          'Restaurant',
      );
      await Linking.openURL(`https://maps.apple.com/?q=${fallbackQuery}`);
    }
  } catch (error) {
    console.warn('[openDefaultMaps] Failed to open native maps URL:', error);
  }
}
