#!/usr/bin/env python3

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import threading
import webbrowser
from copy import deepcopy
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


FRONTEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = FRONTEND_ROOT.parent
CONTENT_PATH = FRONTEND_ROOT / 'static' / 'site-content.json'
APP_HTML_PATH = FRONTEND_ROOT / 'src' / 'app.html'
APP_TITLE_START = '		<!-- app-title:start -->'
APP_TITLE_END = '		<!-- app-title:end -->'
APP_TITLE_FALLBACK = 'TRXD'
RULES_PATHS = (
    FRONTEND_ROOT / 'rules.md',
    PROJECT_ROOT / 'rules.md',
)
SCHEMA_PATH = FRONTEND_ROOT / 'scripts' / 'site-schema.json'


EDITOR_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site Editor | TRXd</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: dark;
      --bg: #09090b;
      --card: rgba(24, 24, 27, 0.6);
      --card-hover: rgba(30, 30, 35, 0.8);
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(255, 255, 255, 0.2);
      --text: #fafafa;
      --muted: #a1a1aa;
      --primary: #fafafa;
      --primary-foreground: #09090b;
      --accent: #10b981; /* Emerald-500 */
      --danger: #ef4444;
      --shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
      
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * { box-sizing: border-box; }
    
    body {
      margin: 0;
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, rgba(16, 185, 129, 0.05) 0px, transparent 50%),
        radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.05) 0px, transparent 50%);
      color: var(--text);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(9, 9, 11, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 1rem 0;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .nav-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }

    .brand {
      display: flex;
      flex-direction: column;
    }

    .brand h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: -0.025em;
      text-transform: uppercase;
    }

    .brand p {
      margin: 0;
      font-size: 0.75rem;
      color: var(--muted);
      font-weight: 500;
      margin-top: 0.2rem;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
    }

    main {
      padding: 2.5rem 0;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 2rem;
      align-items: start;
    }

    .panel {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 1rem;
      backdrop-filter: blur(8px);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .panel-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.02);
    }

    .panel-title {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
    }

    .sections {
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    .section-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-card h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--accent);
    }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .field.markdown {
      grid-column: 1 / -1;
    }

    /* Form Fields */
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.02);
      padding: 1.25rem;
      border-radius: 0.75rem;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }

    .field:focus-within {
      background: rgba(255, 255, 255, 0.04);
      border-color: var(--border-focus);
    }

    .field label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text);
    }

    .field small {
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.4;
    }

    input, textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--text);
      padding: 0.75rem;
      font-size: 0.95rem;
      font-family: inherit;
      transition: all 0.2s ease;
    }

    input:focus, textarea:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(0, 0, 0, 0.4);
      box-shadow: 0 0 0 1px var(--accent);
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    .markdown textarea {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      min-height: 200px;
    }

    /* Buttons */
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      gap: 0.5rem;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    button.primary:hover:not(:disabled) {
      background: #ffffff;
      transform: translateY(-1px);
    }

    button.secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border-color: var(--border);
    }

    button.secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--border-focus);
    }

    button.danger {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.2);
    }

    button.danger:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.4);
    }

    .mini-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    /* List / Array Editor */
    .array-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .array-item {
      background: rgba(0, 0, 0, 0.15);
      border: 1px dashed var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .array-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .array-item-header strong {
       font-size: 0.75rem;
       text-transform: uppercase;
       letter-spacing: 0.05em;
       color: var(--accent);
    }

    .array-actions {
      display: flex;
      gap: 0.5rem;
    }

    .array-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .hint {
      font-size: 0.75rem;
      color: var(--muted);
      margin: 0;
    }

    /* Preview Sidebar */
    .sticky-preview {
      position: sticky;
      top: 6rem;
    }

    pre {
      margin: 0;
      padding: 1.5rem;
      background: #000;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      line-height: 1.6;
      color: #8ab4ff;
      overflow: auto;
      max-height: 70vh;
    }

    .preview-note {
      padding: 1.25rem;
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.5;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid var(--border);
    }

    .error-banner {
      background: var(--danger);
      color: white;
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
      margin-bottom: 2rem;
      font-weight: 600;
      font-size: 0.875rem;
      display: none;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr; }
      .sticky-preview { position: static; }
    }
    
    @media (max-width: 640px) {
      .container { padding: 0 1rem; }
      header .nav-content { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="nav-content">
        <div class="brand">
          <h1 id="editor-title">Site Editor</h1>
          <p id="editor-description">Loading schema...</p>
        </div>
        <div class="actions">
          <button id="reload-button" class="secondary" title="Reload from disk">
            Reload
          </button>
          <button id="reset-button" class="danger">
            Reset
          </button>
          <button id="save-button" class="primary">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </header>

  <div class="container">
    <main>
      <div id="error-banner" class="error-banner"></div>

      <div class="layout">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">Configuration Fields</div>
          </div>
          <div id="sections" class="sections"></div>
          <div id="status" style="padding: 1rem 1.5rem; font-size: 0.75rem; color: var(--muted); border-top: 1px solid var(--border);">
            Ready
          </div>
        </section>

        <aside class="sticky-preview">
          <div class="panel">
            <div class="panel-header">
              <div class="panel-title">JSON Preview</div>
            </div>
            <pre id="json-preview">{}</pre>
            <div class="preview-note">
              Config saved to <code>frontend/static/site-content.json</code>.
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>

  <script>
    const state = {
      schema: null,
      content: null,
      pristine: '',
      loading: true
    };

    const sectionsEl = document.getElementById('sections');
    const statusEl = document.getElementById('status');
    const previewEl = document.getElementById('json-preview');
    const titleEl = document.getElementById('editor-title');
    const descriptionEl = document.getElementById('editor-description');
    const errorBannerEl = document.getElementById('error-banner');

    function clone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function getByPath(target, path) {
      return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), target);
    }

    function setByPath(target, path, value) {
      const parts = path.split('.');
      let cursor = target;
      for (let index = 0; index < parts.length - 1; index += 1) {
        const part = parts[index];
        if (typeof cursor[part] !== 'object' || cursor[part] === null || Array.isArray(cursor[part])) {
          cursor[part] = {};
        }
        cursor = cursor[part];
      }
      cursor[parts[parts.length - 1]] = value;
    }

    function buildDefaultItem(field) {
      const item = {};
      for (const subField of field.fields || []) {
        item[subField.key] = subField.default ?? '';
      }
      return item;
    }

    function buildDefaultContent(schema) {
      const data = {};
      for (const section of schema.sections || []) {
        for (const field of section.fields || []) {
          if (field.type === 'list') {
            const items = Array.isArray(field.default) ? clone(field.default) : [];
            const normalizedItems = items.map((item) => {
              const next = buildDefaultItem(field);
              return Object.assign(next, item || {});
            });
            setByPath(data, field.path, normalizedItems);
            continue;
          }
          setByPath(data, field.path, field.default ?? '');
        }
      }
      return data;
    }

    function updateStatus(message) {
      statusEl.textContent = message;
    }

    function updatePreview() {
      previewEl.textContent = JSON.stringify(state.content, null, 2);
      const current = JSON.stringify(state.content);
      const dirty = current !== state.pristine;
      updateStatus(dirty ? 'Unsaved changes' : 'Saved');
      const browserTitle = getByPath(state.content, 'brand.browserTitle');
      if (browserTitle) {
        document.title = `${browserTitle} — Site Editor`;
      }
    }

    function showError(message) {
      errorBannerEl.style.display = 'block';
      errorBannerEl.textContent = message;
    }

    function clearError() {
      errorBannerEl.style.display = 'none';
      errorBannerEl.textContent = '';
    }

    function createFieldWrapper(field) {
      const wrapper = document.createElement('div');
      wrapper.className = `field ${field.type === 'markdown' ? 'markdown' : ''}`;

      const label = document.createElement('label');
      label.textContent = field.label;
      wrapper.appendChild(label);

      if (field.help) {
        const help = document.createElement('small');
        help.textContent = field.help;
        wrapper.appendChild(help);
      }

      return wrapper;
    }
    function bindSimpleField(field) {
      const wrapper = createFieldWrapper(field);
      const currentValue = getByPath(state.content, field.path) ?? '';

      if (field.type === 'boolean') {
        const label = wrapper.querySelector('label');
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '0.75rem';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.width = 'auto';
        checkbox.checked = !!currentValue;
        checkbox.addEventListener('change', () => {
          setByPath(state.content, field.path, checkbox.checked);
          updatePreview();
        });

        row.appendChild(checkbox);
        if (label) row.appendChild(label);
        
        // Clear wrapper but preserve help text if present
        const help = wrapper.querySelector('small');
        wrapper.innerHTML = '';
        wrapper.appendChild(row);
        if (help) wrapper.appendChild(help);
        
        return wrapper;
      }

      const isTextArea = field.type === 'textarea' || field.type === 'markdown';
      const input = isTextArea ? document.createElement('textarea') : document.createElement('input');

      if (!isTextArea) {
        input.type = field.type === 'url' ? 'url' : 'text';
      }

      input.value = currentValue;
      input.placeholder = field.placeholder || '';
      input.addEventListener('input', () => {
        setByPath(state.content, field.path, input.value);
        updatePreview();
      });

      wrapper.appendChild(input);
      return wrapper;
    }

    function renderListField(field) {
      const wrapper = createFieldWrapper(field);
      const list = Array.isArray(getByPath(state.content, field.path)) ? getByPath(state.content, field.path) : [];
      setByPath(state.content, field.path, list);

      const toolbar = document.createElement('div');
      toolbar.className = 'array-toolbar';

      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Add, remove, or reorder repeatable items like sponsors.';
      toolbar.appendChild(hint);

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'secondary mini-button';
      addButton.textContent = `Add ${field.itemLabel || 'Item'}`;
      addButton.addEventListener('click', () => {
        list.push(buildDefaultItem(field));
        renderForm();
      });
      toolbar.appendChild(addButton);

      wrapper.appendChild(toolbar);

      const itemsEl = document.createElement('div');
      itemsEl.className = 'array-list';

      if (list.length === 0) {
        const emptyHint = document.createElement('p');
        emptyHint.className = 'hint';
        emptyHint.textContent = `No ${field.label.toLowerCase()} yet.`;
        itemsEl.appendChild(emptyHint);
      }

      list.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'array-item';

        const header = document.createElement('div');
        header.className = 'array-item-header';

        const title = document.createElement('strong');
        title.textContent = `${field.itemLabel || 'Item'} ${index + 1}`;
        header.appendChild(title);

        const actions = document.createElement('div');
        actions.className = 'array-actions';

        const moveUp = document.createElement('button');
        moveUp.type = 'button';
        moveUp.className = 'secondary';
        moveUp.textContent = 'Up';
        moveUp.disabled = index === 0;
        moveUp.addEventListener('click', () => {
          [list[index - 1], list[index]] = [list[index], list[index - 1]];
          renderForm();
        });
        actions.appendChild(moveUp);

        const moveDown = document.createElement('button');
        moveDown.type = 'button';
        moveDown.className = 'secondary';
        moveDown.textContent = 'Down';
        moveDown.disabled = index === list.length - 1;
        moveDown.addEventListener('click', () => {
          [list[index], list[index + 1]] = [list[index + 1], list[index]];
          renderForm();
        });
        actions.appendChild(moveDown);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'danger';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          list.splice(index, 1);
          renderForm();
        });
        actions.appendChild(removeButton);

        header.appendChild(actions);
        card.appendChild(header);

        for (const subField of field.fields || []) {
          const subWrapper = createFieldWrapper(subField);
          const isTextArea = subField.type === 'textarea' || subField.type === 'markdown';
          const input = isTextArea ? document.createElement('textarea') : document.createElement('input');
          if (!isTextArea) {
            input.type = subField.type === 'url' ? 'url' : 'text';
          }
          input.value = item[subField.key] ?? '';
          input.placeholder = subField.placeholder || '';
          input.addEventListener('input', () => {
            item[subField.key] = input.value;
            updatePreview();
          });
          subWrapper.appendChild(input);
          card.appendChild(subWrapper);
        }

        itemsEl.appendChild(card);
      });

      wrapper.appendChild(itemsEl);
      return wrapper;
    }

    function renderForm() {
      sectionsEl.innerHTML = '';
      clearError();

      for (const section of state.schema.sections || []) {
        const card = document.createElement('section');
        card.className = 'section-card';

        const title = document.createElement('h2');
        title.textContent = section.label;
        card.appendChild(title);

        if (section.description) {
          const description = document.createElement('p');
          description.className = 'section-description';
          description.textContent = section.description;
          card.appendChild(description);
        }

        const grid = document.createElement('div');
        grid.className = 'field-grid';

        for (const field of section.fields || []) {
          grid.appendChild(field.type === 'list' ? renderListField(field) : bindSimpleField(field));
        }

        card.appendChild(grid);
        sectionsEl.appendChild(card);
      }

      updatePreview();
    }

    async function loadEditorState() {
      updateStatus('Loading...');
      clearError();
      try {
        const [schemaResponse, contentResponse] = await Promise.all([
          fetch('/api/schema', { cache: 'no-store' }),
          fetch('/api/content', { cache: 'no-store' })
        ]);

        if (!schemaResponse.ok) {
          throw new Error(`Failed to load schema (${schemaResponse.status})`);
        }
        if (!contentResponse.ok) {
          const payload = await contentResponse.json().catch(() => ({}));
          throw new Error(payload.error || `Failed to load site content (${contentResponse.status})`);
        }

        state.schema = await schemaResponse.json();
        state.content = await contentResponse.json();
        state.pristine = JSON.stringify(state.content);

        titleEl.textContent = state.schema.title || 'Site Editor';
        descriptionEl.textContent = state.schema.description || '';

        renderForm();
      } catch (error) {
        showError(error.message || String(error));
        updateStatus('Load failed');
      }
    }

    async function saveContent() {
      updateStatus('Saving...');
      clearError();
      try {
        const response = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.content)
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || `Failed to save (${response.status})`);
        }

        state.content = payload.content;
        state.pristine = JSON.stringify(state.content);
        renderForm();
        updateStatus('Saved');
      } catch (error) {
        showError(error.message || String(error));
        updateStatus('Save failed');
      }
    }

    document.getElementById('reload-button').addEventListener('click', () => {
      loadEditorState();
    });

    document.getElementById('reset-button').addEventListener('click', () => {
      if (!state.schema) {
        return;
      }
      const confirmed = window.confirm('Reset the form to schema defaults? You can still cancel by not saving.');
      if (!confirmed) {
        return;
      }
      state.content = buildDefaultContent(state.schema);
      renderForm();
    });

    document.getElementById('save-button').addEventListener('click', () => {
      saveContent();
    });

    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveContent();
      }
    });

    loadEditorState();
  </script>
