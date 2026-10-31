#!/usr/bin/env python3
"""Importación trazable; conserva datos anteriores e historial incluso si falla la fuente."""
import argparse
import csv
import json
import math
import os
from pathlib import Path
import tempfile
import time
import unicodedata
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = ROOT / 'src/data/live-prices.json'
HISTORY = ROOT / 'src/data/price-history.json'
CHAINS = ['coto','la_anonima','changomas','vea','cooperativa_obrera','yaguar','vital','diarco','makro']
API = 'https://api.lacoopeencasa.coop/api/'
TERMS = ['aceite','leche','yerba','arroz','fideos','harina','azucar','galletitas','cafe','yogur','queso','manteca','gaseosa','agua','lavandina','detergente','jabon','papel','pan','pollo']

def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value).lower()) if unicodedata.category(c) != 'Mn')

def request_json(url):
    with urlopen(Request(url, headers={'Accept':'application/json','User-Agent':'RadarPreciosNeuquen/1.1'}), timeout=20) as response:
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
    name = normalize(name)
    groups = [('Limpieza',['lavandina','detergente','jabon','limpiador','papel hig','suavizante']),('Lácteos y Frescos',['leche','yogur','queso','manteca','crema']),('Bebidas',['gaseosa','agua','jugo','cerveza']),('Carnicería',['pollo','asado','carne']),('Panadería',['pan '])]
    return next((cat for cat,words in groups if any(word in name for word in words)), 'Almacén')

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
        try:
            products,incoming,branch,errors = collect_coope(stamp,args.max_pages)
            branches = [b for b in branches if b['id']!=branch['id']]+[branch]
            snapshot['sources']['cooperativa_obrera'] = {'status':'partial' if errors else 'ok','last_attempt':stamp,'last_success':stamp,'message':f'{len(incoming)} precios consultados en el local 124.','errors':errors}
        except Exception as error:
            snapshot['sources']['cooperativa_obrera'] = {'status':'error','last_attempt':stamp,'last_success':snapshot.get('sources',{}).get('cooperativa_obrera',{}).get('last_success'),'message':str(error)}
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
    if not incoming: raise SystemExit(1)

if __name__=='__main__': main()
