import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, ScanBarcode, AlertCircle, RefreshCw, Zap } from 'lucide-react';
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
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Reproduce un beep auditivo idéntico al de un escáner de supermercado
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio no permitido por el navegador sin interacción previa, continuar
    }
  };

  const handleLookup = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    playBeep();

    const found = products.find(p => p.ean === cleanCode);
    if (found) {
      stopCamera();
      onProductFound(found);
      onClose();
    } else {
      setErrorMsg(`Código detectado: ${cleanCode}. Producto no registrado aún en el catálogo de Neuquén.`);
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    setIsInitializing(true);

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
      }

      // Configurar escáner optimizado para códigos de barra de supermercado (EAN-13 / EAN-8 / UPC)
      const html5QrCode = new Html5Qrcode('reader', {
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
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 20, // 20 cuadros por segundo para captura veloz
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdgePercentage = 0.75;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: Math.max(qrboxSize, 250),
              height: Math.floor(Math.max(qrboxSize, 250) * 0.6) // Proporción rectangular ideal para códigos de barras horizontales
            };
          },
          aspectRatio: 1.333334
        },
        (decodedText) => {
          handleLookup(decodedText);
        },
        () => {
          // Frame no reconocido, continuar escaneo
        }
      );

      setIsScanning(true);
      setIsInitializing(false);

      // Comprobar si la cámara tiene linterna / flash
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        }
      } catch {
        // Torch no soportado en esta cámara
      }

    } catch (err: any) {
      console.warn('Error al activar cámara:', err);
      setIsInitializing(false);
      setIsScanning(false);
      setErrorMsg('No pudimos acceder a la cámara trasera. Asegúrate de dar permisos de cámara en tu navegador o ingresa los números manualmente.');
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.stop().catch(() => {});
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
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
      setErrorMsg('No se detectó un código de barra claro en la foto. Prueba con una imagen con buena luz y sin reflejos.');
    }
  };

  // Iniciar la cámara automáticamente al abrir el modal (igual que en Superprecio)
  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 300);

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
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Escanear Código de Barras
              </h3>
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

        {/* Viewport de Escaneo con Láser Animado tipo Superprecio */}
        <div className="p-4 sm:p-6 space-y-4">
          
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-4/3 flex flex-col items-center justify-center text-white shadow-inner">
            
            {/* Contenedor del video HTML5 */}
            <div id="reader" className="w-full h-full object-cover" />
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
                      Centra las barras aquí
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Estado de inicialización */}
            {isInitializing && !isScanning && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center z-10">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                <p className="text-xs text-slate-300 font-semibold">Iniciando cámara trasera...</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Permite el acceso a la cámara si el navegador lo solicita</p>
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

            {/* Controles flotantes sobre la cámara (Linterna) */}
            {isScanning && hasTorch && (
              <div className="absolute top-3 right-3 z-20">
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
              </div>
            )}
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
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
                placeholder="Ej: 7790070507303"
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

          {/* Botones de Prueba Rápida con Productos de Neuquén */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Probar escaneo inmediato con productos de Neuquén:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌿 Yerba Playadito', ean: '7790387011036' },
                { label: '🌻 Aceite Natura', ean: '7790272001005' },
                { label: '🥛 Leche Serenísima', ean: '7793940428003' },
                { label: '🍝 Fideos Matarazzo', ean: '7790070318048' },
                { label: '🥤 Coca-Cola 3L', ean: '7790895000997' }
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
