import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, MapPin, Navigation, Clock, Compass, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import gsap from 'gsap';
import { SUPERMARKETS_NEUQUEN, SupermarketBranchExtended } from '../data/supermarkets';

// Component to handle smooth flyTo camera animation
const MapController: React.FC<{ selectedStore: SupermarketBranchExtended | null }> = ({ selectedStore }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedStore) {
      map.flyTo([selectedStore.lat, selectedStore.lng], 15, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [selectedStore, map]);

  return null;
};

// Create custom animated HTML marker for Leaflet
const createRadarMarkerIcon = (store: SupermarketBranchExtended, isHovered: boolean) => {
  return L.divIcon({
    className: 'custom-radar-pin',
    html: `
      <div class="relative flex items-center justify-center group" style="width: 48px; height: 48px;">
        <!-- Sonar Wave Ping -->
        <div class="absolute inset-0 rounded-full animate-ping opacity-35" style="background-color: ${store.logo_color}; animation-duration: 2.2s;"></div>
        
        <!-- Radar Pulse Circle Outer with Store Brand Badge -->
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300" 
             style="background: white; border: 2.5px solid ${store.logo_color}; transform: ${isHovered ? 'scale(1.35) translateY(-5px)' : 'scale(1)'}; box-shadow: 0 10px 15px -3px ${store.logo_color}40;">
          <div class="w-7 h-7 flex items-center justify-center">
            ${store.logo_svg}
          </div>
        </div>

        <!-- Location Pin Tip -->
        <div class="absolute -bottom-1 w-2.5 h-2.5 rotate-45 shadow-xs" style="background-color: ${store.logo_color};"></div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 46],
  });
};

interface NeuquenMapModalProps {
  onClose: () => void;
}

export const NeuquenMapModal: React.FC<NeuquenMapModalProps> = ({ onClose }) => {
  const neuquenCenter: [number, number] = [-38.9516, -68.0591];
  const [hoveredStore, setHoveredStore] = useState<SupermarketBranchExtended | null>(null);
  const [activeStore, setActiveStore] = useState<SupermarketBranchExtended | null>(null);
  const [activeZone, setActiveZone] = useState<'all' | 'ruta_22' | 'centro_shopping' | 'oeste_cercania'>('all');

  const hoverCardRef = useRef<HTMLDivElement>(null);

  // GSAP animation on hover card
  useEffect(() => {
    if (hoveredStore && hoverCardRef.current) {
      gsap.fromTo(
        hoverCardRef.current,
        { opacity: 0, y: 12, scale: 0.92 },
        { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'back.out(1.8)' }
      );
    }
  }, [hoveredStore]);

  // Filtered stores based on zone
  const displayedStores = useMemo(() => {
    if (activeZone === 'all') return SUPERMARKETS_NEUQUEN;
    return SUPERMARKETS_NEUQUEN.filter(s => s.corridor_zone === activeZone);
  }, [activeZone]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header with Radar Theme */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-white tracking-tight">
                  Radar Geográfico • Red de Supermercados Neuquén Capital
                </h3>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  CP 8300
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ubicaciones exactas sobre el Corredor Ruta 22, Alto Comahue, Paseo de la Patagonia y red barrial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone Selector Filter Pills */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <span className="text-slate-400 flex items-center gap-1.5 mr-1 text-[11px] uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Zona:
          </span>
          <button
            onClick={() => setActiveZone('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeZone === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todas ({SUPERMARKETS_NEUQUEN.length})
          </button>
          <button
            onClick={() => setActiveZone('ruta_22')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeZone === 'ruta_22'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🛣️ Corredor Ruta 22 (Perticone / Planas / Félix San Martín)
          </button>
          <button
            onClick={() => setActiveZone('centro_shopping')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeZone === 'centro_shopping'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🏢 Centro & Shoppings (Coto, Patagonia, Fava)
          </button>
          <button
            onClick={() => setActiveZone('oeste_cercania')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeZone === 'oeste_cercania'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🏘️ Oeste & Barrios (Godoy, Dr. Ramón, Melipal)
          </button>
        </div>

        {/* Map and Sidebar Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden min-h-[480px] relative">
          
          {/* Interactive Leaflet Map */}
          <div className="md:col-span-2 relative h-96 md:h-full bg-slate-100">
            <MapContainer
              center={neuquenCenter}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController selectedStore={activeStore} />

              {displayedStores.map(store => {
                const isHovered = hoveredStore?.id === store.id;

                return (
                  <Marker
                    key={store.id}
                    position={[store.lat, store.lng]}
                    icon={createRadarMarkerIcon(store, isHovered)}
                    eventHandlers={{
                      mouseover: () => setHoveredStore(store),
                      mouseout: () => setHoveredStore(null),
                      click: () => {
                        setActiveStore(store);
                        setHoveredStore(store);
                      }
                    }}
                  />
                );
              })}
            </MapContainer>

            {/* GSAP Animated Floating Info Card on Hover */}
            {hoveredStore && (
              <div
                ref={hoverCardRef}
                className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-4 max-w-xs pointer-events-none transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl p-1 shrink-0 flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: `${hoveredStore.logo_color}15`, border: `1.5px solid ${hoveredStore.logo_color}30` }}
                    dangerouslySetInnerHTML={{ __html: hoveredStore.logo_svg || '' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {hoveredStore.type === 'mayorista' ? 'Mayorista' : hoveredStore.type === 'cooperativa' ? 'Cooperativa' : 'Minorista'}
                      </span>
                      {hoveredStore.branch_number && (
                        <span className="text-[10px] font-bold text-slate-500">
                          {hoveredStore.branch_number}
                        </span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-900 truncate mt-0.5">
                      {hoveredStore.brand_name}
                    </h4>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                  <p className="flex items-start gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                    <span>{hoveredStore.address}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{hoveredStore.opening_hours}</span>
                  </p>
                </div>

                <div className="mt-2 text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-1 rounded-lg text-center border border-cyan-200/60">
                  ⚡ Precios auditados en Neuquén
                </div>
              </div>
            )}
          </div>

          {/* Supermarkets Sidebar List */}
          <div className="border-t md:border-t-0 md:border-l border-slate-200 overflow-y-auto max-h-[380px] md:max-h-full p-4 space-y-2.5 bg-slate-50/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {displayedStores.length} Bocas Relevadas
              </span>
              <span className="text-[10px] font-black text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded-full uppercase">
                {activeZone === 'ruta_22' ? 'Ruta 22' : activeZone === 'centro_shopping' ? 'Centro' : activeZone === 'oeste_cercania' ? 'Oeste' : 'Total'}
              </span>
            </div>

            {displayedStores.map(store => {
              const isSelected = activeStore?.id === store.id;

              return (
                <div
                  key={store.id}
                  onClick={() => {
                    setActiveStore(store);
                    setHoveredStore(store);
                  }}
                  onMouseEnter={() => setHoveredStore(store)}
                  onMouseLeave={() => setHoveredStore(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl p-1 shrink-0 flex items-center justify-center border border-slate-100"
                      style={{ backgroundColor: `${store.logo_color}10` }}
                      dangerouslySetInnerHTML={{ __html: store.logo_svg || '' }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-xs text-slate-900 truncate">
                          {store.name}
                        </h5>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${store.badge_bg}`}>
                          {store.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {store.address}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 truncate max-w-[170px]">
                      <Clock className="w-3 h-3 shrink-0" />
                      {store.opening_hours.split(',')[0]}
                    </span>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.name + ' ' + store.address + ' Neuquen')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-0.5 hover:underline"
                    >
                      Ver GPS <Navigation className="w-3 h-3 text-cyan-600" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
