import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, ScanBarcode, AlertCircle, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  products: Product[];
  onProductFound: (product: Product) => void;
  onClose: () => void;
}

const formats = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];
type CameraCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number; step?: number };
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products, onProductFound, onClose
}) => {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const capabilitiesRef = useRef<CameraCapabilities>({});
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const generationRef = useRef(0);
  const mountedRef = useRef(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const propsRef = useRef({ products, onProductFound, onClose });
  propsRef.current = { products, onProductFound, onClose };

  // Serialize start/stop/file operations: a pending permission request can finish
  // after closing the modal. Its session is invalidated and released on completion.
  const enqueue = (operation: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(operation).catch(error => {
      console.error('Error del lector:', error);
    });
    return queueRef.current;
  };
  const releaseCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    if (scanner.isScanning) await scanner.stop();
    scanner.clear();
    scannerRef.current = null;
  };
  const isCurrent = (generation: number) =>
    mountedRef.current && generationRef.current === generation;

  const stopCamera = () => {
    generationRef.current += 1;
    clearTimeout(resultTimerRef.current);
    if (mountedRef.current) {
      setIsScanning(false);
      setIsInitializing(false);
      setTorchOn(false);
      setHasTorch(false);
      setHasZoom(false);
    }
    return enqueue(releaseCamera);
  };

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1050;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => { void ctx.close(); };
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch { /* Sound is optional. */ }
  };

  const handleLookup = (code: string, source: 'camera' | 'manual' | 'photo' = 'manual') => {
    const cleanCode = code.replace(/\s/g, '');
    if (!cleanCode || !mountedRef.current) return;
    if (!/^\d{8}$|^\d{12,13}$/.test(cleanCode)) {
      setErrorMsg('Ingresa el código completo: 8, 12 o 13 números.');
      return;
    }
    void stopCamera();
    setManualCode(cleanCode);
    setErrorMsg('');
    setSuccessMsg('');
    // UPC-A may be reported by a decoder as EAN-13 with a leading zero.
    const normalize = (value: string) => value.length === 12 ? `0${value}` : value;
    const found = propsRef.current.products.find(product =>
      [product.ean, ...(product.ean_aliases ?? [])].some(value =>
        value && normalize(value.trim()) === normalize(cleanCode)));
    if (source !== 'manual') playBeep();
    if (!found) {
      setErrorMsg(`${source === 'manual' ? 'Código ingresado' : 'Código leído correctamente'}: ${cleanCode}. Este producto todavía no está en el catálogo.`);
      return;
    }
    setSuccessMsg(`¡${found.name} encontrado!`);
    const generation = generationRef.current;
    resultTimerRef.current = setTimeout(() => {
      if (!isCurrent(generation)) return;
      propsRef.current.onProductFound(found);
      propsRef.current.onClose();
    }, 350);
  };

  const scannerOptions = async () => {
    // html5-qrcode alternates the native decoder with ZXing when both exist.
    // Enable native decoding only when it supports all requested product formats.
    let useNative = false;
    try {
      const detector = (window as any).BarcodeDetector;
      const supported: string[] = detector ? await detector.getSupportedFormats() : [];
      useNative = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].every(f => supported.includes(f));
    } catch { /* ZXing works without BarcodeDetector. */ }
    return { formatsToSupport: formats, verbose: false, useBarCodeDetectorIfSupported: useNative };
  };

  const startCamera = () => {
    const generation = ++generationRef.current;
    clearTimeout(resultTimerRef.current);
    setErrorMsg('');
    setSuccessMsg('');
    setIsInitializing(true);
    setIsScanning(false);
    setHasTorch(false);
    setTorchOn(false);
    setHasZoom(false);
    return enqueue(async () => {
      await releaseCamera();
      if (!isCurrent(generation)) return;
      try {
        const options = await scannerOptions();
        if (!isCurrent(generation)) return;
        const scanner = new Html5Qrcode('reader-fallback', options);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            disableFlip: true,
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 }, height: { ideal: 1080 }
            }
          },
          code => { if (isCurrent(generation)) handleLookup(code, 'camera'); },
          () => { /* A frame with no barcode is expected, not a camera failure. */ }
        );
        if (!isCurrent(generation)) { await releaseCamera(); return; }
        try {
          const caps = scanner.getRunningTrackCapabilities() as CameraCapabilities;
          capabilitiesRef.current = caps;
          setHasTorch(Boolean(caps.torch));
          setHasZoom(Boolean(caps.zoom && caps.zoom.max > Math.max(1, caps.zoom.min)));
          setZoomLevel((scanner.getRunningTrackSettings() as MediaTrackSettings & { zoom?: number }).zoom ?? caps.zoom?.min ?? 1);
        } catch {
          // Optional camera controls must never prevent barcode recognition.
          capabilitiesRef.current = {};
        }
        setIsScanning(true);
      } catch (error) {
        console.warn('No se pudo iniciar el lector:', error);
        await releaseCamera();
        if (isCurrent(generation)) {
          setErrorMsg('No pudimos iniciar el lector. Revisa el permiso de cámara y cierra otras aplicaciones que la estén usando. También puedes subir una foto o escribir el código.');
          setIsScanning(false);
        }
      } finally {
        if (isCurrent(generation)) setIsInitializing(false);
      }
    });
  };

  const toggleTorch = async () => {
    const generation = generationRef.current;
    try {
      const next = !torchOn;
      await scannerRef.current?.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      if (isCurrent(generation)) setTorchOn(next);
    } catch { if (isCurrent(generation)) setErrorMsg('Este dispositivo no pudo activar la linterna.'); }
  };
  const toggleZoom = async () => {
    const range = capabilitiesRef.current.zoom;
    if (!range) return;
    const generation = generationRef.current;
    const base = Math.max(range.min, Math.min(1, range.max));
    const target = Math.min(range.max, Math.max(base, 2));
    const next = zoomLevel > base ? base : target;
    try {
      await scannerRef.current?.applyVideoConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] });
      if (isCurrent(generation)) setZoomLevel(next);
    } catch { if (isCurrent(generation)) setErrorMsg('Este dispositivo no pudo cambiar el zoom.'); }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void stopCamera();
    const generation = generationRef.current;
    setErrorMsg('');
    setSuccessMsg('');
    setIsInitializing(true);
    void enqueue(async () => {
      if (!isCurrent(generation)) return;
      const options = await scannerOptions();
      if (!isCurrent(generation)) return;
      const scanner = new Html5Qrcode('file-scanner-temp', options);
      try {
        const result = await scanner.scanFile(file, false);
        if (isCurrent(generation)) handleLookup(result, 'photo');
      } catch {
        if (isCurrent(generation)) setErrorMsg('No se pudo reconocer un código en esta foto. Incluye todas las barras y los márgenes blancos.');
      } finally {
        scanner.clear();
        if (isCurrent(generation)) setIsInitializing(false);
      }
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    void startCamera();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { void stopCamera(); propsRef.current.onClose(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      mountedRef.current = false;
      void stopCamera();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-2 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 text-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-800 flex flex-col my-auto max-h-[92dvh] sm:max-h-[90vh] overflow-hidden">
        
        {/* Header Sticky - Siempre visible y accesible en cualquier celular */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/95 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <ScanBarcode className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-extrabold text-xs sm:text-base text-white">
                  Lector de Código de Barras
                </h3>

              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                Apunta al código EAN de cualquier producto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700 shadow-md touch-manipulation"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport de Escaneo con Láser Animado y Enfoque */}
        <div className="overflow-y-auto flex-1 p-3.5 sm:p-5 space-y-3.5">
          
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-48 flex flex-col items-center justify-center text-white shadow-inner">
            
            {/* Always laid out: decoding uses the video's rendered dimensions. */}
            <div id="reader-fallback" className="w-full [&_video]:!w-full [&_video]:!h-auto" />
            <div id="file-scanner-temp" className="hidden" />

            {/* MIRA DE ENFOQUE + LÁSER ANIMADO TIPO SUPERPRECIO */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Cuadro de Enfoque con esquinas neón */}
                <div className="relative w-64 h-36 sm:w-72 sm:h-44 rounded-2xl border-2 border-cyan-400/40 overflow-hidden shadow-[0_0_0_9999px_rgba(2,6,23,0.65)]">
                  
                  {/* 4 Esquinas estilizadas */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-cyan-400 rounded-br-lg" />

                  {/* LÍNEA LÁSER ANIMADA QUE SUBE Y BAJA */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee,0_0_24px_#06b6d4] animate-laser" />

                  {/* Texto indicador de encuadre */}
                  <div className="absolute bottom-1.5 inset-x-0 text-center">
                    <span className="text-[10px] font-bold text-cyan-200 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/40 uppercase tracking-wider">
                      Apunta aquí al código de barras
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de Éxito al Detectar */}
            {successMsg && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in duration-150">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <p className="text-sm font-bold text-white">{successMsg}</p>
                <p className="text-xs text-emerald-300 mt-1">Cargando precios comparados...</p>
              </div>
            )}

            {/* Estado de inicialización */}
            {isInitializing && !isScanning && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                <p className="text-xs text-slate-300 font-semibold">Preparando lector...</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Asegúrate de permitir el uso de la cámara</p>
              </div>
            )}

            {/* Botón de reintento si falló el inicio */}
            {!isInitializing && !isScanning && !successMsg && (
              <div className="p-6 text-center z-10 flex flex-col items-center">
                <Camera className="w-12 h-12 text-slate-500 mb-2" />
                <p className="text-xs text-slate-300 max-w-xs mb-3">
                  La cámara no está activa en este momento.
                </p>
                <button
                  onClick={startCamera}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Reintentar Cámara
                </button>
              </div>
            )}

            {/* Controles flotantes sobre la cámara (Linterna y Zoom 2x) */}
            {isScanning && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {hasZoom && (
                  <button
                    onClick={toggleZoom}
                    className={`px-2.5 py-1.5 rounded-xl border backdrop-blur-md text-xs font-bold transition-all ${
                      zoomLevel === 2
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30'
                        : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                    }`}
                    title="Alternar Zoom 1x / 2x"
                  >
                    {zoomLevel.toFixed(1)}x
                  </button>
                )}

                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                      torchOn 
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/40' 
                        : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                    }`}
                    title="Encender Linterna"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Consejo ergonómico para botellas y envases curvos */}
          <div className="text-[11px] text-slate-400 flex items-start gap-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-cyan-400 font-bold shrink-0">💡 Tip:</span>
            <span>
              Si el envase es curvo o tiene brillo (como una botella de aceite), sostenlo a unos <strong>15-20 cm</strong> sin inclinar. Si tu celular lo permite, activa el botón <strong>2x</strong> para mayor nitidez.
            </span>
          </div>

          {/* Mensaje de Error o No Encontrado */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-200 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <span>{errorMsg}</span>
                <button
                  onClick={() => {
                    setErrorMsg('');
                    startCamera();
                  }}
                  className="block mt-1 text-[11px] font-bold text-cyan-300 underline cursor-pointer"
                >
                  Volver a escanear
                </button>
              </div>
            </div>
          )}

          {/* Opción de Subir Foto */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-slate-200">¿Tienes una foto del código de barras?</span>
            </div>
            <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-600 transition-colors">
              Subir foto
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Ingreso Manual de Dígitos */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              O escribe el código de barras completo:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Código de barras"
                onKeyDown={event => { if (event.key === 'Enter') handleLookup(manualCode); }}
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Ej: 7790272001005"
                className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 outline-none font-mono"
              />
              <button
                onClick={() => handleLookup(manualCode)}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition-colors active:scale-95 cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Botones de Prueba Rápida con Productos Reales de Neuquén */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Buscar productos de ejemplo (sin usar la cámara):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌻 Natura 1.5 L', ean: '7790272001029' },
                { label: '🌻 Natura 900 ml', ean: '7790272001005' },
                { label: '🌿 Yerba Playadito', ean: '7793704000928' },
                { label: '🥛 Leche Serenísima', ean: '7790742357007' },
                { label: '🍝 Fideos Matarazzo', ean: '7790070336293' },
                { label: '🥤 Coca-Cola 3L', ean: '7790895007019' }
              ].map(test => (
                <button
                  key={test.ean}
                  onClick={() => handleLookup(test.ean)}
                  className="bg-slate-800/90 hover:bg-cyan-950 hover:text-cyan-300 hover:border-cyan-500/50 text-slate-300 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  {test.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botón de Cierre Inferior (Ultra accesible en móviles) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700 shadow-xs"
            >
              <X className="w-4 h-4" />
              Cerrar Escáner
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
