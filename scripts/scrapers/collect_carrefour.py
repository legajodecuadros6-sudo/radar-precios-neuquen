#!/usr/bin/env python3
"""
Módulo colector Carrefour Argentina - Regionalizado para Neuquén Capital (CP 8300).
Consulta la API pública VTEX de Carrefour y valida stock y precios regionales en Neuquén
mediante el endpoint oficial de simulación con código postal 8300.
"""

import json
import math
import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Accept-Language': 'es-AR,es;q=0.9',
}

SEARCH_URL = 'https://www.carrefour.com.ar/api/catalog_system/pub/products/search'
SIM_URL = 'https://www.carrefour.com.ar/api/checkout/pub/orderForms/simulation?RnbBehavior=0'

CARREFOUR_BRANCH = {
    'id': 'carrefour_centro',
    'supermarket_id': 'carrefour',
    'name': 'Carrefour Hipermercado Neuquén Centro',
    'brand_name': 'Carrefour',
    'type': 'minorista',
    'address': 'Av. Coronel Olascoaga 350',
    'city': 'Neuquén',
    'postal_code': '8300',
    'lat': -38.95876,
    'lng': -68.05837,
    'opening_hours': 'Lun a Dom 8:00 a 22:00 hs',
    'logo_color': '#004f9f',
    'badge_bg': 'bg-blue-50',
    'badge_text': 'Carrefour Centro',
    'has_ecommerce': True,
    'ecommerce_url': 'https://www.carrefour.com.ar',
}

DEFAULT_TERMS = [
    'aceite', 'leche', 'yerba', 'arroz', 'fideos', 'harina', 'azucar',
    'galletitas', 'cafe', 'yogur', 'queso', 'manteca', 'gaseosa', 'agua',
    'lavandina', 'detergente', 'jabon', 'papel higienico', 'pan', 'pollo',
    'lays', 'cerveza', 'vino', 'fernet', 'shampoo', 'dentifrico', 'atun',
    'mayonesa', 'pure de tomate', 'mermelada', 'te', 'cacao', 'dulce de leche'
]

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value).lower()) if unicodedata.category(c) != 'Mn')

def valid_ean(code):
    return (
        code.isdigit()
        and len(code) in (8, 12, 13, 14)
        and (sum(int(n) * (3 if i % 2 == 0 else 1) for i, n in enumerate(reversed(code[:-1]))) + int(code[-1])) % 10 == 0
    )

