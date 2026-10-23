import os

PUBLIC_DIR = r"D:\UGAM_MES\sample_barcodes"
HTML_PATH = os.path.join(PUBLIC_DIR, "index.html")

STATIONS = [
    {
        "num": 1,
        "name": "Station 01 — Seat Frame Assembly",
        "role": "Assembly Operator",
        "parts": [
            {"code": "FRAME-LH-101", "name": "Driver-Side Seat Frame", "file": "barcode_frame_lh_101.png"},
            {"code": "RAIL-LH-201", "name": "Seat Slider Rail Kit", "file": "barcode_rail_lh_201.png"},
            {"code": "BRKT-LH-301", "name": "Mounting Bracket Kit", "file": "barcode_brkt_lh_301.png"}
        ]
    },
    {
        "num": 2,
        "name": "Station 02 — Recliner Mechanism Fitting",
        "role": "Assembly Operator",
        "parts": [
            {"code": "RECL-101", "name": "Recliner Mechanism", "file": "barcode_recl_101.png"},
            {"code": "LEVR-101", "name": "Adjustment Lever", "file": "barcode_levr_101.png"},
            {"code": "FAST-101", "name": "Fastener Kit", "file": "barcode_fast_101.png"}
        ]
    },
    {
        "num": 3,
        "name": "Station 03 — Foam Installation",
        "role": "Assembly Operator",
        "parts": [
            {"code": "FOAM-CSH-101", "name": "Seat Cushion Foam", "file": "barcode_foam_csh_101.png"},
            {"code": "FOAM-BST-101", "name": "Backrest Foam", "file": "barcode_foam_bst_101.png"}
        ]
    },
    {
        "num": 4,
        "name": "Station 04 — Upholstery Installation",
        "role": "Quality Inspector",
        "parts": [
            {"code": "COV-LH-101", "name": "Seat Cover (LH)", "file": "barcode_cov_lh_101.png"},
            {"code": "CLIP-TRM-101", "name": "Clips (Trim Retainer)", "file": "barcode_clip_trm_101.png"},
            {"code": "TRIM-LH-101", "name": "Trim Components", "file": "barcode_trim_lh_101.png"}
        ]
    },
    {
        "num": 5,
        "name": "Station 05 — Final Seat Assembly",
        "role": "Quality Inspector",
        "parts": [
            {"code": "HDRST-101", "name": "Headrest", "file": "barcode_hdrst_101.png"},
            {"code": "COV-SD-101", "name": "Covers (Side)", "file": "barcode_cov_sd_101.png"},
            {"code": "ACC-KIT-101", "name": "Specified Accessories", "file": "barcode_acc_kit_101.png"}
        ]
    },
    {
        "num": 6,
        "name": "Station 06 — Final Quality Inspection",
        "role": "Quality Supervisor",
        "parts": [
            {"code": "SEAT-0001", "name": "Completed Seat Serial Barcode", "file": "barcode_seat_0001.png"}
        ]
    }
]

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UGAM MES — Automotive Seat Assembly Barcode Test Sheet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
    .header { max-width: 1200px; margin: 0 auto 24px; padding: 20px; background: #1E293B; border-radius: 12px; border: 1px solid #334155; }
    h1 { margin: 0 0 8px 0; font-size: 22px; color: #38BDF8; }
    p { margin: 4px 0; font-size: 13px; color: #94A3B8; }
    .grid { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    .station-block { background: #1E293B; border-radius: 12px; border: 1px solid #334155; padding: 18px; }
    .station-title { font-size: 15px; font-weight: 700; color: #F1F5F9; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 14px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 600; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
    .card-item { background: #FFFFFF; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25); text-align: center; }
    .card-item img { width: 100%; height: auto; display: block; }
    .copy-pill { display: inline-block; background: #E2E8F0; color: #0F172A; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; margin: 8px auto 10px; cursor: pointer; border: 1px solid #CBD5E1; }
    .copy-pill:hover { background: #38BDF8; color: #FFFFFF; }
    @media print {
      body { background: #FFFFFF; color: #000; padding: 0; }
      .header { background: #FFFFFF; border: none; padding: 0 0 16px; }
      .station-block { background: #FFFFFF; border: 1px solid #ccc; page-break-inside: avoid; }
      .card-item { box-shadow: none; border: 1px solid #ccc; }
    }
  </style>
  <script>
    function copyText(val) {
      navigator.clipboard.writeText(val);
      alert('Copied barcode: ' + val);
    }
  </script>
</head>
<body>
  <div class="header">
    <h1>UGAM MES — AutoComfort Seating Barcode Test Sheet</h1>
    <p>Front Driver Seat Assembly (<code>SEAT-DRV-101</code>) • Work Order: <code>WO-SEAT-2026-001</code></p>
    <p>Point your mobile camera, USB 2D imager, or optical webcam scanner directly at these barcodes to test Poka-Yoke verification on the Operator terminal.</p>
  </div>
  <div class="grid">
"""

for st in STATIONS:
    html_content += f"""
    <div class="station-block">
      <div class="station-title">
        <span>{st['name']}</span>
        <span class="badge">Role: {st['role']}</span>
      </div>
      <div class="cards">
    """
    for p in st['parts']:
        html_content += f"""
        <div class="card-item">
          <img src="{p['file']}" alt="{p['code']}">
          <div class="copy-pill" onclick="copyText('{p['code']}')">📋 Click to Copy: {p['code']}</div>
        </div>
        """
    html_content += """
      </div>
    </div>
    """

html_content += """
  </div>
</body>
</html>
"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Generated printable HTML sheet at {HTML_PATH}")
