// WordPress-Style Email Block Renderer & XSS-Safe Sanitizer

export type ImagePlacement =
  | 'header_banner'
  | 'hero'
  | 'inline_top'
  | 'inline_left'
  | 'inline_right'
  | 'inline_bottom'
  | 'footer_banner';

export interface EmailBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'button' | 'event_card' | 'divider' | 'spacer' | 'department_links';
  text?: string;
  level?: 'h1' | 'h2' | 'h3';
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
  url?: string;
  alt?: string;
  placement?: ImagePlacement;
  width?: string;
  borderRadius?: string;
  title?: string;
  showLocation?: boolean;
  showDateTime?: boolean;
  showNotes?: boolean;
  height?: number;
}

export interface EmailThemeConfig {
  bgColor: string;
  cardBg: string;
  headerBg: string;
  headerText: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  buttonBg: string;
  buttonText: string;
}

export const DEFAULT_THEME_CONFIG: EmailThemeConfig = {
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

export function escapeHtml(unsafe: unknown): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)$/.test(trimmed)) return trimmed;
  return fallback;
}

function sanitizeFont(font: string | undefined, fallback: string): string {
  if (!font) return fallback;
  return font.replace(/[^a-zA-Z0-9,\s\-']/g, '').trim() || fallback;
}

function sanitizeUrl(url: string | undefined): string {
  if (!url) return 'https://erise-scientific-club.site';
  const clean = url.trim();
  if (/^https?:\/\//i.test(clean)) return escapeHtml(clean);
  if (clean.startsWith('/')) return `https://erise-scientific-club.site${escapeHtml(clean)}`;
  return 'https://erise-scientific-club.site';
}

export function interpolateMergeTags(templateStr: string, vars: Record<string, string>): string {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const val = vars[key] ?? '';
    return escapeHtml(String(val));
  });
}

function interpolatePlain(templateStr: string, vars: Record<string, string>): string {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (_m, key) => String(vars[key] ?? ''));
}

