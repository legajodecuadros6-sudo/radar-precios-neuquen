#!/usr/bin/env python3
"""
Scraper de Supermayorista Vital - Sucursal Neuquén Capital (Paimún 70 / Ruta 22)
Releva catálogos de ofertas periódicas y productos destacados.
"""

import urllib.request
import json
import re
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

VITAL_URL = 'https://www.vital.com.ar'

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

def scrape_vital_offers():
    req = urllib.request.Request(VITAL_URL, headers=HEADERS)
    products = []

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')

            # Extraer enlaces a catálogos o folletos de ofertas
            links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                if any(k in href.lower() for k in ['catalogo', 'oferta', 'revista', 'pdf', 'folleto']):
                    links.append({
                        'title': a.get_text(strip=True) or 'Catálogo Vital',
                        'link': href if href.startswith('http') else VITAL_URL + href
                    })

            # Extraer productos si hay vitrina de ofertas en home
            offer_cards = soup.select('.oferta, .producto-destacado, .item-promocion')
            for card in offer_cards:
                title = card.select_one('.titulo, h3, h4')
                price = card.select_one('.precio, .price')
                if title and price:
                    products.append({
                        'supermarket_id': 'vital',
                        'branch_name': 'Supermayorista Vital Neuquén (Paimún 70)',
                        'name': title.get_text(strip=True),
                        'current_price': clean_price(price.get_text(strip=True)),
                        'scraped_at': datetime.now().isoformat()
                    })

            return {
                'supermarket': 'vital',
                'branch': 'Paimún 70, Neuquén Capital',
                'catalogos_enlaces': links,
                'productos_detectados': products,
                'status': 'ok',
                'scraped_at': datetime.now().isoformat()
            }
    except Exception as e:
        return {
            'supermarket': 'vital',
            'branch': 'Paimún 70, Neuquén Capital',
            'error': str(e),
            'scraped_at': datetime.now().isoformat()
        }

def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Iniciando relevamiento de Supermayorista Vital Neuquén...")
    data = scrape_vital_offers()
    out = '/home/rodrigo/Escritorio/ANTIGRAVITY/radar-precios/scripts/scrapers/vital_scraped.json'
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Relevamiento Vital guardado en {out}")

if __name__ == '__main__':
    main()
