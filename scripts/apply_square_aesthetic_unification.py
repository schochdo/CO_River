import re

print("--- Starting Square Aesthetic Unification ---")

# ==============================================================
# 1. UPDATE web/editorial.css & web/style.css
# ==============================================================
with open("web/editorial.css", "r") as f:
    editorial = f.read()

# Add square enforcement for expansion toggles, map controls, badges, sliders
editorial_square_additions = """
/* 3b. Square Precision Map & Card Controls */
.collapse-icon, .legend-toggle-chevron {
  border-radius: 2px !important;
}

.maplibregl-ctrl-group, .maplibregl-ctrl-tilt, .maplibregl-ctrl-group button, .ctrl-tilt-btn {
  border-radius: 2px !important;
}

.storage-bar-bg, .storage-bar-fill, .progress-bar-bg, .progress-bar-fill {
  border-radius: 0px !important;
}

.slider {
  border-radius: 2px !important;
}
.slider:before {
  border-radius: 1px !important;
}

.status-dot, .legend-dot, .reservoir-dot, .station-dot {
  border-radius: 1px !important;
}
"""

if ".collapse-icon, .legend-toggle-chevron" not in editorial:
    # Append to Section 3 of editorial.css
    editorial = editorial.replace(
        "/* 4. Unified High-Contrast Blue-Gray Palette & Square Architecture */",
        editorial_square_additions.strip() + "\n\n/* 4. Unified High-Contrast Blue-Gray Palette & Square Architecture */"
    )
    with open("web/editorial.css", "w") as f:
        f.write(editorial)
    print("Updated web/editorial.css with square controls & expansion toggles.")

with open("web/style.css", "r") as f:
    style = f.read()

# Update .collapse-icon border-radius: 50% -> 2px
style = re.sub(
    r"(\.collapse-icon\s*\{[^}]*?border-radius:\s*)50%",
    r"\g<1>2px",
    style
)
# Update .legend-toggle-chevron border-radius: 50% -> 2px
style = re.sub(
    r"(\.legend-toggle-chevron\s*\{[^}]*?border-radius:\s*)50%",
    r"\g<1>2px",
    style
)
# Update .maplibregl-ctrl-group border-radius: 8px !important -> 2px !important
style = re.sub(
    r"(\.maplibregl-ctrl-group\s*\{[^}]*?border-radius:\s*)8px\s*!important",
    r"\g<1>2px !important",
    style
)

with open("web/style.css", "w") as f:
    f.write(style)
print("Updated web/style.css (.collapse-icon, .legend-toggle-chevron, .maplibregl-ctrl-group to 2px).")

# ==============================================================
# 2. UPDATE web/pipeline.html (Flow Schematic & Elevation Profile)
# ==============================================================
with open("web/pipeline.html", "r") as f:
    pipeline = f.read()

# 2a. CSS rules for paths
pipeline = re.sub(
    r"(\.river-path\s*\{[^}]*?stroke-linecap:\s*)round",
    r"\g<1>square",
    pipeline
)
pipeline = re.sub(
    r"(\.river-path\s*\{[^}]*?stroke-linejoin:\s*)round",
    r"\g<1>miter",
    pipeline
)
pipeline = re.sub(
    r"(\.diversion-path\s*\{[^}]*?stroke-linecap:\s*)round",
    r"\g<1>square",
    pipeline
)
pipeline = re.sub(
    r"(\.diversion-path\s*\{[^}]*?stroke-linejoin:\s*)round",
    r"\g<1>miter",
    pipeline
)
pipeline = re.sub(
    r"(\.loss-path\s*\{[^}]*?stroke-linecap:\s*)round",
    r"\g<1>square",
    pipeline
)
pipeline = re.sub(
    r"(\.loss-path\s*\{[^}]*?stroke-linejoin:\s*)round",
    r"\g<1>miter",
    pipeline
)

# 2b. Inline SVG stroke-linecap & stroke-linejoin
# For dashed lines, use "butt" or "square"
pipeline = pipeline.replace('stroke-linecap="round"', 'stroke-linecap="square"')
pipeline = pipeline.replace('stroke-linejoin="round"', 'stroke-linejoin="miter"')

# 2c. Reservoir bodies: Lake Powell & Lake Mead in Flow Schematic
pipeline = re.sub(r'id="body-powell"\s+([^>]*?)rx="\d+"', r'id="body-powell" \1rx="2"', pipeline)
pipeline = re.sub(r'id="body-mead"\s+([^>]*?)rx="\d+"', r'id="body-mead" \1rx="2"', pipeline)

# 2d. Flow badge backgrounds rx="4" -> rx="2", rx="6" -> rx="2", rx="7" -> rx="2", rx="8" -> rx="2"
pipeline = re.sub(r'\brx="[456789]"\b', 'rx="2"', pipeline)
pipeline = re.sub(r'\brx="10"\b', 'rx="2"', pipeline)
pipeline = re.sub(r'\brx="3(?:\.5)?"\b', 'rx="1"', pipeline)

