#!/usr/bin/env python3
"""
compile_full_ai_transcript.py

Compiles all authentic Colorado River Basin AI dialogues (User Prompts + AI Responses)
into a single, self-contained, high-performance HTML audit archive:
web/ai_complete_prompt_archive.html.

- Extracts both User Prompts and AI Responses in chronological order.
- Staged user screenshots and early Gemini mockups directly into web/audit_assets/
- Excludes completely unrelated projects (Opera Libretto, Ski Map, Resume site)
- Provides full search, session filters, quick "Expand/Collapse All Responses" controls,
  and clean print styles for academic audit compliance.
"""

import os
import sys
import glob
import json
import re
import shutil
import html
from datetime import datetime

CO_SESSIONS = [
    '020c8971-5c78-4eba-8811-cea3997b058e',
    '0fedef31-6991-497d-9a19-33180dfdcf02',
    '2f11e2b7-7ffb-48a6-9f23-da3993acea64',
    '4435b62e-8fe9-444c-a9e1-fde4adac282d',
    '58cfdbf8-91b4-4263-ad4e-596d29fac1a2',
    'bbab402d-c7b9-479d-b2e0-9fb8404a0e69',
    'f3a97760-d230-4b4e-8463-96f71462f340',
    'aad5e810-76c0-4f7e-a9c4-9eb2855ee883'
]

SESSION_LABELS = {
    '020c8971-5c78-4eba-8811-cea3997b058e': 'Session 1: Initial Architecture & Planning Interview (Sep 27)',
    'bbab402d-c7b9-479d-b2e0-9fb8404a0e69': 'Session 2: Hydrology Pipelines & Live USGS Automation (Oct 15)',
    '4435b62e-8fe9-444c-a9e1-fde4adac282d': 'Session 3: Basin Cartography & Visual Flow Balance (Oct 23)',
    '2f11e2b7-7ffb-48a6-9f23-da3993acea64': 'Session 4: Reservoir Dynamics & Minard Flow Replay (Nov 03)',
    '58cfdbf8-91b4-4263-ad4e-596d29fac1a2': 'Session 5: ML Richards-Baker Flashiness & Legal Accounting (Nov 08-19)',
    '0fedef31-6991-497d-9a19-33180dfdcf02': 'Session 6: Workspace & Codebase Audit Verification (Nov 19)',
    'f3a97760-d230-4b4e-8463-96f71462f340': 'Session 7: Deep Architecture Defense & Academic Disclosure (Nov 19-20)',
    'aad5e810-76c0-4f7e-a9c4-9eb2855ee883': 'Session 8: Corridor Palette Unification, Sankey Brackets & Single Notebook Consolidation (Nov 20-22)'
}

