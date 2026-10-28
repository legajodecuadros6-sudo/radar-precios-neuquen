#!/usr/bin/env python3
"""
Módulo API Oficial Cooperativa Obrera - Sucursales Neuquén Capital
(Sucursal 110 Centro, 113 Chocón, 118 Belgrano, 124 Sucursal del Oeste / Dr. Luis Ramón 3952)
Consulta la API REST pública de La Coope en Casa para relevar precios vigentes y ofertas de asociados.
"""

import urllib.request
import urllib.parse
import json
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9',
}

API_BASE_URL = 'https://api.lacoopeencasa.coop/api/buscar/articulos'
LOCAL_ID_NEUQUEN = 124  # Sucursal Neuquén Capital

def search_cooperativa_obrera(query, max_items=5):
    """
    Busca artículos en la tienda online de Cooperativa Obrera para Neuquén.
    """
    params = urllib.parse.urlencode({
        'q': query,
        'offset': 0,
        'pedido': 0,
        'id_local': LOCAL_ID_NEUQUEN
    })
    url = f"{API_BASE_URL}?{params}"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('estado') != 1:
                return []
                
            articulos = data.get('datos', [])
            results = []
            
            for art in articulos[:max_items]:
                name = art.get('descripcion', '').strip().title()
                brand = art.get('marca_desc', '').strip().title()
                
                try:
                    price = float(art.get('precio', 0.0))
                except (ValueError, TypeError):
                    price = 0.0
                    
                try:
                    prev_price = float(art.get('precio_anterior', price))
                except (ValueError, TypeError):
                    prev_price = price
                    
                promo_price_val = art.get('precio_promo')
                promo_price = float(promo_price_val) if promo_price_val else None
                
                current_price = promo_price if promo_price and promo_price > 0 else price
                regular_price = prev_price if prev_price and prev_price > 0 else current_price
                
                discount_pct = 0
                if regular_price > current_price:
                    discount_pct = round(((regular_price - current_price) / regular_price) * 100)
                    
                results.append({
                    'supermarket_id': 'cooperativa-san-martin',
                    'supermarket_name': 'Cooperativa Obrera Neuquén',
                    'cod_interno': art.get('cod_interno'),
                    'name': name,
                    'brand': brand,
                    'regular_price': regular_price,
                    'offer_price': current_price,
                    'discount_percentage': discount_pct,
                    'promo_condition': 'Precio Asociado Mi Coope' if discount_pct > 0 else None,
                    'image_url': art.get('imagen'),
                    'source': 'API La Coope en Casa',
                    'updated_at': datetime.now().isoformat()
                })
                
            return results
    except Exception as e:
        return []

if __name__ == '__main__':
    print("Probando API Cooperativa Obrera Neuquén...")
    articulos = search_cooperativa_obrera('yerba playadito')
    for a in articulos:
        print(f" -> {a['name']} ({a['brand']}) | Oferta: ${a['offer_price']} | Regular: ${a['regular_price']}")
