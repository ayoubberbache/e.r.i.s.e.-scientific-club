import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  ImagePlus,
  Loader2,
  MousePointerClick,
  Palette,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Calendar,
  Minus,
} from 'lucide-react';
import { getApiAuthHeaders } from '../../lib/departmentStorage';
import {
  EmailBlock,
  EmailTemplateRecord,
  EmailThemeConfig,
  ImagePlacement,
} from '../../types/portals';

const DEFAULT_THEME: EmailThemeConfig = {
  bgColor: '#f8fcfd',
  cardBg: '#ffffff',
  headerBg: '#0d5c63',
  headerText: '#ffffff',
  accentColor: '#0d5c63',
  textColor: '#0a1628',
  fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
  buttonBg: '#0d5c63',
  buttonText: '#ffffff',
};

const FONT_OPTIONS = [
  'Plus Jakarta Sans, Arial, sans-serif',
  'Space Grotesk, Arial, sans-serif',
  'Cairo, Arial, sans-serif',
  'Georgia, serif',
  'Courier New, monospace',
];

const PLACEMENT_OPTIONS: Array<{ value: ImagePlacement; label: string }> = [
  { value: 'header_banner', label: 'Header Banner (Above Title)' },
  { value: 'hero', label: 'Hero Image (Below Header)' },
  { value: 'inline_top', label: 'Inline Top' },
  { value: 'inline_left', label: 'Inline Float Left' },
  { value: 'inline_right', label: 'Inline Float Right' },
  { value: 'inline_bottom', label: 'Inline Bottom' },
  { value: 'footer_banner', label: 'Footer Banner (Before Club Footer)' },
];

const CATEGORIES: Array<{ value: EmailTemplateRecord['category']; label: string }> = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'bootcamp', label: 'Bootcamp' },
  { value: 'competition', label: 'Competition' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'recruitment_meeting', label: 'Recruitment Interview' },
  { value: 'recruitment_acceptance', label: 'Club Acceptance' },
  { value: 'custom', label: 'General / Custom' },
];

const MERGE_TAGS = ['{{name}}', '{{eventTitle}}', '{{dateTime}}', '{{location}}', '{{notes}}', '{{departments}}', '{{studentId}}'];

const createEmptyTemplate = (): Omit<EmailTemplateRecord, 'id'> & { id?: string } => ({
  name: 'New Workshop Email Template',
  category: 'workshop',
  subject: 'You are registered for {{eventTitle}} — E.R.I.S.E. Club',
  theme_config: { ...DEFAULT_THEME },
  is_default: false,
  blocks: [
    {
      id: `blk-${Date.now()}-1`,
      type: 'heading',
      text: 'Welcome to {{eventTitle}}!',
      color: '#0d5c63',
      fontSize: '22px',
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      align: 'left',
    },
    {
      id: `blk-${Date.now()}-2`,
      type: 'paragraph',
      text: 'Hello {{name}},\n\nYour registration for {{eventTitle}} has been recorded. Please find the event details and instructions below.',
      color: '#0a1628',
      fontSize: '14px',
      fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
      align: 'left',
    },
    {
      id: `blk-${Date.now()}-3`,
      type: 'event_card',
      title: 'Session Schedule & Venue',
      showDateTime: true,
      showLocation: true,
      showNotes: true,
    },
    {
      id: `blk-${Date.now()}-4`,
      type: 'button',
      text: 'View Club Events',
      url: 'https://erise-scientific-club.site/events',
      align: 'center',
    },
  ],
});

interface EmailTemplateStudioProps {
  onTemplatesChanged?: (templates: EmailTemplateRecord[]) => void;
}

