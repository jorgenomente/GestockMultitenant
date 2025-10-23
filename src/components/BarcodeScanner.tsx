"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

type Props = {
  onDetected: (value: string) => void;
  onClose?: () => void;
};

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [controls, setControls] = useState<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let stopped = false;

    const start = async () => {
      try {
        const reader = new BrowserMultiFormatReader();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) videoRef.current.srcObject = stream;

        const c = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result, err, _controls) => {
            if (_controls && !controls) setControls(_controls);
            if (result && !stopped) {
              // feedback háptico si existe
              (navigator as any).vibrate?.(80);
              const text = result.getText().trim();
              stop();
              onDetected(text);
            }
          }
        );

        setControls(c);
        setRunning(true);
      } catch (e: any) {
        setError(e?.message ?? "No se pudo acceder a la cámara.");
      }
    };

    const stop = () => {
      stopped = true;
      setRunning(false);
      controls?.stop();
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((t) => t.stop());
    };

    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    setRunning(false);
    controls?.stop();
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((t) => t.stop());
    onClose?.();
  };

  return (
    <div className="relative w-full h-[70vh] max-h-[80dvh] bg-black rounded-2xl overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {/* overlay guía */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-3/4 max-w-sm aspect-[1.8/1] border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>

      {/* header */}
      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
        <span className="text-white/90 text-sm">{running ? "Escaneando…" : "Inactivo"}</span>
        <button onClick={stop} className="bg-white/90 text-black px-3 py-1 rounded-lg text-sm">
          Cerrar
        </button>
      </div>

      {/* errores */}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="bg-red-600 text-white text-sm px-3 py-2 rounded-lg">{error}</div>
        </div>
      )}
    </div>
  );
}