# 2e. Replace HTML rounded classes with square 2px classes (rounded-xs / rounded-none)
pipeline = pipeline.replace('rounded-xl', 'rounded-xs')
pipeline = pipeline.replace('rounded-lg', 'rounded-xs')
pipeline = pipeline.replace('rounded-md', 'rounded-xs')

# 2f. In Elevation Profile, convert circle profile nodes to square milestone rects
def circle_to_rect(match):
    cx = float(match.group(1))
    cy = float(match.group(2))
    r = float(match.group(3))
    rest = match.group(4)
    w = r * 2.0
    h = r * 2.0
    x = cx - r
    y = cy - r
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="1" {rest}'

pipeline = re.sub(
    r'<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"\s+([^>]*?class="profile-node"[^>]*?)>',
    circle_to_rect,
    pipeline
)

with open("web/pipeline.html", "w") as f:
    f.write(pipeline)
print("Updated web/pipeline.html (square edges, end caps, square milestones, and 2px radii).")

# ==============================================================
# 3. UPDATE web/ml_analysis.html (Option 1: Independent Tributaries & Square Styling)
# ==============================================================
with open("web/ml_analysis.html", "r") as f:
    ml = f.read()

# Replace RIVERS definition with Option 1: True Independent Headwater Tributaries
new_rivers_code = """    const RIVERS = [
      {
        id: 'cameo',
        name: 'Upper Colorado at Cameo',
        station: '#09095500',
        regime: 'snowmelt',
        x: 0.32,
        rbi: 0.32,
        y: 3.50,
        r: 15,
        color: COLOR_SNOWMELT,
        travelDays: 6.5,
        distanceMi: 210,
        sharePct: 37,
        summary: 'Selected: Upper Colorado at Cameo — 3.50 MAF/yr (37% of tributary inflow) • RBI: 0.32 (Alpine Snowmelt) • Reaches Powell in 6.5 days • Natural Rocky Mountain snowmelt headwaters',
        travelCurve: [0.08, 0.15, 0.26, 0.41, 0.56, 0.68, 0.74, 0.73, 0.64, 0.49, 0.35]
      },
      {
        id: 'gunnison',
        name: 'Gunnison near Grand Junction',
        station: '#09152500',
        regime: 'dam_controlled',
        x: 0.15,
        rbi: 0.15,
        y: 2.10,
        r: 13,
        color: COLOR_DAM,
        travelDays: 5.5,
        distanceMi: 180,
        sharePct: 22,
        summary: 'Selected: Gunnison near Grand Jct — 2.10 MAF/yr (22% of tributary inflow) • RBI: 0.15 (Dam-Regulated) • Reaches Powell in 5.5 days • Regulated by Aspinall Unit dams',
        travelCurve: [0.12, 0.20, 0.34, 0.50, 0.63, 0.69, 0.68, 0.59, 0.46, 0.34, 0.22]
      },
      {
        id: 'flaming_gorge',
        name: 'Green below Flaming Gorge Dam',
        station: '#09234500',
        regime: 'dam_controlled',
        x: 0.08,
        rbi: 0.08,
        y: 1.40,
        r: 10,
        color: COLOR_DAM,
        travelDays: 7.0,
        distanceMi: 290,
        sharePct: 15,
        summary: 'Selected: Green below Flaming Gorge — 1.40 MAF/yr (15% of tributary inflow) • RBI: 0.08 (Steady Baseflow) • Reaches Powell in 7.0 days • Regulated hydropower dam releases',
        travelCurve: [0.05, 0.10, 0.18, 0.28, 0.42, 0.56, 0.68, 0.72, 0.65, 0.52, 0.38]
      },
      {
        id: 'yampa',
        name: 'Yampa River at Deerlodge Park',
        station: '#09260050',
        regime: 'snowmelt',
        x: 0.42,
        rbi: 0.42,
        y: 1.30,
        r: 10,
        color: COLOR_SNOWMELT,
        travelDays: 8.0,
        distanceMi: 350,
        sharePct: 14,
        summary: 'Selected: Yampa at Deerlodge — 1.30 MAF/yr (14% of tributary inflow) • RBI: 0.42 (Wild Snowmelt) • Reaches Powell in 8.0 days • Last large wild undammed river in the basin',
        travelCurve: [0.05, 0.09, 0.16, 0.25, 0.37, 0.49, 0.59, 0.65, 0.66, 0.61, 0.52]
      },
      {
        id: 'san_juan_bluff',
        name: 'San Juan River at Bluff',
        station: '#09379500',
        regime: 'flash_flood',
        x: 0.78,
        rbi: 0.78,
        y: 1.15,
        r: 9,
        color: COLOR_FLASH,
        travelDays: 1.5,
        distanceMi: 105,
        sharePct: 12,
        summary: 'Selected: San Juan at Bluff — 1.15 MAF/yr (12% of tributary inflow) • RBI: 0.78 (Monsoon Flash) • Reaches Powell in 1.5 days • Driven by brief desert monsoon pulses',
        travelCurve: [0.35, 0.41, 0.42, 0.38, 0.31, 0.23, 0.16, 0.11, 0.08, 0.05, 0.03]
      },
      {
        id: 'dirty_devil',
        name: 'Dirty Devil near Hanksville',
        station: '#09333500',
        regime: 'flash_flood',
        x: 0.88,
        rbi: 0.88,
        y: 0.07,
        r: 6,
        color: COLOR_FLASH,
        travelDays: 1.0,
        distanceMi: 40,
        sharePct: 1,
        summary: 'Selected: Dirty Devil near Hanksville — 0.07 MAF/yr (1% of tributary inflow) • RBI: 0.88 (Extreme Flash) • Reaches Powell in ~1 day • Rapid mudflow arroyo spikes',
        travelCurve: [0.45, 0.48, 0.30, 0.18, 0.10, 0.05, 0.02, 0.01, 0.00, 0.00, 0.00]
      },
      {
        id: 'escalante',
        name: 'Escalante River near Escalante',
        station: '#09337500',
        regime: 'flash_flood',
        x: 0.94,
        rbi: 0.94,
        y: 0.02,
        r: 5,
        color: COLOR_FLASH,
        travelDays: 0.8,
        distanceMi: 35,
        sharePct: 0.2,
        summary: 'Selected: Escalante near Escalante — 0.02 MAF/yr (<1% of tributary inflow) • RBI: 0.94 (Extreme Flash) • Reaches Powell in <1 day • Desert slickrock canyon surges',
        travelCurve: [0.55, 0.38, 0.22, 0.11, 0.05, 0.02, 0.01, 0.00, 0.00, 0.00, 0.00]
      }
    ];"""

