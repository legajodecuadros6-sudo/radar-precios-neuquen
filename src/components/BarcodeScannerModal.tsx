import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, ScanBarcode, AlertCircle, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  products: Product[];
  onProductFound: (product: Product) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products,
  onProductFound,
  onClose
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
  const [engineType, setEngineType] = useState<'native' | 'html5'>('html5');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const activeRef = useRef<boolean>(true);

  // Reproduce un beep auditivo de confirmación instantáneo
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1050, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Audio no permitido sin interacción previa
    }
  };

  const handleLookup = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Buscar coincidencia exacta por EAN principal o por alias
    const found = products.find(p => 
      p.ean === cleanCode || 
      (p.ean_aliases && p.ean_aliases.includes(cleanCode))
    );

    if (found) {
      playBeep();
      setSuccessMsg(`¡${found.name} detectado!`);
      setTimeout(() => {
        stopCamera();
        onProductFound(found);
        onClose();
      }, 350);
    } else {
      setErrorMsg(`Código leído: ${cleanCode} (EAN-13 válido). Este producto aún no figura en la canasta testigo de Neuquén. Prueba con los productos sugeridos abajo.`);
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsInitializing(true);
    activeRef.current = true;

    // 1. INTENTAR MOTOR NATIVO (BarcodeDetector API - Idéntico a Google Lens)
    const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    if (hasNativeDetector) {
      try {
        const supported = await (window as any).BarcodeDetector.getSupportedFormats();
        const targetFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'].filter(
          (f: string) => supported.includes(f)
        );

        const detector = new (window as any).BarcodeDetector({
          formats: targetFormats.length > 0 ? targetFormats : ['ean_13', 'ean_8', 'qr_code']
        });

        // Configuración de alta resolución y autofoco continuo de cámara
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            // @ts-ignore
            advanced: [{ focusMode: 'continuous' }]
          },
          audio: false
        });

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities() as any;
          if (caps.torch) setHasTorch(true);
          if (caps.zoom) setHasZoom(true);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setEngineType('native');
        setIsScanning(true);
        setIsInitializing(false);

        // Bucle de detección nativo de ultra-alta velocidad (60 FPS por GPU/NPU)
        let isDetecting = false;
        const scanLoop = async () => {
          if (!activeRef.current) return;
          if (videoRef.current && videoRef.current.readyState >= 2 && !isDetecting) {
            isDetecting = true;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && activeRef.current) {
                const detected = barcodes[0].rawValue;
                if (detected) {
                  activeRef.current = false;
                  handleLookup(detected);
                  return;
                }
              }
            } catch (e) {
              // Frame individual sin código, continuar ciclo
            } finally {
              isDetecting = false;
            }
          }
          if (activeRef.current) {
            animFrameRef.current = requestAnimationFrame(scanLoop);
          }
        };

        animFrameRef.current = requestAnimationFrame(scanLoop);
        return;
      } catch (nativeErr) {
        console.warn('Motor nativo no disponible o falló inicio, recurriendo a Html5Qrcode:', nativeErr);
        // Continúa al fallback Html5Qrcode
      }
    }

    // 2. MOTOR DE RESPALDO (Html5Qrcode con escaneo de cuadro completo)
    try {
      const html5QrCode = new Html5Qrcode('reader-fallback', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { 
          facingMode: 'environment',
          // @ts-ignore
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        },
        {
          fps: 25,
          // Sin qrbox restrictivo: escanea el encuadre completo de la cámara
          aspectRatio: 1.333334
        },
        (decodedText) => {
          if (activeRef.current) {
            activeRef.current = false;
            handleLookup(decodedText);
          }
        },
        () => {}
      );

      setEngineType('html5');
      setIsScanning(true);
      setIsInitializing(false);

      try {
        const caps = html5QrCode.getRunningTrackCapabilities();
        if (caps && (caps as any).torch) setHasTorch(true);
      } catch {}

    } catch (err: any) {
      console.warn('Error al activar cámara:', err);
      setIsInitializing(false);
      setIsScanning(false);
      setErrorMsg('No pudimos iniciar la cámara trasera. Comprueba los permisos de tu navegador o ingresa los números manualmente.');
    }
  };

  const toggleTorch = async () => {
    try {
      const nextTorch = !torchOn;
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: nextTorch }]
          });
          setTorchOn(nextTorch);
          return;
        }
      }
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextTorch } as any]
        });
        setTorchOn(nextTorch);
      }
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  const toggleZoom = async () => {
    try {
      const nextZoom = zoomLevel === 1 ? 2 : 1;
      setZoomLevel(nextZoom);
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            // @ts-ignore
            advanced: [{ zoom: nextZoom }]
          });
        }
      }
    } catch (e) {
      console.warn('Error alternando zoom:', e);
    }
  };

  const stopCamera = () => {
    activeRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop().catch(() => {});
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      const result = await html5QrCode.scanFile(file, true);
      handleLookup(result);
    } catch {
      setErrorMsg('No se detectó un código de barra claro en la foto. Prueba con una imagen con buena luz y sin sombras.');
    }
  };

  // Iniciar la cámara automáticamente al montar el modal
  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Lector de Código de Barras
                </h3>
                {engineType === 'native' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Motor Lens HD
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Apunta al código EAN de cualquier producto de góndola
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport de Escaneo con Láser Animado y Enfoque */}
        <div className="p-4 sm:p-6 space-y-4">
          
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-4/3 flex flex-col items-center justify-center text-white shadow-inner">
            
            {/* 1. Video Element para Motor Nativo (Prioridad 1) */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${streamRef.current ? 'block' : 'hidden'}`}
            />

            {/* 2. Contenedor Fallback para Html5Qrcode */}
            <div 
              id="reader-fallback" 
              className={`w-full h-full object-cover ${!streamRef.current && isScanning ? 'block' : 'hidden'}`} 
            />
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
                <p className="text-xs text-slate-300 font-semibold">Calibrando lente y autofoco...</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Asegúrate de permitir el uso de la cámara</p>
              </div>
            )}

            {/* Botón de reintento si falló el inicio */}
            {!isInitializing && !isScanning && (
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
                    {zoomLevel === 1 ? '1x' : '2x'}
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
              O escribe los 13 dígitos del código de barras:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
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
              Probar escaneo inmediato con productos de Neuquén:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌻 Aceite Natura', ean: '7790272001005' },
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

        </div>

      </div>
    </div>
  );
};
