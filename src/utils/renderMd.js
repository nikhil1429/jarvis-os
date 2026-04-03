// renderMd.js — Shared markdown-to-HTML renderer
// WHY: AI responses contain **bold**, `code`, ```blocks```. Multiple components need this.

export default function renderMd(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre style="background:rgba(0,180,216,0.08);padding:12px;border-radius:4px;overflow-x:auto;margin:8px 0;border:1px solid rgba(0,180,216,0.15)"><code style="font-family:Share Tech Mono,monospace;font-size:0.85em;color:#48cae4">${code.trim()}</code></pre>`)
    .replace(/### (.+)/g, '<span style="display:block;font-family:Rajdhani,sans-serif;font-size:0.85em;font-weight:700;color:#00b4d8;margin:12px 0 4px;letter-spacing:0.05em">$1</span>')
    .replace(/## (.+)/g, '<span style="display:block;font-family:Rajdhani,sans-serif;font-size:0.95em;font-weight:700;color:#d4a853;margin:14px 0 6px;letter-spacing:0.05em">$1</span>')
    .replace(/---/g, '<hr style="border:none;border-top:1px solid rgba(0,180,216,0.15);margin:10px 0"/>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#d0e8f8">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,180,216,0.1);padding:1px 4px;border-radius:3px;font-family:Share Tech Mono,monospace;font-size:0.9em">$1</code>')
    .replace(/^- (.+)/gm, '<span style="display:block;padding-left:12px;margin:2px 0">• $1</span>')
    .replace(/^\d+\. (.+)/gm, '<span style="display:block;padding-left:12px;margin:2px 0">$1</span>')
    .replace(/\n/g, '<br/>')
}