def positive(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise ValueError('Valor no positivo')
    return number

def category(name):
    norm = normalize(name).strip()
    if norm.startswith('cerveza') and re.search(r'sin alcohol|0[.,]0\s*%', norm):
        return 'Bebidas'
    groups = [
        ('Cuidado Personal', r'^(?:agua micelar|aceite para bebe|jabon (?:de tocador|liquido para manos)|shampoo|champu|acondicionador|crema (?:corporal|facial)|papel higienico|desodorante|dentifrico|pasta dental|cepillo de dientes)\b'),
        ('Limpieza', r'^(?:agua desmineralizada|lavandina|detergente|jabon (?:en polvo|para ropa)|limpiador|suavizante|desinfectante|papel (?:cocina|de cocina)|rollo de cocina)\b'),
        ('Lácteos y Frescos', r'^(?:leche|yogur|yogurt|queso|manteca|crema de leche|dulce de leche)\b'),
        ('Bebidas alcohólicas', r'^(?:cerveza|cerv |vino|fernet|aperitivo|vodka|whisky|ron |gin |sidra|espumante)\b'),
        ('Snacks', r'^(?:papas fritas|snack|nachos|mani)\b'),
        ('Bebidas', r'^(?:gaseosa|agua|jugo|cerveza|amargo)\b'),
        ('Carnicería', r'^(?:pollo (?:entero|fresco)|asado|carne|pechuga|pata muslo|muslo|suprema)\b'),
        ('Panadería', r'^(?:pan|panificado|tostadas)\b'),
    ]
    return next((cat for cat, pattern in groups if re.search(pattern, norm)), 'Almacén')

def carrefour_in_scope(product, name):
    norm = normalize(name)
    exclude_pattern = r'\b(espumador|cafetera|tostadora|pava electrica|licuadora|batidora|sarten|olla|cuchillo|tenedor|cuchara|colador|jarra|recipiente|hermetico|tupper|termo|mate|bombilla|balanza|taza|copa|vaso|organizador|almohada|toalla|sabana|acolchado|cortina|frazada|reloj|lampara|foco|cable|cargador|auricular|parlante|soporte|plancha|secarropas|lavarropas|heladera|microondas|freezer|anafe|cocina|horno|estufa|caloventor|ventilador|aire acondicionado|extractor|aspiradora|hidrolavadora|taladro|herramienta)\b'
    if re.search(exclude_pattern, norm):
        return False
    cats = [normalize(c) for c in product.get('categories', [])]
    for c in cats:
        if any(bad in c for bad in ('electro', 'tecno', 'bazar', 'hogar', 'ferreteria', 'jardin', 'automotor', 'juguete', 'colchone', 'libreria', 'indumentaria', 'textil')):
            return False
    return True

def parse_carrefour_record(product, sku, sim_item, branch, stamp):
    name = str(sku.get('name') or product.get('productName') or '').strip()
    if not name or not carrefour_in_scope(product, name):
        return None

    # Sim price check
    selling_price_cents = sim_item.get('sellingPrice')
    if selling_price_cents is None:
        return None
    try:
        current_price = positive(selling_price_cents) / 100.0
    except ValueError:
        return None

    regular_price_cents = sim_item.get('listPrice') or sim_item.get('price') or selling_price_cents
    try:
        regular_price = positive(regular_price_cents) / 100.0
    except ValueError:
        regular_price = current_price
    if regular_price < current_price:
        regular_price = current_price

    ean = str(sku.get('ean') or '').strip()
    ean_ok = valid_ean(ean)
    sku_id = str(sku.get('itemId') or '')
    pid = ('ean_' + ean) if ean_ok else ('carrefour_' + sku_id)

    # Unit & net content extraction
    norm = normalize(name)
    matches = list(re.finditer(r'(\d+(?:[.,]\d+)?)\s*(ltr?s?|l|ml|cc|cm3|kg|gr|grs|g)\b', norm))
    unit, quantity, content = 'unidad', 1.0, 'Unidad / presentación indicada'
    is_pack = bool(re.search(r'\b(pack|combo|kit)\b|\b\d+\s*[xu]\b', norm))
    if len(matches) == 1 and not is_pack:
        amount, raw = matches[0].groups()
        amount = positive(amount.replace(',', '.'))
        is_weight = raw in ('kg', 'gr', 'grs', 'g')
        unit = 'kg' if is_weight else 'litro'
        quantity = amount / 1000.0 if raw in ('gr', 'grs', 'g', 'ml', 'cc', 'cm3') else amount
        content = matches[0].group()
    if is_pack:
        return None

    brand = str(product.get('brand') or '').strip() or 'Carrefour'
    images = sku.get('images', [])
    image_url = images[0].get('imageUrl', '') if images else ''

    prod_data = {
        'id': pid,
        'name': name.capitalize(),
        'brand': brand,
        'category': category(name),
        'image_url': image_url,
        'unit_measure': unit,
        'net_content_number': quantity,
        'net_content_str': content,
    }
    if ean_ok:
        prod_data['ean'] = ean

    source_url = str(product.get('link') or 'https://www.carrefour.com.ar')
    notes = 'Precio verificado para Neuquén Capital (CP 8300). Sucursales Neuquén Centro (Olascoaga 350) y Antártida (Antártida Arg. 3600).'
    if regular_price > current_price:
        disc_pct = round(((regular_price - current_price) / regular_price) * 100)
        notes += f' Publica {disc_pct}% de descuento sobre precio regular (${regular_price:g}).'

    obs = {
        'id': pid + '@' + branch['id'] + '@online',
        'product_id': pid,
        'supermarket_id': 'carrefour',
        'branch_id': branch['id'],
        'branch_name': branch['name'],
        'branch_address': branch['address'],
        'regular_price': regular_price,
        'current_price': current_price,
        'price_per_unit': round(current_price / quantity, 2),
        'unit_label': {'kg': '$ / kg', 'litro': '$ / L', 'unidad': '$ / u'}[unit],
        'query_date': stamp,
        'is_verified': True,
        'is_demo': False,
        'source_url': source_url,
        'source_name': 'Carrefour Argentina · tienda online Neuquén',
        'channel': 'online',
        'min_quantity': 1,
        'notes': notes,
        'source_sku': sku_id,
        'source_seller': '1',
    }
    if regular_price > current_price:
        obs['discount_percentage'] = round(((regular_price - current_price) / regular_price) * 100)
        obs['promo_label'] = 'Oferta Carrefour'

    return prod_data, obs

def collect_carrefour(stamp=None, terms=None, items_per_term=25):
    if stamp is None:
        stamp = datetime.now(timezone.utc).isoformat()
    branch = CARREFOUR_BRANCH
    target_terms = terms or DEFAULT_TERMS
    candidates = {}
    errors = []

    print(f'Carrefour Neuquén: buscando {len(target_terms)} términos...', file=sys.stderr, flush=True)
    for term in target_terms:
        try:
            url = f"{SEARCH_URL}?ft={quote(term)}&_from=0&_to={items_per_term - 1}"
            req = Request(url, headers=HEADERS)
            with urlopen(req, timeout=12) as res:
                items_page = json.loads(res.read().decode('utf-8'))
            if not isinstance(items_page, list):
                continue
            for prod in items_page:
                for sku in prod.get('items', []):
                    sku_id = str(sku.get('itemId') or '')
                    if sku_id:
                        candidates[sku_id] = (prod, sku)
        except Exception as error:
            errors.append(f"Término '{term}': {type(error).__name__}: {error}")
        time.sleep(0.12)

    print(f'Carrefour Neuquén: {len(candidates)} SKUs candidatos. Cotizando para CP 8300...', file=sys.stderr, flush=True)

    products = {}
    observations = {}
    sku_ids = list(candidates.keys())
    batch_size = 35

    for i in range(0, len(sku_ids), batch_size):
        batch = sku_ids[i:i + batch_size]
        sim_items = [{'id': s, 'quantity': 1, 'seller': '1'} for s in batch]
        sim_payload = {'items': sim_items, 'postalCode': '8300', 'country': 'ARG'}
        try:
            req_sim = Request(
                SIM_URL,
                data=json.dumps(sim_payload).encode('utf-8'),
                headers=HEADERS
            )
            with urlopen(req_sim, timeout=18) as res_sim:
                sim_data = json.loads(res_sim.read().decode('utf-8'))
            for sim_it in sim_data.get('items', []):
                s_id = str(sim_it.get('id') or '')
                if s_id not in candidates:
                    continue
                if sim_it.get('availability') != 'available':
                    continue
                prod, sku = candidates[s_id]
                rec = parse_carrefour_record(prod, sku, sim_it, branch, stamp)
                if rec:
                    p, o = rec
                    products[p['id']] = p
                    observations[o['id']] = o
        except Exception as error:
            errors.append(f"Lote {i}-{i+batch_size}: {type(error).__name__}: {error}")
        time.sleep(0.15)

    print(f'Carrefour Neuquén: {len(observations)} cotizaciones verificadas para Neuquén Capital.', file=sys.stderr, flush=True)
    if not observations:
        raise ValueError('No se obtuvieron cotizaciones válidas para Carrefour Neuquén (CP 8300)')

    return list(products.values()), list(observations.values()), branch, errors

if __name__ == '__main__':
    now = datetime.now(timezone.utc).isoformat()
    prods, obs, b, errs = collect_carrefour(now, items_per_term=10)
    print(f"Resultado: {len(prods)} productos, {len(obs)} cotizaciones, {len(errs)} advertencias")
    for o in obs[:5]:
        print(f" - {o['id']}: ${o['current_price']} (Reg: ${o['regular_price']}) {o.get('promo_label', '')}")
