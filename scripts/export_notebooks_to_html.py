#!/usr/bin/env python3
"""
export_notebooks_to_html.py
Converts Jupyter notebooks in notebooks/ to standalone, beautifully styled,
accessible HTML pages in web/notebooks/ with Pygments syntax highlighting,
KaTeX math support, table of contents, and one-click cloud execution links.
"""

import os
import re
import json
import html
import glob
import shutil
from pygments import highlight
from pygments.lexers import PythonLexer
from pygments.formatters import HtmlFormatter

def slugify(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text)

def markdown_to_html(md_text, toc_entries=None):
    """Simple robust markdown to HTML converter for notebook markdown cells."""
    lines = md_text.split('\n')
    out = []
    in_list = False
    list_type = None
    in_code_block = False
    code_block_lang = ""
    code_block_lines = []
    in_table = False
    table_lines = []

    def close_list():
        nonlocal in_list, list_type
        if in_list:
            out.append(f'</{list_type}>')
            in_list = False
            list_type = None

    def close_table():
        nonlocal in_table, table_lines
        if in_table and table_lines:
            header = table_lines[0]
            rows = table_lines[2:] if len(table_lines) > 2 else []
            table_html = ['<div class="overflow-x-auto my-4"><table class="notebook-table">']
            # Header
            table_html.append('<thead><tr>')
            for col in [c.strip() for c in header.strip('|').split('|')]:
                table_html.append(f'<th>{inline_format(col)}</th>')
            table_html.append('</tr></thead><tbody>')
            # Rows
            for row in rows:
                if not row.strip():
                    continue
                table_html.append('<tr>')
                for col in [c.strip() for c in row.strip('|').split('|')]:
                    table_html.append(f'<td>{inline_format(col)}</td>')
                table_html.append('</tr>')
            table_html.append('</tbody></table></div>')
            out.append(''.join(table_html))
            in_table = False
            table_lines = []

    def inline_format(text):
        placeholders = []

        def hold(html_frag):
            idx = len(placeholders)
            placeholders.append(html_frag)
            return f"\x00PH{idx}\x00"

        # 1. Protect inline code `...` first so underscores/asterisks inside stay untouched
        text = re.sub(r'`([^`]+)`', lambda m: hold(f'<code class="inline-code">{html.escape(m.group(1))}</code>'), text)
        # 2. Protect LaTeX $...$ spans so underscores stay untouched
        text = re.sub(r'\$([^$]+)\$', lambda m: hold(m.group(0)), text)
        # 3. Extract markdown links [text](url) before italicizing underscores in URLs
        def fmt_link(m):
            lbl = m.group(1).replace('\x00', '')
            lbl = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', lbl)
            href = html.escape(m.group(2), quote=True)
            # Restore any protected inline code inside link label
            for i, ph in enumerate(placeholders):
                lbl = lbl.replace(f"PH{i}", ph)
            return hold(f'<a href="{href}" target="_blank" rel="noopener noreferrer" class="notebook-link">{lbl} ↗</a>')

        # Build links safely by formatting inline placeholders after
        links_raw = []
        def hold_link(m):
            idx = len(links_raw)
            links_raw.append((m.group(1), m.group(2)))
            return f"\x01LK{idx}\x01"
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', hold_link, text)

        # 4. Bold and word-boundary italic (ignore underscores inside identifiers/paths)
        text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'__([^_]+)__', r'<strong>\1</strong>', text)
        text = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', text)
        text = re.sub(r'(?<![\w/])_([^_]+)_(?![\w/])', r'<em>\1</em>', text)

        # 5. Restore links and inline placeholders
        for idx, (lbl, url) in enumerate(links_raw):
            for i, ph in enumerate(placeholders):
                lbl = lbl.replace(f"\x00PH{i}\x00", ph)
            href = html.escape(url, quote=True)
            text = text.replace(f"\x01LK{idx}\x01", f'<a href="{href}" target="_blank" rel="noopener noreferrer" class="notebook-link">{lbl} ↗</a>')
        for i, ph in enumerate(placeholders):
            text = text.replace(f"\x00PH{i}\x00", ph)
        return text

    i = 0
    while i < len(lines):
        line = lines[i]

        # Fenced code blocks
        if line.startswith('```'):
            if in_code_block:
                code_content = '\n'.join(code_block_lines)
                if code_block_lang == 'python':
                    highlighted = highlight(code_content, PythonLexer(), HtmlFormatter(nowrap=True))
                    out.append(f'<div class="highlight"><pre><span></span>{highlighted}</pre></div>')
                else:
                    out.append(f'<pre><code>{html.escape(code_content)}</code></pre>')
                in_code_block = False
                code_block_lines = []
            else:
                close_list()
                close_table()
                in_code_block = True
                code_block_lang = line[3:].strip()
            i += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue

        # Tables
        if '|' in line and not line.strip().startswith('```'):
            close_list()
            in_table = True
            table_lines.append(line)
            i += 1
            continue
        elif in_table:
            close_table()

        # Headings
        header_match = re.match(r'^(#{1,6})\s+(.*)$', line)
        if header_match:
            close_list()
            level = len(header_match.group(1))
            heading_text = header_match.group(2).strip()
            slug = slugify(heading_text)
            if toc_entries is not None:
                toc_entries.append({'level': level, 'title': heading_text, 'slug': slug})
            out.append(f'<h{level} id="{slug}" class="notebook-h{level}">{inline_format(heading_text)} <a href="#{slug}" class="anchor-link">#</a></h{level}>')
            i += 1
            continue

        # Blockquote
        if line.startswith('> '):
            close_list()
            out.append(f'<blockquote class="notebook-quote">{inline_format(line[2:])}</blockquote>')
            i += 1
            continue

        # Unordered list
        ul_match = re.match(r'^\s*[-*]\s+(.*)$', line)
        if ul_match:
            if not in_list or list_type != 'ul':
                close_list()
                in_list = True
                list_type = 'ul'
                out.append('<ul class="notebook-ul">')
            out.append(f'<li>{inline_format(ul_match.group(1))}</li>')
            i += 1
            continue

        # Ordered list
        ol_match = re.match(r'^\s*\d+\.\s+(.*)$', line)
        if ol_match:
            if not in_list or list_type != 'ol':
                close_list()
                in_list = True
                list_type = 'ol'
                out.append('<ol class="notebook-ol">')
            out.append(f'<li>{inline_format(ol_match.group(1))}</li>')
            i += 1
            continue

        # Empty line
        if not line.strip():
            close_list()
            i += 1
            continue

        # Normal paragraph
        close_list()
        out.append(f'<p class="notebook-p">{inline_format(line)}</p>')
        i += 1

    close_list()
    close_table()
    return '\n'.join(out)

