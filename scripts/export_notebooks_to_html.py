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
                            code_block += f'<div class="output-item image-output my-3 text-center"><img src="data:image/png;base64,{img_b64}" class="max-w-full rounded shadow-sm border border-stone-200" alt="Notebook Plot Output" /></div>'
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
                        code_block += f'<div class="output-item error-output"><pre class="notebook-output text-rose-700 bg-rose-50 border border-rose-200">{html.escape(clean_tb or f"{ename}: {evalue}")}</pre></div>'
                code_block += '</div>'

            code_block += '</div>'
            rendered_cells.append(code_block)

    # Build TOC HTML
    toc_html = []
    for item in toc_entries:
        indent = (item['level'] - 1) * 12
        level_class = "font-bold text-stone-800" if item['level'] <= 2 else "text-stone-600"
        toc_html.append(f'<a href="#{item["slug"]}" class="block text-xs py-1 hover:text-sky-700 transition truncate {level_class}" style="padding-left: {indent}px;">{html.escape(item["title"])}</a>')

    toc_rendered = '\n'.join(toc_html) if toc_html else '<p class="text-xs text-stone-500 italic">No section headers detected.</p>'

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} — Colorado River Research Notebook</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- KaTeX for LaTeX mathematical rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"
          onload="renderMathInElement(document.body, {{delimiters: [{{left: '$$', right: '$$', display: true}}, {{left: '$', right: '$', display: false}}]}});"></script>
  <style>
    body {{
      background-color: #faf9f5;
      color: #1c1917;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
    }}
    {pygments_css}
    .highlight {{
      background-color: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 12px 16px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }}
    .inline-code {{
      background-color: rgba(27, 31, 35, 0.05);
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 85%;
      padding: 0.2em 0.4em;
    }}
    .notebook-cell {{
      margin-bottom: 1.75rem;
    }}
    .code-cell {{
      background: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }}
    .code-header {{
      background: #fbfbfa;
      border-b: 1px solid #e7e5e4;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-family: ui-monospace, monospace;
    }}
    .prompt-in {{
      color: #0284c7;
      font-weight: 700;
    }}
    .code-lang {{
      color: #78716c;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }}
    .outputs-wrapper {{
      border-top: 1px solid #e7e5e4;
      background: #ffffff;
      padding: 10px 14px;
    }}
    .notebook-output {{
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
      background: #fafaf9;
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #f5f5f4;
      color: #292524;
      max-height: 380px;
      overflow-y: auto;
    }}
    .notebook-h1 {{ font-size: 1.75rem; font-weight: 900; color: #1c1917; margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 2px solid #e7e5e4; padding-bottom: 0.5rem; }}
    .notebook-h2 {{ font-size: 1.35rem; font-weight: 800; color: #1c1917; margin-top: 1.75rem; margin-bottom: 0.6rem; border-bottom: 1px solid #e7e5e4; padding-bottom: 0.35rem; }}
    .notebook-h3 {{ font-size: 1.15rem; font-weight: 700; color: #292524; margin-top: 1.25rem; margin-bottom: 0.5rem; }}
    .notebook-h4 {{ font-size: 1.0rem; font-weight: 600; color: #44403c; margin-top: 1rem; margin-bottom: 0.4rem; }}
    .notebook-p {{ margin-bottom: 0.85rem; font-size: 0.9375rem; color: #292524; }}
    .notebook-ul {{ list-style-type: disc; margin-left: 1.5rem; margin-bottom: 0.85rem; font-size: 0.9375rem; color: #292524; }}
    .notebook-ol {{ list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 0.85rem; font-size: 0.9375rem; color: #292524; }}
    .notebook-quote {{ border-left: 4px solid #0284c7; padding-left: 1rem; margin: 1rem 0; color: #44403c; background: #f0f9ff; padding: 0.75rem 1rem; border-radius: 0 4px 4px 0; }}
    .notebook-link {{ color: #0284c7; text-decoration: underline; text-underline-offset: 2px; font-weight: 500; }}
    .notebook-link:hover {{ color: #0369a1; }}
    .anchor-link {{ color: #a8a29e; margin-left: 0.35rem; text-decoration: none; opacity: 0; transition: opacity 0.2s; font-size: 0.9rem; }}
    h1:hover .anchor-link, h2:hover .anchor-link, h3:hover .anchor-link {{ opacity: 1; }}
    .notebook-table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin: 1rem 0; }}
    .notebook-table th {{ background: #f5f5f4; border: 1px solid #d6d3d1; padding: 6px 10px; text-align: left; font-weight: 700; color: #1c1917; }}
    .notebook-table td {{ border: 1px solid #e7e5e4; padding: 6px 10px; color: #292524; }}
    .notebook-table tr:nth-child(even) {{ background: #fafaf9; }}
  </style>
</head>
<body class="min-h-screen flex flex-col">

  <!-- Top Sticky Navigation Bar -->
  <header class="sticky top-0 z-50 bg-[#1c1917] text-stone-100 border-b border-stone-800 shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-3">
        <a href="../index.html?tab=overview" class="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-sky-300 hover:text-sky-200 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span>Return to Portal</span>
        </a>
        <div class="h-4 w-px bg-stone-700 hidden sm:block"></div>
        <span class="text-xs font-bold text-stone-300 hidden md:inline truncate max-w-md">{html.escape(title)}</span>
      </div>

      <div class="flex items-center gap-2">
        <a href="{filename}" download class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition" title="Download raw .ipynb file">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          <span>Download .ipynb</span>
        </a>
        <a href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 transition" title="Open in Google Colab (Upload from computer or link)">
          <svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M16.9 8.2a4.8 4.8 0 00-6.8 0L3.5 14.8a4.8 4.8 0 106.8 6.8l6.6-6.6a4.8 4.8 0 000-6.8zm-1.4 5.4l-6.6 6.6a2.8 2.8 0 11-4-4l6.6-6.6a2.8 2.8 0 114 4z"/></svg>
          <span>Google Colab</span>
        </a>
        <a href="https://nbviewer.org/" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition" title="Project Jupyter nbviewer">
          <span>nbviewer ↗</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <div class="max-w-7xl mx-auto px-4 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
    
    <!-- Left Reading Content (3 Columns) -->
    <main class="lg:col-span-3 bg-white p-6 md:p-10 rounded-xl border border-stone-200 shadow-sm min-w-0">
      <div class="mb-6 pb-6 border-b border-stone-200">
        <div class="flex items-center gap-2 mb-2 flex-wrap">
          <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">DAT 1001 Research</span>
          <span class="text-[10px] font-bold text-stone-500">Colorado River Basin Data Pipeline</span>
          <span class="text-[10px] font-bold text-stone-400">•</span>
          <span class="text-[10px] font-mono text-stone-500">{filename}</span>
        </div>
        <h1 class="text-2xl md:text-3xl font-black text-stone-900 tracking-tight leading-tight">{html.escape(title)}</h1>
        <p class="text-xs text-stone-600 mt-2">Static archival rendering generated from the master research repository. Interactive code blocks, mathematical formulations, and data figures preserved.</p>
      </div>

      <!-- Notebook Rendered Content -->
      <div class="notebook-content">
        {chr(10).join(rendered_cells)}
      </div>
    </main>

    <!-- Right Sticky Table of Contents (1 Column) -->
    <aside class="hidden lg:block lg:col-span-1">
      <div class="sticky top-20 bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
        <h3 class="text-xs font-black uppercase tracking-wider text-stone-500 pb-2 border-b border-stone-200 mb-3 flex items-center justify-between">
          <span>Table of Contents</span>
          <span class="text-[10px] font-normal text-stone-400">Jump to section</span>
        </h3>
        <nav class="space-y-0.5 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          {toc_rendered}
        </nav>
      </div>
    </aside>

  </div>

  <!-- Footer -->
  <footer class="bg-stone-100 border-t border-stone-200 py-6 text-center text-xs text-stone-500 mt-12">
    <p>Colorado River Basin • Douglas Schoch • Open Hydrologic Science</p>
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
        out_name = os.path.splitext(base)[0] + '.html'
        out_path = os.path.join('web/notebooks', out_name)
        render_notebook(nb, out_path)

if __name__ == '__main__':
    main()