export function renderEmailFromBlocks(params: {
  subject: string;
  blocks: EmailBlock[];
  themeConfig?: Partial<EmailThemeConfig>;
  variables: Record<string, string>;
}): { subject: string; html: string; text: string } {
  const theme: EmailThemeConfig = {
    bgColor: sanitizeColor(params.themeConfig?.bgColor, DEFAULT_THEME_CONFIG.bgColor),
    cardBg: sanitizeColor(params.themeConfig?.cardBg, DEFAULT_THEME_CONFIG.cardBg),
    headerBg: sanitizeColor(params.themeConfig?.headerBg, DEFAULT_THEME_CONFIG.headerBg),
    headerText: sanitizeColor(params.themeConfig?.headerText, DEFAULT_THEME_CONFIG.headerText),
    accentColor: sanitizeColor(params.themeConfig?.accentColor, DEFAULT_THEME_CONFIG.accentColor),
    textColor: sanitizeColor(params.themeConfig?.textColor, DEFAULT_THEME_CONFIG.textColor),
    fontFamily: sanitizeFont(params.themeConfig?.fontFamily, DEFAULT_THEME_CONFIG.fontFamily),
    buttonBg: sanitizeColor(params.themeConfig?.buttonBg, DEFAULT_THEME_CONFIG.buttonBg),
    buttonText: sanitizeColor(params.themeConfig?.buttonText, DEFAULT_THEME_CONFIG.buttonText),
  };

  const vars = params.variables;
  const renderedSubject = interpolatePlain(params.subject || 'E.R.I.S.E. Notification', vars);
  const blocks = Array.isArray(params.blocks) ? params.blocks : [];

  const headerBanners = blocks.filter(b => b.type === 'image' && b.placement === 'header_banner');
  const heroImages = blocks.filter(b => b.type === 'image' && b.placement === 'hero');
  const footerBanners = blocks.filter(b => b.type === 'image' && b.placement === 'footer_banner');
  const bodyBlocks = blocks.filter(
    b => !(b.type === 'image' && (b.placement === 'header_banner' || b.placement === 'hero' || b.placement === 'footer_banner'))
  );

  const renderImageTag = (b: EmailBlock) => {
    const src = sanitizeUrl(b.url);
    const alt = escapeHtml(b.alt || 'E.R.I.S.E. Image');
    const width = b.width && /^\d+(%|px)$/.test(b.width) ? b.width : '100%';
    const radius = b.borderRadius && /^\d+(px|%)$/.test(b.borderRadius) ? b.borderRadius : '8px';

    if (b.placement === 'inline_left') {
      return `<img src="${src}" alt="${alt}" style="float:left;width:${width};max-width:240px;margin:4px 16px 12px 0;border-radius:${radius};display:block;" />`;
    }
    if (b.placement === 'inline_right') {
      return `<img src="${src}" alt="${alt}" style="float:right;width:${width};max-width:240px;margin:4px 0 12px 16px;border-radius:${radius};display:block;" />`;
    }
    const alignMargin = b.align === 'left' ? '0 auto 14px 0' : b.align === 'right' ? '0 0 14px auto' : '0 auto 14px auto';
    return `<div style="text-align:${b.align || 'center'};margin:12px 0;"><img src="${src}" alt="${alt}" style="width:${width};max-width:100%;height:auto;border-radius:${radius};display:block;margin:${alignMargin};" /></div>`;
  };

  const plainLines: string[] = [];

  const bodyHtml = bodyBlocks
    .map(b => {
      if (b.type === 'image') {
        return renderImageTag(b);
      }

      if (b.type === 'heading') {
        const text = interpolateMergeTags(b.text || '', vars);
        plainLines.push(interpolatePlain(b.text || '', vars));
        const font = sanitizeFont(b.fontFamily, theme.fontFamily);
        const color = sanitizeColor(b.color, theme.accentColor);
        const size = b.fontSize && /^\d+px$/.test(b.fontSize) ? b.fontSize : '22px';
        const align = b.align || 'left';
        return `<h2 style="margin:0 0 12px 0;font-family:${font};color:${color};font-size:${size};font-weight:${b.fontWeight || '700'};text-align:${align};line-height:1.3;">${text}</h2>`;
      }

      if (b.type === 'paragraph') {
        const text = interpolateMergeTags(b.text || '', vars).replace(/\n/g, '<br/>');
        plainLines.push(interpolatePlain(b.text || '', vars));
        const font = sanitizeFont(b.fontFamily, theme.fontFamily);
        const color = sanitizeColor(b.color, theme.textColor);
        const size = b.fontSize && /^\d+px$/.test(b.fontSize) ? b.fontSize : '14px';
        const align = b.align || 'left';
        return `<p style="margin:0 0 14px 0;font-family:${font};color:${color};font-size:${size};line-height:1.65;text-align:${align};">${text}</p>`;
      }

      if (b.type === 'button') {
        const label = interpolateMergeTags(b.text || 'Learn More', vars);
        const href = sanitizeUrl(b.url);
        plainLines.push(`${interpolatePlain(b.text || 'Link', vars)}: ${href}`);
        return `<div style="text-align:${b.align || 'center'};margin:20px 0;"><a href="${href}" target="_blank" style="display:inline-block;background-color:${theme.buttonBg};color:${theme.buttonText};text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;font-family:${theme.fontFamily};">${label}</a></div>`;
      }

      if (b.type === 'event_card') {
        const cardTitle = escapeHtml(b.title || 'Event Details');
        const evTitle = escapeHtml(vars.eventTitle || 'E.R.I.S.E. Event');
        const dt = escapeHtml(vars.dateTime || 'TBA');
        const loc = escapeHtml(vars.location || 'HNSRE Batna');
        const notes = escapeHtml(vars.notes || '');
        plainLines.push(`\n--- ${b.title || 'Event Details'} ---\nEvent: ${vars.eventTitle || ''}\nDate/Time: ${vars.dateTime || ''}\nLocation: ${vars.location || ''}${vars.notes ? `\nNotes: ${vars.notes}` : ''}`);
        return `
          <div style="clear:both;background-color:#f8fcfd;border:1px solid #cfe5e9;border-left:4px solid ${theme.accentColor};border-radius:8px;padding:16px;margin:16px 0;text-align:left;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;color:${theme.accentColor};margin-bottom:8px;">${cardTitle}</div>
            <div style="font-size:15px;font-weight:700;color:#0a1628;margin-bottom:6px;">${evTitle}</div>
            ${b.showDateTime !== false ? `<div style="font-size:13px;color:#244153;margin-bottom:4px;"><strong>Date &amp; Time:</strong> ${dt}</div>` : ''}
            ${b.showLocation !== false ? `<div style="font-size:13px;color:#244153;margin-bottom:4px;"><strong>Location:</strong> ${loc}</div>` : ''}
            ${b.showNotes !== false && notes ? `<div style="font-size:13px;color:#244153;margin-top:8px;padding-top:8px;border-top:1px solid #e2f2f5;"><strong>Note:</strong> ${notes}</div>` : ''}
          </div>
        `;
      }

      if (b.type === 'divider') {
        return `<hr style="clear:both;border:none;border-top:1px solid #cfe5e9;margin:18px 0;" />`;
      }

      if (b.type === 'spacer') {
        const h = Math.min(80, Math.max(8, Number(b.height) || 16));
        return `<div style="clear:both;height:${h}px;"></div>`;
      }

      return '';
    })
    .join('\n');

  const logoUrl = 'https://erise-scientific-club.site/logo-cyan-full.png';
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(renderedSubject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${theme.bgColor};font-family:${theme.fontFamily};color:${theme.textColor};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${theme.bgColor}">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background-color:${theme.cardBg};border:1px solid #cfe5e9;border-radius:12px;overflow:hidden;">
          ${headerBanners.length > 0 ? `<tr><td style="padding:0;">${headerBanners.map(renderImageTag).join('')}</td></tr>` : ''}
          <tr>
            <td bgcolor="${theme.headerBg}" style="background-color:${theme.headerBg};padding:24px 24px;text-align:center;">
              <img src="${logoUrl}" alt="E.R.I.S.E. Logo" width="120" style="margin:0 auto 10px auto;display:block;width:120px;height:auto;" />
              <div style="color:${theme.headerText};font-size:18px;font-weight:800;letter-spacing:0.3px;">E.R.I.S.E. Scientific Club</div>
              <div style="color:${theme.headerText};opacity:0.85;font-size:12px;margin-top:4px;">Engineers for Renewable Energy, Innovation &amp; Environmental Sustainability</div>
            </td>
          </tr>
          ${heroImages.length > 0 ? `<tr><td style="padding:16px 24px 0 24px;">${heroImages.map(renderImageTag).join('')}</td></tr>` : ''}
          <tr>
            <td style="padding:24px 24px;text-align:left;">
              ${bodyHtml}
              <div style="clear:both;"></div>
            </td>
          </tr>
          ${footerBanners.length > 0 ? `<tr><td style="padding:0 24px 16px 24px;">${footerBanners.map(renderImageTag).join('')}</td></tr>` : ''}
          <tr>
            <td bgcolor="#060f1c" style="background-color:#060f1c;padding:18px 20px;text-align:center;color:#9ec2d2;font-size:11px;line-height:1.5;">
              <strong style="color:#f0f8fb;">E.R.I.S.E. Scientific Club</strong><br/>
              Higher National School of Renewable Energies, Environment &amp; Sustainable Development — Batna, Algeria<br/>
              <a href="mailto:erise.club@hns-re2sd.dz" style="color:#00e5ff;text-decoration:underline;">erise.club@hns-re2sd.dz</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${plainLines.join('\n\n')}\n\n--\nE.R.I.S.E. Scientific Club (erise.club@hns-re2sd.dz)\nHigher National School of Renewable Energies, Environment & Sustainable Development — Batna, Algeria`;

  return { subject: renderedSubject, html, text };
}