</body>
</html>
"""


class SiteEditorError(RuntimeError):
    pass


def read_json(path: Path) -> Any:
    try:
        with path.open('r', encoding='utf-8') as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise SiteEditorError(f'Missing file: {path}') from exc
    except json.JSONDecodeError as exc:
        raise SiteEditorError(f'Invalid JSON in {path}: {exc}') from exc


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        json.dump(data, handle, indent=2, ensure_ascii=True)
        handle.write('\n')


def set_path(target: dict[str, Any], path: str, value: Any) -> None:
    parts = path.split('.')
    cursor: dict[str, Any] = target
    for part in parts[:-1]:
        next_value = cursor.get(part)
        if not isinstance(next_value, dict):
            next_value = {}
            cursor[part] = next_value
        cursor = next_value
    cursor[parts[-1]] = value


def get_path(target: dict[str, Any], path: str) -> Any:
    cursor: Any = target
    for part in path.split('.'):
        if not isinstance(cursor, dict) or part not in cursor:
            return None
        cursor = cursor[part]
    return cursor


def build_default_item(field: dict[str, Any]) -> dict[str, Any]:
    item: dict[str, Any] = {}
    for sub_field in field.get('fields', []):
        item[sub_field['key']] = deepcopy(sub_field.get('default', ''))
    return item


def build_default_content(schema: dict[str, Any]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for section in schema.get('sections', []):
        for field in section.get('fields', []):
            if field.get('type') == 'list':
                default_items = []
                for raw_item in field.get('default', []):
                    item = build_default_item(field)
                    if isinstance(raw_item, dict):
                        item.update(raw_item)
                    default_items.append(item)
                set_path(data, field['path'], default_items)
            else:
                set_path(data, field['path'], deepcopy(field.get('default', '')))
    return data


def sync_item_with_schema(item: Any, field: dict[str, Any]) -> dict[str, Any]:
    current = item if isinstance(item, dict) else {}
    merged = dict(current)
    for sub_field in field.get('fields', []):
        merged.setdefault(sub_field['key'], deepcopy(sub_field.get('default', '')))
    return merged


def sync_with_schema(schema: dict[str, Any], content: Any) -> dict[str, Any]:
    current = content if isinstance(content, dict) else {}
    merged: dict[str, Any] = deepcopy(current)

    for section in schema.get('sections', []):
        for field in section.get('fields', []):
            if field.get('type') == 'list':
                raw_items = get_path(merged, field['path'])
                items = raw_items if isinstance(raw_items, list) else deepcopy(field.get('default', []))
                normalized = [sync_item_with_schema(item, field) for item in items]
                set_path(merged, field['path'], normalized)
                continue

            existing = get_path(merged, field['path'])
            if existing is None:
                set_path(merged, field['path'], deepcopy(field.get('default', '')))

    return merged


def find_rules_path() -> Path | None:
    for candidate in RULES_PATHS:
        if candidate.exists():
            return candidate
    return None


def load_rules_content() -> tuple[str, str] | None:
    rules_path = find_rules_path()
    if rules_path is None:
        print("[!] rules.md file not provided. skipping rules generation.")
        return None

    raw = rules_path.read_text(encoding='utf-8').strip()
    if not raw:
        return '', ''

    title = ''
    markdown = raw

    heading_match = re.match(r'^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*(?:\n|$)', raw)
    if heading_match:
        title = heading_match.group(2).strip()
        markdown = raw[heading_match.end():].lstrip('\n')

    return title, markdown


def sync_rules_into_content(content: dict[str, Any], force: bool = False) -> dict[str, Any]:
    rules_content = load_rules_content()
    if rules_content is None:
        return content

    title, markdown = rules_content
    merged = deepcopy(content)
    
    # Only sync if forced or if current content is empty
    current_title = get_path(merged, 'home.rulesTitle')
    current_md = get_path(merged, 'home.rulesMarkdown')
    
    if force or (not current_title and not current_md):
        set_path(merged, 'home.rulesTitle', title)
        set_path(merged, 'home.rulesMarkdown', markdown)
        
    return merged


def load_schema() -> dict[str, Any]:
    schema = read_json(SCHEMA_PATH)
    if not isinstance(schema, dict):
        raise SiteEditorError(f'Expected an object in {SCHEMA_PATH}')
    return schema


def load_content(schema: dict[str, Any]) -> dict[str, Any]:
    if CONTENT_PATH.exists():
        content = read_json(CONTENT_PATH)
    else:
        content = build_default_content(schema)
    synced = sync_with_schema(schema, content)
    return sync_rules_into_content(synced)


def sync_site_content() -> dict[str, Any]:
    if CONTENT_PATH.exists():
        raw_content = read_json(CONTENT_PATH)
        content = raw_content if isinstance(raw_content, dict) else {}
    else:
        content = {}

    content = sync_rules_into_content(content, force=True)
    write_json(CONTENT_PATH, content)
    sync_app_html_title(content)
    return content

def sync_app_html_title(content: Any) -> None:
    if not APP_HTML_PATH.exists():
        return

    browser_title = APP_TITLE_FALLBACK
    if isinstance(content, dict):
        brand = content.get('brand')
        if isinstance(brand, dict):
            raw_title = brand.get('browserTitle')
            if isinstance(raw_title, str) and raw_title.strip():
                browser_title = raw_title.strip()

    html_content = APP_HTML_PATH.read_text(encoding='utf-8')
    managed_block = (
        f'{APP_TITLE_START}\n'
        f'		<title>{html.escape(browser_title, quote=True)}</title>\n'
        f'{APP_TITLE_END}'
    )

    start_index = html_content.find(APP_TITLE_START)
    end_index = html_content.find(APP_TITLE_END)

    if start_index != -1 and end_index != -1 and end_index >= start_index:
        end_index += len(APP_TITLE_END)
        next_html = html_content[:start_index] + managed_block + html_content[end_index:]
    else:
        next_html = html_content.replace('		%sveltekit.head%', f'{managed_block}\n		%sveltekit.head%')

    if next_html != html_content:
        APP_HTML_PATH.write_text(next_html, encoding='utf-8')


class SiteEditorHandler(BaseHTTPRequestHandler):
    server_version = 'SiteEditor/1.0'

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stdout.write(f'[site-editor] {self.address_string()} - {fmt % args}\n')

    @property
    def editor_server(self) -> 'SiteEditorServer':
        return self.server  # type: ignore[return-value]

    def send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = html.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        try:
            if path in ('/', '/index.html'):
                self.send_html(EDITOR_HTML)
                return
            if path == '/api/schema':
                self.send_json(self.editor_server.schema)
                return
            if path == '/api/content':
                self.send_json(load_content(self.editor_server.schema))
                return
            if path == '/favicon.ico':
                self.send_response(HTTPStatus.NO_CONTENT)
                self.end_headers()
                return
            self.send_json({'error': 'Not found'}, HTTPStatus.NOT_FOUND)
        except SiteEditorError as exc:
            self.send_json({'error': str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != '/api/content':
            self.send_json({'error': 'Not found'}, HTTPStatus.NOT_FOUND)
            return

        try:
            length = int(self.headers.get('Content-Length', '0'))
            raw_body = self.rfile.read(length)
            payload = json.loads(raw_body.decode('utf-8')) if raw_body else {}
            content = sync_with_schema(self.editor_server.schema, payload)
            # We DON'T sync rules here, because the user just saved their version from the editor
            write_json(CONTENT_PATH, content)
            sync_app_html_title(content)
            self.send_json({'content': content}, HTTPStatus.OK)
        except json.JSONDecodeError as exc:
            self.send_json({'error': f'Invalid JSON payload: {exc}'}, HTTPStatus.BAD_REQUEST)
        except SiteEditorError as exc:
            self.send_json({'error': str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)


class SiteEditorServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], handler_cls: type[BaseHTTPRequestHandler], schema: dict[str, Any]) -> None:
        super().__init__(server_address, handler_cls)
        self.schema = schema


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Edit frontend site-content.json before deployment.')
    parser.add_argument('--host', default='127.0.0.1', help='Host interface to bind to.')
    parser.add_argument('--port', type=int, default=8765, help='Port to bind to.')
    parser.add_argument('--no-browser', action='store_true', help='Do not open a browser tab automatically.')
    parser.add_argument('--sync-only', action='store_true', help='Sync rules.md into site-content.json and exit.')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.sync_only:
        sync_site_content()
        print(f'Synced {CONTENT_PATH.relative_to(PROJECT_ROOT)}')
        return

    schema = load_schema()
    sync_app_html_title(load_content(schema))
    server = SiteEditorServer((args.host, args.port), SiteEditorHandler, schema)
    actual_host, actual_port = server.server_address[:2]
    url = f'http://{actual_host}:{actual_port}'

    print(f'Site editor ready at {url}')
    print(
        f'Editing {CONTENT_PATH.relative_to(PROJECT_ROOT)} '
        f'using {SCHEMA_PATH.relative_to(PROJECT_ROOT)}'
    )
    print('Press Ctrl+C to stop.')

    if not args.no_browser:
        threading.Timer(0.25, lambda: webbrowser.open_new_tab(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopping site editor...')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
