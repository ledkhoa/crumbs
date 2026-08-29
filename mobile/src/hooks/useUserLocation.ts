import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking } from 'react-native';
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
      // Check existing permission first
      const currentPerm = await Location.getForegroundPermissionsAsync();

      let permissionResult = currentPerm;
      if (
        currentPerm.status === Location.PermissionStatus.UNDETERMINED ||
        (currentPerm.status !== Location.PermissionStatus.GRANTED &&
          currentPerm.canAskAgain)
      ) {
        permissionResult = await Location.requestForegroundPermissionsAsync();
      }

      if (!isMountedRef.current) return;

      if (permissionResult.status === Location.PermissionStatus.GRANTED) {
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
      } else if (permissionResult.status === Location.PermissionStatus.DENIED) {
        setStatus('denied');
        setIsLoading(false);
        return;
      } else {
        setStatus('restricted');
        setIsLoading(false);
        return;
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message =
        err instanceof Error ? err.message : 'Unknown location error';
      setErrorMessage(message);
      setStatus('timeout_fallback');
      setIsLoading(false);
    }
  }, [fetchPositionWithTimeout]);

  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
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
  }, [fetchPositionWithTimeout]);

  const openAppSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Ignore linking errors
    }
  }, []);

  const recenterToUser =
    useCallback(async (): Promise<MapCoordinates | null> => {
      if (status === 'granted') {
        try {
          const userCoords = await fetchPositionWithTimeout();
          if (userCoords && isMountedRef.current) {
            setCoords(userCoords);
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
          }
          return userCoords;
        } catch {
          return null;
        }
      }

      return null;
    }, [status, coords, fetchPositionWithTimeout, requestPermission]);

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
