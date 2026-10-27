# Radar de Precios - Neuquén Capital (CP 8300) 🛒

Plataforma comparadora de precios de supermercados, agregador de ofertas e historial anti-inflación para Neuquén Capital y zona de influencia.

---

## 🚀 Inicio Rápido

El servidor de desarrollo ya se encuentra ejecutándose en segundo plano.

Para verlo en tu navegador, ingresa a:
👉 **[http://localhost:3000](http://localhost:3000)**

Si en el futuro quieres iniciarlo manualmente desde la terminal de VS Code:
```bash
npm run dev
```

Para compilar para producción:
```bash
npm run build
```

---

## 📁 Estructura del Proyecto

* **`src/data/database.ts`**: Base de datos centralizada con los productos reales, códigos EAN, marcas, precios de lista y de oferta relevados en Neuquén.
* **`src/data/supermarkets.ts`**: Registro de sucursales físicas en Neuquén (Coto Alto Comahue, La Anónima Paseo Patagonia, ChangoMás Perticone, Makro Teodoro Planas, Yaguar Félix San Martín, Cooperativa Obrera, Diarco y Vital) con coordenadas GPS para OpenStreetMap.
* **`src/utils/basketOptimizer.ts`**: Lógica matemática para:
  * **Opción A (Un Solo Supermercado):** Ranking del total de la canasta por tienda.
  * **Opción B (Compra Dividida / Ahorro Máximo):** Asignación óptima por menor precio unitario y lista agrupada para WhatsApp.
* **`src/utils/priceAnalyzer.ts`**: Detector anti-inflación que compara precios contra el promedio histórico de 30 y 90 días.
* **`src/components/BarcodeScannerModal.tsx`**: Lector de código de barras con cámara web/celular, subida de fotos y búsqueda manual por EAN-13.
* **`src/components/NeuquenMapModal.tsx`**: Mapa interactivo 100% open-source con Leaflet y OpenStreetMap (sin costo de API de Google).
* **`src/components/ProductDetailModal.tsx`**: Modal con gráficos de evolución temporal en Recharts y trazabilidad de fuentes.

---

## 🔍 Cobertura Territorial
* **Zona:** Neuquén Capital (Código Postal 8300).
* **Fuentes integradas:** Coto Digital, La Anónima Online, Makro Canasta Básica Neuquén, Catálogo Yaguar Neuquén, MasOnline y La Coope.
* **Políticas:** 100% Open Source, sin login obligatorio, persistencia de canasta en LocalStorage y trazabilidad pública de cada precio.
