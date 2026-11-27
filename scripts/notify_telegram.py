#!/usr/bin/env python3
"""
scripts/notify_telegram.py
Envía reporte y alertas de sincronización de Radar de Precios a Telegram.
Diseñado para ejecutarse al final del workflow de GitHub Actions.
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

def format_date_arg(iso_str):
    if not iso_str:
        return "Sin fecha"
    try:
        dt = datetime.fromisoformat(iso_str)
        # Convertir a hora de Argentina (UTC-3)
        dt_arg = dt.astimezone(timezone(timedelta(hours=-3)))
        return dt_arg.strftime('%d/%m/%Y %H:%M:%S hs (ART)')
    except Exception:
        return iso_str[:19]

def build_report():
    catalog_path = 'src/data/live-prices.json'
    if not os.path.exists(catalog_path):
        return "⚠️ Error: No se encontró el archivo del catálogo (live-prices.json)."

    try:
        with open(catalog_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return f"⚠️ Error al leer live-prices.json: {e}"

    stamp = data.get('last_attempt', '')
    products = data.get('products', [])
    observations = data.get('observations', [])
    sources = data.get('sources', {})

    total_prods = len(products)
    total_obs = len(observations)
    date_formatted = format_date_arg(stamp)

    # Evaluar estado global
    degraded = []
    healthy = []
    
    chain_names = {
        'coto': 'Coto',
        'yaguar': 'Yaguar Mayorista',
        'cooperativa_obrera': 'Coope Obrera',
        'la_anonima': 'La Anónima',
        'carrefour': 'Carrefour',
        'jumbo': 'Jumbo',
        'changomas': 'ChangoMás',
        'vital': 'Vital Mayorista',
        'makro': 'Makro'
    }

    lines_chains = []

    for key, name in chain_names.items():
        src = sources.get(key, {})
        status = src.get('status', 'pending')
        msg = src.get('message', '')
        
        count_str = ""
        if ' precios consultados' in msg:
            count_str = f" ({msg.split(' precios')[0]} precios)"

        if status == 'ok':
            lines_chains.append(f"• *{name}:* ✅ OK{count_str}")
            healthy.append(name)
        elif status == 'partial':
            lines_chains.append(f"• *{name}:* 🟡 Parcial{count_str}")
            healthy.append(name)
        elif status == 'error':
            lines_chains.append(f"• *{name}:* 🔴 Error: {src.get('message', 'Fallo')[:60]}")
            degraded.append(name)
        elif status == 'pending':
            lines_chains.append(f"• *{name}:* ⚪ Pendiente")

    if degraded:
        status_header = f"⚠️ *Atención: {len(degraded)} cadena(s) degradada(s)*"
    else:
        status_header = "✅ *Sincronización Exitosa (Todas las cadenas activas)*"

    run_url = os.environ.get('GITHUB_RUN_URL', '')
    url_footer = f"\n🔗 [Ver ejecución en GitHub Actions]({run_url})" if run_url else ""

    report = (
        f"🛰️ *Radar de Precios Neuquén*\n"
        f"{status_header}\n\n"
        f"📅 *Fecha:* {date_formatted}\n"
        f"📦 *Catálogo:* {total_prods:,} productos · {total_obs:,} cotizaciones\n\n"
        f"*Estado por Supermercado:*\n"
        + "\n".join(lines_chains)
        + url_footer
    )

    return report

def send_telegram(token, chat_id, message):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, timeout=15) as res:
        res_data = json.loads(res.read().decode('utf-8'))
        return res_data.get('ok', False)

def main():
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')

    report_text = build_report()
    print("=== REPORTE GENERADO ===")
    print(report_text)
    print("========================")

    if not token or not chat_id:
        print("[AVISO] Variables TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configuradas en el entorno. No se envía mensaje.")
        return 0

    try:
        print(f"[INFO] Enviando reporte a Telegram (Chat ID: {chat_id})...")
        success = send_telegram(token, chat_id, report_text)
        if success:
            print("[ÉXITO] Mensaje de Telegram enviado correctamente.")
        else:
            print("[ERROR] Telegram API devolvió respuesta no exitosa.")
    except Exception as e:
        print(f"[ERROR] No se pudo enviar el mensaje a Telegram: {e}")
        return 0

    return 0

if __name__ == '__main__':
    sys.exit(main())
