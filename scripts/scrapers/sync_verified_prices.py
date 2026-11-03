#!/usr/bin/env python3
"""Importación trazable; conserva datos anteriores e historial incluso si falla la fuente."""
import argparse
import csv
import html
import json
import math
import os
import re
import sys
from pathlib import Path
import tempfile
import time
import unicodedata
from html.parser import HTMLParser
from urllib.parse import urlencode, urlparse, quote
from urllib.request import Request, urlopen
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / 'src/data/live-prices.json'
HISTORY = ROOT / 'src/data/price-history.json'
CHAINS = ['coto','la_anonima','changomas','vea','cooperativa_obrera','yaguar','vital','diarco','makro']
API = 'https://api.lacoopeencasa.coop/api/'
TERMS = ['aceite','leche','yerba','arroz','fideos','harina','azucar','galletitas','cafe','yogur','queso','manteca','gaseosa','agua','lavandina','detergente','jabon','papel','pan','pollo','lays','manaos pomelo','cerveza','vino','fernet']

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value).lower()) if unicodedata.category(c) != 'Mn')

def request_json(url, payload=None):
    with urlopen(Request(url, data=json.dumps(payload).encode() if payload is not None else None, headers={'Accept':'application/json','Content-Type':'application/json','User-Agent':'RadarPreciosNeuquen/1.1'}), timeout=20) as response:
        return json.load(response)

def read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default

def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', dir=path.parent, delete=False, encoding='utf8') as out:
        json.dump(value, out, ensure_ascii=False, indent=2, allow_nan=False)
        out.write('\n')
        temp = out.name
    os.replace(temp, path)

