# Decisiones — vigencia revisada 05-11-2026

| ID | Estado vigente / corrección |
|---|---|
|D1|JSON versionados son la base de importación; el frontend además puede fusionar lecturas de Supabase. “Único escritor GHA” es objetivo, no garantía: script ejecutable localmente, CSV y divergencia real.|
|D2|No retirar cadenas sin instrucción explícita del usuario.|
|D3|Vea/Diarco excluidos por solicitud explícita; commit `f424e45`.|
|D4|No publicar promociones por cantidad sin confirmar precio, presentación, cantidad, vigencia y alcance local. Coto corregido: ahora usa exclusivamente precio de lista regional de sucursal 185.|
|D5|Coto integrado y calibrado a sucursal 185 Neuquén sin descuentos globales.|
|D6|Yaguar marcado con `price_validation: 'pending'`. Precios excluidos de comparador, canasta y ahorros minoristas hasta confirmar IVA y condiciones de consumidor final.|
|D7|Reconciliación histórica preferente sobre sobreescrituras. Deploy CLI ejecutado para restablecer producción ante desfasaje de GitHub Actions.|
|D8|Nunca inventar EAN ni unir por similitud. Trazabilidad estricta obligatoria.|
|D9|La Anónima usa HTMLParser estándar y preflight de sucursal.|
|D10|La Anónima usa `ean_` cuando existe EAN válido, `anonima_` si no.|
|D11|Makro 168h implementado en colector y banner.|
|D12|No inventar precios ni corregirlos por heurística arbitraria. Subordinado a D4.|
|D13|Unificar EAN con checksum y guard de presentación.|
|D14|Catálogo por fetch/stub e histórico lazy resumido fuera del bundle.|
|D15|Jumbo integrado con validación estricta de `jumbo_quote_is_local()` (seller Jumbo, unidad 1, multiplicador 1, tax 0, sin priceTags).|
|D16|Auditoría Yaguar Neuquén: la URL oficial consultada corresponde a Neuquén (`/neuquen/producto/...`). El precio físico visto por el usuario ($9.103) coincide exactamente con la cotización actualizada de la tienda online de Neuquén tras el aumento registrado entre el 03-11 y el 05-11.|
|D17|Reconciliación histórica: se unen los históricos local y remoto en commit `013b8ec`, alcanzando 40.725 cotizaciones conservadas sin pérdidas.|
|D18|Coto regionalizado: se descarta el uso de descuentos globales no atribuidos a la sucursal 185.|
|D19|Despliegue de producción Vercel: ejecutado y validado en `https://radar-precios-neuquen.vercel.app` para restaurar `/data/live-prices.json`.|

## Instrucción vigente del usuario

SYNC-002: Autorización de sincronización y reactivación de producción ejecutada. Memoria y registros actualizados conforme a REGLAS_TRABAJO.
