import cv2
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

# ---------------- CONFIG ----------------
PAGE_W, PAGE_H = 215.9, 279.4      # US Letter in mm
MARKER_MM = 50.0                   # outer black square, border included
EDGE = 35.0                        # marker center distance from page edges (mm)
DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

# Marker centers in mm. Origin = top-left of the sheet, y pointing down
LAYOUT = {
    0: (EDGE, EDGE),                      # top-left
    1: (PAGE_W - EDGE, EDGE),             # top-right
    2: (EDGE, PAGE_H / 2),                # middle-left
    3: (PAGE_W - EDGE, PAGE_H / 2),       # middle-right
    4: (EDGE, PAGE_H - EDGE),             # bottom-left
    5: (PAGE_W - EDGE, PAGE_H - EDGE),    # bottom-right
}

c = canvas.Canvas("aruco_sheet_letter_50mm.pdf", pagesize=(PAGE_W * mm, PAGE_H * mm))

for mid, (cx, cy) in LAYOUT.items():
    # 6x6 cells: 1-cell black border + 4x4 data bits (one pixel per cell)
    grid = cv2.aruco.generateImageMarker(DICT, mid, 6, borderBits=1)
    cell = MARKER_MM / 6
    x0, y0 = cx - MARKER_MM / 2, cy - MARKER_MM / 2   # top-left corner (y down)
    for r in range(6):
        for col in range(6):
            if grid[r, col] == 0:  # black cell
                c.rect((x0 + col * cell) * mm,
                       (PAGE_H - (y0 + (r + 1) * cell)) * mm,   # flip y for PDF
                       cell * mm, cell * mm, stroke=0, fill=1)
    c.setFont("Helvetica", 7)
    c.drawString(x0 * mm, (PAGE_H - y0 + 2) * mm, f"ID {mid}")

c.save()
print("Saved aruco_sheet_letter_50mm.pdf")
print("LAYOUT =", {k: (round(v[0], 2), round(v[1], 2)) for k, v in LAYOUT.items()})