def clean_markdown_to_html(text):
    if not text:
        return ''
    # Escape HTML characters first
    escaped = html.escape(text)
    
    # Format code blocks ```lang ... ```
    def replace_code_block(match):
        code_body = match.group(2)
        lang = match.group(1) or 'code'
        return f'<div class="code-block-header">{lang}</div><pre class="code-block"><code>{code_body}</code></pre>'
    escaped = re.sub(r'```([a-zA-Z0-9_\-\+]*)\n(.*?)```', replace_code_block, escaped, flags=re.DOTALL)
    
    # Format inline code `...`
    escaped = re.sub(r'`([^`\n]+)`', r'<code class="inline-code">\1</code>', escaped)
    
    # Bold **...**
    escaped = re.sub(r'\*\*([^\*\n]+)\*\*', r'<strong>\1</strong>', escaped)
    
    # Italic *...*
    escaped = re.sub(r'\*([^\*\n]+)\*', r'<em>\1</em>', escaped)
    
    # Headers
    escaped = re.sub(r'^### (.*?)$', r'<h4 class="ai-heading">\1</h4>', escaped, flags=re.MULTILINE)
    escaped = re.sub(r'^## (.*?)$', r'<h3 class="ai-heading">\1</h3>', escaped, flags=re.MULTILINE)
    escaped = re.sub(r'^# (.*?)$', r'<h2 class="ai-heading">\1</h2>', escaped, flags=re.MULTILINE)
    
    # Bullet points
    escaped = re.sub(r'^\s*[\*\-]\s+(.*?)$', r'<li class="ai-li">\1</li>', escaped, flags=re.MULTILINE)
    # Convert consecutive <li> into <ul>
    escaped = re.sub(r'((?:<li class="ai-li">.*?</li>\n?)+)', r'<ul class="ai-ul">\1</ul>', escaped)
    
    # Line breaks for remaining text
    # Paragraphs
    parts = escaped.split('\n\n')
    formatted_parts = []
    for p in parts:
        p_clean = p.strip()
        if not p_clean:
            continue
        if p_clean.startswith('<h') or p_clean.startswith('<pre') or p_clean.startswith('<div') or p_clean.startswith('<ul'):
            formatted_parts.append(p_clean)
        else:
            p_with_br = p_clean.replace('\n', '<br>')
            formatted_parts.append(f'<p>{p_with_br}</p>')
            
    return '\n'.join(formatted_parts)

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    web_dir = os.path.join(root_dir, 'web')
    assets_dir = os.path.join(web_dir, 'audit_assets')
    
    # Wipe audit assets to remove any previously staged non-CO images
    if os.path.exists(assets_dir):
        shutil.rmtree(assets_dir)
    os.makedirs(assets_dir, exist_ok=True)
    
    print(f"Purged and recreated {assets_dir}")
    
    # 1. Copy initial mockups, Gemini HTML prototype, and any PDF exports from mockups/
    mockups_src = os.path.join(root_dir, 'mockups')
    early_mockups = []
    early_docs = []
    if os.path.exists(mockups_src):
        for mf in sorted(os.listdir(mockups_src)):
            src_file = os.path.join(mockups_src, mf)
            if mf.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                dest_fn = f"gemini_mockup_{mf}"
                shutil.copy2(src_file, os.path.join(assets_dir, dest_fn))
                early_mockups.append({
                    'src': f"audit_assets/{dest_fn}",
                    'name': mf,
                    'title': 'Early Concept Mockup (Gemini Prototyping - Sep 22, 2026)'
                })
            elif mf.lower().endswith(('.html', '.pdf')):
                dest_fn = f"gemini_doc_{mf}"
                shutil.copy2(src_file, os.path.join(assets_dir, dest_fn))
                early_docs.append({'src': f"audit_assets/{dest_fn}", 'name': mf})
    print(f"Copied {len(early_mockups)} early mockups and {len(early_docs)} Gemini HTML/PDF docs into audit_assets/")
    
    # 2. Extract dialogue turns from authentic Colorado River sessions
    all_dialogues = []
    image_copy_count = 0
    
    for cid in CO_SESSIONS:
        b_dir = os.path.expanduser(f'~/.gemini/antigravity/brain/{cid}')
        t_full = os.path.join(b_dir, '.system_generated', 'logs', 'transcript_full.jsonl')
        t_compact = os.path.join(b_dir, '.system_generated', 'logs', 'transcript.jsonl')
        
        target_path = t_full if os.path.exists(t_full) else t_compact
        if not os.path.exists(target_path):
            continue
            
        with open(target_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
        for i, line in enumerate(lines):
            try:
                step = json.loads(line)
            except Exception:
                continue
                
            if step.get('type') == 'USER_INPUT' and step.get('source') == 'USER_EXPLICIT':
                raw_content = step.get('content', '')
                req_match = re.search(r'<USER_REQUEST>(.*?)</USER_REQUEST>', raw_content, re.DOTALL)
                if req_match:
                    clean_prompt = req_match.group(1).strip()
                else:
                    clean_prompt = re.sub(r'<ADDITIONAL_METADATA>.*?</ADDITIONAL_METADATA>', '', raw_content, flags=re.DOTALL)
                    clean_prompt = re.sub(r'<USER_SETTINGS_CHANGE>.*?</USER_SETTINGS_CHANGE>', '', clean_prompt, flags=re.DOTALL)
                    clean_prompt = clean_prompt.strip()
                    
                created_at = step.get('created_at', '')
                raw_media = step.get('media', [])
                
                # Copy media if present
                staged_media = []
                # Explicit list of accidental cross-project uploads to exclude:
                EXCLUDED_MEDIA = {
                    'media_1794015881323_136d6b63.jpg', # Accidental clipboard upload from ski project (Abbotsford/Canada border)
                }
                for m in raw_media:
                    uri = m.get('uri', '')
                    if uri and os.path.exists(uri):
                        fn = os.path.basename(uri)
                        if fn in EXCLUDED_MEDIA:
                            continue
                        fn = os.path.basename(uri)
                        asset_fn = f"{cid[:8]}_{fn}"
                        dest_path = os.path.join(assets_dir, asset_fn)
                        if not os.path.exists(dest_path):
                            shutil.copy2(uri, dest_path)
                            image_copy_count += 1
                        staged_media.append({
                            'src': f"audit_assets/{asset_fn}",
                            'name': fn,
                            'mime_type': m.get('mime_type', 'image/png')
                        })
                        
                # Look ahead for assistant responses and actions
                assistant_replies = []
                tools_used = []
                for j in range(i + 1, len(lines)):
                    next_step = json.loads(lines[j])
                    if next_step.get('type') == 'USER_INPUT':
                        break
                    if next_step.get('type') == 'PLANNER_RESPONSE':
                        c = next_step.get('content')
                        if c and c.strip():
                            assistant_replies.append(c.strip())
                        for tc in next_step.get('tool_calls', []):
                            args = tc.get('args', {})
                            summary = args.get('toolSummary') or tc.get('tool')
                            if summary and summary not in tools_used:
                                tools_used.append(summary)
                                
                all_dialogues.append({
                    'session_id': cid,
                    'created_at': created_at,
                    'prompt': clean_prompt,
                    'media': staged_media,
                    'assistant_text': '\n\n---\n\n'.join(assistant_replies) if assistant_replies else None,
                    'tools_used': tools_used
                })

    # Sort strictly chronologically
    def parse_time(item):
        ts = item.get('created_at', '')
        if ts:
            try:
                clean_ts = re.sub(r'([+-]\d{2}):(\d{2})$', r'\1\2', ts)
                return datetime.fromisoformat(clean_ts)
            except Exception:
                pass
        return datetime.min

    all_dialogues.sort(key=parse_time)
    print(f"Total authentic Colorado River dialogues compiled: {len(all_dialogues)}")
    print(f"Total user-uploaded images verified and staged: {image_copy_count}")

    # Generate Dialogue HTML Cards
    dialogue_html = []
    for idx, item in enumerate(all_dialogues, 1):
        cid = item['session_id']
        ts = item['created_at']
        p_text = html.escape(item['prompt'])
        media_items = item['media']
        tools = item['tools_used']
        ai_resp = item['assistant_text']
        
        media_html = ""
        if media_items:
            m_cards = []
            for m in media_items:
                m_cards.append(f"""
                <div class="user-screenshot-wrap">
                    <a href="{m['src']}" target="_blank" rel="noopener noreferrer">
                        <img src="{m['src']}" alt="Attached screenshot" class="user-screenshot-thumb" loading="lazy" />
                    </a>
                    <span class="screenshot-label">{html.escape(m['name'])}</span>
                </div>
                """)
            media_html = f"""<div class="screenshot-gallery">{''.join(m_cards)}</div>"""
            
        tool_pill_html = ""
        if tools:
            clean_tools = [html.escape(t.strip('"')) for t in tools[:8]]
            more_tag = f'<span class="tool-pill more">+{len(tools) - 8} more</span>' if len(tools) > 8 else ''
            tool_pill_html = f"""
            <div class="tool-list">
                <span class="tool-header">Actions:</span>
                {''.join(f'<span class="tool-pill">{t}</span>' for t in clean_tools)}
                {more_tag}
            </div>
            """
            
        if ai_resp:
            formatted_ai = clean_markdown_to_html(ai_resp)
            ai_section = f"""
            <div class="ai-response-container">
                <button class="ai-toggle-btn" onclick="toggleResponse({idx})">
                    <span id="ai-toggle-icon-{idx}">▼</span> View AI Response
                </button>
                <div id="ai-response-body-{idx}" class="ai-response-body">
                    {tool_pill_html}
                    <div class="ai-markdown-content">
                        {formatted_ai}
                    </div>
                </div>
            </div>
            """
        elif tools:
            ai_section = f"""
            <div class="ai-response-container">
                <div class="ai-action-only">
                    {tool_pill_html}
                </div>
            </div>
            """
        else:
            ai_section = """
            <div class="ai-response-container">
                <div class="ai-action-only empty">Turn concluded without additional text.</div>
            </div>
            """

        sess_label = SESSION_LABELS.get(cid, f"Session {cid[:8]}")
        card = f"""
        <article class="audit-card" data-idx="{idx}" data-cid="{cid}" data-ts="{ts}">
            <div class="card-meta">
                <span class="badge-idx">#{idx}</span>
                <span class="badge-session">{html.escape(sess_label)}</span>
                <time class="meta-time">{html.escape(ts)}</time>
            </div>
            <div class="user-prompt-wrap">
                <div class="speaker-tag user">USER PROMPT</div>
                <div class="prompt-text">{p_text}</div>
                {media_html}
            </div>
            {ai_section}
        </article>
        """
        dialogue_html.append(card)

    # Mockups HTML
    mockup_gallery_html = ""
    if early_mockups or early_docs:
        m_items = []
        for m in early_mockups:
            m_items.append(f"""
            <div class="mockup-card">
                <a href="{m['src']}" target="_blank" rel="noopener noreferrer">
                    <img src="{m['src']}" alt="{html.escape(m['title'])}" class="mockup-img" loading="lazy" />
                </a>
                <div class="mockup-title">{html.escape(m['title'])}</div>
                <div class="mockup-fn">{html.escape(m['name'])}</div>
            </div>
            """)
        doc_links = "".join(
            f'<a href="{d["src"]}" target="_blank" rel="noopener noreferrer" class="tool-pill" style="text-decoration:none;margin-right:6px;">{html.escape(d["name"])} ↗</a>'
            for d in early_docs
        )
        doc_row = f'<div style="margin-top:12px;font-size:12px;"><strong>Early Gemini Prototype / PDF Exports:</strong> {doc_links}</div>' if doc_links else ""
        mockup_gallery_html = f"""
        <section class="mockup-section">
            <h2 class="section-title">Pre-Development Artifacts: Early Gemini Concept Mockups (Sep 2026)</h2>
            <p class="section-desc">Before development began in Antigravity on September 27, early user flows and aesthetic layouts were brainstormed with Gemini. These artifacts guided the initial wireframes.</p>
            <div class="mockup-grid">
                {''.join(m_items)}
            </div>
            {doc_row}
        </section>
        """

    total_turns = len(all_dialogues)
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Interaction & Dialogue Archive — Colorado River Basin Project</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
            :root {{
            --canvas-bg: #fafaf9;
            --surface-bg: #ffffff;
            --surface-subtle: #f8fafc;
            --user-bubble: #f1f5f9;
            --ink-heading: #0f172a;
            --ink-body: #334155;
            --ink-muted: #64748b;
            --ink-subtle: #94a3b8;
            --hairline: #e2e8f0;
            --hairline-dark: #cbd5e1;
            --accent-blue: #0284c7;
            --accent-cyan: #0891b2;
            --accent-amber: #d97706;
            --code-bg: #f8fafc;
        }}
        
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        
        body {{
            background-color: var(--canvas-bg);
            color: var(--ink-body);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            padding-bottom: 5rem;
        }}
        
        header.audit-header {{
            background: #ffffff;
            border-bottom: 1px solid var(--hairline);
            padding: 2rem 2rem 1.25rem;
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        .audit-meta-line {{
            font-size: 0.9rem;
            color: var(--ink-muted);
            margin-top: 0.35rem;
        }}
        
        .header-tag {{
            display: inline-block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--accent-cyan);
            border: 1px solid #bae6fd;
            background: #f0f9ff;
            padding: 0.2rem 0.6rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        
        h1.audit-title {{
            font-size: 2.2rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: var(--ink-heading);
            margin-bottom: 0.8rem;
        }}
        
        .audit-subtitle {{
            font-size: 1.05rem;
            color: var(--ink-muted);
            max-width: 900px;
            margin-bottom: 2rem;
            line-height: 1.7;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.25rem;
            margin-top: 1.5rem;
        }}
        
        .stat-card {{
            background: var(--surface-bg);
            border: 1px solid var(--hairline);
            border-radius: 8px;
            padding: 1.25rem;
        }}
        
        .stat-val {{
            font-size: 2rem;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            color: var(--accent-blue);
            margin-bottom: 0.25rem;
        }}
        
        .stat-label {{
            font-size: 0.85rem;
            color: var(--ink-muted);
            font-weight: 500;
        }}
        
        main.audit-container {{
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1.5rem;
        }}
        
        /* Sticky Filter Bar */
        .controls-sticky {{
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(250, 250, 249, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid var(--hairline-dark);
            border-radius: 10px;
            padding: 1rem 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.05);
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            align-items: center;
            justify-content: space-between;
        }}
        
        .search-box-wrap {{
            flex: 1 1 320px;
            position: relative;
        }}
        
        .search-input {{
            width: 100%;
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 6px;
            color: var(--ink-heading);
            padding: 0.65rem 1rem;
            font-size: 0.95rem;
            font-family: inherit;
            outline: none;
            transition: border-color 0.15s ease;
        }}
        
        .search-input:focus {{
            border-color: var(--accent-blue);
        }}
        
        .filter-controls {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
        }}
        
        .filter-select {{
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 6px;
            color: var(--ink-body);
            padding: 0.65rem 1rem;
            font-size: 0.875rem;
            outline: none;
            cursor: pointer;
        }}
        
        .action-btn {{
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 6px;
            color: var(--ink-body);
            padding: 0.65rem 1.1rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }}
        
        .action-btn:hover {{
            background: #f1f5f9;
            border-color: var(--accent-blue);
            color: var(--accent-blue);
        }}

        /* Mockup Section */
        .mockup-section {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2.5rem;
        }}
        
        .section-title {{
            font-size: 1.3rem;
            font-weight: 700;
            color: var(--ink-heading);
            margin-bottom: 0.5rem;
        }}
        
        .section-desc {{
            color: var(--ink-muted);
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
            max-width: 850px;
        }}
        
        .mockup-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }}
        
        .mockup-card {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.15s ease, border-color 0.15s ease;
        }}
        
        .mockup-card:hover {{
            transform: translateY(-2px);
            border-color: var(--accent-blue);
        }}
        
        .mockup-img {{
            width: 100%;
            height: 190px;
            object-fit: cover;
            display: block;
            border-bottom: 1px solid var(--hairline);
        }}
        
        .mockup-title {{
            padding: 0.75rem 1rem 0.25rem;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--ink-heading);
        }}
        
        .mockup-fn {{
            padding: 0 1rem 0.75rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--ink-muted);
        }}

        /* Dialogue List */
        .dialogue-stream {{
            display: flex;
            flex-direction: column;
            gap: 1.75rem;
        }}
        
        .audit-card {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
            transition: border-color 0.15s ease;
        }}
        
        .audit-card:hover {{
            border-color: var(--hairline-dark);
        }}
        
        .card-meta {{
            background: #f8fafc;
            border-bottom: 1px solid var(--hairline);
            padding: 0.75rem 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.8rem;
        }}
        
        .badge-idx {{
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            color: var(--accent-blue);
            background: #e0f2fe;
            border: 1px solid #bae6fd;
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
        }}
        
        .badge-session {{
            color: var(--ink-heading);
            font-weight: 600;
        }}
        
        .meta-time {{
            margin-left: auto;
            color: var(--ink-muted);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
        }}
        
        /* Speaker Blocks */
        .user-prompt-wrap {{
            background: #f8fafc;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--hairline);
        }}
        
        .speaker-tag {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-bottom: 0.5rem;
            display: inline-block;
            text-transform: uppercase;
        }}
        
        .speaker-tag.user {{
            color: var(--accent-blue);
        }}
        
        .prompt-text {{
            font-size: 0.975rem;
            color: var(--ink-heading);
            white-space: pre-wrap;
            line-height: 1.6;
        }}
        
        .screenshot-gallery {{
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px dashed var(--hairline-dark);
        }}
        
        .user-screenshot-wrap {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 6px;
            padding: 0.5rem;
            max-width: 260px;
        }}
        
        .user-screenshot-thumb {{
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 4px;
            display: block;
            border: 1px solid var(--hairline);
            transition: opacity 0.15s ease;
        }}
        
        .user-screenshot-thumb:hover {{
            opacity: 0.85;
        }}
        
        .screenshot-label {{
            display: block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            color: var(--ink-muted);
            margin-top: 0.4rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        
        /* AI Response Section */
        .ai-response-container {{
            background: #ffffff;
            padding: 0;
        }}
        
        .ai-toggle-btn {{
            width: 100%;
            background: transparent;
            border: none;
            padding: 0.75rem 1.5rem;
            text-align: left;
            color: var(--accent-blue);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-bottom: 1px solid transparent;
            transition: background 0.15s ease;
        }}
        
        .ai-toggle-btn:hover {{
            background: #f8fafc;
        }}
        
        .ai-response-body {{
            display: block;
            padding: 1.25rem 1.5rem 1.5rem;
            border-top: 1px solid var(--hairline);
        }}
        
        .ai-response-body.collapsed {{
            display: none;
        }}
        
        .tool-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            align-items: center;
            margin-bottom: 1.25rem;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--hairline);
        }}
        
        .tool-header {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--ink-muted);
            margin-right: 0.25rem;
        }}
        
        .tool-pill {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            background: #f1f5f9;
            border: 1px solid var(--hairline);
            color: var(--ink-body);
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
        }}
        
        .tool-pill.more {{
            background: #fef3c7;
            border-color: #fde68a;
            color: #b45309;
        }}
        
        .ai-action-only {{
            padding: 0.85rem 1.5rem;
            font-size: 0.85rem;
            color: var(--ink-muted);
        }}
        
        .ai-action-only.empty {{
            font-style: italic;
            font-size: 0.8rem;
            color: var(--ink-subtle);
        }}
        
        /* Markdown formatting inside responses */
        .ai-markdown-content {{
            font-size: 0.95rem;
            color: var(--ink-body);
            line-height: 1.7;
        }}
        
        .ai-markdown-content p {{
            margin-bottom: 1rem;
        }}
        
        .ai-markdown-content p:last-child {{
            margin-bottom: 0;
        }}
        
        .ai-markdown-content .ai-heading {{
            color: var(--ink-heading);
            margin: 1.25rem 0 0.5rem;
            font-weight: 700;
        }}
        
        .ai-markdown-content .inline-code {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85em;
            background: #f1f5f9;
            border: 1px solid var(--hairline);
            color: #b45309;
            padding: 0.1em 0.35em;
            border-radius: 3px;
        }}
        
        .code-block-header {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            background: #f1f5f9;
            color: var(--ink-muted);
            padding: 0.3rem 0.75rem;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
            border: 1px solid var(--hairline);
            border-bottom: none;
            margin-top: 1rem;
        }}
        
        .code-block {{
            background: #f8fafc;
            border: 1px solid var(--hairline);
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
            padding: 1rem;
            overflow-x: auto;
            margin-bottom: 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: var(--ink-heading);
            line-height: 1.5;
        }}
        
        .ai-ul {{
            margin: 0.75rem 0 1rem 1.5rem;
        }}
        
        .ai-li {{
            margin-bottom: 0.4rem;
        }}