def render_notebook(ipynb_path, output_html_path):
    with open(ipynb_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)

    filename = os.path.basename(ipynb_path)
    title = filename.replace('.ipynb', '').replace('_', ' ').title()
    toc_entries = []

    # First pass: find main title and collect TOC
    for cell in nb.get('cells', []):
        if cell.get('cell_type') == 'markdown':
            src = ''.join(cell.get('source', []))
            for line in src.split('\n'):
                if line.startswith('# '):
                    title = line[2:].strip()
                    break
            if title:
                break

    rendered_cells = []
    formatter = HtmlFormatter(style='friendly')
    pygments_css = formatter.get_style_defs('.highlight')

    cell_execution_count = 1

    for cell in nb.get('cells', []):
        cell_type = cell.get('cell_type')
        source = ''.join(cell.get('source', []))

        if cell_type == 'markdown':
            cell_html = markdown_to_html(source, toc_entries)
            rendered_cells.append(f'<div class="notebook-cell markdown-cell">{cell_html}</div>')

        elif cell_type == 'code':
            count = cell.get('execution_count') or cell_execution_count
            cell_execution_count += 1

            # Format code with pygments
            highlighted_code = highlight(source, PythonLexer(), HtmlFormatter(nowrap=True))
            code_block = f"""
            <div class="notebook-cell code-cell">
              <div class="code-header">
                <span class="prompt-in">In [{count}]:</span>
                <span class="code-lang">Python 3</span>
              </div>
              <div class="highlight"><pre><span></span>{highlighted_code}</pre></div>
            """

            # Render outputs
            outputs = cell.get('outputs', [])
            if outputs:
                code_block += '<div class="outputs-wrapper">'
                for out in outputs:
                    out_type = out.get('output_type')
                    if out_type == 'stream':
                        text = ''.join(out.get('text', []))
                        code_block += f'<div class="output-item stream-output"><pre class="notebook-output">{html.escape(text)}</pre></div>'
                    elif out_type in ('execute_result', 'display_data'):
                        data = out.get('data', {})
                        if 'image/png' in data:
                            img_b64 = data['image/png'].strip()
                            code_block += f'<div class="output-item image-output my-3 text-center"><img src="data:image/png;base64,{img_b64}" class="max-w-full mx-auto rounded-[2px] border border-[#cfc8ba]" alt="Notebook Plot Output" /></div>'
                        elif 'text/html' in data:
                            html_content = ''.join(data['text/html'])
                            code_block += f'<div class="output-item html-output overflow-x-auto my-2">{html_content}</div>'
                        elif 'text/plain' in data:
                            text = ''.join(data['text/plain'])
                            code_block += f'<div class="output-item text-output"><pre class="notebook-output">{html.escape(text)}</pre></div>'
                    elif out_type == 'error':
                        ename = out.get('ename', 'Error')
                        evalue = out.get('evalue', '')
                        traceback_text = '\n'.join(out.get('traceback', []))
                        # Strip ANSI escape codes
                        clean_tb = re.sub(r'\x1b\[[0-9;]*m', '', traceback_text)
                        code_block += f'<div class="output-item error-output"><pre class="notebook-output text-[#9e3f32] bg-[#fdf3f2] border border-[#e6b8b3]">{html.escape(clean_tb or f"{ename}: {evalue}")}</pre></div>'
                code_block += '</div>'

            code_block += '</div>'
            rendered_cells.append(code_block)

    # Build TOC HTML
    toc_html = []
    for item in toc_entries:
        indent = (item['level'] - 1) * 12
        level_class = "font-bold text-[#0f172a]" if item['level'] <= 2 else "text-[#475569]"
        toc_html.append(f'<a href="#{item["slug"]}" class="block text-xs py-1 hover:text-[#2b5c8f] transition truncate {level_class}" style="padding-left: {indent}px;">{html.escape(item["title"])}</a>')

    toc_rendered = '\n'.join(toc_html) if toc_html else '<p class="text-xs text-stone-500 italic">No section headers detected.</p>'

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} — Colorado River Research Notebook</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="../editorial.css">
  <!-- KaTeX for LaTeX mathematical rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"
          onload="renderMathInElement(document.body, {{delimiters: [{{left: '$$', right: '$$', display: true}}, {{left: '$', right: '$', display: false}}]}});"></script>
  <style>
    body {{
      background-color: #f5f2eb;
      color: #1e293b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
    }}
    {pygments_css}
    .highlight {{
      background-color: #faf8f4;
      border: 1px solid #cfc8ba;
      border-radius: 2px;
      padding: 12px 16px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.5;
    }}
    .code-cell .highlight {{
      border: none;
      border-radius: 0;
    }}
    .inline-code {{
      background-color: #f5f2eb;
      border: 1px solid #dfd9cc;
      border-radius: 2px;
      color: #7c4318;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 85%;
      padding: 0.12em 0.38em;
    }}
    .notebook-cell {{
      margin-bottom: 1.5rem;
    }}
    .code-cell {{
      background: #ffffff;
      border: 1px solid #cfc8ba;
      border-radius: 2px;
      overflow: hidden;
      box-shadow: none;
    }}
    .code-header {{
      background: #ebe4d6;
      border-bottom: 1px solid #cfc8ba;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }}
    .prompt-in {{
      color: #2b5c8f;
      font-weight: 700;
    }}
    .code-lang {{
      color: #475569;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }}
    .outputs-wrapper {{
      border-top: 1px solid #cfc8ba;
      background: #ffffff;
      padding: 10px 14px;
    }}
    .notebook-output {{
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
      background: #faf8f4;
      padding: 8px 12px;
      border-radius: 2px;
      border: 1px solid #dfd9cc;
      color: #1e293b;
      max-height: 380px;
      overflow-y: auto;
    }}
    .notebook-h1 {{ font-size: 1.55rem; font-weight: 900; color: #0f172a; margin-top: 0.25rem; margin-bottom: 0.75rem; border-bottom: 1.5px solid #cfc8ba; padding-bottom: 0.5rem; letter-spacing: -0.02em; }}
    .notebook-h2 {{ font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-top: 1.75rem; margin-bottom: 0.6rem; border-bottom: 1px solid #dfd9cc; padding-bottom: 0.35rem; letter-spacing: -0.01em; }}
    .notebook-h3 {{ font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-top: 1.25rem; margin-bottom: 0.45rem; }}
    .notebook-h4 {{ font-size: 0.95rem; font-weight: 700; color: #334155; margin-top: 1rem; margin-bottom: 0.35rem; }}
    .notebook-p {{ margin-bottom: 0.85rem; font-size: 0.9rem; color: #1e293b; overflow-wrap: anywhere; }}
    .notebook-ul {{ list-style-type: disc; margin-left: 1.5rem; margin-bottom: 0.85rem; font-size: 0.9rem; color: #1e293b; }}
    .notebook-ol {{ list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 0.85rem; font-size: 0.9rem; color: #1e293b; }}
    .notebook-quote {{ border-left: 3px solid #2b5c8f; margin: 1rem 0; color: #334155; background: #f5f2eb; border-top: 1px solid #dfd9cc; border-right: 1px solid #dfd9cc; border-bottom: 1px solid #dfd9cc; padding: 0.7rem 1rem; border-radius: 2px; font-size: 0.875rem; }}
    .notebook-link {{ color: #2b5c8f; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; overflow-wrap: anywhere; }}
    .notebook-link:hover {{ color: #1e436a; }}
    .anchor-link {{ color: #8c8476; margin-left: 0.35rem; text-decoration: none; opacity: 0; transition: opacity 0.15s; font-size: 0.9rem; }}
    h1:hover .anchor-link, h2:hover .anchor-link, h3:hover .anchor-link {{ opacity: 1; }}
    .notebook-table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin: 1rem 0; font-variant-numeric: tabular-nums; }}
    .notebook-table th {{ background: #ebe4d6; border: 1px solid #cfc8ba; padding: 6px 10px; text-align: left; font-weight: 800; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f172a; }}
    .notebook-table td {{ border: 1px solid #dfd9cc; padding: 6px 10px; color: #1e293b; }}
    .notebook-table tr:nth-child(even) {{ background: #faf8f4; }}
    body.in-iframe #btn-back-portal {{ display: none !important; }}
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <script>
    if (window.self !== window.top) {{
      document.body.classList.add('in-iframe');
    }}
  </script>

  <!-- Warm Sandstone Editorial Navigation Header -->
  <header class="sticky top-0 z-50 bg-[#ebe4d6] text-[#0f172a] border-b border-[#cfc8ba]">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-3 min-w-0">
        <a id="btn-back-portal" href="../index.html" class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[2px] bg-white hover:bg-[#faf8f4] text-stone-800 border border-[#b8ae9c] transition shrink-0">
          <span>← System Dashboard</span>
        </a>
        <div class="h-4 w-px bg-[#b8ae9c] hidden sm:block shrink-0"></div>
        <span class="text-xs font-bold text-stone-800 hidden md:inline truncate max-w-md">{html.escape(title)}</span>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <a href="{filename}" download class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-[2px] bg-[#2b5c8f] hover:bg-[#21476e] text-white border border-[#21476e] transition" title="Download raw .ipynb file">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Download .ipynb</span>
        </a>
        <a href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[2px] bg-white hover:bg-[#faf8f4] text-stone-800 border border-[#b8ae9c] transition" title="Open in Google Colab">
          <span>Google Colab ↗</span>
        </a>
        <a href="https://nbviewer.org/" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[2px] bg-white hover:bg-[#faf8f4] text-stone-800 border border-[#b8ae9c] transition" title="Project Jupyter nbviewer">
          <span>nbviewer ↗</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <div class="max-w-7xl mx-auto px-3 sm:px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
    
    <!-- Left Reading Content (3 Columns) -->
    <main class="lg:col-span-3 bg-white p-5 md:p-8 rounded-[2px] border border-[#cfc8ba] min-w-0">
      <div class="mb-4 pb-2.5 border-b border-[#dfd9cc] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-stone-500">
        <span>notebooks/{filename}</span>
        <span>Executed Python 3.11 • SQLite + Matplotlib / Seaborn</span>
      </div>

      <!-- Notebook Rendered Content -->
      <div class="notebook-content">
        {chr(10).join(rendered_cells)}
      </div>
    </main>

    <!-- Right Sticky Table of Contents (1 Column) -->
    <aside class="hidden lg:block lg:col-span-1">
      <div class="sticky top-16 bg-white p-4 rounded-[2px] border border-[#cfc8ba]">
        <h3 class="text-xs font-black uppercase tracking-wider text-stone-700 pb-2 border-b border-[#cfc8ba] mb-3 flex items-center justify-between">
          <span>Table of Contents</span>
          <span class="text-[10px] font-normal text-stone-500">Sections</span>
        </h3>
        <nav class="space-y-0.5 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          {toc_rendered}
        </nav>
      </div>
    </aside>

  </div>

  <!-- Editorial Footer -->
  <footer class="bg-[#ebe4d6] border-t border-[#cfc8ba] px-6 py-3 mt-10">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] text-stone-600">
      <span>Colorado River Basin • DAT1001 • Douglas Schoch • Fall 2026</span>
      <a href="../index.html" class="font-bold text-stone-800 hover:text-stone-950">← Return to System Dashboard</a>
    </div>
  </footer>

</body>
</html>
"""

    with open(output_html_path, 'w', encoding='utf-8') as f:
        f.write(html_template)
    print(f"Rendered: {ipynb_path} -> {output_html_path}")

def main():
    notebook_files = glob.glob('notebooks/*.ipynb')
    os.makedirs('web/notebooks', exist_ok=True)
    
    for nb in sorted(notebook_files):
        base = os.path.basename(nb)
        shutil.copy2(nb, os.path.join('web/notebooks', base))
        out_name = os.path.splitext(base)[0] + '.html'
        out_path = os.path.join('web/notebooks', out_name)
        render_notebook(nb, out_path)

if __name__ == '__main__':
    main()
