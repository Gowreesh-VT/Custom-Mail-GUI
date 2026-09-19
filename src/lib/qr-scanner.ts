"use client";

export type ScanResult = {
  rawValue: string;
  detectedAt: number;
};

export type ScannerTier = "barcodedetector" | "zxing-wasm" | "jsqr";

export type ScannerOptions = {
  onDetect: (result: ScanResult) => void;
  onError?: (error: Error) => void;
  onTierSelected?: (tier: ScannerTier) => void;
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor & {
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

const DEBOUNCE_MS = 800;

export async function startCameraStream(videoElement: HTMLVideoElement): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
      advanced: [{ torch: false } as MediaTrackConstraintSet]
    } as MediaTrackConstraints
  };

  try {
    (constraints.video as MediaTrackConstraints & { focusMode?: string }).focusMode = "continuous";
    return await attachStream(videoElement, await navigator.mediaDevices.getUserMedia(constraints));
  } catch {
    const fallback: MediaStreamConstraints = {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        advanced: [{ torch: false } as MediaTrackConstraintSet]
      } as MediaTrackConstraints
    };
    return attachStream(videoElement, await navigator.mediaDevices.getUserMedia(fallback));
  }
}

async function attachStream(videoElement: HTMLVideoElement, stream: MediaStream) {
  videoElement.srcObject = stream;
  videoElement.setAttribute("playsinline", "true");
  await videoElement.play();
  return stream;
}

export async function toggleTorch(stream: MediaStream, enable: boolean): Promise<void> {
  try {
    const track = stream.getVideoTracks()[0];
    await track.applyConstraints({ advanced: [{ torch: enable } as MediaTrackConstraintSet] });
  } catch {
    // Torch is not available on every device/browser.
  }
}

function emitOnce(value: string, state: { value: string; at: number }, options: ScannerOptions) {
  const now = performance.now();
  if (value && (value !== state.value || now - state.at > DEBOUNCE_MS)) {
    state.value = value;
    state.at = now;
    options.onDetect({ rawValue: value, detectedAt: now });
  }
}

export async function scanWithBarcodeDetector(videoElement: HTMLVideoElement, options: ScannerOptions) {
  if (!window.BarcodeDetector) throw new Error("BarcodeDetector is unavailable");
  const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
  let animationFrameId = 0;
  const state = { value: "", at: 0 };

  async function scanFrame() {
    try {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        const barcodes = await detector.detect(videoElement);
        if (barcodes[0]?.rawValue) emitOnce(barcodes[0].rawValue, state, options);
      }
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error("BarcodeDetector scan failed"));
    }
    animationFrameId = requestAnimationFrame(scanFrame);
  }

  animationFrameId = requestAnimationFrame(scanFrame);
  return () => cancelAnimationFrame(animationFrameId);
}

export async function scanWithZxingWasm(videoElement: HTMLVideoElement, options: ScannerOptions) {
  const { readBarcodes } = await import("zxing-wasm/reader");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable");
  const context = ctx;
  let animationFrameId = 0;
  let isScanning = false;
  const state = { value: "", at: 0 };

  async function scanFrame() {
    if (!isScanning && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      isScanning = true;
      try {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0);
        const result = await readBarcodes(context.getImageData(0, 0, canvas.width, canvas.height), { formats: ["QRCode"] });
        const value = result[0]?.text;
        if (value) emitOnce(value, state, options);
      } catch (error) {
        options.onError?.(error instanceof Error ? error : new Error("zxing-wasm scan failed"));
      } finally {
        isScanning = false;
      }
    }
    animationFrameId = requestAnimationFrame(scanFrame);
  }

  animationFrameId = requestAnimationFrame(scanFrame);
  return () => cancelAnimationFrame(animationFrameId);
}

export async function scanWithJsQr(videoElement: HTMLVideoElement, options: ScannerOptions) {
  const jsQR = (await import("jsqr")).default;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable");
  const context = ctx;
  let animationFrameId = 0;
  const state = { value: "", at: 0 };

  function scanFrame() {
    try {
      if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, canvas.width, canvas.height);
        if (result?.data) emitOnce(result.data, state, options);
      }
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error("jsQR scan failed"));
    }
    animationFrameId = requestAnimationFrame(scanFrame);
  }

  animationFrameId = requestAnimationFrame(scanFrame);
  return () => cancelAnimationFrame(animationFrameId);
}

export class QrScanner {
  private cleanup: (() => void) | null = null;
  private stream: MediaStream | null = null;
  private tier: ScannerTier | null = null;

  async start(videoElement: HTMLVideoElement, options: ScannerOptions): Promise<void> {
    this.stop();
    this.stream = await startCameraStream(videoElement);

    if (window.BarcodeDetector) {
      try {
        const supported = (await window.BarcodeDetector.getSupportedFormats?.()) ?? ["qr_code"];
        if (supported.includes("qr_code")) {
          this.tier = "barcodedetector";
          this.cleanup = await scanWithBarcodeDetector(videoElement, options);
          options.onTierSelected?.("barcodedetector");
          return;
        }
      } catch {}
    }

    try {
      this.tier = "zxing-wasm";
      this.cleanup = await scanWithZxingWasm(videoElement, options);
      options.onTierSelected?.("zxing-wasm");
      return;
    } catch {}

    this.tier = "jsqr";
    this.cleanup = await scanWithJsQr(videoElement, options);
    options.onTierSelected?.("jsqr");
  }

  async toggleTorch(enable: boolean) {
    if (this.stream) await toggleTorch(this.stream, enable);
  }

  stop() {
    this.cleanup?.();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.cleanup = null;
    this.stream = null;
  }

  getTier() {
    return this.tier;
  }
}
