#!/usr/bin/env python3
"""
Scraper de Coto Digital - Neuquén Capital
Extrae productos, precios regulares, precios de oferta (2x1, 2do al 70%, Comunidad Coto)
y precios normalizados por unidad de medida.
"""

import urllib.request
import urllib.parse
import json
import re
import sys
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
}

SEARCH_QUERIES = [
    'aceite girasol',
    'leche entera',
    'yerba mate playadito',
    'arroz largo fino',
    'fideos matarazzo',
    'asado',
    'pollo entero',
    'queso cremoso',
    'dulce de leche',
    'harina 000',
    'coca cola',
    'cerveza heineken',
    'lavandina ayudin',
    'jabon liquido',
    'desinfectante lysoform'
]

def clean_price(text):
    if not text:
        return 0.0
    # Extrae dígitos y comas/puntos
    cleaned = re.sub(r'[^\d,.]', '', text).strip()
    # En Argentina: 1.250,50 -> 1250.50
    if ',' in cleaned and '.' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def scrape_coto_product(query):
    encoded = urllib.parse.quote(query)
    url = f"https://www.cotodigital3.com.ar/sitios/cdigi/browse?_dyncharset=utf-8&Dy=1&Ntt={encoded}"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')

            products = []
            items = soup.select('li.product_info_container, div.product_info_container, div.subcontent_left')

            for item in items[:3]:
                title_elem = item.select_one('div.descrip_full, span.descrip_full, div.nombre_producto')
                if not title_elem:
                    continue
                name = title_elem.get_text(strip=True)

                # Precio regular y de oferta
                regular_elem = item.select_one('.first_price, .price_regular, .precio_regular')
                promo_elem = item.select_one('.atg_store_newPrice, .price_discount, .precio_descuento')
                unit_elem = item.select_one('.unit, .precio_unitario, .unidad_medida')

                regular_price = clean_price(regular_elem.get_text(strip=True)) if regular_elem else 0.0
                promo_price = clean_price(promo_elem.get_text(strip=True)) if promo_elem else regular_price

                # Etiqueta de promo (ej. 2do al 70%, 3x2, Comunidad Coto)
                promo_tag_elem = item.select_one('.text_promo, .descuento_leyenda, .dto_label')
                promo_label = promo_tag_elem.get_text(strip=True) if promo_tag_elem else None

                current_price = promo_price if promo_price > 0 else regular_price
                if regular_price == 0:
                    regular_price = current_price

                products.append({
                    'supermarket_id': 'coto',
                    'branch_name': 'Coto Hipermercado Alto Comahue (Neuquén)',
                    'name': name,
                    'query': query,
                    'current_price': current_price,
                    'regular_price': regular_price,
                    'promo_label': promo_label,
                    'unit_text': unit_elem.get_text(strip=True) if unit_elem else '',
                    'url': url,
                    'scraped_at': datetime.now().isoformat()
                })

            return products
    except Exception as e:
        # En caso de limitación de conexión o bloqueo temporal, reporta el evento
        return [{
            'supermarket_id': 'coto',
            'branch_name': 'Coto Hipermercado Alto Comahue (Neuquén)',
            'name': f'Consulta {query.title()} (Coto Neuquén)',
            'query': query,
            'status': 'requiere_sesion_o_bypass',
            'error': str(e)
        }]

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando relevamiento de Coto Digital Neuquén...")
    all_results = []
    
    for q in SEARCH_QUERIES[:5]:
        print(f" -> Buscando: {q}...")
        res = scrape_coto_product(q)
        all_results.extend(res)

    output_path = '/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios/scripts/scrapers/coto_scraped.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Relevamiento finalizado. Guardado en {output_path}")

if __name__ == '__main__':
    main()
