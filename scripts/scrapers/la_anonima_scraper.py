#!/usr/bin/env python3
"""
Scraper de La Anónima Online - Sucursales Neuquén Capital
(Paseo de la Patagonia / Olascoaga y Fava)
"""

import urllib.request
import urllib.parse
import json
import re
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9',
}

SEARCH_QUERIES = [
    'aceite girasol',
    'leche entera',
    'yerba playadito',
    'arroz',
    'fideos matarazzo',
    'asado',
    'lavandina ayudin'
]

def clean_price(text):
    if not text:
        return 0.0
    cleaned = re.sub(r'[^\d,.]', '', text).strip()
    if ',' in cleaned and '.' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def scrape_la_anonima(query):
    encoded = urllib.parse.quote(query)
    url = f"https://supermercado.laanonimaonline.com/buscar?pag=1&texto={encoded}"
    req = urllib.request.Request(url, headers=HEADERS)

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')

            products = []
            items = soup.select('.item, .producto, div.bloque')

            for item in items[:4]:
                title_elem = item.select_one('.titulo, .nombre, h3, h4')
                price_elem = item.select_one('.precio, .precio-actual, .valor')
                prev_price_elem = item.select_one('.precio-anterior, .tachado')

                if not title_elem or not price_elem:
                    continue

                name = title_elem.get_text(strip=True)
                current_price = clean_price(price_elem.get_text(strip=True))
                regular_price = clean_price(prev_price_elem.get_text(strip=True)) if prev_price_elem else current_price

                products.append({
                    'supermarket_id': 'la_anonima',
                    'branch_name': 'La Anónima Paseo Patagonia (Neuquén)',
                    'name': name,
                    'query': query,
                    'current_price': current_price,
                    'regular_price': regular_price,
                    'discount_percentage': round(((regular_price - current_price)/regular_price)*100) if regular_price > current_price else 0,
                    'url': url,
                    'scraped_at': datetime.now().isoformat()
                })

            return products
    except Exception as e:
        return [{
            'supermarket_id': 'la_anonima',
            'branch_name': 'La Anónima Paseo Patagonia (Neuquén)',
            'name': f'Consulta {query.title()} (La Anónima)',
            'error': str(e)
        }]

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando relevamiento de La Anónima Online...")
    results = []
    for q in SEARCH_QUERIES[:4]:
        print(f" -> Buscando: {q}...")
        res = scrape_la_anonima(q)
        results.extend(res)

    out = '/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios/scripts/scrapers/la_anonima_scraped.json'
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Guardado en {out}")

if __name__ == '__main__':
    main()
