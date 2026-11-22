#!/usr/bin/env python3
import os
import re

def update_editorial_css():
    path = "web/editorial.css"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Ensure theme variables are crisp
    palette_block = """/* ==============================================================
   EDITORIAL DESIGN SYSTEM (Edward Tufte / NYT Editorial Standard)
   ============================================================== */

:root {
  --canvas-bg: #cbd5e1;          /* Contrusty cool slate canvas from basin metrics */
  --surface-bg: #e2e8f0;         /* Contrusty blue-gray panel & sidebar */
  --card-bg: #ffffff;            /* Crisp card surface */
  --card-bg-subtle: #f1f5f9;     /* Slate-100 inner container */
  --ink-heading: #0f172a;        /* Deep slate-900 primary text */
  --ink-body: #1e293b;           /* Slate-800 body text */
  --ink-muted: #475569;          /* Balanced slate-600 */
  --ink-subtle: #64748b;         /* Slate-500 dim text */
  --hairline: #94a3b8;           /* High-contrast slate-400 border from basin metrics */
  --hairline-dark: #64748b;      /* Slate-500 strong border */
  --radius-card: 2px;            /* Square corner look from navigation panel */
  --radius-button: 2px;          /* Square corner look */
  --radius-tag: 2px;             /* Square corner look */
}"""

    # Replace :root block if present
    content = re.sub(
        r'/\* =+[\s\S]*?EDITORIAL DESIGN SYSTEM[\s\S]*?:root\s*\{[\s\S]*?\}',
        palette_block,
        content
    )

    # Universal square corner rule
    square_rule = """/* 3. Universal Square Corner Look (Zero Bubble-Wrap) */
.card, .card-academic, .stat-card, .editorial-card,
.modal-card, .rounded-xl, .rounded-2xl, .rounded-3xl, .rounded-lg, .rounded-md, .rounded, .rounded-sm,
.sidebar-panel, .map-legend, .map-menu-dropdown, .dialog-box, .leaflet-popup-content-wrapper, .maplibregl-popup-content,
.dashboard-card, .law-stat-card, .law-item-box {
  border-radius: var(--radius-card) !important;
}

/* Restrained square radii for buttons, badges, pills, tabs, and inputs */
button:not(.circle-btn):not(#compass-container button):not(#trackball-wrapper button):not(.compass-btn),
.tag, .badge, .law-tag, .api-tag, .type-pill, .stat-badge, .tab-btn, .nav-btn, .map-menu-btn,
input, select, textarea, .slider, .sidebar-link, .sidebar-expand-tab, .custom-select, .nav-header-btn {
  border-radius: var(--radius-button) !important;
}

/* 4. Unified High-Contrast Blue-Gray Palette & Square Architecture */
.sidebar-academic {
  background-color: var(--surface-bg) !important;
  color: var(--ink-heading) !important;
  border-right: 1.5px solid var(--hairline) !important;
}

.sidebar-category-header {
  color: var(--ink-muted) !important;
  font-weight: 700 !important;
}

.sidebar-link {
  color: var(--ink-body) !important;
  border-radius: var(--radius-button) !important;
  border: 1px solid transparent !important;
  border-left: 3.5px solid transparent !important;
  transition: all 0.15s ease !important;
}

.sidebar-link:hover {
  background-color: #cbd5e1 !important;
  color: var(--ink-heading) !important;
}

.sidebar-link.active {
  background-color: #ffffff !important;
  color: var(--ink-heading) !important;
  font-weight: 700 !important;
  border: 1.5px solid var(--hairline) !important;
  border-left: 3.5px solid #0284c7 !important;
  border-radius: var(--radius-button) !important;
  box-shadow: none !important;
}

.sidebar-link.active svg {
  color: #0284c7 !important;
}

#academic-top-header {
  background-color: var(--surface-bg) !important;
  border-bottom: 1.5px solid var(--hairline) !important;
}

/* Floating map elements & Basin Metrics panel */
.sidebar-panel {
  background: var(--surface-bg) !important;
  border-left: 1.5px solid var(--hairline) !important;
  border-radius: 0 !important;
}

.sidebar-expand-tab {
  background: var(--surface-bg) !important;
  border: 1.5px solid var(--hairline) !important;
  border-right: none !important;
  border-radius: var(--radius-card) 0 0 var(--radius-card) !important;
}

.sidebar-expand-tab:hover {
  background: #ffffff !important;
  border-color: var(--hairline-dark) !important;
}

.map-legend, .map-legend.collapsed {
  background: var(--surface-bg) !important;
  border: 1.5px solid var(--hairline) !important;
  border-radius: var(--radius-card) !important;
}

.map-menu-dropdown {
  background: var(--surface-bg) !important;
  border: 1.5px solid var(--hairline) !important;
  border-radius: var(--radius-card) !important;
}

.map-menu-btn {
  background: var(--surface-bg) !important;
  border: 1.5px solid var(--hairline) !important;
  border-radius: var(--radius-button) !important;
}

.card.layer-card,
.card.outflows-card,
.card.reservoirs-card,
.card.front-range-card,
.card.sectors-card,
.card-academic,
.dashboard-card {
  background: #ffffff !important;
  border: 1.5px solid var(--hairline) !important;
  border-radius: var(--radius-card) !important;
}"""

    # Replace section 3 if present
    content = re.sub(
        r'/\* 3\. Universal Square Corner Look[\s\S]*?/\* 4\. Hairlines Instead of Drop Shadows \*/',
        square_rule + '\n\n/* 5. Hairlines Instead of Drop Shadows */',
        content
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated editorial.css")

def update_index_html():
    path = "web/index.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update body and sidebar styles in <style>
    old_style_block = """    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      height: 100%;
      height: -webkit-fill-available;
      height: 100dvh;
      min-height: 100%;
      min-height: -webkit-fill-available;
      min-height: 100dvh;
      max-height: 100%;
      max-height: -webkit-fill-available;
      max-height: 100dvh;
      overflow: hidden;
      box-sizing: border-box;
    }
    .sidebar-academic {
      background-color: #f8fafc;
      color: #334155;
      border-right: 1px solid #e2e8f0;
      height: 100%;
      height: -webkit-fill-available;
      height: 100dvh;
      max-height: 100%;
      max-height: -webkit-fill-available;
      max-height: 100dvh;
      padding-bottom: max(1.25rem, calc(0.875rem + env(safe-area-inset-bottom, 0px))) !important;
      box-sizing: border-box;
    }"""

    new_style_block = """    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #cbd5e1;
      height: 100%;
      height: -webkit-fill-available;
      height: 100dvh;
      min-height: 100%;
      min-height: -webkit-fill-available;
      min-height: 100dvh;
      max-height: 100%;
      max-height: -webkit-fill-available;
      max-height: 100dvh;
      overflow: hidden;
      box-sizing: border-box;
    }
    .sidebar-academic {
      background-color: #e2e8f0;
      color: #0f172a;
      border-right: 1.5px solid #94a3b8;
      height: 100%;
      height: -webkit-fill-available;
      height: 100dvh;
      max-height: 100%;
      max-height: -webkit-fill-available;
      max-height: 100dvh;
      padding-bottom: max(1.25rem, calc(0.875rem + env(safe-area-inset-bottom, 0px))) !important;
      box-sizing: border-box;
    }"""

    if old_style_block in content:
        content = content.replace(old_style_block, new_style_block)
    else:
        print("Note: old_style_block not matched directly in index.html, using regex")
        content = re.sub(
            r'body\s*\{[\s\S]*?background-color:\s*#[a-f0-9]+;[\s\S]*?box-sizing:\s*border-box;\s*\}\s*\.sidebar-academic\s*\{[\s\S]*?box-sizing:\s*border-box;\s*\}',
            new_style_block.strip(),
            content
        )

    # 2. Update palette classes in <style>
    old_academic_links = """    /* Academic editorial palette matching Tufte / data science presentation */
    .portal-bg {
      background-color: #f8fafc;
    }
    .card-academic {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .sidebar-academic {
      background-color: #f8fafc;
      color: #334155;
      border-right: 1px solid #e2e8f0;
    }
    .sidebar-category-header {
      color: #64748b;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 10px 10px 3px 10px;
      display: flex;
      align-items: center;
    }
    .sidebar-link {
      color: #334155;
      font-weight: 500;
      font-size: 12px;
      padding: 6.5px 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      border: 1px solid transparent;
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      background: transparent;
    }
    .sidebar-link svg {
      color: #64748b;
      flex-shrink: 0;
      transition: color 0.15s ease;
    }
    .sidebar-link:hover {
      background-color: #f1f5f9;
      color: #0f172a;
    }
    .sidebar-link:hover svg {
      color: #334155;
    }
    .sidebar-link.active {
      background-color: #ffffff;
      color: #0f172a;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #0072B2;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .sidebar-link.active svg {
      color: #0072B2 !important;
    }"""

    new_academic_links = """    /* Academic editorial palette matching Tufte / data science presentation */
    .portal-bg {
      background-color: #cbd5e1;
    }
    .card-academic {
      background-color: #ffffff;
      border: 1.5px solid #94a3b8;
      border-radius: 2px;
    }
    .sidebar-academic {
      background-color: #e2e8f0;
      color: #0f172a;
      border-right: 1.5px solid #94a3b8;
    }
    .sidebar-category-header {
      color: #475569;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 10px 10px 3px 10px;
      display: flex;
      align-items: center;
    }
    .sidebar-link {
      color: #1e293b;
      font-weight: 600;
      font-size: 12px;
      padding: 6.5px 10px;
      border-radius: 2px;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      border: 1px solid transparent;
      border-left: 3.5px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      background: transparent;
    }
    .sidebar-link svg {
      color: #64748b;
      flex-shrink: 0;
      transition: color 0.15s ease;
    }
    .sidebar-link:hover {
      background-color: #cbd5e1;
      color: #0f172a;
    }
    .sidebar-link:hover svg {
      color: #0f172a;
    }
    .sidebar-link.active {
      background-color: #ffffff;
      color: #0f172a;
      font-weight: 800;
      border: 1.5px solid #94a3b8;
      border-left: 3.5px solid #0284c7;
      border-radius: 2px;
      box-shadow: none;
    }
    .sidebar-link.active svg {
      color: #0284c7 !important;
    }"""

    if old_academic_links in content:
        content = content.replace(old_academic_links, new_academic_links)
    else:
        print("Note: old_academic_links not matched directly, replacing via regex")
        content = re.sub(
            r'/\* Academic editorial palette[\s\S]*?\.sidebar-link\.active svg\s*\{\s*color:\s*#0072B2\s*!important;\s*\}',
            new_academic_links.strip(),
            content
        )

    # 3. Update body tag
    content = content.replace(
        '<body class="flex flex-col md:flex-row h-full h-[100dvh] max-h-[100dvh] overflow-hidden antialiased bg-[#f8fafc]">',
        '<body class="flex flex-col md:flex-row h-full h-[100dvh] max-h-[100dvh] overflow-hidden antialiased bg-[#cbd5e1]">'
    )

    # 4. Update sidebar aside tag
    content = content.replace(
        '<aside class="sidebar-academic w-full md:w-64 flex-shrink-0 flex flex-col justify-between p-3.5 border-r border-[#e2e8f0] select-none z-30 h-auto md:h-full md:h-[100dvh] md:max-h-[100dvh] overflow-y-auto">',
        '<aside class="sidebar-academic w-full md:w-64 flex-shrink-0 flex flex-col justify-between p-3.5 border-r border-[#94a3b8] select-none z-30 h-auto md:h-full md:h-[100dvh] md:max-h-[100dvh] overflow-y-auto">'
    )

    # 5. Header border inside sidebar
    content = content.replace(
        '<div class="cursor-pointer pb-3 border-b border-[#e2e8f0]" onclick="setTab(\'overview\')">',
        '<div class="cursor-pointer pb-3 border-b border-[#94a3b8]" onclick="setTab(\'overview\')">'
    )

    # 6. Bottom border inside sidebar
    content = content.replace(
        '<div class="pt-3 border-t border-[#e2e8f0] space-y-1">',
        '<div class="pt-3 border-t border-[#94a3b8] space-y-1">'
    )

    # 7. Main tag background
    content = content.replace(
        '<main class="flex-1 flex flex-col h-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f8fafc] relative">',
        '<main class="flex-1 flex flex-col h-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#cbd5e1] relative">'
    )

    # 8. Top academic header
    content = content.replace(
        '<header id="academic-top-header" class="flex-shrink-0 border-b border-[#e2e8f0] bg-white z-10 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">',
        '<header id="academic-top-header" class="flex-shrink-0 border-b border-[#94a3b8] bg-[#e2e8f0] z-10 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">'
    )

    # 9. Cards #act-1 .. #act-4
    for act_id in ['act-1', 'act-2', 'act-3', 'act-4']:
        content = re.sub(
            rf'<div id="{act_id}" class="card-academic bg-white rounded-\[[0-9]+px\] border border-\[#[a-f0-9]+\]',
            f'<div id="{act_id}" class="card-academic bg-white rounded-[2px] border border-[#94a3b8]',
            content
        )

    # 10. Modals #law-modal and #api-modal rounded corners and headers
    content = content.replace(
        '<div class="bg-white rounded-[3px] max-w-5xl w-full max-h-[90vh] flex flex-col border border-[#d6d3d1] overflow-hidden">',
        '<div class="bg-white rounded-[2px] max-w-5xl w-full max-h-[90vh] flex flex-col border border-[#94a3b8] overflow-hidden">'
    )
    content = content.replace(
        '<div class="flex justify-between items-start px-6 py-4 border-b border-[#d6d3d1] bg-[#fafaf9]">',
        '<div class="flex justify-between items-start px-6 py-4 border-b border-[#94a3b8] bg-[#e2e8f0]">'
    )
    content = content.replace(
        '<div class="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-stone-300 overflow-hidden">',
        '<div class="bg-white rounded-[2px] shadow-none max-w-5xl w-full max-h-[90vh] flex flex-col border border-[#94a3b8] overflow-hidden">'
    )
    content = content.replace(
        '<div class="flex justify-between items-center px-6 py-4 border-b border-stone-200 bg-[#faf9f5]">',
        '<div class="flex justify-between items-center px-6 py-4 border-b border-[#94a3b8] bg-[#e2e8f0]">'
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated index.html")

def update_style_css():
    path = "web/style.css"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Update radii variables
    content = re.sub(r'--radius-md:\s*10px;', '--radius-md: 2px;', content)
    content = re.sub(r'--radius-lg:\s*14px;', '--radius-lg: 2px;', content)

    # Update .sidebar-academic duplicate styles in style.css
    old_side_academic = """.sidebar-academic {
  background-color: #f8fafc;
  color: #334155;
  border-right: 1px solid #e2e8f0;
}
.sidebar-category-header {
  color: #64748b;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 10px 10px 3px 10px;
  display: flex;
  align-items: center;
}
.sidebar-link {
  color: #334155;
  font-weight: 500;
  font-size: 12px;
  padding: 6.5px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
}
.sidebar-link svg {
  color: #64748b;
  flex-shrink: 0;
  transition: color 0.15s ease;
}
.sidebar-link:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}
.sidebar-link:hover svg {
  color: #334155;
}
.sidebar-link.active {
  background-color: #ffffff;
  color: #0f172a;
  font-weight: 700;
  border: 1px solid #cbd5e1;
  border-left: 3px solid #0072B2;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.sidebar-link.active svg {
  color: #0072B2 !important;
}"""

    new_side_academic = """.sidebar-academic {
  background-color: var(--bg-surface);
  color: var(--text-main);
  border-right: 1.5px solid var(--border-color);
}
.sidebar-category-header {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 10px 10px 3px 10px;
  display: flex;
  align-items: center;
}
.sidebar-link {
  color: #1e293b;
  font-weight: 600;
  font-size: 12px;
  padding: 6.5px 10px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-left: 3.5px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
}
.sidebar-link svg {
  color: #64748b;
  flex-shrink: 0;
  transition: color 0.15s ease;
}
.sidebar-link:hover {
  background-color: #cbd5e1;
  color: #0f172a;
}
.sidebar-link:hover svg {
  color: #0f172a;
}
.sidebar-link.active {
  background-color: #ffffff;
  color: #0f172a;
  font-weight: 800;
  border: 1.5px solid var(--border-color);
  border-left: 3.5px solid #0284c7;
  border-radius: 2px;
  box-shadow: none;
}
.sidebar-link.active svg {
  color: #0284c7 !important;
}"""

    if old_side_academic in content:
        content = content.replace(old_side_academic, new_side_academic)

    # Standardize map legend background and radii
    content = content.replace(
        "/* Collapsed State (Desktop & Mobile) */\n.map-legend.collapsed {\n  width: auto;\n  max-width: fit-content;\n  max-height: none;\n  background: var(--bg-card);\n  border: 1.5px solid var(--border-color);\n  border-radius: 8px;",
        "/* Collapsed State (Desktop & Mobile) */\n.map-legend.collapsed {\n  width: auto;\n  max-width: fit-content;\n  max-height: none;\n  background: var(--bg-surface);\n  border: 1.5px solid var(--border-color);\n  border-radius: 2px;"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated style.css")

def update_map_embed_html():
    path = "web/map_embed.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Add editorial.css if not present
    if '<link rel="stylesheet" href="editorial.css">' not in content:
        content = content.replace(
            '<link rel="stylesheet" href="style.css">',
            '<link rel="stylesheet" href="style.css">\n  <!-- Editorial Design Standard (Edward Tufte / NYT Restrained Palette) -->\n  <link rel="stylesheet" href="editorial.css">'
        )

    # Tooltip radius
    content = content.replace("border-radius: 8px !important;", "border-radius: 2px !important;")
    # Dropdown radius
    content = content.replace("border-radius: 12px !important;", "border-radius: 2px !important;")
    # Close button radius
    content = content.replace("border-radius: 6px !important;", "border-radius: 2px !important;")
    # Basin metrics tab handle radius
    content = content.replace("border-radius: 9px 0 0 9px !important;", "border-radius: 2px 0 0 2px !important;")

    # Dropdown & Tab & Menu button surface background
    content = content.replace(
        "background: rgba(255, 255, 255, 0.98) !important;\n      backdrop-filter: blur(16px) !important;\n      -webkit-backdrop-filter: blur(16px) !important;\n      border: 1px solid #cbd5e1 !important;",
        "background: var(--bg-surface, #e2e8f0) !important;\n      backdrop-filter: blur(16px) !important;\n      -webkit-backdrop-filter: blur(16px) !important;\n      border: 1.5px solid var(--border-color, #94a3b8) !important;"
    )
    content = content.replace(
        "background: rgba(255, 255, 255, 0.96) !important;\n      backdrop-filter: blur(14px) !important;\n      -webkit-backdrop-filter: blur(14px) !important;\n      border: 1px solid #cbd5e1 !important;",
        "background: var(--bg-surface, #e2e8f0) !important;\n      backdrop-filter: blur(14px) !important;\n      -webkit-backdrop-filter: blur(14px) !important;\n      border: 1.5px solid var(--border-color, #94a3b8) !important;"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated map_embed.html")

if __name__ == "__main__":
    update_editorial_css()
    update_index_html()
    update_style_css()
    update_map_embed_html()
