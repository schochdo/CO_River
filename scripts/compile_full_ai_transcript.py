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
import subprocess
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo('America/Denver')

CO_SESSIONS = [
    '020c8971-5c78-4eba-8811-cea3997b058e',
    'bbab402d-c7b9-479d-b2e0-9fb8404a0e69',
    '4435b62e-8fe9-444c-a9e1-fde4adac282d',
    '2f11e2b7-7ffb-48a6-9f23-da3993acea64',
    '58cfdbf8-91b4-4263-ad4e-596d29fac1a2',
    'f3a97760-d230-4b4e-8463-96f71462f340',
    'aad5e810-76c0-4f7e-a9c4-9eb2855ee883',
]

SESSION_BASE_TITLES = {
    '020c8971-5c78-4eba-8811-cea3997b058e': 'Session 1: Initial Architecture & Planning Interview',
    'bbab402d-c7b9-479d-b2e0-9fb8404a0e69': 'Session 2: Hydrology Pipelines & Live USGS Automation',
    '4435b62e-8fe9-444c-a9e1-fde4adac282d': 'Session 3: Basin Cartography & Visual Flow Balance',
    '2f11e2b7-7ffb-48a6-9f23-da3993acea64': 'Session 4: Reservoir Dynamics & Minard Flow Replay',
    '58cfdbf8-91b4-4263-ad4e-596d29fac1a2': 'Session 5: ML Richards-Baker Flashiness & Legal Accounting',
    'f3a97760-d230-4b4e-8463-96f71462f340': 'Session 6: Deep Architecture Defense & Academic Disclosure',
    'aad5e810-76c0-4f7e-a9c4-9eb2855ee883': 'Session 7: Corridor Palette Unification, Sankey Brackets & Single Notebook Consolidation',
}

