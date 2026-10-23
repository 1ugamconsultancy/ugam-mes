/**
 * ============================================================================
 * UGAM MES — UNIVERSAL REAL-TIME BARCODE & 2D QR SCANNER MODAL
 * ============================================================================
 * @file QrScannerModal.tsx
 * @description Cross-browser optical barcode scanner engine supporting Firefox, Chrome, Edge, Safari:
 *   1. Real-time camera viewfinder via HTML5 WebRTC (auto-selecting environment or user webcam)
 *   2. Dual-Engine Live Optical Decoding:
 *      - jsQR: Ultra-fast pure JavaScript QR code decoding on video canvas frames
 *      - @zxing/browser: Industry-standard 1D (Code 128, Code 39) & 2D (Data Matrix, QR) multi-format decoding
 *   3. Industrial 2D handheld USB/Bluetooth wedge listener
 *   4. Context-aware 1-click quick-test verification buttons
 * 
 * Compliance: IATF 16949 Section 8.5.2 Traceability, ISO/IEC 18004
 */

import React, { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, X, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Keyboard, ArrowRight } from 'lucide-react';
import jsQR from 'jsqr';
import { BrowserMultiFormatReader } from '@zxing/browser';

export interface QrSampleCode {
  label: string;
  code: string;
  json?: string;
}

export interface QrScannerModalProps {
  title?: string;
  subtitle?: string;
  expectedSku?: string;
  sampleCodes?: QrSampleCode[];
  onScan: (scannedValue: string) => void;
  onClose: () => void;
}