</style>
</head>
<body>

<header class="audit-header">
    <h1 class="audit-title">Colorado River Basin Platform — AI Dialogue Archive</h1>
    <div class="audit-meta-line">
        <span>Sessions 1–8</span> &bull; 
        <span>Sep 27 – Nov 22, 2026</span> &bull; 
        <span>{total_turns} dialogues</span> &bull; 
        <span>{image_copy_count + len(early_mockups)} screenshots</span>
    </div>
</header>

<main class="audit-container">
    <div class="controls-sticky">
        <div class="search-box-wrap">
            <input type="text" id="searchInput" class="search-input" placeholder="Search prompts, code, error messages, or USGS stations..." oninput="filterDialogues()">
        </div>
        <div class="filter-controls">
            <select id="sessionFilter" class="filter-select" onchange="filterDialogues()">
                <option value="ALL">All 7 Sessions (Chronological)</option>
                <option value="020c8971-5c78-4eba-8811-cea3997b058e">Session 1: Architecture & Planning (Sep 27)</option>
                <option value="bbab402d-c7b9-479d-b2e0-9fb8404a0e69">Session 2: Hydrology Pipelines (Oct 15)</option>
                <option value="4435b62e-8fe9-444c-a9e1-fde4adac282d">Session 3: Basin Cartography (Oct 23)</option>
                <option value="2f11e2b7-7ffb-48a6-9f23-da3993acea64">Session 4: Minard Flow Replay (Nov 03)</option>
                <option value="58cfdbf8-91b4-4263-ad4e-596d29fac1a2">Session 5: ML & Legal Accounting (Nov 08-19)</option>
                <option value="0fedef31-6991-497d-9a19-33180dfdcf02">Session 6: Workspace Audit Verification (Nov 19)</option>
                <option value="f3a97760-d230-4b4e-8463-96f71462f340">Session 7: Architecture Defense (Nov 19-20)</option>
            </select>
            <button class="action-btn" onclick="toggleAllResponses(false)">Expand All Answers</button>
            <button class="action-btn" onclick="toggleAllResponses(true)">Collapse All Answers</button>
            <button class="action-btn" onclick="window.print()">Print / Save PDF</button>
        </div>
    </div>

    {mockup_gallery_html}

    <section class="dialogue-stream" id="dialogueStream">
        {''.join(dialogue_html)}
    </section>
