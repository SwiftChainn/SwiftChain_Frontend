'use client';

import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';

export interface UseMobileQrScannerOptions {
  autoStart?: boolean;
  scanIntervalMs?: number;
  onDecode?: (_data: string) => void;
}

const DEFAULT_SCAN_INTERVAL_MS = 1_000;

function cameraError(error: unknown): {
  permission: CameraPermissionState;
  message: string;
} {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return { permission: 'denied', message: 'Camera permission was denied.' };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      permission: 'unavailable',
      message: 'No camera was found on this device.',
    };
  }
  return { permission: 'error', message: 'The camera could not be started.' };
}

export function useMobileQrScanner(
  options: UseMobileQrScannerOptions = {},
) {
  const {
    autoStart = true,
    scanIntervalMs = DEFAULT_SCAN_INTERVAL_MS,
    onDecode,
  } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mountedRef = useRef(true);
  const scanningRef = useRef(false);
  const onDecodeRef = useRef(onDecode);
  const [data, setData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] =
    useState<CameraPermissionState>('idle');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopTracks = useCallback(() => {
    clearTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    scanningRef.current = false;
  }, [clearTimer]);

  const stopScanning = useCallback(() => {
    stopTracks();
    if (mountedRef.current) {
      setIsScanning(false);
      setPermission('idle');
    }
  }, [stopTracks]);

  const startScanning = useCallback(async () => {
    stopTracks();
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('unavailable');
      setError('Camera access is not available on this device.');
      return;
    }

    setPermission('requesting');
    setError(null);
    setData(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        setPermission('error');
        setError('The scanner video is not mounted.');
        return;
      }

      streamRef.current = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      scanningRef.current = true;
      setPermission('granted');
      setIsScanning(true);

      const scanFrame = () => {
        if (!scanningRef.current) return;
        const activeVideo = videoRef.current;
        if (
          activeVideo &&
          activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          const width = activeVideo.videoWidth;
          const height = activeVideo.videoHeight;
          if (width > 0 && height > 0) {
            const canvas =
              canvasRef.current ?? document.createElement('canvas');
            canvasRef.current = canvas;
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', {
              willReadFrequently: true,
            });
            if (context) {
              context.drawImage(activeVideo, 0, 0, width, height);
              const image = context.getImageData(0, 0, width, height);
              const result = jsQR(image.data, width, height, {
                inversionAttempts: 'dontInvert',
              });
              const decoded = result?.data?.trim();
              if (decoded) {
                setData(decoded);
                onDecodeRef.current?.(decoded);
                stopTracks();
                setIsScanning(false);
                return;
              }
            }
          }
        }
        timerRef.current = setTimeout(scanFrame, scanIntervalMs);
      };

      timerRef.current = setTimeout(scanFrame, scanIntervalMs);
    } catch (caught) {
      stopTracks();
      if (!mountedRef.current) return;
      const state = cameraError(caught);
      setPermission(state.permission);
      setError(state.message);
      setIsScanning(false);
    }
  }, [scanIntervalMs, stopTracks]);

  const clearResult = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (autoStart) {
      autoStartTimerRef.current = setTimeout(() => void startScanning(), 0);
    }
    return () => {
      mountedRef.current = false;
      if (autoStartTimerRef.current) clearTimeout(autoStartTimerRef.current);
      stopTracks();
    };
  }, [autoStart, startScanning, stopTracks]);

  return {
    videoRef,
    data,
    error,
    permission,
    isScanning,
    startScanning,
    stopScanning,
    clearResult,
  };
}
