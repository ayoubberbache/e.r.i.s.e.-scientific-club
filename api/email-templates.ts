import { z } from 'zod';
import { getAdminClient } from './_lib/supabaseAdmin.js';
import { applySecurityCors, logAuditEvent, verifyAdminAuth } from './_lib/auth.js';
import { renderEmailFromBlocks, type EmailBlock, type EmailThemeConfig } from './_lib/emailRenderer.js';
import { sendGmailAsErise } from './_lib/googleWorkspace.js';

const BlockSchema = z.object({
  id: z.string(),
  type: z.enum(['heading', 'paragraph', 'image', 'button', 'event_card', 'divider', 'spacer', 'department_links']),
  text: z.string().optional(),
  level: z.enum(['h1', 'h2', 'h3']).optional(),
  color: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  url: z.string().optional(),
  alt: z.string().optional(),
  placement: z.enum([
    'header_banner',
    'hero',
    'inline_top',
    'inline_left',
    'inline_right',
    'inline_bottom',
    'footer_banner',
  ]).optional(),
  width: z.string().optional(),
  borderRadius: z.string().optional(),
  title: z.string().optional(),
  showLocation: z.boolean().optional(),
  showDateTime: z.boolean().optional(),
  showNotes: z.boolean().optional(),
  height: z.number().optional(),
});

const SaveTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).optional(),
  category: z.enum([
    'workshop',
    'bootcamp',
    'competition',
    'hackathon',
    'recruitment_meeting',
    'recruitment_acceptance',
    'custom',
  ]),
  subject: z.string().min(2).max(200),
  blocks: z.array(BlockSchema),
  theme_config: z.record(z.any()).optional().default({}),
  is_default: z.boolean().optional().default(false),
});

function slugifyTemplate(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `template-${Date.now()}`;
}

export default async function handler(req: any, res: any) {
  applySecurityCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = verifyAdminAuth(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized. Valid admin session required.' });
  }

  let supabase;
  try {
    supabase = getAdminClient();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data: data || [] });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const action = body.action || 'save';

    if (action === 'preview') {
      const { subject, blocks, theme_config, variables } = body;
      const rendered = renderEmailFromBlocks({
        subject: subject || 'E.R.I.S.E. Preview',
        blocks: (blocks || []) as EmailBlock[],
        themeConfig: (theme_config || {}) as Partial<EmailThemeConfig>,
        variables: variables || {
          name: 'Amine Benali',
          eventTitle: 'Solar IoT Workshop 2026',
          dateTime: 'Saturday, 10:00 AM',
          location: 'HNSRE Amphitheater B, Batna',
          notes: 'Bring your laptop and student ID card.',
          departments: 'Projects, Organization',
          studentId: '202431048291',
        },
      });
      return res.status(200).json(rendered);
    }

    if (action === 'upload_image') {
      const { fileName, contentType, base64Data } = body;
      if (!fileName || !contentType || !base64Data) {
        return res.status(400).json({ error: 'Missing fileName, contentType, or base64Data' });
      }
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(contentType)) {
        return res.status(400).json({ error: 'Unsupported image MIME type. Use PNG, JPG, WEBP, or GIF.' });
      }

      const cleanB64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanB64, 'base64');
      if (buffer.length > 4 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image size exceeds 4MB limit' });
      }

      const ext = contentType.split('/')[1].replace('jpeg', 'jpg');
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const storagePath = `email-assets/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('public_images')
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadErr) {
        return res.status(500).json({ error: `Storage upload failed: ${uploadErr.message}` });
      }

      const { data: pubData } = supabase.storage.from('public_images').getPublicUrl(storagePath);
      return res.status(200).json({ success: true, url: pubData.publicUrl, path: storagePath });
    }

    if (action === 'save') {
      const parsed = SaveTemplateSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid template data', details: parsed.error.flatten() });
      }
      const tpl = parsed.data;
      const slug = tpl.slug ? slugifyTemplate(tpl.slug) : `${slugifyTemplate(tpl.name)}-${Date.now().toString(36)}`;
      const rendered = renderEmailFromBlocks({
        subject: tpl.subject,
        blocks: tpl.blocks as EmailBlock[],
        themeConfig: tpl.theme_config as Partial<EmailThemeConfig>,
        variables: {
          name: '{{name}}',
          eventTitle: '{{eventTitle}}',
          dateTime: '{{dateTime}}',
          location: '{{location}}',
          notes: '{{notes}}',
          departments: '{{departments}}',
          studentId: '{{studentId}}',
        },
      });

      if (tpl.is_default) {
        await supabase.from('email_templates').update({ is_default: false }).eq('category', tpl.category);
      }

      const row = {
        name: tpl.name,
        slug: tpl.id ? undefined : slug,
        category: tpl.category,
        subject: tpl.subject,
        blocks: tpl.blocks,
        theme_config: tpl.theme_config,
        html_preview: rendered.html,
        is_default: tpl.is_default,
        created_by: session.user.username,
        updated_at: new Date().toISOString(),
      };

      if (tpl.id) {
        const { data, error } = await supabase
          .from('email_templates')
          .update(row)
          .eq('id', tpl.id)
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        await logAuditEvent(supabase, session, 'update_email_template', 'email_templates', tpl.id, { name: tpl.name });
        return res.status(200).json({ success: true, data });
      } else {
        const { data, error } = await supabase
          .from('email_templates')
          .insert([{ ...row, slug }])
          .select()
          .single();
        if (error) return res.status(500).json({ error: error.message });
        await logAuditEvent(supabase, session, 'create_email_template', 'email_templates', data?.id, { name: tpl.name });
        return res.status(200).json({ success: true, data });
      }
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id) return res.status(400).json({ error: 'Template id required' });
      const { error } = await supabase.from('email_templates').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      await logAuditEvent(supabase, session, 'delete_email_template', 'email_templates', id);
      return res.status(200).json({ success: true });
    }

    if (action === 'send_test') {
      const { to, subject, blocks, theme_config } = body;
      if (!to || typeof to !== 'string') return res.status(400).json({ error: 'Recipient email required' });

      const rendered = renderEmailFromBlocks({
        subject: subject || 'Test Email — E.R.I.S.E. Template Studio',
        blocks: (blocks || []) as EmailBlock[],
        themeConfig: (theme_config || {}) as Partial<EmailThemeConfig>,
        variables: {
          name: session.user.name,
          eventTitle: 'Renewable Energy Innovation Bootcamp 2026',
          dateTime: 'Saturday 10:00 AM',
          location: 'HNSRE Batna Campus',
          notes: 'Test preview sent from E.R.I.S.E. Email Studio.',
          departments: 'Projects, Organization',
          studentId: '202400000001',
        },
      });

      const gmailResult = await sendGmailAsErise({
        to: to.trim(),
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      return res.status(200).json({ success: true, id: gmailResult.id, sender: gmailResult.sender });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