ml = re.sub(r'const RIVERS = \[[\s\S]*?\];', new_rivers_code.strip(), ml)

# Update subtitle
ml = ml.replace(
    '<span class="text-[10px] text-slate-500 font-medium">Relative Volume = % of Powell Inflow</span>',
    '<span class="text-[10px] text-slate-500 font-medium">Relative Volume = % of Tributary Inflow</span>'
)

# Update Card 1 bubble labels
ml = re.sub(
    r"const shortName = r\.id === 'green_river' \? 'Green' :[\s\S]*?r\.id === 'dirty_devil' \? 'Dirty Devil' : 'Escalante';",
    """const shortName = r.id === 'cameo' ? 'Upper CO (Cameo)' :
                              r.id === 'gunnison' ? 'Gunnison' :
                              r.id === 'flaming_gorge' ? 'Flaming Gorge' :
                              r.id === 'yampa' ? 'Yampa' :
                              r.id === 'san_juan_bluff' ? 'San Juan' :
                              r.id === 'dirty_devil' ? 'Dirty Devil' : 'Escalante';""",
    ml
)

# In card1BubbleLabelsPlugin, use square rect
ml = ml.replace("if (ctx.roundRect) {\n              ctx.roundRect(pillX, pillY, pillW, pillH, 3);\n            } else {\n              ctx.rect(pillX, pillY, pillW, pillH);\n            }", "ctx.rect(pillX, pillY, pillW, pillH);")

# Update Card 2 mainRivers array
ml = re.sub(
    r"const mainRivers = \[[\s\S]*?\];",
    """const mainRivers = [
          { id: 'san_juan_bluff', label: 'San Juan 1.5d', xVal: 1.5, yVal: 0.42, xOffset: 12, yOffset: -14 },
          { id: 'gunnison', label: 'Gunnison 5.5d', xVal: 5.5, yVal: 0.69, xOffset: 12, yOffset: -13 },
          { id: 'cameo', label: 'Cameo 6.5d', xVal: 6.5, yVal: 0.74, xOffset: -12, yOffset: -13 },
          { id: 'flaming_gorge', label: 'Flaming Gorge 7d', xVal: 7.0, yVal: 0.72, xOffset: 12, yOffset: -13 },
          { id: 'yampa', label: 'Yampa 8d', xVal: 8.0, yVal: 0.66, xOffset: 0, yOffset: -13 }
        ];""",
    ml
)

# In Card 2 pill label plugin, use square rect
ml = ml.replace("if (ctx.roundRect) {\n              ctx.roundRect(pillX, pillY, pillW, pillH, 3);\n            } else {\n              ctx.rect(pillX, pillY, pillW, pillH);\n            }", "ctx.rect(pillX, pillY, pillW, pillH);")

# Update rounded classes to square
ml = ml.replace("rounded-xl", "rounded-xs")
ml = ml.replace("rounded-lg", "rounded-xs")
ml = ml.replace("rounded-md", "rounded-xs")

with open("web/ml_analysis.html", "w") as f:
    f.write(ml)
print("Updated web/ml_analysis.html (Option 1: 7 independent tributaries, 0 duplicates, square labels).")

print("--- Completed Square Aesthetic Unification ---")
