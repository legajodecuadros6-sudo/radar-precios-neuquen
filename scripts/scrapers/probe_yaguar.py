#!/usr/bin/env python3
"""Read-only local catalogue collector. Quarantined until taxes/access are verified."""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'data-staging/yaguar.json'
BASE = 'https://yaguar.com.ar/neuquen/'
TERMS = ('lays', 'manaos', 'pomelo')

def parse_product(row, stamp):
    link = urlparse(row.get('permalink', ''))
    if link.scheme != 'https' or link.netloc != 'yaguar.com.ar' or not link.path.startswith('/neuquen/producto/'):
        raise ValueError('Producto fuera de la tienda Neuquén')
    if row.get('type') != 'simple' or not row.get('is_purchasable') or not row.get('is_in_stock') or row.get('is_on_backorder'):
        return None
    prices, limits = row['prices'], row['add_to_cart']
    if prices.get('currency_code') != 'ARS' or prices.get('price_range') is not None:
        raise ValueError('Moneda o precio ambiguo')
    decimals = prices['currency_minor_unit']
    if type(decimals) is not int or not 0 <= decimals <= 2:
        raise ValueError('Escala monetaria desconocida')
    raw = prices['price']
    if not isinstance(raw, str) or not raw.isdigit() or int(raw) <= 0:
        raise ValueError('Precio inválido')
    minimum, multiple = limits['minimum'], limits['multiple_of']
    if any(type(n) is not int or n < 1 for n in (minimum, multiple)):
        raise ValueError('Cantidad ambigua')
    return {'source_id': str(row['id']), 'sku': str(row.get('sku', '')), 'name': row['name'],
            'source_url': row['permalink'], 'observed_at': stamp,
            'api_price_ars': int(raw) / 10 ** decimals,
            'minimum': minimum, 'multiple': multiple,
            'is_verified': False, 'tax_included': None,
            'reason': 'Confirmar impuestos y acceso de consumidor final a este precio online. No usar en comparaciones.',
            'image_url': (row.get('images') or [{}])[0].get('src', '')}

def collect():
    stamp = datetime.now(timezone.utc).isoformat()
    rows, errors, capped = {}, [], []
    for term in TERMS:
        # Default 10 results. This is a focused sample, never a claim of full coverage.
        url = BASE + 'wp-json/wc/store/v1/products?' + urlencode({'search': term})
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'}), timeout=25) as response:
                if not response.url.startswith(BASE): raise ValueError('Redirección fuera de Neuquén')
                data = json.loads(response.read().decode('utf-8-sig'))
            if not isinstance(data, list): raise ValueError('Respuesta no es catálogo')
            if len(data) >= 10: capped.append(term)
            for item in data:
                try:
                    record = parse_product(item, stamp)
                    if record: rows[record['source_id']] = record
                except (KeyError, TypeError, ValueError) as error:
                    errors.append(f'{term}: registro descartado: {error}')
        except Exception as error:
            errors.append(f'{term}: {type(error).__name__}: {error}')
    result = {'last_attempt': stamp, 'status': 'pending_validation', 'scope': 'Muestra de Lay’s, Manaos y pomelo; no es catálogo completo',
              'queries_at_limit': capped, 'errors': errors, 'products': list(rows.values())}
    if not rows:
        # Preserve old observation dates if every request fails.
        if OUTPUT.exists(): result['products'] = json.loads(OUTPUT.read_text())['products']
        result['status'] = 'error'
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix('.tmp')
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(OUTPUT)
    print(json.dumps({'products':len(rows), 'errors':errors, 'status':result['status']}, ensure_ascii=False))
    return 0 if rows else 1

if __name__ == '__main__': raise SystemExit(collect())
