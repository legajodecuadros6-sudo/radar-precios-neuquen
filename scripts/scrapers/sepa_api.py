#!/usr/bin/env python3
"""
Módulo Oficial SEPA CloudFront API (El motor de Superprecio para Argentina)
Consulta los precios legales diarios informados por las sucursales físicas de Neuquén Capital.
"""

import urllib.request
import urllib.parse
import json
import ssl
from datetime import datetime

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-AR,es;q=0.9',
}

SEPA_BASE_URL = 'https://d3e6htiiul5ek9.cloudfront.net/prod/producto'
LAT_NEUQUEN = -38.9515
LNG_NEUQUEN = -68.0612

# Mapeo de cadenas SEPA a IDs de supermercados del Radar
MAPA_SUPERMERCADOS = {
    'coto': 'coto_alto_comahue',
    'la anonima': 'la_anonima_rioja',
    'hiperchangomas': 'changomas_perticone',
    'changomas': 'changomas_perticone',
    'cooperativa obrera': 'cooperativa_chocon',
    'vea': 'vea_lainez'
}

def query_sepa_product(ean_code):
    """
    Consulta un código EAN-13 en la API de SEPA georreferenciada en Neuquén Capital.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    params = urllib.parse.urlencode({
        'id_producto': str(ean_code),
        'lat': str(LAT_NEUQUEN),
        'lng': str(LNG_NEUQUEN)
    })
    url = f"{SEPA_BASE_URL}?{params}"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('status') != 200:
                return None
                
            producto = data.get('producto', {})
            sucursales_raw = data.get('sucursales', [])
            
            sucursales_procesadas = []
            for suc in sucursales_raw:
                bandera = (suc.get('banderaDescripcion') or '').strip()
                bandera_lower = bandera.lower()
                sucursal_nombre = (suc.get('sucursalNombre') or '').strip()
                direccion = (suc.get('direccion') or '').strip()
                
                # Precios
                precios_dict = suc.get('preciosProducto') or {}
                precio_lista = precios_dict.get('precioLista')
                
                if not precio_lista:
                    continue
                    
                try:
                    regular_price = float(precio_lista)
                except (ValueError, TypeError):
                    continue
                    
                if regular_price <= 0:
                    continue
                    
                # Promociones si existen en promo1 o promo2
                promo1 = precios_dict.get('promo1', {})
                promo_desc = promo1.get('descripcion') or None
                promo_price_val = promo1.get('precio') or None
                
                offer_price = regular_price
                if promo_price_val:
                    try:
                        promo_f = float(promo_price_val)
                        if 0 < promo_f < regular_price:
                            offer_price = promo_f
                    except (ValueError, TypeError):
                        pass
                        
                discount_pct = 0
                if regular_price > offer_price:
                    discount_pct = round(((regular_price - offer_price) / regular_price) * 100)
                    
                # Resolver supermarket_id normalizado
                super_id = 'coto_alto_comahue'
                for k, v in MAPA_SUPERMERCADOS.items():
                    if k in bandera_lower:
                        super_id = v
                        break
                        
                sucursales_procesadas.append({
                    'supermarket_id': super_id,
                    'chain_name': bandera,
                    'branch_name': sucursal_nombre,
                    'address': direccion,
                    'regular_price': regular_price,
                    'offer_price': offer_price,
                    'discount_percentage': discount_pct,
                    'promo_condition': promo_desc,
                    'actualizado_hoy': suc.get('actualizadoHoy', True)
                })
                
            return {
                'ean': producto.get('id'),
                'name': producto.get('nombre'),
                'brand': producto.get('marca'),
                'net_content': producto.get('presentacion'),
                'sucursales': sucursales_procesadas,
                'source': 'SEPA CloudFront Argentina',
                'queried_at': datetime.now().isoformat()
            }
    except Exception as e:
        return None

if __name__ == '__main__':
    print("Probando motor SEPA Superprecio para Neuquén...")
    res = query_sepa_product('7790272001029')
    if res:
        print(f"Producto: {res['name']} ({res['brand']})")
        for s in res['sucursales']:
            print(f" -> {s['chain_name']} ({s['branch_name']}): ${s['offer_price']}")
