#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
import threading
import webbrowser
from copy import deepcopy
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / 'tools' / 'site-schema.json'
CONTENT_PATH = ROOT / 'frontend' / 'static' / 'site-content.json'


EDITOR_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Site Editor</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --panel: #121932;
      --panel-2: #17203d;
      --border: rgba(255, 255, 255, 0.12);
      --text: #eef2ff;
      --muted: #a9b3d9;
      --accent: #66d9c6;
      --accent-2: #8ab4ff;
      --danger: #ff7b8b;
      --shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(102, 217, 198, 0.12), transparent 26rem),
        radial-gradient(circle at top right, rgba(138, 180, 255, 0.14), transparent 26rem),
        linear-gradient(180deg, #0a0f1d, #0d1326 50%, #101938);
      color: var(--text);
      min-height: 100vh;
    }

    .shell {
      max-width: 1440px;
      margin: 0 auto;
      padding: 2rem;
    }

    .topbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 1rem;
      align-items: start;
      margin-bottom: 1.5rem;
    }

    .hero {
      background: rgba(18, 25, 50, 0.82);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      padding: 1.5rem;
      box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }

    .hero h1 {
      margin: 0 0 0.35rem;
      font-size: clamp(2rem, 4vw, 3rem);
      line-height: 1;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      max-width: 62rem;
      line-height: 1.6;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: end;
      align-self: stretch;
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 0.8rem 1.15rem;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
    }

    button:hover { transform: translateY(-1px); }
    button:active { transform: translateY(0); }
    button.secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--border);
    }
    button.primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #08111f;
    }
    button.danger {
      background: rgba(255, 123, 139, 0.12);
      color: #ffd9df;
      border: 1px solid rgba(255, 123, 139, 0.25);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
      gap: 1.25rem;
    }

    .panel {
      background: rgba(18, 25, 50, 0.82);
      border: 1px solid var(--border);
      border-radius: 1.5rem;
      box-shadow: var(--shadow);
      overflow: hidden;
      backdrop-filter: blur(16px);
    }

    .panel-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .panel-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .status {
      font-size: 0.92rem;
      color: var(--muted);
    }

    .sections {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .section-card {
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      background: rgba(23, 32, 61, 0.68);
      padding: 1.1rem;
    }

    .section-card h2 {
      margin: 0;
      font-size: 1.2rem;
    }

    .section-card p.section-description {
      margin: 0.4rem 0 0;
      color: var(--muted);
      line-height: 1.55;
    }

    .field-grid {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .field {
      display: grid;
      gap: 0.45rem;
    }

    .field label {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .field small {
      color: var(--muted);
      line-height: 1.5;
    }

    input, textarea {
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 0.95rem;
      background: rgba(9, 13, 28, 0.6);
      color: var(--text);
      padding: 0.9rem 1rem;
      font: inherit;
    }

    textarea {
      min-height: 6.5rem;
      resize: vertical;
    }

    .markdown textarea {
      min-height: 12rem;
      font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      font-size: 0.92rem;
    }

    .array-list {
      display: grid;
      gap: 0.85rem;
    }

    .array-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .array-item {
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1rem;
      background: rgba(9, 13, 28, 0.45);
      display: grid;
      gap: 0.9rem;
    }

    .array-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .array-actions {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .array-actions button,
    .mini-button {
      padding: 0.55rem 0.8rem;
      border-radius: 0.8rem;
      font-size: 0.9rem;
    }

    .hint {
      color: var(--muted);
      line-height: 1.6;
      margin: 0;
    }

    pre {
      margin: 0;
      padding: 1.25rem;
      overflow: auto;
      max-height: calc(100vh - 14rem);
      color: #cfe0ff;
      font: 0.87rem/1.6 "IBM Plex Mono", "SFMono-Regular", monospace;
    }

    .preview-note {
      padding: 0 1.25rem 1.15rem;
      color: var(--muted);
      line-height: 1.6;
      font-size: 0.92rem;
    }

    .error-banner {
      margin-bottom: 1rem;
      border: 1px solid rgba(255, 123, 139, 0.3);
      background: rgba(255, 123, 139, 0.12);
      color: #ffe2e7;
      border-radius: 1rem;
      padding: 1rem 1.1rem;
      display: none;
      line-height: 1.5;
    }

    @media (max-width: 1080px) {
      .layout { grid-template-columns: 1fr; }
      pre { max-height: 24rem; }
    }

    @media (max-width: 700px) {
      .shell { padding: 1rem; }
      .topbar { grid-template-columns: 1fr; }
      .toolbar { justify-content: start; }
      .array-toolbar, .array-item-header { align-items: start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div id="error-banner" class="error-banner"></div>

    <div class="topbar">
      <div class="hero">
        <h1 id="editor-title">Site Editor</h1>
        <p id="editor-description">Loading schema...</p>
      </div>
      <div class="toolbar">
        <button id="reload-button" class="secondary" type="button">Reload</button>
        <button id="reset-button" class="danger" type="button">Reset To Defaults</button>
        <button id="save-button" class="primary" type="button">Save</button>
      </div>
    </div>

    <div class="layout">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">Editable Fields</div>
          <div id="status" class="status">Loading...</div>
        </div>
        <div id="sections" class="sections"></div>
      </section>

      <aside class="panel">
        <div class="panel-header">
          <div class="panel-title">JSON Preview</div>
          <div class="status">Generated from the schema-driven form</div>
        </div>
        <pre id="json-preview">{}</pre>
        <div class="preview-note">
          The file on disk is <code>frontend/static/site-content.json</code>. Save here, then build or
          deploy as usual.
        </div>
      </aside>
    </div>
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
    return sync_with_schema(schema, content)


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
            write_json(CONTENT_PATH, content)
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    schema = load_schema()
    server = SiteEditorServer((args.host, args.port), SiteEditorHandler, schema)
    actual_host, actual_port = server.server_address[:2]
    url = f'http://{actual_host}:{actual_port}'

    print(f'Site editor ready at {url}')
    print(f'Editing {CONTENT_PATH.relative_to(ROOT)} using {SCHEMA_PATH.relative_to(ROOT)}')
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