export function EmailTemplateStudio({ onTemplatesChanged }: EmailTemplateStudioProps) {
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Omit<EmailTemplateRecord, 'id'> & { id?: string }>(
    createEmptyTemplate()
  );
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email-templates', { headers: getApiAuthHeaders() });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setTemplates(json.data);
        onTemplatesChanged?.(json.data);
        if (json.data.length > 0 && !editing.id) {
          setEditing(json.data[0]);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Debounced live server-rendered preview
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/email-templates', {
          method: 'POST',
          headers: getApiAuthHeaders(),
          body: JSON.stringify({
            action: 'preview',
            subject: editing.subject,
            blocks: editing.blocks,
            theme_config: editing.theme_config,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          setPreviewHtml(json.html || '');
        }
      } catch {}
    }, 280);
    return () => clearTimeout(timer);
  }, [editing.subject, editing.blocks, editing.theme_config]);

  const addBlock = (type: EmailBlock['type']) => {
    const id = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let newBlock: EmailBlock;

    switch (type) {
      case 'heading':
        newBlock = { id, type, text: 'Section Heading', color: editing.theme_config.accentColor, fontSize: '20px', fontFamily: editing.theme_config.fontFamily, align: 'left' };
        break;
      case 'paragraph':
        newBlock = { id, type, text: 'Write your message here... You can insert tags like {{name}} or {{eventTitle}}.', color: editing.theme_config.textColor, fontSize: '14px', fontFamily: editing.theme_config.fontFamily, align: 'left' };
        break;
      case 'image':
        newBlock = { id, type, url: '/logo-cyan-full.png', alt: 'Event Banner', placement: 'hero', width: '100%', borderRadius: '8px', align: 'center' };
        break;
      case 'button':
        newBlock = { id, type, text: 'Confirm Attendance', url: 'https://erise-scientific-club.site/events', align: 'center' };
        break;
      case 'event_card':
        newBlock = { id, type, title: 'Event Details', showDateTime: true, showLocation: true, showNotes: true };
        break;
      case 'divider':
        newBlock = { id, type };
        break;
      default:
        newBlock = { id, type: 'spacer', height: 18 };
        break;
    }

    setEditing(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
  };

  const updateBlock = (blockId: string, patch: Partial<EmailBlock>) => {
    setEditing(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= editing.blocks.length) return;
    setEditing(prev => {
      const next = [...prev.blocks];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...prev, blocks: next };
    });
  };

  const removeBlock = (blockId: string) => {
    setEditing(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== blockId) }));
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    if (!file) return;
    setUploadingBlockId(blockId);
    setStatusMsg(null);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: getApiAuthHeaders(),
        body: JSON.stringify({
          action: 'upload_image',
          fileName: file.name,
          contentType: file.type,
          base64Data,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');

      updateBlock(blockId, { url: json.url, alt: file.name.replace(/\.[^.]+$/, '') });
      setStatusMsg({ type: 'ok', text: 'Picture uploaded to Supabase Storage & placed in template.' });
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err?.message || 'Picture upload failed' });
    } finally {
      setUploadingBlockId(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editing.name.trim() || !editing.subject.trim()) {
      setStatusMsg({ type: 'err', text: 'Template name and subject line are required.' });
      return;
    }
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: getApiAuthHeaders(),
        body: JSON.stringify({
          action: 'save',
          id: editing.id,
          name: editing.name.trim(),
          slug: editing.slug,
          category: editing.category,
          subject: editing.subject.trim(),
          blocks: editing.blocks,
          theme_config: editing.theme_config,
          is_default: Boolean(editing.is_default),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');

      setEditing(json.data);
      setStatusMsg({ type: 'ok', text: `Template "${json.data.name}" registered & ready for events and recruitment!` });
      await loadTemplates();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err?.message || 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this saved email template?')) return;
    const res = await fetch('/api/email-templates', {
      method: 'POST',
      headers: getApiAuthHeaders(),
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (res.ok) {
      if (editing.id === id) setEditing(createEmptyTemplate());
      await loadTemplates();
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setSendingTest(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: getApiAuthHeaders(),
        body: JSON.stringify({
          action: 'send_test',
          to: testEmail.trim(),
          subject: editing.subject,
          blocks: editing.blocks,
          theme_config: editing.theme_config,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send test');
      setStatusMsg({ type: 'ok', text: `Test email dispatched via ${json.sender || 'erise.club@hns-re2sd.dz'}!` });
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err?.message || 'Test send failed' });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-4">
      {statusMsg && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Saved Template Library */}
        <div className="xl:col-span-3 card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-primary">Registered Templates</h3>
            <button
              type="button"
              onClick={() => setEditing(createEmptyTemplate())}
              className="btn-primary text-xs py-1.5 px-2.5"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {loading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {templates.map(tpl => {
                const isSelected = editing.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setEditing(tpl)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-secondary border-accent'
                        : 'bg-dominant border-subtle hover:border-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-primary truncate">{tpl.name}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-surface border border-subtle text-[10px] font-bold uppercase text-accent">
                          {tpl.category.replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteTemplate(tpl.id);
                        }}
                        className="p-1 text-muted hover:text-red-500 transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Test Dispatch */}
          <div className="pt-3 border-t border-subtle space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted block">
              Test Send (erise.club@hns-re2sd.dz)
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="input-standard text-xs py-2"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest || !testEmail.trim()}
              className="btn-secondary w-full text-xs py-2"
            >
              {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test Preview
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: WordPress-Style Visual Block & Style Composer */}
        <div className="xl:col-span-5 card p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-3">
            <div>
              <h2 className="font-display font-bold text-base text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Email Template Editor
              </h2>
              <p className="text-xs text-muted">Customize colors, fonts, images & placement, then register.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={saving}
              className="btn-primary text-xs py-2 px-4"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editing.id ? 'Update Template' : 'Create & Register'}
            </button>
          </div>

          {/* Template Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-secondary block mb-1">Template Name *</label>
              <input
                type="text"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
                className="input-standard text-xs py-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-secondary block mb-1">Category *</label>
              <select
                value={editing.category}
                onChange={e =>
                  setEditing({
                    ...editing,
                    category: e.target.value as EmailTemplateRecord['category'],
                  })
                }
                className="input-standard text-xs py-2"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-secondary block mb-1">Email Subject Line *</label>
              <input
                type="text"
                value={editing.subject}
                onChange={e => setEditing({ ...editing, subject: e.target.value })}
                className="input-standard text-xs py-2"
              />
            </div>
          </div>

          {/* Global Colors & Typography */}
          <div className="p-3.5 rounded-xl bg-dominant border border-default space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-accent" /> Colors &amp; Global Font
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setEditing(prev => ({
                      ...prev,
                      theme_config: { ...DEFAULT_THEME },
                    }))
                  }
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-default hover:border-accent"
                >
                  Teal Preset
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditing(prev => ({
                      ...prev,
                      theme_config: {
                        bgColor: '#060f1c',
                        cardBg: '#0a192a',
                        headerBg: '#0d5c63',
                        headerText: '#ffffff',
                        accentColor: '#00e5ff',
                        textColor: '#f0f8fb',
                        fontFamily: prev.theme_config.fontFamily,
                        buttonBg: '#00e5ff',
                        buttonText: '#060f1c',
                      },
                    }))
                  }
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-default hover:border-accent"
                >
                  Dark Cyan Preset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
              {[
                ['headerBg', 'Header BG'],
                ['accentColor', 'Accent'],
                ['buttonBg', 'Button BG'],
                ['bgColor', 'Canvas BG'],
                ['cardBg', 'Card BG'],
                ['textColor', 'Body Text'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between gap-2 bg-surface px-2.5 py-1.5 rounded-lg border border-subtle">
                  <span className="font-semibold text-secondary">{label}</span>
                  <input
                    type="color"
                    value={(editing.theme_config as any)[key] || '#0d5c63'}
                    onChange={e =>
                      setEditing(prev => ({
                        ...prev,
                        theme_config: { ...prev.theme_config, [key]: e.target.value },
                      }))
                    }
                    className="w-6 h-5 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-bold text-muted block mb-1">Global Font Family</label>
              <select
                value={editing.theme_config.fontFamily}
                onChange={e =>
                  setEditing(prev => ({
                    ...prev,
                    theme_config: { ...prev.theme_config, fontFamily: e.target.value },
                  }))
                }
                className="input-standard text-xs py-1.5"
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f} value={f}>{f.split(',')[0]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Block Toolbar */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Insert Content Block
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => addBlock('heading')} className="btn-secondary text-xs py-1.5 px-2.5">
                <Type className="w-3.5 h-3.5" /> Heading
              </button>
              <button type="button" onClick={() => addBlock('paragraph')} className="btn-secondary text-xs py-1.5 px-2.5">
                <AlignLeft className="w-3.5 h-3.5" /> Text
              </button>
              <button type="button" onClick={() => addBlock('image')} className="btn-secondary text-xs py-1.5 px-2.5">
                <ImagePlus className="w-3.5 h-3.5" /> Picture
              </button>
              <button type="button" onClick={() => addBlock('event_card')} className="btn-secondary text-xs py-1.5 px-2.5">
                <Calendar className="w-3.5 h-3.5" /> Event Card
              </button>
              <button type="button" onClick={() => addBlock('button')} className="btn-secondary text-xs py-1.5 px-2.5">
                <MousePointerClick className="w-3.5 h-3.5" /> CTA Button
              </button>
              <button type="button" onClick={() => addBlock('divider')} className="btn-secondary text-xs py-1.5 px-2.5">
                <Minus className="w-3.5 h-3.5" /> Divider
              </button>
            </div>
          </div>

          {/* Merge Tag Cheat Sheet */}
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="font-bold text-muted mr-1">Dynamic Tags:</span>
            {MERGE_TAGS.map(tag => (
              <code key={tag} className="px-1.5 py-0.5 rounded bg-secondary text-accent border border-subtle">
                {tag}
              </code>
            ))}
          </div>

          {/* Block Stack */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {editing.blocks.map((block, idx) => (
              <div key={block.id} className="p-3.5 rounded-xl bg-dominant border border-default space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    #{idx + 1} · {block.type.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveBlock(idx, -1)} className="p-1 rounded hover:bg-secondary text-muted" title="Move Up">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => moveBlock(idx, 1)} className="p-1 rounded hover:bg-secondary text-muted" title="Move Down">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-red-500/10 text-red-500" title="Remove">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {(block.type === 'heading' || block.type === 'paragraph') && (
                  <>
                    <textarea
                      rows={block.type === 'heading' ? 1 : 3}
                      value={block.text || ''}
                      onChange={e => updateBlock(block.id, { text: e.target.value })}
                      className="input-standard text-xs py-2"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="color"
                        value={block.color || editing.theme_config.textColor}
                        onChange={e => updateBlock(block.id, { color: e.target.value })}
                        title="Text Color"
                        className="w-7 h-7 rounded cursor-pointer border border-default bg-surface p-0.5"
                      />
                      <select
                        value={block.fontFamily || editing.theme_config.fontFamily}
                        onChange={e => updateBlock(block.id, { fontFamily: e.target.value })}
                        className="input-standard text-[11px] py-1 px-2 w-auto flex-1"
                      >
                        {FONT_OPTIONS.map(f => (
                          <option key={f} value={f}>{f.split(',')[0]}</option>
                        ))}
                      </select>
                      <select
                        value={block.fontSize || (block.type === 'heading' ? '22px' : '14px')}
                        onChange={e => updateBlock(block.id, { fontSize: e.target.value })}
                        className="input-standard text-[11px] py-1 px-2 w-20"
                      >
                        {['12px', '14px', '16px', '18px', '22px', '26px'].map(sz => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                      <div className="flex rounded-lg border border-default overflow-hidden">
                        {(['left', 'center', 'right'] as const).map(al => (
                          <button
                            key={al}
                            type="button"
                            onClick={() => updateBlock(block.id, { align: al })}
                            className={`p-1.5 ${block.align === al ? 'bg-accent btn-on-accent' : 'bg-surface text-muted'}`}
                          >
                            {al === 'left' ? <AlignLeft className="w-3 h-3" /> : al === 'center' ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {block.type === 'image' && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer">
                        {uploadingBlockId === block.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                        <span>Upload Picture</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleImageUpload(block.id, f);
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={block.url || ''}
                        onChange={e => updateBlock(block.id, { url: e.target.value })}
                        placeholder="Or paste https:// image URL"
                        className="input-standard text-xs py-1.5 flex-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-muted block mb-1">Image Placement</label>
                        <select
                          value={block.placement || 'hero'}
                          onChange={e => updateBlock(block.id, { placement: e.target.value as ImagePlacement })}
                          className="input-standard text-xs py-1.5"
                        >
                          {PLACEMENT_OPTIONS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted block mb-1">Width</label>
                        <select
                          value={block.width || '100%'}
                          onChange={e => updateBlock(block.id, { width: e.target.value })}
                          className="input-standard text-xs py-1.5"
                        >
                          <option value="100%">Full Width (100%)</option>
                          <option value="75%">Large (75%)</option>
                          <option value="50%">Half (50%)</option>
                          <option value="220px">Thumbnail (220px)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {block.type === 'button' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={block.text || ''}
                      onChange={e => updateBlock(block.id, { text: e.target.value })}
                      placeholder="Button label"
                      className="input-standard text-xs py-1.5"
                    />
                    <input
                      type="text"
                      value={block.url || ''}
                      onChange={e => updateBlock(block.id, { url: e.target.value })}
                      placeholder="https://..."
                      className="input-standard text-xs py-1.5"
                    />
                  </div>
                )}

                {block.type === 'event_card' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.title || ''}
                      onChange={e => updateBlock(block.id, { title: e.target.value })}
                      placeholder="Card Heading"
                      className="input-standard text-xs py-1.5"
                    />
                    <div className="flex flex-wrap gap-3 text-xs text-secondary">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={block.showDateTime !== false}
                          onChange={e => updateBlock(block.id, { showDateTime: e.target.checked })}
                        />
                        Date &amp; Time
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={block.showLocation !== false}
                          onChange={e => updateBlock(block.id, { showLocation: e.target.checked })}
                        />
                        Location
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={block.showNotes !== false}
                          onChange={e => updateBlock(block.id, { showNotes: e.target.checked })}
                        />
                        Notes
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Email Render */}
        <div className="xl:col-span-4 card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-subtle pb-2">
            <span className="font-display font-bold text-sm text-primary flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-accent" /> Live Inbox Preview
            </span>
            <span className="text-[11px] font-semibold text-muted">From: erise.club@hns-re2sd.dz</span>
          </div>
          <div className="rounded-lg border border-default overflow-hidden bg-white h-[660px]">
            <iframe
              title="Email Live Preview"
              srcDoc={previewHtml || '<p style="font-family:sans-serif;padding:24px;color:#557485;">Loading live preview...</p>'}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