def positive(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0: raise ValueError('Valor no positivo')
    return number

def valid_ean(code):
    return code.isdigit() and len(code) in (8,12,13,14) and (sum(int(n)*(3 if i%2==0 else 1) for i,n in enumerate(reversed(code[:-1])))+int(code[-1]))%10==0

def category(name):
    name = normalize(name).strip()
    if name.startswith('cerveza') and re.search(r'sin alcohol|0[.,]0\s*%', name): return 'Bebidas'
    # Classify the product itself, not an ingredient/flavour mentioned later.
    groups = [
        ('Cuidado Personal', r'^(?:agua micelar|aceite para bebe|jabon (?:de tocador|liquido para manos)|shampoo|champu|acondicionador|crema (?:corporal|facial)|papel higienico|desodorante corporal)\b'),
        ('Limpieza', r'^(?:agua desmineralizada|lavandina|detergente|jabon (?:en polvo|para ropa)|limpiador|suavizante|desinfectante|papel (?:cocina|de cocina)|rollo de cocina)\b'),
        ('Lácteos y Frescos', r'^(?:leche|yogur|yogurt|queso|manteca|crema de leche|dulce de leche)\b'),
        ('Bebidas alcohólicas', r'^(?:cerveza|cerv |vino|fernet|aperitivo|vodka|whisky|ron |gin |sidra|espumante)\b'),
        ('Snacks', r'^(?:papas fritas|snack)\b'),
        ('Bebidas', r'^(?:gaseosa|agua|jugo|cerveza)\b'),
        ('Carnicería', r'^(?:pollo (?:entero|fresco)|asado|carne|pechuga|pata muslo|muslo|suprema)\b'),
        ('Panadería', r'^(?:pan|panificado)\b'),
    ]
    return next((cat for cat, pattern in groups if re.search(pattern,name)), 'Almacén')


def coope_record(article, branch, stamp):
    code, name = str(article.get('cod_interno') or '').strip(), str(article.get('descripcion') or '').strip()
    if not code or not name or str(article.get('estado')) != '1': return None
    price = positive(article.get('precio'))
    raw_unit = normalize(article.get('unimed_desc',''))
    try: amount = positive(article.get('gramaje'))
    except (ValueError,TypeError): amount = 1
    if raw_unit in ('g','gr','grs','gramos'): unit,quantity,label = 'kg',amount/1000,'$ / kg'
    elif raw_unit in ('cm3','cc','ml'): unit,quantity,label = 'litro',amount/1000,'$ / L'
    elif raw_unit in ('kg','kgr','kgs'): unit,quantity,label = 'kg',amount,'$ / kg'
    elif raw_unit in ('l','lt','lts','litro','litros'): unit,quantity,label = 'litro',amount,'$ / L'
    else: unit,quantity,label = 'unidad',1,'$ / u'
    pid = 'coope_'+code
    url = API+'buscar/articulos?'+urlencode({'q':name,'offset':0,'pedido':0,'id_local':124})
    product = {'id':pid,'name':name.capitalize(),'brand':str(article.get('marca_desc') or 'Sin marca'),'category':category(name),'image_url':article.get('imagen') or '', 'unit_measure':unit,'net_content_number':quantity,'net_content_str':f'{amount:g} {raw_unit}' if raw_unit else 'Unidad'}
    # cod_interno no es EAN. Nunca unir productos por semejanza del nombre.
    if article.get('ean') and valid_ean(str(article['ean'])): product['ean'] = str(article['ean'])
    observation = {'id':pid+'@cooperativa_124@online','product_id':pid,'supermarket_id':'cooperativa_obrera','branch_id':'cooperativa_124','branch_name':'Cooperativa Obrera · '+branch['descripcion'],'branch_address':branch['direccion'],'regular_price':price,'current_price':price,'price_per_unit':round(price/quantity,2),'unit_label':label,'query_date':stamp,'is_verified':True,'is_demo':False,'source_url':url,'source_name':'La Coope en Casa · local 124','channel':'online','min_quantity':1,'notes':'Precio base de la tienda online. Promociones y disponibilidad deben confirmarse en la tienda.'}
    return product, observation

def collect_coope(stamp, max_pages=3, terms=None):
    response = request_json(API+'locales')
    branch = next((b for b in response.get('datos',[]) if str(b.get('id_local'))=='124'),None)
    if not branch or normalize(branch.get('localidad_desc'))!='neuquen' or str(branch.get('cod_postal'))!='8300':
        raise ValueError('No se confirmó la sucursal 124 en Neuquén Capital')
    products, observations, errors = {}, {}, []
    for term in terms or TERMS:
        offset, seen = 0, set()
        for _ in range(max_pages):
            try:
                data = request_json(API+'buscar/articulos?'+urlencode({'q':term,'offset':offset,'pedido':0,'id_local':124}))
                if data.get('estado') == 2 and data.get('datos') == []: break
                if data.get('estado')!=1 or not isinstance(data.get('datos'),list): raise ValueError('Respuesta inválida')
                articles = data['datos']
                new_codes = {str(a.get('cod_interno')) for a in articles}-seen
                if not articles or not new_codes: break
                seen.update(new_codes)
                for article in articles:
                    try: record = coope_record(article,branch,stamp)
                    except (ValueError,TypeError): continue
                    if record:
                        product,observation = record
                        products[product['id']],observations[observation['id']] = product,observation
                offset += len(articles)
                time.sleep(0.25)
            except Exception as error:
                errors.append(f'{term}: {type(error).__name__}: {error}')
                break
    if not observations: raise ValueError('Sin precios válidos; se conserva la última lectura')
    coords = branch['datos']['coordenadas']
    verified_branch = {'id':'cooperativa_124','supermarket_id':'cooperativa_obrera','name':'Cooperativa Obrera · Sucursal del Oeste','brand_name':'Cooperativa Obrera','type':'cooperativa','address':branch['direccion'],'city':'Neuquén','postal_code':'8300','lat':float(coords['latitud']),'lng':float(coords['longitud']),'opening_hours':'Consultar en la tienda','logo_color':'#ea580c','badge_bg':'bg-orange-50','badge_text':'La Coope','has_ecommerce':True,'ecommerce_url':'https://www.lacoopeencasa.coop/'}
    return list(products.values()),list(observations.values()),verified_branch,errors


MAS = 'https://www.masonline.com.ar'
MAS_SELLER = 'masonlineprod0023'
MAS_PICKUP = MAS_SELLER+'_WM-3608'

def mas_branch():
    data = request_json(MAS+'/api/checkout/pub/pickup-points?postalCode=8300&countryCode=ARG')
    point = next((x['pickupPoint'] for x in data.get('items',[]) if x.get('pickupPoint',{}).get('id')==MAS_PICKUP),None)
    if not point or not point.get('isActive'): raise ValueError('Sucursal ChangoMás 3608 no confirmada')
    a = point['address']
    if normalize(a.get('city'))!='neuquen' or a.get('postalCode')!='8300' or a.get('country')!='ARG':
        raise ValueError('Sucursal ChangoMás fuera de Neuquén')
    return {'id':'changomas_3608','supermarket_id':'changomas','name':'HIPERChangoMás Neuquén · Perticone','brand_name':'ChangoMás','type':'minorista','address':a['street']+' '+a['number'],'city':'Neuquén','postal_code':'8300','lat':float(a['geoCoordinates'][1]),'lng':float(a['geoCoordinates'][0]),'opening_hours':'Consultar en la tienda','logo_color':'#e11d48','badge_bg':'bg-rose-50','badge_text':'ChangoMás','has_ecommerce':True,'ecommerce_url':MAS}

def mas_in_scope(name):
    return not re.search(r'^(?:rociador|aceite (?:multiuso|totalenergies)|batidor|cuchara|filtro|copa|organizador|cinta adhesiva|luma papel)',normalize(name))

def mas_record(product, sku, response, branch, stamp):
    # The catalogue's default seller is national. Only use a local simulation.
    ean = str(sku.get('ean') or '')
    if not valid_ean(ean) or sku.get('isKit') or sku.get('measurementUnit')!='un' or sku.get('unitMultiplier')!=1:
        return None
    rows = response.get('items',[])
    if len(rows)!=1: return None
    row = rows[0]
    if str(row.get('id'))!=str(sku['itemId']) or row.get('seller')!=MAS_SELLER or row.get('quantity')!=1 or row.get('availability')!='available': return None
    if row.get('tax',0)!=0 or row.get('priceTags') or row.get('sellingPrice')!=row.get('price'): return None
    local = any(d.get('warehouseId')=='Inv-Full-3608' and d.get('dockId')=='Muelle-Full-3608' for info in response.get('logisticsInfo',[]) if info.get('itemIndex')==0 for sla in info.get('slas',[]) for d in sla.get('deliveryIds',[]))
    if not local: return None
    price = positive(row.get('sellingPrice'))/100
    name = sku.get('name') or product['productName']
    if not mas_in_scope(name): return None
    # Only normalize unambiguous single-pack sizes; other packs remain per unit.
    matches = list(re.finditer(r'(\d+(?:[.,]\d+)?)\s*(kg|grs?|g|ml|cc|cm3|lts?|l)\b',normalize(name)))
    unit,quantity,content = 'unidad',1,'Unidad / presentación indicada'
    if len(matches)==1 and not re.search(r'\b(pack|combo|kit)\b|\b\d+\s*[xu]\b',normalize(name)):
        amount,raw = matches[0].groups(); amount=positive(amount.replace(',','.'))
        unit = 'kg' if raw in ('kg','gr','grs','g') else 'litro'
        quantity = amount/1000 if raw in ('gr','grs','g','ml','cc','cm3') else amount
        content = matches[0].group()
    pid='ean_'+ean
    images=sku.get('images',[])
    p={'id':pid,'ean':ean,'name':name,'brand':product.get('brand') or 'Sin marca','category':category(name),'image_url':images[0].get('imageUrl','') if images else '', 'unit_measure':unit,'net_content_number':quantity,'net_content_str':content}
    source=product.get('link','')
    if urlparse(source).hostname!='www.masonline.com.ar': return None
    o={'id':pid+'@changomas_3608@online','product_id':pid,'supermarket_id':'changomas','branch_id':branch['id'],'branch_name':branch['name'],'branch_address':branch['address'],'regular_price':price,'current_price':price,'price_per_unit':round(price/quantity,2),'unit_label':{'kg':'$ / kg','litro':'$ / L','unidad':'$ / u'}[unit],'query_date':stamp,'is_verified':True,'is_demo':False,'source_url':source,'source_name':'MâsOnline · cotización Neuquén 3608','channel':'online','min_quantity':1,'notes':'Precio de una unidad cotizado sin identificación de cliente, para CP 8300. Despacho desde sucursal 3608. No incluye envío; confirmar mínimo de compra y disponibilidad en la tienda.','source_sku':str(sku['itemId']),'source_seller':MAS_SELLER}
    return p,o

def collect_mas(stamp, terms=None):
    branch=mas_branch(); candidates={}; errors=[]
    for term in terms or TERMS+['aceite natura']:
        try:
            rows=request_json(MAS+'/api/catalog_system/pub/products/search?'+urlencode({'ft':term,'_from':0,'_to':9},quote_via=quote))
            for product in rows:
                for sku in product.get('items',[]):
                    if valid_ean(str(sku.get('ean') or '')): candidates[str(sku['itemId'])]=(product,sku)
        except Exception as error: errors.append(f'{term}: {type(error).__name__}: {error}')
        time.sleep(.2)
    products,observations={},{}
    print(f'ChangoMás: {len(candidates)} SKU candidatos; cotizando en Neuquén.', file=sys.stderr, flush=True)
    for index,(product,sku) in enumerate(candidates.values(),1):
        try:
            # One item per quote: multi-buy/cart discounts cannot contaminate unit prices.
            response=request_json(MAS+'/api/checkout/pub/orderForms/simulation',{'items':[{'id':str(sku['itemId']),'quantity':1,'seller':MAS_SELLER}],'country':'ARG','postalCode':'8300'})
            record=mas_record(product,sku,response,branch,stamp)
            if record:
                p,o=record;products[p['id']]=p;observations[o['id']]=o
        except Exception as error: errors.append(f"SKU {sku['itemId']}: {type(error).__name__}: {error}")
        if index % 25 == 0: print(f'ChangoMás: {index}/{len(candidates)} cotizados, {len(observations)} precios válidos.', file=sys.stderr, flush=True)
        time.sleep(.15)
    if not observations: raise ValueError('Sin cotizaciones locales válidas de ChangoMás; se conserva la última lectura')
    return list(products.values()),list(observations.values()),branch,errors


MAKRO_URL = 'https://makro.com.ar/canastabasicaneuquen/'
MONTHS = {name:index for index,name in enumerate('enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(),1)}

def plain_html(value):
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ',value)).split())

def parse_makro(page, stamp):
    text=normalize(plain_html(page))
    if 'iva incluido para la sucursal de neuquen' not in text:
        raise ValueError('Makro: no se confirmó sucursal Neuquén e IVA incluido')
    date_element=re.search(r'<p[^>]*class=["\'][^"\']*mlp-lista-precios__fecha[^"\']*["\'][^>]*>(.*?)</p>',page,re.S)
    date_match=re.search(r'(\d{1,2}) de (\w+) de (\d{4}),\s*(\d{2}):(\d{2})',normalize(plain_html(date_element.group(1)))) if date_element else None
    if not date_match: raise ValueError('Makro: fecha de publicación ausente')
    day,month,year,hour,minute=date_match.groups()
    published=datetime(int(year),MONTHS[month],int(day),int(hour),int(minute),tzinfo=timezone(timedelta(hours=-3)))
    now=datetime.fromisoformat(stamp)
    if published>now or now-published>timedelta(hours=72): raise ValueError('Makro: lista futura o de más de 72 horas')
    table=re.search(r'<table[^>]*class=["\'][^"\']*mlp-lista-precios__table["\'][^>]*>(.*?)</table>',page,re.S)
    if not table: raise ValueError('Makro: tabla ausente')
    headers=[normalize(plain_html(v)) for v in re.findall(r'<th\b[^>]*>(.*?)</th>',table.group(1),re.S)]
    if headers!=['codigo','producto','precio regular','precio sin impuestos nacionales']:
        raise ValueError('Makro: cambió el orden de columnas; no se importan precios')
    products,observations=[],[]
    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>',table.group(1),re.S):
        cells=[plain_html(v) for v in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S)]
        if not cells: continue
        if len(cells)!=4: raise ValueError('Makro: fila incompleta')
        code,name,regular,_=cells
        if not code.isdigit() or not name: raise ValueError('Makro: producto sin identidad')
        # Unspecified weighed cuts and ambiguous multipacks are not unit prices.
        size=re.search(r'(?:x|\b)(\d+(?:[.,]\d+)?)\s*(kg|grs|gr|g|ml|cc|l)\.?$',normalize(name))
        if not size or re.search(r'\d+\s*(?:s|u|un)\s*x',normalize(name)): continue
        if not re.fullmatch(r'\$\s*[0-9.]+,\d{2}',regular): raise ValueError('Makro: importe no reconocido')
        price=positive(regular.replace('$','').replace('.','').replace(',','.').strip())
        amount,raw=size.groups();amount=positive(amount.replace(',','.'))
        unit='kg' if raw in ('kg','g','gr','grs') else 'litro'
        quantity=amount/1000 if raw in ('g','gr','grs','ml','cc') else amount
        pid='makro_'+code
        cat=category(name)
        if normalize(name).startswith(('gaseo ','soda ')): cat='Bebidas'
        product={'id':pid,'name':name,'brand':'Según descripción','category':cat,'image_url':'','unit_measure':unit,'net_content_number':quantity,'net_content_str':f'{amount:g} {raw}'}
        observation={'id':pid+'@makro_neuquen@store','product_id':pid,'supermarket_id':'makro','branch_id':'makro_neuquen','branch_name':'Makro Mayorista Neuquén','branch_address':'Teodoro Planas 4141, esquina El Cholar','regular_price':price,'current_price':price,'price_per_unit':round(price/quantity,2),'unit_label':'$ / kg' if unit=='kg' else '$ / L','query_date':published.isoformat(),'retrieved_at':stamp,'is_verified':True,'is_demo':False,'source_url':MAKRO_URL,'source_name':'Makro · lista diaria Neuquén','channel':'store','min_quantity':1,'notes':'Precio regular con IVA incluido. Fecha del relevamiento publicado por Makro; consultar stock y condiciones en la sucursal. El código interno no es un EAN.'}
        products.append(product);observations.append(observation)
    if not observations: raise ValueError('Makro: sin presentaciones unitarias comprobables')
    return products,observations,None,[]

def collect_makro(stamp):
    with urlopen(Request(MAKRO_URL,headers={'User-Agent':'RadarPreciosNeuquen/1.1'}),timeout=25) as response:
        page=response.read().decode('utf-8')
    return parse_makro(page,stamp)


VITAL_URL='https://tiendaonline.vital.com.ar'

def vital_catalog(page):
    match=re.search(r'<template data-type="json" data-varname="__STATE__">\s*<script>(.*?)</script>',page,re.S)
    if not match: raise ValueError('Vital: catálogo público no encontrado')
    state=json.loads(match.group(1)); products=[]
    for value in state.values():
        if not isinstance(value,dict) or value.get('__typename')!='Product': continue
        for reference in value.get('items',value.get('items({"filter":"ALL_AVAILABLE"})',[])):
            sku=state.get(reference.get('id'),{})
            if sku.get('__typename')!='SKU' or not valid_ean(str(sku.get('ean') or '')): continue
            images=[state.get(r.get('id'),{}) for r in sku.get('images',[])]
            products.append((value,{**sku,'images':images}))
    if not products: raise ValueError('Vital: sin SKU identificados')
    return products

def vital_record(product,sku,response,stamp):
    rows=response.get('items',[])
    if len(rows)!=1: return None
    row=rows[0]
    if row.get('seller')!='arvitalne' or str(row.get('id'))!=str(sku['itemId']) or row.get('quantity')!=1 or row.get('availability')!='available': return None
    if str(row.get('measurementUnit','')).lower()!='un' or row.get('tax',0)!=0 or row.get('priceTags'): return None
    multiple=positive(row.get('unitMultiplier'))
    if not multiple.is_integer() or multiple!=sku.get('unitMultiplier'): return None
    price=positive(row.get('price'))
    if abs(positive(row.get('sellingPrice'))-price*multiple)>.5: return None
    if row.get('priceDefinition',{}).get('pricePerUnit')!=price: return None
    addresses=[sla.get('pickupStoreInfo',{}).get('address') or {} for info in response.get('logisticsInfo',[]) if info.get('itemIndex')==0 for sla in info.get('slas',[]) if sla.get('deliveryChannel')=='pickup-in-point']
    local=next((a for a in addresses if normalize(a.get('city'))=='neuquen' and a.get('postalCode')=='8300' and a.get('country')=='ARG'),None)
    if not local: return None
    name=sku['name'];ean=str(sku.get('ean') or '')
    if re.search(r'\d+\s*/\s*\d+',name): return None
    if not valid_ean(ean) or not mas_in_scope(name): return None
    size=re.search(r'(\d+(?:[.,]\d+)?)\s*(kg|grs?|g|ml|cc|lts?|l)\b',normalize(name))
    unit,quantity,content='unidad',1,'Unidad / presentación indicada'
    if size:
        amount,raw=size.groups();amount=positive(amount.replace(',','.'))
        unit='kg' if raw in ('kg','g','gr','grs') else 'litro'
        quantity=amount/1000 if raw in ('g','gr','grs','ml','cc') else amount
        content=size.group()
        pack=re.search(r'(\d+)\s*u\s+\d',normalize(name))
        if pack:
            quantity*=int(pack.group(1));content=f'{quantity:g} {unit} (pack)'
    pid='ean_'+ean;price/=100
    link=product.get('linkText','')
    if not link or '/' in link or '?' in link: return None
    images=sku.get('images',[])
    p={'id':pid,'ean':ean,'name':name,'brand':product.get('brand') or 'Según descripción','category':category(name),'image_url':images[0].get('imageUrl','') if images else '', 'unit_measure':unit,'net_content_number':quantity,'net_content_str':content}
    o={'id':pid+'@vital_neuquen@online','product_id':pid,'supermarket_id':'vital','branch_id':'vital_neuquen','branch_name':'Vital Neuquén','branch_address':'Ruta Nacional 22 Km 1218','regular_price':price,'current_price':price,'price_per_unit':round(price/quantity,2),'unit_label':{'kg':'$ / kg','litro':'$ / L','unidad':'$ / u'}[unit],'query_date':stamp,'is_verified':True,'is_demo':False,'source_url':VITAL_URL+'/'+link+'/p','source_name':'Vital · cotización de retiro Neuquén','channel':'online','min_quantity':int(multiple),'quantity_multiple':int(multiple),'notes':f'Precio por unidad. Compra por bulto de {int(multiple)} unidades: ${price*multiple:.2f}. Cotización sin cliente identificado, retiro en Neuquén. Confirmar stock y condiciones en la tienda.','source_sku':str(sku['itemId']),'source_seller':'arvitalne'}
    return p,o

def collect_vital(stamp):
    regions=request_json(VITAL_URL+'/api/checkout/pub/regions?country=ARG&postalCode=8300&sc=1')
    if not any(s.get('id')=='arvitalne' for region in regions for s in region.get('sellers',[])):
        raise ValueError('Vital: no se confirmó vendedor de Neuquén')
    with urlopen(Request(VITAL_URL+'/',headers={'User-Agent':'RadarPreciosNeuquen/1.1'}),timeout=25) as response:
        candidates=vital_catalog(response.read().decode('utf-8'))
    products,observations,errors={},{},[]
    for index,(product,sku) in enumerate(candidates,1):
        try:
            result=request_json(VITAL_URL+'/api/checkout/pub/orderForms/simulation',{'items':[{'id':str(sku['itemId']),'quantity':1,'seller':'arvitalne'}],'country':'ARG','postalCode':'8300'})
            record=vital_record(product,sku,result,stamp)
            if record:
                p,o=record;products[p['id']]=p;observations[o['id']]=o
        except Exception as error: errors.append(f"SKU {sku['itemId']}: {type(error).__name__}: {error}")
        if index%25==0:print(f'Vital: {index}/{len(candidates)} cotizados, {len(observations)} precios válidos.',file=sys.stderr,flush=True)
        time.sleep(.15)
    if not observations: raise ValueError('Vital: sin precios locales válidos')
    return list(products.values()),list(observations.values()),None,errors


YAGUAR='https://yaguar.com.ar/neuquen'

def yagu_json(url):
    with urlopen(Request(url,headers={'User-Agent':'RadarPreciosNeuquen/1.1','Accept':'application/json'}),timeout=25) as response:
        return json.loads(response.read().decode('utf-8-sig'))

def yagu_record(item,stamp):
    link=urlparse(item.get('permalink',''))
    if link.scheme!='https' or link.netloc!='yaguar.com.ar' or not link.path.startswith('/neuquen/producto/'): raise ValueError('Producto fuera de la tienda Neuquén')
    if item.get('type')!='simple' or not item.get('is_purchasable') or not item.get('is_in_stock') or item.get('is_on_backorder'): return None
    prices,limits=item.get('prices') or {},item.get('add_to_cart') or {}
    if prices.get('currency_code')!='ARS' or prices.get('price_range') is not None: raise ValueError('Moneda o precio ambiguo')
    decimals=prices.get('currency_minor_unit')
    if type(decimals) is not int or not 0<=decimals<=2: raise ValueError('Escala monetaria desconocida')
    def money(key):
        raw=str(prices.get(key) or '')
        if not raw.isdigit(): raise ValueError('Importe no reconocido')
        return int(raw)/10**decimals
    price=positive(money('price'))
    regular=price if not str(prices.get('regular_price') or '').isdigit() else positive(money('regular_price'))
    minimum,multiple=limits.get('minimum'),limits.get('multiple_of')
    if type(minimum) is not int or minimum<1 or type(multiple) is not int or multiple<1: raise ValueError('Cantidad ambigua')
    name=str(item.get('name') or '').strip()
    if not name or not mas_in_scope(name): return None
    matches=list(re.finditer(r'(\d+(?:[.,]\d+)?)\s*(kg|grs?|g|ml|cc|cm3|lts?|l)\b',normalize(name)))
    unit,quantity,content='unidad',1,'Unidad / presentación indicada'
    if len(matches)==1 and not re.search(r'\b(pack|combo|kit)\b|\b\d+\s*[xu]\b',normalize(name)):
        amount,raw=matches[0].groups();amount=positive(amount.replace(',','.'))
        unit='kg' if raw in ('kg','gr','grs','g') else 'litro'
        quantity=amount/1000 if raw in ('gr','grs','g','ml','cc','cm3') else amount
        content=matches[0].group()
    pid='yaguar_'+str(item['id'])
    brands=item.get('brands') or []
    brand=brands[0].get('name') if brands and isinstance(brands[0],dict) and brands[0].get('name') else 'Según descripción'
    product={'id':pid,'name':name.capitalize(),'brand':brand,'category':category(name),'image_url':(item.get('images') or [{}])[0].get('src',''),'unit_measure':unit,'net_content_number':quantity,'net_content_str':content}
    notes='Cotización del catálogo online de Yaguar Neuquén tal como la publica su tienda. El sitio es mayorista: impuestos y condiciones del canal deben confirmarse en la tienda antes de comprar.'
    if minimum>1:
        notes+=f' Mínimo de compra: {minimum} unidades'
        if multiple>1: notes+=f' en múltiplos de {multiple}'
        notes+='.'
    obs={'id':pid+'@yaguar_online@online','product_id':pid,'supermarket_id':'yaguar','branch_id':'yaguar_online','branch_name':'Yaguar Neuquén · tienda online','branch_address':'Catálogo online de la sucursal Neuquén','regular_price':max(regular,price),'current_price':price,'price_per_unit':round(price/quantity,2),'unit_label':{'kg':'$ / kg','litro':'$ / L','unidad':'$ / u'}[unit],'query_date':stamp,'is_verified':True,'is_demo':False,'source_url':item['permalink'],'source_name':'Yaguar · tienda online Neuquén (mayorista)','channel':'online','min_quantity':minimum,'quantity_multiple':multiple if multiple>1 else 1,'notes':notes}
    return product,obs

def collect_yaguar(stamp,terms=None,per_page=100,pages=3):
    site=yagu_json(YAGUAR+'/wp-json/')
    if 'neuquen' not in normalize(str(site.get('name',''))): raise ValueError('No se confirmó la tienda de Neuquén')
    if str(site.get('timezone_string','')).lower()!='america/argentina/buenos_aires': raise ValueError('Zona horaria inesperada')
    products,observations,errors,at_limit={},{},{},[]
    for term in terms or TERMS:
        for page in range(1,pages+1):
            try:
                rows=yagu_json(YAGUAR+'/wp-json/wc/store/v1/products?'+urlencode({'search':term,'per_page':per_page,'page':page},quote_via=quote))
                if not isinstance(rows,list): break
                if page==pages and len(rows)>=per_page: at_limit.append(term)
                for item in rows:
                    try:
                        record=yagu_record(item,stamp)
                        if record:
                            product,obs=record
                            products[product['id']],observations[obs['id']]=product,obs
                    except (KeyError,TypeError,ValueError) as error: errors.append(f'{term} p{page}: descartado: {error}')
                if len(rows)<per_page: break
                time.sleep(.2)
            except Exception as error:
                errors.append(f'{term} p{page}: {type(error).__name__}: {error}');break
    if not observations:
        detail='; '.join(errors[:3]) or 'respuesta vacía'
        raise ValueError('Yaguar: sin precios válidos ('+detail+'); se conserva la última lectura')
    return list(products.values()),list(observations.values()),None,[f'{t}: la consulta llegó al tope de páginas (posible recorte)' for t in at_limit]


ANONIMA_URL = 'https://www.laanonima.com.ar'
ANONIMA_API = 'https://api.laanonima.com.ar'
ANONIMA_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
ANONIMA_HEADERS = {
    'User-Agent': ANONIMA_UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-AR,es;q=0.9',
    'Cookie': 'codigoPostal=8300; Id-Sucursal-Super=8; descripcionLocalidadCabezal=Neuqu%C3%A9n%20Paseo%20de%20la%20Patagonia; seleccionocp=1; idZonaPrecio=8'
}

class AnonimaCardParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []
        self.in_item = False
        self.card = None

    def handle_starttag(self, tag, attrs):
        attr_dict = {k.lower(): v for k, v in attrs}
        classes = attr_dict.get('class', '').split()
        if tag == 'div' and 'producto-item' in classes:
            if self.card and self.card.get('code'):
                self.items.append(self.card)
            self.in_item = True
            self.card = {'code': None, 'name': None, 'brand': None, 'price': None, 'regular_price': None, 'offer_price': None, 'href': None, 'image_url': '', 'stock': None}
        if self.in_item and self.card:
            if tag == 'a' and 'data-codigo' in attr_dict:
                self.card['code'] = attr_dict.get('data-codigo')
                self.card['name'] = attr_dict.get('data-nombre')
                self.card['brand'] = attr_dict.get('data-marca')
                self.card['price'] = attr_dict.get('data-precio')
                self.card['regular_price'] = attr_dict.get('data-precio_anterior')
                self.card['offer_price'] = attr_dict.get('data-precio_oferta')
                self.card['href'] = attr_dict.get('href')
            if 'data-stock' in attr_dict and not self.card['stock']:
                self.card['stock'] = attr_dict.get('data-stock')
            if tag == 'img' and 'data-src' in attr_dict and not self.card['image_url']:
                self.card['image_url'] = attr_dict.get('data-src')

    def close(self):
        super().close()
        if self.card and self.card.get('code'):
            self.items.append(self.card)
            self.card = None

def anonima_branch():
    req = Request(ANONIMA_API + '/sucursal/8300', headers={'User-Agent': ANONIMA_UA, 'Accept': 'application/json'})
    with urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode('utf-8'))
    super_data = data.get('super') or {}
    sucursales = super_data.get('sucursales') or []
    branch = next((s for s in sucursales if 'neuquen' in normalize(s.get('descLocalidad', '')) and s.get('idSucursalSuper') == '8'), None)
    if not branch or not super_data.get('haySucursalSuper'):
        raise ValueError('No se confirmó la sucursal de La Anónima en Neuquén (Paseo de la Patagonia)')
    raw_addr = branch.get('direccion', 'Antártida Argentina 1111').split('<')[0].strip()
    return {
        'id': 'la_anonima_patagonia',
        'supermarket_id': 'la_anonima',
        'name': 'La Anónima · Paseo de la Patagonia',
        'brand_name': 'La Anónima',
        'type': 'minorista',
        'address': raw_addr or 'Antártida Argentina 1111',
        'city': 'Neuquén',
        'postal_code': '8300',
        'lat': -38.94662,
        'lng': -68.07421,
        'opening_hours': 'Lun a Dom 9:00 a 21:30 hs',
        'logo_color': '#2563eb',
        'badge_bg': 'bg-blue-50',
        'badge_text': 'La Anónima',
        'has_ecommerce': True,
        'ecommerce_url': ANONIMA_URL
    }

def anonima_record(item, branch, stamp, ean=None):
    code = str(item.get('code') or '').strip()
    name = html.unescape(str(item.get('name') or '')).strip()
    if not code or not name or not mas_in_scope(name): return None
    stock_val = str(item.get('stock') or '').strip()
    if stock_val == '-1' or (stock_val.isdigit() and int(stock_val) <= 0): return None
    price = positive(item.get('price'))
    raw_reg = item.get('regular_price')
    regular = positive(raw_reg) if raw_reg and str(raw_reg).isdigit() else price
    regular_price = max(regular, price)

    matches = list(re.finditer(r'(\d+(?:[.,]\d+)?)\s*(kg|grs?|g|ml|cc|cm3|lts?|l)\b', normalize(name)))
    unit, quantity, content = 'unidad', 1, 'Unidad / presentación indicada'
    is_pack = bool(re.search(r'\b(pack|combo|kit)\b|\b\d+\s*[xu]\b', normalize(name)))
    if not is_pack and len(matches) == 1:
        m = matches[0]
        rem = normalize(name)[:m.start()] + normalize(name)[m.end():]
        if re.search(r'(?:\bx\s*\d+\b|\b\d+\s*x\b)', rem):
            is_pack = True
    if len(matches) == 1 and not is_pack:
        amount, raw = matches[0].groups()
        amount = positive(amount.replace(',', '.'))
        unit = 'kg' if raw in ('kg', 'gr', 'grs', 'g') else 'litro'
        quantity = amount / 1000 if raw in ('gr', 'grs', 'g', 'ml', 'cc', 'cm3') else amount
        content = matches[0].group()

    pid = 'ean_' + str(ean) if ean and valid_ean(str(ean)) else 'anonima_' + code
    brand = str(item.get('brand') or 'La Anónima').strip()
    product = {
        'id': pid,
        'name': name.capitalize(),
        'brand': brand,
        'category': category(name),
        'image_url': item.get('image_url') or '',
        'unit_measure': unit,
        'net_content_number': quantity,
        'net_content_str': content
    }
    if ean and valid_ean(str(ean)):
        product['ean'] = str(ean)

    href = str(item.get('href') or '').strip()
    source_url = f'{ANONIMA_URL}{href}' if href.startswith('/') else ANONIMA_URL
    notes = 'Precio del catálogo online de La Anónima para la sucursal Paseo de la Patagonia (CP 8300). Confirmar disponibilidad y promociones en la tienda.'
    discount = round(((regular_price - price) / regular_price) * 100) if regular_price > price else 0
    if discount > 0:
        notes += f' Oferta online: {discount}% de descuento sobre precio regular (${regular_price:g}).'

    obs = {
        'id': pid + '@la_anonima_patagonia@online',
        'product_id': pid,
        'supermarket_id': 'la_anonima',
        'branch_id': branch['id'],
        'branch_name': branch['name'],
        'branch_address': branch['address'],
        'regular_price': regular_price,
        'current_price': price,
        'price_per_unit': round(price / quantity, 2),
        'unit_label': {'kg': '$ / kg', 'litro': '$ / L', 'unidad': '$ / u'}[unit],
        'query_date': stamp,
        'is_verified': True,
        'is_demo': False,
        'source_url': source_url,
        'source_name': 'La Anónima · sucursal Paseo de la Patagonia',
        'channel': 'online',
        'min_quantity': 1,
        'notes': notes
    }
    if discount > 0:
        obs['discount_percentage'] = discount
        obs['promo_label'] = 'Oferta online'
    return product, obs

def collect_la_anonima(stamp, terms=None, max_detail_eans=25):
    branch = anonima_branch()
    raw_candidates, errors = {}, []
    for term in terms or TERMS:
        try:
            req = Request(f'{ANONIMA_URL}/buscar/{quote(term)}', headers=ANONIMA_HEADERS)
            with urlopen(req, timeout=15) as res:
                page = res.read().decode('utf-8', errors='ignore')
            parser = AnonimaCardParser()
            parser.feed(page)
            parser.close()
            for item in parser.items:
                code = str(item.get('code') or '').strip()
                if code and code not in raw_candidates:
                    raw_candidates[code] = item
            time.sleep(0.2)
        except Exception as error:
            errors.append(f'{term}: {type(error).__name__}: {error}')

    eans = {}
    ean_count = 0
    if max_detail_eans > 0:
        for code, item in raw_candidates.items():
            if ean_count >= max_detail_eans:
                break
            href = item.get('href')
            if not href or not href.startswith('/'):
                continue
            try:
                detail_url = f'{ANONIMA_URL}{href}'
                req = Request(detail_url, headers=ANONIMA_HEADERS)
                with urlopen(req, timeout=10) as res:
                    detail_page = res.read().decode('utf-8', errors='ignore')
                m = re.search(r'data-flix-ean=\"(\d+)\"', detail_page)
                if m and valid_ean(m.group(1)):
                    eans[code] = m.group(1)
                ean_count += 1
                time.sleep(0.15)
            except Exception:
                pass

    products, observations = {}, {}
    for code, item in raw_candidates.items():
        try:
            record = anonima_record(item, branch, stamp, ean=eans.get(code))
            if record:
                p, o = record
                products[p['id']], observations[o['id']] = p, o
        except (ValueError, TypeError) as error:
            errors.append(f'art_{code}: {error}')

    if not observations:
        raise ValueError('La Anónima: sin precios válidos; se conserva la última lectura')
    return list(products.values()), list(observations.values()), branch, errors

def load_csv(path, now):
    products, observations = {}, []
    with open(path,newline='',encoding='utf-8-sig') as file:
        for line,row in enumerate(csv.DictReader(file),2):
            try:
                chain,ean = row['supermarket_id'].strip(),row['ean'].strip()
                if chain not in CHAINS or not valid_ean(ean): raise ValueError('Cadena o EAN/GTIN inválido')
                price,content,minimum = positive(row['price']),positive(row['net_content_number']),positive(row['min_quantity'])
                date = datetime.fromisoformat(row['observed_at'].replace('Z','+00:00'))
                if date.tzinfo is None or date>now: raise ValueError('Fecha futura o sin zona horaria')
                url = row['source_url'].strip()
                if urlparse(url).scheme!='https' or not urlparse(url).netloc: raise ValueError('Falta fuente HTTPS')
                if normalize(row['city'].strip()) not in ('neuquen','neuquen capital'): raise ValueError('Local fuera de Neuquén Capital')
                for key in ('branch_id','branch_name','branch_address','name','brand','net_content_str'):
                    if not row[key].strip(): raise ValueError('Campo vacío: '+key)
                if row['tax_included'].lower()!='true' or row['price_basis']!='unit' or not minimum.is_integer(): raise ValueError('Indicar precio unitario con impuestos y cantidad mínima entera')
                unit,channel = row['unit_measure'],row['channel']
                if unit not in ('kg','litro','unidad') or channel not in ('online','store'): raise ValueError('Unidad o canal inválido')
                pid,bid = 'ean_'+ean,chain+':'+row['branch_id']
                product = {'id':pid,'ean':ean,'name':row['name'],'brand':row['brand'],'category':row.get('category') or category(row['name']),'image_url':row.get('image_url',''),'unit_measure':unit,'net_content_number':content,'net_content_str':row['net_content_str']}
                if pid in products and products[pid]!=product: raise ValueError('Identidad de producto contradictoria')
                products[pid] = product
                observations.append({'id':pid+'@'+bid+'@'+channel,'product_id':pid,'supermarket_id':chain,'branch_id':bid,'branch_name':row['branch_name'],'branch_address':row['branch_address'],'regular_price':price,'current_price':price,'price_per_unit':round(price/content,2),'unit_label':{'kg':'$ / kg','litro':'$ / L','unidad':'$ / u'}[unit],'query_date':date.isoformat(),'is_verified':True,'is_demo':False,'source_url':url,'source_name':'Importación documentada','min_quantity':int(minimum),'channel':channel,'promo_condition':row.get('conditions') or None})
            except (KeyError,ValueError,TypeError) as error: raise ValueError(f'CSV línea {line}: {error}') from error
    if not observations: raise ValueError('CSV vacío')
    return list(products.values()),observations

def merge_observations(previous,incoming):
    result = {o['id']:o for o in previous}
    for obs in incoming:
        old = result.get(obs['id'])
        if old is None or datetime.fromisoformat(obs['query_date'])>=datetime.fromisoformat(old['query_date']): result[obs['id']] = obs
    return list(result.values())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv',type=Path)
    parser.add_argument('--max-pages',type=int,default=3)
    parser.add_argument('--source', choices=['all','cooperativa_obrera','changomas','makro','vital','yaguar','la_anonima'], default='all')
    parser.add_argument('--coope-terms', nargs='+', help='Consultas específicas de Coope')
    parser.add_argument('--mas-terms', nargs='+', help='Consultas acotadas para ampliar ChangoMás')
    parser.add_argument('--anonima-terms', nargs='+', help='Consultas específicas de La Anónima')
    args = parser.parse_args()
    now = datetime.now(timezone.utc); stamp = now.isoformat()
    snapshot = read_json(SNAPSHOT,{'products':[],'observations':[],'branches':[],'sources':{}})
    products,incoming,branches = [],[],snapshot.get('branches',[])
    if args.csv:
        products,incoming = load_csv(args.csv,now)
        existing = {p['id']: p for p in snapshot['products']}
        for product in products:
            old = existing.get(product['id'])
            if old and any(old.get(key) != product.get(key) for key in ('ean','name','brand','unit_measure','net_content_number')):
                raise ValueError('El CSV contradice la identidad ya importada: '+product['id'])
        for chain in {o['supermarket_id'] for o in incoming}: snapshot['sources'][chain] = {'status':'ok','last_attempt':stamp,'message':'Importación documentada; revisar fecha y condiciones.'}
    else:
        for chain,collector in [('cooperativa_obrera',lambda:collect_coope(stamp,args.max_pages,args.coope_terms)),('changomas',lambda:collect_mas(stamp,args.mas_terms)),('makro',lambda:collect_makro(stamp)),('vital',lambda:collect_vital(stamp)),('yaguar',lambda:collect_yaguar(stamp,TERMS)),('la_anonima',lambda:collect_la_anonima(stamp,args.anonima_terms))]:
            if args.source not in ('all',chain): continue
            try:
                ps,obs,branch,errors=collector()
                existing={p['id']:p for p in snapshot['products']+products}
                accepted=[]
                for product in ps:
                    old=existing.get(product['id'])
                    if old and old.get('ean') and product.get('ean')==old.get('ean'):
                        if any(old.get(k)!=product.get(k) for k in ('unit_measure','net_content_number')):
                            errors.append('Presentación contradictoria para '+product['id']); continue
                        product=old
                    accepted.append(product)
                allowed={p['id'] for p in accepted}
                obs=[o for o in obs if o['product_id'] in allowed]
                if not obs: raise ValueError('No quedaron precios con identidad comprobada')
                products.extend(accepted);incoming.extend(obs)
                if branch: branches=[b for b in branches if b['id']!=branch['id']]+[branch]
                snapshot['sources'][chain]={'status':'partial' if errors else 'ok','last_attempt':stamp,'last_success':stamp,'message':f'{len(obs)} precios consultados en {branch["name"] if branch else chain}.','errors':errors}
            except Exception as error:
                snapshot['sources'][chain]={'status':'error','last_attempt':stamp,'last_success':snapshot.get('sources',{}).get(chain,{}).get('last_success'),'message':str(error)}
    for chain in CHAINS: snapshot['sources'].setdefault(chain,{'status':'pending','message':'Sin precios locales verificados. Pendiente conectar fuente o importar lista documentada.'})
    product_map = {p['id']:p for p in snapshot['products']}; product_map.update({p['id']:p for p in products})
    snapshot.update(products=list(product_map.values()),observations=merge_observations(snapshot['observations'],incoming),branches=branches,last_attempt=stamp)
    history = read_json(HISTORY,[])
    keys = {(o['id'],o['query_date'],o['current_price']) for o in history}
    for obs in incoming:
        key = (obs['id'],obs['query_date'],obs['current_price'])
        if key not in keys: history.append(obs); keys.add(key)
    atomic_json(HISTORY,history)
    atomic_json(SNAPSHOT,snapshot)
    print(json.dumps({'products':len(snapshot['products']),'new_prices':len(incoming),'history':len(history),'sources':snapshot['sources']},ensure_ascii=False))
    if not incoming or any(v.get('status')=='error' and v.get('last_attempt')==stamp for v in snapshot['sources'].values()): raise SystemExit(1)

if __name__=='__main__': main()