def extract_gemini_web_pdf_turns(pdf_path, dest_rel_src):
    """Extract User prompt / Response turns from a Gemini Web exported PDF via macOS PDFKit."""
    swift_code = '''
import Foundation
import PDFKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
if let doc = PDFDocument(url: url), let s = doc.string {
    print(s)
}
'''
    res = subprocess.run(['/usr/bin/swift', '-e', swift_code, pdf_path], capture_output=True, text=True)
    raw = res.stdout or ''
    if not raw.strip():
        return []
    # Strip Chrome print header/footer noise
    cleaned_lines = []
    for line in raw.splitlines():
        s = line.strip()
        if re.match(r'^\d{1,2}/\d{1,2}/\d{2,4},\s+\d{1,2}:\d{2}\s+[AP]M\s+', s):
            continue
        if re.match(r'^https://gemini\.google\.com/app/[a-z0-9]+(?:\s+\d+/\d+)?$', s):
            continue
        cleaned_lines.append(line)
    cleaned = '\n'.join(cleaned_lines)
    # Split on "User prompt:" markers
    chunks = re.split(r'(?:^|\n)\s*User prompt:\s*', cleaned)
    turns = []
    pdf_title = os.path.splitext(os.path.basename(pdf_path))[0]
    for ch in chunks[1:]:
        parts = re.split(r'\n\s*Response:\s*', ch, maxsplit=1)
        prompt = parts[0].strip()
        resp = parts[1].strip() if len(parts) > 1 else ''
        if prompt:
            turns.append({
                'session_id': 'gemini-web-sessions',
                'created_at': f'{pdf_title} (Gemini Argon PDF)',
                'prompt': prompt,
                'media': [],
                'assistant_text': resp if resp else None,
                'tools_used': [f'Source PDF: {pdf_title}.pdf'],
                'pdf_src': dest_rel_src,
                'pdf_name': os.path.basename(pdf_path),
                'pdf_title': pdf_title
            })
    return turns

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
    gemini_sessions_dir = os.path.join(mockups_src, 'gemini_sessions')
    gemini_pdf_docs = []
    gemini_web_turns = []
    if os.path.exists(gemini_sessions_dir):
        for pf in sorted(os.listdir(gemini_sessions_dir)):
            if pf.lower().endswith('.pdf'):
                slug = re.sub(r'[^a-z0-9]+', '_', os.path.splitext(pf)[0].lower()).strip('_')
                dest_fn = f"gemini_session_{slug}.pdf"
                src_pdf = os.path.join(gemini_sessions_dir, pf)
                shutil.copy2(src_pdf, os.path.join(assets_dir, dest_fn))
                rel_src = f"audit_assets/{dest_fn}"
                gemini_pdf_docs.append({'src': rel_src, 'name': pf})
                gemini_web_turns.extend(extract_gemini_web_pdf_turns(src_pdf, rel_src))
    print(f"Copied {len(early_mockups)} early mockups, {len(early_docs)} docs, and {len(gemini_pdf_docs)} Gemini Web PDFs ({len(gemini_web_turns)} turns)")
    
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
                        
                # Look ahead for assistant responses, planning-mode plans, and actions
                assistant_replies = []
                thinking_blocks = []
                tools_used = []
                for j in range(i + 1, len(lines)):
                    next_step = json.loads(lines[j])
                    if next_step.get('type') == 'USER_INPUT':
                        break
                    if next_step.get('type') == 'PLANNER_RESPONSE':
                        c = next_step.get('content')
                        if c and c.strip():
                            assistant_replies.append(c.strip())
                        th = next_step.get('thinking')
                        if th and th.strip():
                            thinking_blocks.append(th.strip())
                        for tc in next_step.get('tool_calls', []):
                            tool_name = tc.get('name') or tc.get('tool') or ''
                            args = tc.get('args', {})
                            if not isinstance(args, dict):
                                args = {}
                            if tool_name == 'exit_plan_mode' and args.get('plan'):
                                assistant_replies.append(f"### Planning Mode Plan\n\n{args['plan'].strip()}")
                            elif tool_name == 'enter_plan_mode' and args.get('reason'):
                                assistant_replies.append(f"### Plan Review Status Report\n\n{args['reason'].strip()}")
                            elif tool_name in ('write_file', 'write_to_file') and any(
                                k in str(args.get('Path') or args.get('TargetFile') or '')
                                for k in ('implementation_plan.md', 'walkthrough.md')
                            ):
                                body = (args.get('Content') or args.get('CodeContent') or '').strip()
                                if body:
                                    assistant_replies.append(body)
                            summary = args.get('toolSummary') or tool_name
                            if summary and summary not in tools_used:
                                tools_used.append(summary)

                if not assistant_replies and thinking_blocks:
                    assistant_replies.append("### Planning Mode Diagnostic Reasoning\n\n" + "\n\n".join(thinking_blocks))
                                
                all_dialogues.append({
                    'session_id': cid,
                    'created_at': created_at,
                    'prompt': clean_prompt,
                    'media': staged_media,
                    'assistant_text': '\n\n---\n\n'.join(assistant_replies) if assistant_replies else None,
                    'tools_used': tools_used
                })

    # Sort strictly chronologically using timezone-aware UTC datetimes
    def parse_utc_dt(ts):
        if not ts:
            return None
        try:
            clean_ts = ts.strip()
            if clean_ts.endswith('Z'):
                clean_ts = clean_ts[:-1] + '+00:00'
            else:
                clean_ts = re.sub(r'([+-]\d{2}):(\d{2})$', r'\1:\2', clean_ts)
            dt = datetime.fromisoformat(clean_ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return None

    def parse_time(item):
        dt = parse_utc_dt(item.get('created_at', ''))
        return dt if dt is not None else datetime.min.replace(tzinfo=timezone.utc)

    all_dialogues.sort(key=parse_time)

    # Convert Antigravity UTC timestamps to local Mountain Time and derive session date ranges
    session_bounds = {}
    all_local_dts = []
    for item in all_dialogues:
        utc_dt = parse_utc_dt(item.get('created_at', ''))
        if utc_dt is not None:
            local_dt = utc_dt.astimezone(LOCAL_TZ)
            item['local_dt'] = local_dt
            item['display_ts'] = local_dt.strftime('%Y-%m-%d %H:%M %Z')
            all_local_dts.append(local_dt)
            cid = item['session_id']
            if cid not in session_bounds:
                session_bounds[cid] = [local_dt, local_dt]
            else:
                if local_dt < session_bounds[cid][0]:
                    session_bounds[cid][0] = local_dt
                if local_dt > session_bounds[cid][1]:
                    session_bounds[cid][1] = local_dt

    def format_date_span(start_dt, end_dt):
        s_date = start_dt.date()
        e_date = end_dt.date()
        if s_date == e_date:
            return start_dt.strftime('%b %d')
        if s_date.year == e_date.year and s_date.month == e_date.month:
            return f"{start_dt.strftime('%b %d')}–{end_dt.strftime('%d')}"
        return f"{start_dt.strftime('%b %d')} – {end_dt.strftime('%b %d')}"

    session_labels = {}
    for cid in CO_SESSIONS:
        base_title = SESSION_BASE_TITLES.get(cid, f"Session {cid[:8]}")
        if cid in session_bounds:
            span = format_date_span(*session_bounds[cid])
            session_labels[cid] = f"{base_title} ({span})"
        else:
            session_labels[cid] = base_title
    session_labels['gemini-web-sessions'] = (
        f"Gemini Web Sessions ({len(gemini_pdf_docs)} PDFs): Architecture & Meta-Prompting for 3.8 Flash"
    )

    all_dialogues.extend(gemini_web_turns)

    def _norm_shingles(text, n=6):
        cleaned = re.sub(r'[^a-z0-9\s]', ' ', (text or '').lower())
        words = cleaned.split()
        if len(words) < 10:
            return set()
        return {' '.join(words[k:k+n]) for k in range(len(words) - n + 1)}

    gemini_indexed = []
    for idx, item in enumerate(all_dialogues, 1):
        item['_idx'] = idx
        if item.get('session_id') == 'gemini-web-sessions':
            if not item.get('pdf_title'):
                item['pdf_title'] = os.path.splitext(item.get('pdf_name', ''))[0]
            item['used_in_turns'] = []
            shingles = _norm_shingles(item.get('assistant_text') or '')
            if shingles:
                gemini_indexed.append((idx, item, shingles))

    argon_match_count = 0
    for idx, item in enumerate(all_dialogues, 1):
        if item.get('session_id') == 'gemini-web-sessions':
            continue
        psh = _norm_shingles(item.get('prompt') or '')
        if not psh:
            continue
        best = None
        for gt_idx, gt_item, gt_sh in gemini_indexed:
            overlap = len(psh & gt_sh)
            ratio = overlap / max(1, len(psh))
            if overlap >= 25 and ratio >= 0.15:
                if not best or overlap > best[0]:
                    best = (overlap, ratio, gt_idx, gt_item)
        if best:
            overlap, ratio, gt_idx, gt_item = best
            item['argon_source'] = {
                'idx': gt_idx,
                'pdf_title': gt_item['pdf_title'],
                'pdf_src': gt_item.get('pdf_src', ''),
                'overlap_pct': int(round(100 * ratio))
            }
            local_dt = item.get('local_dt')
            local_date_str = local_dt.strftime('%Y-%m-%d') if local_dt else (item.get('created_at') or '')[:10]
            gt_item['used_in_turns'].append({
                'idx': idx,
                'ts': local_date_str
            })
            argon_match_count += 1

    print(f"Total authentic Colorado River dialogues compiled: {len(all_dialogues)}")
    print(f"Total user-uploaded images verified and staged: {image_copy_count}")
    print(f"Matched Argon -> Flash prompts: {argon_match_count}")

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

        sess_label = session_labels.get(cid, f"Session {cid[:8]}")
        display_ts = item.get('display_ts') or ts
        time_title_attr = f' title="UTC: {html.escape(ts)}"' if item.get('display_ts') and ts else ''
        pdf_btn = (
            f'<a href="{item["pdf_src"]}" target="_blank" rel="noopener noreferrer" class="tool-pill" style="text-decoration:none;">Source PDF ↗</a>'
            if item.get('pdf_src') else ''
        )
        argon_badge_html = ""
        if item.get('argon_source'):
            src = item['argon_source']
            title_txt = src['pdf_title']
            short_title = (title_txt[:31] + '...') if len(title_txt) > 34 else title_txt
            argon_badge_html = (
                f'<button type="button" class="badge-argon" onclick="jumpToTurn({src["idx"]})" '
                f'title="Matched {src["overlap_pct"]}% overlap with Gemini Argon PDF: {html.escape(title_txt)}">'
                f'Argon &rarr; Flash &bull; #{src["idx"]} ({html.escape(short_title)})</button>'
            )
        elif item.get('used_in_turns'):
            links = ''.join(
                f'<a href="#turn-{u["idx"]}" onclick="event.preventDefault(); jumpToTurn({u["idx"]});" '
                f'title="Executed on {html.escape(u["ts"])}" '
                f'style="color:inherit;font-weight:700;text-decoration:underline;margin-left:4px;">#{u["idx"]}</a>'
                for u in item['used_in_turns']
            )
            argon_badge_html = f'<span class="badge-argon-used">Used in Flash:{links}</span>'
        argon_flag = '1' if item.get('argon_source') else '0'
        card = f"""
        <article class="audit-card" id="turn-{idx}" data-idx="{idx}" data-cid="{html.escape(cid)}" data-ts="{html.escape(ts)}" data-argon="{argon_flag}">
            <div class="card-meta">
                <span class="badge-idx">#{idx}</span>
                <span class="badge-session">{html.escape(sess_label)}</span>
                {pdf_btn}
                {argon_badge_html}
                <time class="meta-time"{time_title_attr}>{html.escape(display_ts)}</time>
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

    # Mockups & Gemini Sessions HTML
    mockup_gallery_html = ""
    if early_mockups or early_docs or gemini_pdf_docs:
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
        doc_row = f'<div style="margin-top:12px;font-size:12px;"><strong>Early Gemini Prototype:</strong> {doc_links}</div>' if doc_links else ""
        pdf_list_html = "".join(
            f'<li><a href="{p["src"]}" target="_blank" rel="noopener noreferrer" class="argon-pdf-link">{html.escape(p["name"])} ↗</a></li>'
            for p in gemini_pdf_docs
        )
        gemini_pdfs_box = f"""
        <div class="argon-pdf-box">
            <strong class="argon-pdf-title">Gemini Argon Meta-Prompting &amp; Architecture Sessions ({len(gemini_pdf_docs)} PDFs, {len(gemini_web_turns)} Turns Extracted Below)</strong>
            <p class="argon-pdf-desc">When Gemini 3.8 Flash drifted inside Antigravity, Gemini Argon sessions were used to sanity-check water law/hydrology and author structured anti-drift prompts. All 10 exported PDFs are archived below and indexed as filterable cards in the dialogue stream.</p>
            <ul class="argon-pdf-list">{pdf_list_html}</ul>
        </div>
        """ if gemini_pdf_docs else ""
        mockup_gallery_html = f"""
        <section class="mockup-section">
            <h2 class="section-title">Pre-Development Artifacts &amp; Gemini Web Meta-Prompting Sessions</h2>
            <p class="section-desc">Early Gemini wireframes (Sep 22, 2026) and exported Gemini Argon PDF sessions used for domain validation and meta-prompting Gemini 3.8 Flash.</p>
            <div class="mockup-grid">
                {''.join(m_items)}
            </div>
            {doc_row}
            {gemini_pdfs_box}
        </section>
        """

    total_turns = len(all_dialogues)
    compiled_str = datetime.now().strftime('%b %d, %Y %I:%M %p')
    if all_local_dts:
        first_local = min(all_local_dts)
        last_local = max(all_local_dts)
        header_date_span = f"{first_local.strftime('%b %d')} – {last_local.strftime('%b %d, %Y')}"
        sort_start_label = first_local.strftime('%b %d')
        sort_end_label = last_local.strftime('%b %d')
    else:
        header_date_span = ""
        sort_start_label = "Start"
        sort_end_label = "End"

    session_options_html = "\n".join(
        f'                <option value="{html.escape(cid)}">{html.escape(session_labels[cid])}</option>'
        for cid in CO_SESSIONS
    )
    gemini_web_option_label = f"Gemini Web Sessions ({len(gemini_pdf_docs)} PDFs / {len(gemini_web_turns)} Turns)"
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Interaction &amp; Dialogue Archive — Colorado River Basin Project</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="editorial.css">
    <style>
        :root {{
            --canvas-bg: #f5f2eb;
            --surface-bg: #ffffff;
            --surface-header: #ebe4d6;
            --surface-subtle: #faf8f4;
            --user-bubble: #faf8f4;
            --ink-heading: #0f172a;
            --ink-body: #1e293b;
            --ink-muted: #475569;
            --ink-subtle: #64748b;
            --hairline: #cfc8ba;
            --hairline-dark: #b8ae9c;
            --accent-blue: #2b5c8f;
            --accent-ochre: #7c4318;
            --code-bg: #faf8f4;
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
        }}

        body.in-iframe .back-btn {{
            display: none !important;
        }}

        header.audit-header {{
            background: var(--surface-header);
            border-bottom: 1px solid var(--hairline);
            width: 100%;
        }}

        .audit-header-inner {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 1.5rem;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }}

        .audit-eyebrow {{
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--ink-muted);
            margin-bottom: 0.25rem;
        }}

        h1.audit-title {{
            font-size: 1.35rem;
            font-weight: 900;
            letter-spacing: -0.02em;
            color: var(--ink-heading);
            line-height: 1.2;
        }}

        .audit-meta-line {{
            font-size: 0.8rem;
            color: var(--ink-muted);
            margin-top: 0.3rem;
            font-variant-numeric: tabular-nums;
            font-feature-settings: "tnum" 1;
        }}

        .back-btn {{
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 2px;
            color: var(--ink-body);
            font-size: 12px;
            font-weight: 700;
            padding: 6px 12px;
            text-decoration: none;
            transition: background-color 0.15s ease, border-color 0.15s ease;
            white-space: nowrap;
        }}

        .back-btn:hover {{
            background: var(--surface-subtle);
            border-color: #8c8476;
            color: var(--ink-heading);
        }}

        main.audit-container {{
            max-width: 1200px;
            margin: 1.5rem auto;
            padding: 0 1.25rem;
        }}

        /* Sticky Filter Bar */
        .controls-sticky {{
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--surface-header);
            border: 1px solid var(--hairline-dark);
            border-radius: 2px;
            padding: 0.75rem 1rem;
            margin-bottom: 1.5rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            align-items: center;
            justify-content: space-between;
        }}

        .search-box-wrap {{
            flex: 1 1 280px;
            position: relative;
        }}

        .search-input {{
            width: 100%;
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 2px;
            color: var(--ink-heading);
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
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
            gap: 0.5rem;
            flex-wrap: wrap;
        }}

        .filter-select {{
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 2px;
            color: var(--ink-body);
            padding: 0.48rem 0.75rem;
            font-size: 0.8rem;
            font-weight: 600;
            max-width: 100%;
            outline: none;
            cursor: pointer;
        }}

        .action-btn {{
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            border-radius: 2px;
            color: var(--ink-body);
            padding: 0.48rem 0.85rem;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }}

        .action-btn:hover {{
            background: var(--surface-subtle);
            border-color: var(--accent-blue);
            color: var(--accent-blue);
        }}

        /* Mockup Section */
        .mockup-section {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 2px;
            padding: 1.5rem;
            margin-bottom: 1.75rem;
        }}

        .section-title {{
            font-size: 1.125rem;
            font-weight: 800;
            color: var(--ink-heading);
            margin-bottom: 0.35rem;
            letter-spacing: -0.01em;
        }}

        .section-desc {{
            color: var(--ink-muted);
            font-size: 0.875rem;
            margin-bottom: 1.25rem;
            max-width: 850px;
        }}

        .mockup-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 1rem;
        }}

        .mockup-card {{
            background: var(--surface-subtle);
            border: 1px solid var(--hairline);
            border-radius: 2px;
            overflow: hidden;
            transition: border-color 0.15s ease;
        }}

        .mockup-card:hover {{
            border-color: #8c8476;
        }}

        .mockup-img {{
            width: 100%;
            height: 180px;
            object-fit: cover;
            display: block;
            border-bottom: 1px solid var(--hairline);
        }}

        .mockup-title {{
            padding: 0.65rem 0.85rem 0.2rem;
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--ink-heading);
        }}

        .mockup-fn {{
            padding: 0 0.85rem 0.65rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            color: var(--ink-muted);
            word-break: break-word;
        }}

        .argon-pdf-box {{
            margin-top: 1rem;
            padding: 0.85rem 1rem;
            background: var(--surface-subtle);
            border: 1px solid var(--hairline);
            border-radius: 2px;
        }}

        .argon-pdf-title {{
            display: block;
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--ink-heading);
            margin-bottom: 0.25rem;
        }}

        .argon-pdf-desc {{
            font-size: 0.78rem;
            color: var(--ink-muted);
            margin-bottom: 0.5rem;
        }}

        .argon-pdf-list {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 4px 16px;
            font-size: 0.78rem;
            list-style: disc;
            padding-left: 1.15rem;
            margin: 0;
        }}

        .argon-pdf-link {{
            color: var(--accent-blue);
            font-weight: 600;
            text-decoration: underline;
            text-underline-offset: 2px;
        }}

        .argon-pdf-link:hover {{
            color: #1e436a;
        }}

        /* Dialogue List */
        .dialogue-stream {{
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }}

        .audit-card {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 2px;
            overflow: hidden;
            box-shadow: none;
            transition: border-color 0.15s ease;
        }}

        .audit-card:hover {{
            border-color: #8c8476;
        }}

        .card-meta {{
            background: var(--surface-header);
            border-bottom: 1px solid var(--hairline);
            padding: 0.6rem 1rem;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.55rem;
            font-size: 0.78rem;
        }}

        .badge-idx {{
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            color: var(--accent-blue);
            background: #ffffff;
            border: 1px solid var(--hairline-dark);
            padding: 0.12rem 0.45rem;
            border-radius: 2px;
            font-variant-numeric: tabular-nums;
        }}

        .badge-session {{
            color: var(--ink-heading);
            font-weight: 700;
        }}

        .badge-argon {{
            font-family: 'JetBrains Mono', monospace;
            background: #f5efe6;
            border: 1px solid #c9a679;
            color: var(--accent-ochre);
            font-size: 0.72rem;
            font-weight: 600;
            padding: 0.12rem 0.45rem;
            border-radius: 2px;
            cursor: pointer;
            text-decoration: none;
        }}
        .badge-argon:hover {{
            background: #ebe0d0;
        }}

        .badge-argon-used {{
            font-family: 'JetBrains Mono', monospace;
            background: #eef4fa;
            border: 1px solid #adc4dc;
            color: var(--accent-blue);
            font-size: 0.72rem;
            font-weight: 600;
            padding: 0.12rem 0.45rem;
            border-radius: 2px;
        }}

        .audit-card.jump-highlight {{
            outline: 2px solid var(--accent-ochre);
            outline-offset: 2px;
            transition: outline-color 0.4s ease;
        }}

        .meta-time {{
            margin-left: auto;
            color: var(--ink-muted);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.74rem;
            font-variant-numeric: tabular-nums;
        }}

        /* Speaker Blocks */
        .user-prompt-wrap {{
            background: var(--user-bubble);
            padding: 1rem 1.25rem;
            border-bottom: 1px solid #dfd9cc;
        }}

        .speaker-tag {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            margin-bottom: 0.4rem;
            display: inline-block;
            text-transform: uppercase;
        }}

        .speaker-tag.user {{
            color: var(--accent-blue);
        }}

        .prompt-text {{
            font-size: 0.92rem;
            color: var(--ink-heading);
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            line-height: 1.6;
        }}

        .screenshot-gallery {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.85rem;
            margin-top: 0.85rem;
            padding-top: 0.85rem;
            border-top: 1px dashed var(--hairline-dark);
        }}

        .user-screenshot-wrap {{
            background: #ffffff;
            border: 1px solid var(--hairline);
            border-radius: 2px;
            padding: 0.4rem;
            max-width: 260px;
        }}

        .user-screenshot-thumb {{
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 2px;
            display: block;
            border: 1px solid var(--hairline);
            transition: opacity 0.15s ease;
        }}

        .user-screenshot-thumb:hover {{
            opacity: 0.88;
        }}

        .screenshot-label {{
            display: block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.68rem;
            color: var(--ink-muted);
            margin-top: 0.35rem;
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
            padding: 0.65rem 1.25rem;
            text-align: left;
            color: var(--accent-blue);
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-bottom: 1px solid transparent;
            transition: background-color 0.15s ease;
        }}

        .ai-toggle-btn:hover {{
            background: var(--surface-subtle);
        }}

        .ai-response-body {{
            display: block;
            padding: 1rem 1.25rem 1.25rem;
            border-top: 1px solid var(--hairline);
        }}

        .ai-response-body.collapsed {{
            display: none;
        }}

        .tool-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.35rem;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.65rem;
            border-bottom: 1px solid #dfd9cc;
        }}

        .tool-header {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            font-weight: 700;
            color: var(--ink-muted);
            margin-right: 0.25rem;
        }}

        .tool-pill {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            background: var(--canvas-bg);
            border: 1px solid var(--hairline);
            color: var(--ink-body);
            padding: 0.12rem 0.45rem;
            border-radius: 2px;
        }}

        .tool-pill.more {{
            background: #f5efe6;
            border-color: #c9a679;
            color: var(--accent-ochre);
        }}

        .ai-action-only {{
            padding: 0.75rem 1.25rem;
            font-size: 0.82rem;
            color: var(--ink-muted);
        }}

        .ai-action-only.empty {{
            font-style: italic;
            font-size: 0.78rem;
            color: var(--ink-subtle);
        }}

        /* Markdown formatting inside responses */
        .ai-markdown-content {{
            font-size: 0.9rem;
            color: var(--ink-body);
            line-height: 1.68;
            overflow-wrap: anywhere;
        }}

        .ai-markdown-content a {{
            color: var(--accent-blue);
            font-weight: 600;
        }}

        .ai-markdown-content p {{
            margin-bottom: 0.85rem;
        }}

        .ai-markdown-content p:last-child {{
            margin-bottom: 0;
        }}

        .ai-markdown-content .ai-heading {{
            color: var(--ink-heading);
            margin: 1.1rem 0 0.45rem;
            font-weight: 800;
        }}

        .ai-markdown-content .inline-code {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.84em;
            background: var(--canvas-bg);
            border: 1px solid #dfd9cc;
            color: var(--accent-ochre);
            padding: 0.1em 0.35em;
            border-radius: 2px;
            overflow-wrap: anywhere;
        }}

        .code-block-header {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            font-weight: 700;
            background: var(--surface-header);
            color: var(--ink-muted);
            padding: 0.3rem 0.75rem;
            border-radius: 2px 2px 0 0;
            border: 1px solid var(--hairline);
            border-bottom: none;
            margin-top: 0.85rem;
        }}

        .code-block {{
            background: var(--code-bg);
            border: 1px solid var(--hairline);
            border-radius: 0 0 2px 2px;
            padding: 0.85rem 1rem;
            overflow-x: auto;
            margin-bottom: 0.85rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.82rem;
            color: var(--ink-heading);
            line-height: 1.5;
        }}

        .ai-ul {{
            margin: 0.65rem 0 0.85rem 1.4rem;
        }}

        .ai-li {{
            margin-bottom: 0.35rem;
        }}

        footer.audit-footer {{
            background: var(--surface-header);
            border-top: 1px solid var(--hairline);
            margin-top: 2.5rem;
            padding: 0.75rem 1.5rem;
            font-size: 11px;
            color: var(--ink-muted);
        }}

        .audit-footer-inner {{
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
        }}

        .audit-footer a {{
            color: var(--ink-heading);
            font-weight: 700;
            text-decoration: none;
        }}

        .audit-footer a:hover {{
            text-decoration: underline;
        }}

        @media print {{
            body {{ background: #ffffff; }}
            .controls-sticky, .back-btn, .ai-toggle-btn {{ display: none !important; }}
            .ai-response-body.collapsed {{ display: block !important; }}
            .audit-card {{ break-inside: avoid; }}
        }}
</style>
</head>
<body>
<script>
    if (window.self !== window.top) {{
        document.body.classList.add('in-iframe');
    }}
</script>

<header class="audit-header">
    <div class="audit-header-inner">
        <div>
            <div class="audit-eyebrow">DAT1001 Academic Audit • Verbatim Prompt &amp; Response Ledger</div>
            <h1 class="audit-title">Colorado River Basin Platform — AI Dialogue Archive</h1>
            <div class="audit-meta-line">
                <span>Sessions 1–{len(CO_SESSIONS)}</span> &bull; 
                <span>{html.escape(header_date_span)}</span> &bull; 
                <span>{total_turns} dialogues</span> &bull; 
                <span>{image_copy_count + len(early_mockups)} screenshots</span> &bull; 
                <span>{argon_match_count} Argon &rarr; Flash prompts</span> &bull; 
                <span>Updated {compiled_str}</span>
            </div>
        </div>
        <a href="index.html" class="back-btn">&larr; System Dashboard</a>
    </div>
</header>

<main class="audit-container">
    <div class="controls-sticky">
        <div class="search-box-wrap">
            <input type="text" id="searchInput" class="search-input" placeholder="Search prompts, code, error messages, or USGS stations..." oninput="filterDialogues()">
        </div>
        <div class="filter-controls">
            <select id="sessionFilter" class="filter-select" onchange="filterDialogues()">
                <option value="ALL">All Sessions + Gemini Web PDFs</option>
                <option value="ARGON_TO_FLASH">Argon &rarr; Flash Prompts ({argon_match_count} Matched)</option>
{session_options_html}
                <option value="gemini-web-sessions">{html.escape(gemini_web_option_label)}</option>
            </select>
            <select id="sortOrder" class="filter-select" onchange="applySortOrder()">
                <option value="DESC" selected>Sort: Newest First ({html.escape(sort_end_label)} &rarr; {html.escape(sort_start_label)})</option>
                <option value="ASC">Sort: Chronological (#1 {html.escape(sort_start_label)} &rarr; {html.escape(sort_end_label)})</option>
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

    function applySortOrder() {{
        const stream = document.getElementById('dialogueStream');
        const orderEl = document.getElementById('sortOrder');
        if (!stream || !orderEl) return;
        const order = orderEl.value;
        const cards = Array.from(stream.querySelectorAll('.audit-card'));
        cards.sort((a, b) => {{
            const aGem = a.getAttribute('data-cid') === 'gemini-web-sessions';
            const bGem = b.getAttribute('data-cid') === 'gemini-web-sessions';
            const aIdx = parseInt(a.getAttribute('data-idx') || '0', 10);
            const bIdx = parseInt(b.getAttribute('data-idx') || '0', 10);
            if (order === 'ASC') {{
                return aIdx - bIdx;
            }}
            // DESC: Dated Antigravity sessions newest-first, followed by Gemini Web PDF turns
            if (aGem !== bGem) return aGem ? 1 : -1;
            if (aGem && bGem) return aIdx - bIdx;
            return bIdx - aIdx;
        }});
        cards.forEach(c => stream.appendChild(c));
    }}

    document.addEventListener('DOMContentLoaded', () => {{
        applySortOrder();
    }});

    function jumpToTurn(targetIdx) {{
        const el = document.getElementById('turn-' + targetIdx);
        if (!el) return;
        if (el.style.display === 'none') {{
            const sf = document.getElementById('sessionFilter');
            const si = document.getElementById('searchInput');
            if (sf) sf.value = 'ALL';
            if (si) si.value = '';
            filterDialogues();
        }}
        el.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
        el.classList.add('jump-highlight');
        setTimeout(() => el.classList.remove('jump-highlight'), 2200);
    }}

    function filterDialogues() {{
        const q = document.getElementById('searchInput').value.toLowerCase().trim();
        const selectedSession = document.getElementById('sessionFilter').value;
        const cards = document.querySelectorAll('.audit-card');

        cards.forEach(card => {{
            const cid = card.getAttribute('data-cid');
            const text = card.textContent.toLowerCase();
            
            const matchesSession = (selectedSession === 'ALL' || (selectedSession === 'ARGON_TO_FLASH' ? card.getAttribute('data-argon') === '1' : cid === selectedSession));
            const matchesQuery = (!q || text.includes(q));

            if (matchesSession && matchesQuery) {{
                card.style.display = 'block';
            }} else {{
                card.style.display = 'none';
            }}
        }});
    }}
</script>

<footer class="audit-footer">
    <div class="audit-footer-inner">
        <span>Colorado River Basin • DAT1001 • Douglas Schoch • Fall 2026</span>
        <a href="index.html">&larr; Return to System Dashboard</a>
    </div>
</footer>

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
