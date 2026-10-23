import os
import json
import qrcode
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont

ARTIFACT_DIR = r"C:\Users\himan\.gemini\antigravity\brain\cd4177ca-58d0-42c3-9264-24091067f7d9\barcodes"
PUBLIC_DIR = r"D:\UGAM_MES\sample_barcodes"

os.makedirs(ARTIFACT_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

STATIONS_DATA = [
    {
        "station": 1,
        "name": "Station 01: Seat Frame Assembly",
        "parts": [
            {"code": "FRAME-LH-101", "name": "Driver-side seat frame", "lot": "LOT-2026-FR01", "vendor": "AutoComfort Metalworks"},
            {"code": "RAIL-LH-201", "name": "Seat slider rail kit", "lot": "LOT-2026-RL02", "vendor": "AutoComfort Precision"},
            {"code": "BRKT-LH-301", "name": "Mounting bracket kit", "lot": "LOT-2026-BK01", "vendor": "AutoComfort Hardware"}
        ]
    },
    {
        "station": 2,
        "name": "Station 02: Recliner Mechanism Fitting",
        "parts": [
            {"code": "RECL-101", "name": "Recliner mechanism", "lot": "LOT-2026-RC03", "vendor": "AutoComfort Motion Systems"},
            {"code": "LEVR-101", "name": "Adjustment lever", "lot": "LOT-2026-LV01", "vendor": "AutoComfort Polymers"},
            {"code": "FAST-101", "name": "Fastener kit (M8/M10)", "lot": "LOT-2026-FT09", "vendor": "AutoComfort Fasteners"}
        ]
    },
    {
        "station": 3,
        "name": "Station 03: Foam Installation",
        "parts": [
            {"code": "FOAM-CSH-101", "name": "Seat cushion foam (PU)", "lot": "LOT-2026-FC05", "vendor": "AutoComfort Urethane Ltd"},
            {"code": "FOAM-BST-101", "name": "Backrest foam (Molded)", "lot": "LOT-2026-FB04", "vendor": "AutoComfort Urethane Ltd"}
        ]
    },
    {
        "station": 4,
        "name": "Station 04: Upholstery Installation",
        "parts": [
            {"code": "COV-LH-101", "name": "Seat leatherette cover (LH)", "lot": "LOT-2026-CV01", "vendor": "AutoComfort Textile Div"},
            {"code": "CLIP-TRM-101", "name": "Trim retainer clips (Pack)", "lot": "LOT-2026-CL08", "vendor": "AutoComfort Fasteners"},
            {"code": "TRIM-LH-101", "name": "Trim side components", "lot": "LOT-2026-TR02", "vendor": "AutoComfort Styling"}
        ]
    },
    {
        "station": 5,
        "name": "Station 05: Final Seat Assembly",
        "parts": [
            {"code": "HDRST-101", "name": "Adjustable headrest unit", "lot": "LOT-2026-HD02", "vendor": "AutoComfort Interior"},
            {"code": "COV-SD-101", "name": "Side aesthetic covers", "lot": "LOT-2026-SC01", "vendor": "AutoComfort Styling"},
            {"code": "ACC-KIT-101", "name": "Seat accessories & wiring kit", "lot": "LOT-2026-AK04", "vendor": "AutoComfort Electrical"}
        ]
    },
    {
        "station": 6,
        "name": "Station 06: Final Quality Inspection",
        "parts": [
            {"code": "SEAT-0001", "name": "Completed Driver Seat Unit", "lot": "WO-SEAT-2026-001", "vendor": "AutoComfort Seating Line 01"}
        ]
    }
]

code128_class = barcode.get_barcode_class('code128')

generated_items = []

for station_info in STATIONS_DATA:
    st_num = station_info["station"]
    for part in station_info["parts"]:
        code = part["code"]
        name = part["name"]
        lot = part["lot"]
        vendor = part["vendor"]
        
        # 1. Generate 2D QR Code image (Standard Automotive serialized JSON payload)
        qr_payload = json.dumps({
            "sku": code,
            "lot": lot,
            "desc": name,
            "mfr": "AutoComfort Seating"
        })
        
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=6,
            border=2,
        )
        qr.add_data(code) # Plain code so any basic optical scanner decodes exact code
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
        
        # 2. Generate 1D Code 128 Barcode
        c128 = code128_class(code, writer=ImageWriter())
        c128_img = c128.render(writer_options={
            "module_width": 0.35,
            "module_height": 14.0,
            "font_size": 10,
            "text_distance": 3.0,
            "quiet_zone": 2.0,
            "write_text": True
        })
        
        # 3. Create a combined industrial label card
        # Width: 650px, Height: 240px
        card_w, card_h = 650, 240
        card = Image.new('RGB', (card_w, card_h), color='#FFFFFF')
        draw = ImageDraw.Draw(card)
        
        # Draw border and header strip
        draw.rounded_rectangle([(2, 2), (card_w-3, card_h-3)], radius=10, outline='#1E3A8A', width=2)
        draw.rounded_rectangle([(4, 4), (card_w-5, 36)], radius=8, fill='#1E3A8A')
        
        # Header text
        header_text = f"AUTOCOMFORT SEATING — ST-0{st_num} COMPONENT LOT LABEL"
        draw.text((15, 12), header_text, fill='#FFFFFF')
        
        # Part info left
        draw.text((20, 50), f"PART CODE:", fill='#64748B')
        draw.text((110, 46), f"{code}", fill='#0F172A')
        
        draw.text((20, 75), f"DESCRIPTION:", fill='#64748B')
        draw.text((110, 75), f"{name}", fill='#0F172A')
        
        draw.text((20, 98), f"LOT NUMBER:", fill='#64748B')
        draw.text((110, 98), f"{lot}", fill='#0F172A')
        
        draw.text((20, 120), f"VENDOR:", fill='#64748B')
        draw.text((110, 120), f"{vendor}", fill='#0F172A')
        
        # Paste 1D barcode on bottom left
        c128_resized = c128_img.resize((360, 80), Image.Resampling.LANCZOS)
        card.paste(c128_resized, (15, 145))
        
        # Paste QR code on right
        qr_resized = qr_img.resize((180, 180), Image.Resampling.LANCZOS)
        card.paste(qr_resized, (445, 45))
        
        # Save card
        clean_name = code.lower().replace("-", "_")
        card_filename = f"barcode_{clean_name}.png"
        card_path_artifact = os.path.join(ARTIFACT_DIR, card_filename)
        card_path_public = os.path.join(PUBLIC_DIR, card_filename)
        
        card.save(card_path_artifact, quality=95)
        card.save(card_path_public, quality=95)
        
        generated_items.append({
            "station": st_num,
            "code": code,
            "name": name,
            "lot": lot,
            "vendor": vendor,
            "filename": card_filename,
            "artifact_path": card_path_artifact
        })

print(f"Successfully generated {len(generated_items)} barcode cards.")