export default function QrScannerModal({
  title = '2D QR Code Scanner',
  subtitle = 'Point camera at industrial QR label or use 2D handheld imager',
  expectedSku,
  sampleCodes,
  onScan,
  onClose,
}: QrScannerModalProps) {
  // Input and video state
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(true);
  const [hasCamera, setHasCamera] = useState(false);
  const [scanSuccessText, setScanSuccessText] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasDetectedRef = useRef<boolean>(false);
  const zxingControlsRef = useRef<any>(null);

  /**
   * Dispatches decoded barcode/QR payload with success visual cue
   */
  const handleDecoded = (payload: string) => {
    if (hasDetectedRef.current) return;
    const clean = payload.trim();
    if (!clean) return;

    hasDetectedRef.current = true;
    setScanSuccessText(clean);

    // Give visual flash feedback before dismissing
    setTimeout(() => {
      onScan(clean);
      onClose();
    }, 400);
  };

  // =========================================================================
  // 1. WEBRTC LIVE CAMERA STREAM INITIALIZER
  // =========================================================================
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError('');
    hasDetectedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access not supported in this browser. Use HTTPS or localhost.');
      setCameraLoading(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // Try rear/environment camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch {
        // Fallback to any available system webcam (laptop / USB webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setHasCamera(true);
            setCameraLoading(false);
          } catch (e) {
            console.error('Video play failed:', e);
            setHasCamera(true);
            setCameraLoading(false);
          }
        };
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please click the camera icon in your browser address bar to allow access.'
          : err.name === 'NotFoundError'
          ? 'No physical camera detected on this system.'
          : 'Unable to start camera stream. Use quick-scan pills or keyboard input below.'
      );
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      hasDetectedRef.current = true;
      if (zxingControlsRef.current) {
        try {
          zxingControlsRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // =========================================================================
  // 2. DUAL-ENGINE OPTICAL DECODER (jsQR + ZXing) - Runs on Firefox, Chrome, Edge
  // =========================================================================
  useEffect(() => {
    if (!hasCamera) return;

    let scanTimer: any = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    // A. Start ZXing Multi-Format Reader (decodes 1D barcodes and 2D QR)
    try {
      const codeReader = new BrowserMultiFormatReader();
      if (videoRef.current) {
        codeReader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && !hasDetectedRef.current) {
            const txt = result.getText();
            if (txt) {
              handleDecoded(txt);
            }
          }
        }).then((controls) => {
          zxingControlsRef.current = controls;
        }).catch((e) => {
          console.warn('ZXing decode warning:', e);
        });
      }
    } catch (e) {
      console.warn('ZXing init error:', e);
    }

    // B. Start jsQR Canvas Scanner (high-frequency fallback for QR codes)
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      if (hasDetectedRef.current || !videoRef.current || !canvas || !ctx) return;
      const video = videoRef.current;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });

          if (qr && qr.data && !hasDetectedRef.current) {
            handleDecoded(qr.data);
            return;
          }
        } catch {}
      }

      if (!hasDetectedRef.current) {
        scanTimer = setTimeout(scanFrame, 150); // Scan every 150ms
      }
    };

    scanTimer = setTimeout(scanFrame, 300);

    return () => {
      if (scanTimer) clearTimeout(scanTimer);
    };
  }, [hasCamera]);

  // =========================================================================
  // 3. HARDWARE KEYBOARD WEDGE LISTENER (USB/BLUETOOTH 2D IMAGER)
  // =========================================================================
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleDecoded(buffer.trim());
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Manual submission handler
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleDecoded(manualInput.trim());
    }
  };

  // Compile active quick-test codes
  const displayCodes = sampleCodes && sampleCodes.length > 0 ? sampleCodes : [
    {
      label: 'EN8 Steel Bar Lot',
      code: 'EN8-260901',
      json: JSON.stringify({ sku: 'RM-ST-001', lot: 'EN8-260901' }),
    },
    {
      label: 'NBR Rubber Compound',
      code: 'RS-260901',
      json: JSON.stringify({ sku: 'RM-ST-003', lot: 'RS-260901' }),
    },
    {
      label: 'Work Order PO-260001',
      code: 'PO-260001',
      json: 'PO-260001',
    },
    {
      label: 'Finished Good FG-001',
      code: 'FG-001',
      json: 'FG-001',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-white relative animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {expectedSku && (
          <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
            <span>Expected Target Component:</span>
            <span className="font-mono font-bold text-white bg-blue-600/30 px-2.5 py-0.5 rounded border border-blue-400/40">
              {expectedSku}
            </span>
          </div>
        )}

        {/* Viewfinder Window (Video is ALWAYS in DOM to preserve ref) */}
        <div className="relative w-full h-56 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${hasCamera ? 'block' : 'hidden'}`}
          />

          {/* Success Overlay Flash */}
          {scanSuccessText && (
            <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white z-20 animate-in fade-in zoom-in-95">
              <CheckCircle2 size={48} className="text-white mb-2 animate-bounce" />
              <span className="text-sm font-bold uppercase tracking-wider">Barcode Detected!</span>
              <span className="text-xs font-mono bg-black/40 px-3 py-1 rounded-full mt-1">{scanSuccessText}</span>
            </div>
          )}

          {!hasCamera && (
            <div className="flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400 space-y-2 z-10">
              <Camera size={36} className="text-slate-600 animate-pulse" />
              <span>{cameraLoading ? 'Initializing camera stream...' : 'Camera Stream Standby'}</span>
              {cameraError && (
                <span className="text-[11px] text-amber-400/90 max-w-xs leading-relaxed">{cameraError}</span>
              )}
              {!hasCamera && !cameraLoading && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer mt-1"
                >
                  <RefreshCw size={12} />
                  <span>Retry Camera</span>
                </button>
              )}
            </div>
          )}

          {/* Targeting HUD Overlay with Glowing Laser Scan Line */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-44 h-44 border-2 rounded-2xl relative shadow-lg transition-colors ${
              scanSuccessText ? 'border-emerald-300 shadow-emerald-400/50' : 'border-emerald-400/80 shadow-emerald-500/20'
            }`}>
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400"></div>

              {/* Animated Laser Sweep Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981] animate-laser"></div>
            </div>
          </div>

          <div className="absolute bottom-2 left-3 right-3 text-center">
            <span className="text-[10px] font-mono font-bold bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-emerald-400 border border-emerald-500/30">
              {scanSuccessText ? '✓ BARCODE DECODED' : hasCamera ? 'DUAL OPTICAL SCANNER ACTIVE (JSQR + ZXING)' : 'STANDBY • READY TO SCAN'}
            </span>
          </div>
        </div>

        {/* Quick Test QR Buttons */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles size={12} className="text-amber-400" /> 1-Click Verification Pills (Simulated):
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {displayCodes.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  handleDecoded(sq.json || sq.code);
                }}
                className={`px-3 py-2 rounded-xl text-left transition border cursor-pointer group ${
                  expectedSku && (sq.code === expectedSku || sq.label.includes(expectedSku))
                    ? 'bg-blue-950/60 border-blue-500/50 hover:border-blue-400 text-blue-200 ring-1 ring-blue-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-white'
                }`}
              >
                <div className="font-bold text-[11px] text-emerald-400 group-hover:underline truncate">
                  {sq.label}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">{sq.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Keyboard Input Option */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-800 space-y-2">
          <label className="block text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Keyboard size={13} /> Or Paste / Type QR Code Data (Wedge Input):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={expectedSku ? `e.g. ${expectedSku}` : 'e.g. FRAME-LH-101 or paste JSON'}
              className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-400 font-mono"
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>Decode</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
