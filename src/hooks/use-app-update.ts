import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';

import { fetchLatestAppVersion } from '@/lib/api';
import type { AppVersion } from '@/types/platform';

function parseVersion(version: string) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) return null;
  return match.slice(1);
}

function isNewerVersion(candidate: string, current: string) {
  const candidateParts = parseVersion(candidate);
  const currentParts = parseVersion(current);
  if (!candidateParts || !currentParts) return false;

  for (let index = 0; index < candidateParts.length; index += 1) {
    if (candidateParts[index].length !== currentParts[index].length) {
      return candidateParts[index].length > currentParts[index].length;
    }
    if (candidateParts[index] !== currentParts[index]) {
      return candidateParts[index] > currentParts[index];
    }
  }
  return false;
}

export function useAppUpdate() {
  const currentVersion = Constants.expoConfig?.version ?? 'نامشخص';
  const [release, setRelease] = useState<AppVersion | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState('');

  const loadLatestVersion = useCallback(() => fetchLatestAppVersion(), []);

  useEffect(() => {
    let isMounted = true;
    loadLatestVersion()
      .then((latestRelease) => {
        if (!isMounted) return;
        setRelease(latestRelease);
        setHasChecked(true);
      })
      .catch((checkError: unknown) => {
        if (!isMounted) return;
        setError(
          checkError instanceof Error
            ? checkError.message
            : `بررسی نسخه ناموفق بود: ${String(checkError)}`,
        );
        setHasChecked(true);
      })
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [loadLatestVersion]);

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    setError('');
    setHasChecked(false);
    setRelease(null);
    try {
      setRelease(await loadLatestVersion());
    } catch (checkError: unknown) {
      setError(
        checkError instanceof Error
          ? checkError.message
          : `بررسی نسخه ناموفق بود: ${String(checkError)}`,
      );
    } finally {
      setHasChecked(true);
      setIsChecking(false);
    }
  }, [loadLatestVersion]);

  return {
    currentVersion,
    release,
    updateAvailable:
      release !== null && isNewerVersion(release.version, currentVersion),
    isChecking,
    hasChecked,
    error,
    checkForUpdate,
  };
}
