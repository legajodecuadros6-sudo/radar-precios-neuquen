#!/usr/bin/env python3
"""
Módulo VTEX Intelligent Search - Hiper ChangoMás Perticone (Neuquén Capital)
Consulta la API pública VTEX de MasOnline / ChangoMás para obtener precios,
códigos EAN-13, promociones y disponibilidad de stock.
"""

import urllib.request
import urllib.parse
import json
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'es-AR,es;q=0.9',
}

BASE_URL = 'https://www.masonline.com.ar/api/catalog_system/pub/products/search'

def search_vtex_changomas(query, max_items=5):
    """
    Busca un término o código de barras en el catálogo VTEX de ChangoMás.
    """
    encoded = urllib.parse.quote(query)
    url = f"{BASE_URL}/{encoded}?_from=0&_to={max_items - 1}"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = []
            
            for prod in data:
                product_name = prod.get('productName', '')
                brand = prod.get('brand', '')
                items = prod.get('items', [])
                
                for item in items:
                    ean = item.get('ean')
                    seller = item.get('sellers', [{}])[0]
                    offer = seller.get('commertialOffer', {})
                    
                    price = float(offer.get('Price', 0.0))
                    list_price = float(offer.get('ListPrice', price))
                    available_qty = int(offer.get('AvailableQuantity', 0))
                    
                    if price <= 0:
                        continue
                        
                    discount_pct = 0
                    if list_price > price:
                        discount_pct = round(((list_price - price) / list_price) * 100)
                        
                    images = item.get('images', [])
                    image_url = images[0].get('imageUrl') if images else None
                    
                    results.append({
                        'supermarket_id': 'changomas-perticone',
                        'supermarket_name': 'Hiper ChangoMás Perticone',
                        'brand': brand,
                        'name': product_name,
                        'ean': ean,
                        'regular_price': list_price,
                        'offer_price': price,
                        'discount_percentage': discount_pct,
                        'promo_condition': f'{discount_pct}% OFF Online' if discount_pct > 0 else None,
                        'in_stock': available_qty > 0,
                        'image_url': image_url,
                        'source': 'VTEX MasOnline API',
                        'updated_at': datetime.now().isoformat()
                    })
                    
            return results
    except Exception as e:
        return []

if __name__ == '__main__':
    print("Probando API VTEX ChangoMás...")
    prods = search_vtex_changomas('aceite natura 1.5')
    for p in prods:
        print(f" -> {p['name']} | EAN: {p['ean']} | Oferta: ${p['offer_price']} | Regular: ${p['regular_price']}")
