import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import type {
  MapCoordinates,
  LocationPermissionStatus,
  UserLocationState,
} from '@/types/map';

export interface UseUserLocationResult extends UserLocationState {
  requestPermission: () => Promise<boolean>;
  openAppSettings: () => Promise<void>;
  recenterToUser: () => Promise<MapCoordinates | null>;
}

const LOCATION_TIMEOUT_MS = 3000;

export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<MapCoordinates | null>(null);
  const [status, setStatus] =
    useState<LocationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchPositionWithTimeout =
    useCallback(async (): Promise<MapCoordinates | null> => {
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Location request timed out'));
        }, LOCATION_TIMEOUT_MS);
      });

      const location = await Promise.race([positionPromise, timeoutPromise]);
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }, []);

  const initializeLocation = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Check existing permission without aggressively prompting on startup
      const currentPerm = await Location.getForegroundPermissionsAsync();

      if (!isMountedRef.current) return;

      if (currentPerm.status === Location.PermissionStatus.GRANTED) {
        try {
          const userCoords = await fetchPositionWithTimeout();
          if (!isMountedRef.current) return;

          if (userCoords) {
            setCoords(userCoords);
            setStatus('granted');
            setIsLoading(false);
            return;
          }
        } catch {
          if (!isMountedRef.current) return;
          setStatus('timeout_fallback');
          setIsLoading(false);
          return;
        }
      } else if (currentPerm.status === Location.PermissionStatus.DENIED) {
        setStatus('denied');
        setIsLoading(false);
        return;
      } else {
        setStatus('undetermined');
        setIsLoading(false);
        return;
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message =
        err instanceof Error ? err.message : 'Unknown location error';
      setErrorMessage(message);
      setStatus('undetermined');
      setIsLoading(false);
    }
  }, [fetchPositionWithTimeout]);

  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  const openAppSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Ignore linking errors
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const currentPerm = await Location.getForegroundPermissionsAsync();
      if (currentPerm.status === Location.PermissionStatus.GRANTED) {
        try {
          const userCoords = await fetchPositionWithTimeout();
          if (isMountedRef.current) {
            setCoords(userCoords);
            setStatus('granted');
            setIsLoading(false);
          }
          return true;
        } catch {
          if (isMountedRef.current) {
            setStatus('timeout_fallback');
            setIsLoading(false);
          }
          return false;
        }
      }

      // If already denied and cannot ask again via native dialog, guide user to Settings
      if (
        !currentPerm.canAskAgain &&
        currentPerm.status !== Location.PermissionStatus.UNDETERMINED
      ) {
        if (isMountedRef.current) {
          setStatus('denied');
          setIsLoading(false);
        }
        Alert.alert(
          'Location Permission Required',
          'To center the map on your current location and find nearby cravings, please enable Location Services in your settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                openAppSettings();
              },
            },
          ],
        );
        return false;
      }

      const result = await Location.requestForegroundPermissionsAsync();

      if (result.status === Location.PermissionStatus.GRANTED) {
        try {
          const userCoords = await fetchPositionWithTimeout();
          if (isMountedRef.current) {
            setCoords(userCoords);
            setStatus('granted');
            setIsLoading(false);
          }
          return true;
        } catch {
          if (isMountedRef.current) {
            setStatus('timeout_fallback');
            setIsLoading(false);
          }
          return false;
        }
      } else {
        if (isMountedRef.current) {
          setStatus(
            result.status === Location.PermissionStatus.DENIED
              ? 'denied'
              : 'restricted',
          );
          setIsLoading(false);
        }
        return false;
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to request location permission';
        setErrorMessage(msg);
        setStatus('denied');
        setIsLoading(false);
      }
      return false;
    }
  }, [fetchPositionWithTimeout, openAppSettings]);

  const recenterToUser =
    useCallback(async (): Promise<MapCoordinates | null> => {
      // Check current permission state in case user enabled it in background or Settings
      const currentPerm = await Location.getForegroundPermissionsAsync();
      if (currentPerm.status === Location.PermissionStatus.GRANTED) {
        try {
          const userCoords = await fetchPositionWithTimeout();
          if (userCoords && isMountedRef.current) {
            setCoords(userCoords);
            setStatus('granted');
          }
          return userCoords || coords;
        } catch {
          return coords;
        }
      }

      const granted = await requestPermission();
      if (granted) {
        try {
          const userCoords = await fetchPositionWithTimeout();
          if (userCoords && isMountedRef.current) {
            setCoords(userCoords);
            setStatus('granted');
          }
          return userCoords;
        } catch {
          return null;
        }
      }

      return null;
    }, [coords, fetchPositionWithTimeout, requestPermission]);

  return {
    coords,
    status,
    isLoading,
    errorMessage,
    requestPermission,
    openAppSettings,
    recenterToUser,
  };
}
