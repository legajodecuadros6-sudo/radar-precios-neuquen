import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, ScanBarcode, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
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
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const handleLookup = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    const found = products.find(p => p.ean === cleanCode);
    if (found) {
      stopCamera();
      onProductFound(found);
      onClose();
    } else {
      setErrorMsg(`No se encontró un producto con el código EAN: ${cleanCode} en la base de Neuquén.`);
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const html5QrCode = new Html5Qrcode('reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 180 }
        },
        (decodedText) => {
          handleLookup(decodedText);
        },
        () => {
          // Ignore failed scan frames
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setErrorMsg('No se pudo acceder a la cámara. Puedes ingresar el código manualmente o probar con los ejemplos abajo.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (html5QrCodeRef.current && isScanning) {
      html5QrCodeRef.current.stop().catch(console.error);
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const result = await html5QrCode.scanFile(file, true);
      handleLookup(result);
    } catch (err) {
      setErrorMsg('No se detectó un código de barra claro en la imagen subida. Prueba con una foto más nítida o ingresa los números.');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Escanear Código de Barras / EAN
              </h3>
              <p className="text-xs text-slate-500">
                Lector con cámara web, foto o ingreso directo
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Camera Scanner Viewport */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-4/3 flex flex-col items-center justify-center text-white">
            <div id="reader" className="w-full h-full" />
            <div id="file-scanner-temp" className="hidden" />

            {!isScanning && (
              <div className="p-6 text-center z-10 flex flex-col items-center">
                <Camera className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-xs text-slate-300 max-w-xs mb-3">
                  Apunta la cámara del celular al código de barras del producto para comparar al instante.
                </p>
                <button
                  onClick={startCamera}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md"
                >
                  Activar Cámara
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Photo Upload Option */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">¿Tienes una foto del código?</span>
            </div>
            <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 shadow-xs transition-colors">
              Subir imagen
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Manual EAN Input */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              O ingresa los 13 dígitos del código de barra:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Ej. 7790070507303"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-mono"
              />
              <button
                onClick={() => handleLookup(manualCode)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Quick Demo Test Buttons */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Probar escaneo rápido con productos de Neuquén:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌿 Yerba Playadito', ean: '7790070507303' },
                { label: '🌻 Aceite Natura', ean: '7790895000997' },
                { label: '🥛 Leche Serenísima', ean: '7790310000001' },
                { label: '🥩 Asado x kg', ean: '2001695889012' }
              ].map(test => (
                <button
                  key={test.ean}
                  onClick={() => handleLookup(test.ean)}
                  className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
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