</main>

<script>
    function toggleResponse(idx) {{
        const body = document.getElementById('ai-response-body-' + idx);
        const icon = document.getElementById('ai-toggle-icon-' + idx);
        if (!body) return;
        if (body.classList.contains('collapsed')) {{
            body.classList.remove('collapsed');
            if (icon) icon.textContent = '▼';
        }} else {{
            body.classList.add('collapsed');
            if (icon) icon.textContent = '►';
        }}
    }}

    function toggleAllResponses(collapse) {{
        const bodies = document.querySelectorAll('.ai-response-body');
        bodies.forEach(b => {{
            const id = b.id.replace('ai-response-body-', '');
            const icon = document.getElementById('ai-toggle-icon-' + id);
            if (collapse) {{
                b.classList.add('collapsed');
                if (icon) icon.textContent = '►';
            }} else {{
                b.classList.remove('collapsed');
                if (icon) icon.textContent = '▼';
            }}
        }});
    }}

    function filterDialogues() {{
        const q = document.getElementById('searchInput').value.toLowerCase().trim();
        const selectedSession = document.getElementById('sessionFilter').value;
        const cards = document.querySelectorAll('.audit-card');

        cards.forEach(card => {{
            const cid = card.getAttribute('data-cid');
            const text = card.textContent.toLowerCase();
            
            const matchesSession = (selectedSession === 'ALL' || cid === selectedSession);
            const matchesQuery = (!q || text.includes(q));

            if (matchesSession && matchesQuery) {{
                card.style.display = 'block';
            }} else {{
                card.style.display = 'none';
            }}
        }});
    }}
</script>

</body>
</html>
"""

    out_file = os.path.join(web_dir, 'ai_complete_prompt_archive.html')
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"\nSuccessfully compiled Colorado River dialogue archive to: {out_file}")
    print(f"File size: {os.path.getsize(out_file):,} bytes")

if __name__ == '__main__':
    main()
