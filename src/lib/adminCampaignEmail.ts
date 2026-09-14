export type AdminCampaignType = 'retention' | 'notification' | 'offer' | 'feedback' | 'rating';
export type AdminCampaignTheme = 'signature' | 'himalayan' | 'coastal' | 'midnight' | 'postcard';
export type AdminCampaignLayout = 'classic' | 'panorama' | 'editorial' | 'journey' | 'minimal';

export type AdminCampaignEmailInput = {
  campaignType: AdminCampaignType;
  theme?: AdminCampaignTheme;
  layout?: AdminCampaignLayout;
  recipientName: string;
  subject: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  logoUrl?: string;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const button = (label: string | undefined, url: string | undefined, color: string) =>
  label && url ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:12px;background:${color}"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(label)}</a></td></tr></table>` : '';

const footer = () => `<tr><td style="padding:24px 32px;text-align:center;color:#94a3b8;font-size:11px;line-height:1.6">You received this email because you have a GoTogether account.<br>&copy; ${new Date().getFullYear()} GoTogether &middot; Travel better, together</td></tr>`;

const brand = (logoUrl: string | undefined, dark = false) => `<table role="presentation" cellspacing="0" cellpadding="0"><tr>
  <td style="vertical-align:middle">${logoUrl ? `<img src="${escapeHtml(logoUrl)}" width="34" height="34" alt="GoTogether" style="display:block;width:34px;height:34px;border:0;border-radius:9px">` : '<span style="display:block;width:34px;height:34px;line-height:34px;border-radius:9px;background:#f97316;color:#fff;text-align:center;font-size:18px">&#9670;</span>'}</td>
  <td style="padding-left:10px;vertical-align:middle;color:${dark ? '#ffffff' : '#0f172a'};font-size:18px;font-weight:800;letter-spacing:-.02em">GoTogether</td>
</tr></table>`;

const themeConfig: Record<Exclude<AdminCampaignTheme, 'signature'>, {
  background: string; card: string; header: string; heading: string; eyebrow: string;
  accent: string; button: string; panel: string; muted: string; label: string; intro: string;
}> = {
  himalayan: {
    background: '#f5f2e9', card: '#fffdf7', header: '#17352b', heading: '#17352b',
    eyebrow: '#b7791f', accent: '#d9a441', button: '#b7791f', panel: '#f3ead5', muted: '#66756e',
    label: 'Field notes', intro: 'A thoughtfully selected journey from GoTogether.',
  },
  coastal: {
    background: '#eff8fa', card: '#ffffff', header: '#075985', heading: '#083344',
    eyebrow: '#0284c7', accent: '#22b8cf', button: '#0284c7', panel: '#e6f7fa', muted: '#55717a',
    label: 'Fresh from the coast', intro: 'A brighter way to plan what comes next.',
  },
  midnight: {
    background: '#090f1f', card: '#111a2e', header: '#0b1222', heading: '#fff7df',
    eyebrow: '#e7b85c', accent: '#e7b85c', button: '#c9922f', panel: '#18233b', muted: '#aab5c8',
    label: 'The night edition', intro: 'An elevated travel note, prepared for you.',
  },
  postcard: {
    background: '#f4efe6', card: '#fffaf0', header: '#fffaf0', heading: '#292524',
    eyebrow: '#b45309', accent: '#c2410c', button: '#292524', panel: '#f1e7d6', muted: '#78716c',
    label: 'Postcard from GoTogether', intro: 'A personal note for your next chapter.',
  },
};

function renderThemedCampaignEmail(input: AdminCampaignEmailInput, theme: Exclude<AdminCampaignTheme, 'signature'>, name: string, subject: string, message: string): string {
  const colors = themeConfig[theme];
  const dark = theme === 'midnight';
  const foreground = dark ? '#e8edf6' : '#475569';
  const border = dark ? '#26334e' : '#e7dfd1';
  return `<!doctype html><html><body style="margin:0;background:${colors.background};font-family:Arial,'Segoe UI',sans-serif;color:${foreground}">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(colors.intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colors.background};padding:30px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:${colors.card};border:1px solid ${border};border-radius:${theme === 'postcard' ? '8px' : '24px'};overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,.14)">
        <tr><td style="padding:20px 34px;background:${colors.header}">${brand(input.logoUrl, theme === 'midnight' || theme === 'himalayan')}<span style="float:right;margin-top:-24px;color:${theme === 'midnight' ? '#e7b85c' : theme === 'himalayan' ? '#f4d99c' : colors.eyebrow};font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(colors.label)}</span></td></tr>
        <tr><td style="padding:46px 38px 30px">
          <div style="width:46px;border-top:3px solid ${colors.accent};margin-bottom:24px"></div>
          <p style="margin:0 0 12px;color:${colors.eyebrow};font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(input.campaignType)} · GoTogether</p>
          <h1 style="margin:0;color:${colors.heading};font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.12;letter-spacing:-.025em">${subject}</h1>
          <p style="margin:18px 0 0;color:${colors.muted};font-size:14px">Hello ${name},</p>
        </td></tr>
        <tr><td style="padding:0 38px 40px">
          <div style="padding:22px 24px;background:${colors.panel};border-radius:16px;color:${dark ? '#d8e0ed' : '#475569'};font-size:15px;line-height:1.8">${message}</div>
          <div style="margin-top:26px">${button(input.ctaLabel, input.ctaUrl, colors.button)}</div>
          <p style="margin:30px 0 0;padding-top:20px;border-top:1px solid ${border};color:${colors.muted};font-size:12px;line-height:1.6">Travel thoughtfully. Book confidently. Go together.</p>
        </td></tr>${footer()}
      </table>
    </td></tr></table></body></html>`;
}

function campaignPalette(input: AdminCampaignEmailInput) {
  const theme = input.theme || 'signature';
  if (theme !== 'signature') {
    const colors = themeConfig[theme];
    return { background: colors.background, card: colors.card, primary: colors.header, accent: colors.accent, heading: colors.heading, panel: colors.panel, muted: colors.muted, dark: theme === 'midnight' };
  }
  if (input.campaignType === 'notification') return { background: '#eef4ff', card: '#ffffff', primary: '#172554', accent: '#2563eb', heading: '#0f172a', panel: '#eff6ff', muted: '#64748b', dark: false };
  if (input.campaignType === 'offer') return { background: '#f5f3ff', card: '#ffffff', primary: '#24124d', accent: '#db2777', heading: '#2e1065', panel: '#faf5ff', muted: '#76658d', dark: false };
  if (input.campaignType === 'feedback') return { background: '#fffbeb', card: '#ffffff', primary: '#78350f', accent: '#d97706', heading: '#451a03', panel: '#fef3c7', muted: '#806c55', dark: false };
  if (input.campaignType === 'rating') return { background: '#fffbeb', card: '#ffffff', primary: '#78350f', accent: '#d97706', heading: '#451a03', panel: '#fef3c7', muted: '#806c55', dark: false };
  return { background: '#fff7ed', card: '#ffffff', primary: '#431407', accent: '#ea580c', heading: '#431407', panel: '#ffedd5', muted: '#806b63', dark: false };
}

function renderLayoutCampaignEmail(input: AdminCampaignEmailInput, layout: Exclude<AdminCampaignLayout, 'classic'>, name: string, subject: string, message: string): string {
  const colors = campaignPalette(input);
  const label = escapeHtml(input.campaignType === 'rating' ? 'Trip rating' : input.campaignType === 'feedback' ? 'Feedback & rating' : input.campaignType);
  const commonStart = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media(max-width:620px){.gt-pad{padding-left:24px!important;padding-right:24px!important}.gt-title{font-size:32px!important}.gt-stack{display:block!important;width:100%!important}.gt-hide-mobile{display:none!important}}</style></head><body style="margin:0;background:${colors.background};font-family:Arial,'Segoe UI',sans-serif;color:${colors.dark ? '#e8edf6' : '#334155'}"><div style="display:none;max-height:0;overflow:hidden">A new message from GoTogether.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${colors.background};padding:28px 10px"><tr><td align="center">`;
  const commonEnd = `</td></tr></table></body></html>`;
  const action = `<div style="margin-top:26px">${button(input.ctaLabel, input.ctaUrl, colors.accent)}</div>`;

  if (layout === 'panorama') return `${commonStart}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:${colors.card};border-radius:28px;overflow:hidden;box-shadow:0 20px 54px rgba(15,23,42,.16)">
    <tr><td class="gt-pad" style="padding:22px 40px;background:${colors.primary}">${brand(input.logoUrl, true)}<span style="float:right;margin-top:-25px;color:${colors.accent};font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Panorama</span></td></tr>
    <tr><td class="gt-pad" style="padding:62px 44px 72px;background:${colors.primary};text-align:center"><p style="margin:0 0 16px;color:${colors.accent};font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">${label} · Curated for ${name}</p><h1 class="gt-title" style="max-width:540px;margin:0 auto;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:46px;line-height:1.06;letter-spacing:-.035em">${subject}</h1></td></tr>
    <tr><td class="gt-pad" style="padding:0 42px 40px"><div style="margin-top:-30px;padding:30px;background:${colors.panel};border:1px solid rgba(148,163,184,.25);border-radius:20px;box-shadow:0 12px 28px rgba(15,23,42,.10);color:${colors.dark ? '#e8edf6' : '#475569'};font-size:15px;line-height:1.8"><p style="margin:0 0 10px;font-weight:700;color:${colors.heading}">Hello ${name},</p>${message}${action}</div></td></tr>${footer()}</table>${commonEnd}`;

  if (layout === 'editorial') return `${commonStart}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:${colors.card};border:1px solid rgba(120,113,108,.25)">
    <tr><td class="gt-pad" style="padding:28px 42px;border-bottom:1px solid rgba(120,113,108,.22)">${brand(input.logoUrl, colors.dark)}<span style="float:right;margin-top:-24px;color:${colors.muted};font-family:Georgia,serif;font-size:12px;font-style:italic">The GoTogether Journal</span></td></tr>
    <tr><td class="gt-pad" style="padding:50px 44px 28px"><table role="presentation" width="100%"><tr><td class="gt-stack" width="24%" style="vertical-align:top;color:${colors.accent};font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase">Edition 01<br>${label}</td><td class="gt-stack" style="vertical-align:top"><h1 class="gt-title" style="margin:0;color:${colors.heading};font-family:Georgia,'Times New Roman',serif;font-size:43px;line-height:1.08;letter-spacing:-.025em">${subject}</h1><p style="margin:18px 0 0;color:${colors.muted};font-size:14px">A personal note for ${name}</p></td></tr></table></td></tr>
    <tr><td class="gt-pad" style="padding:10px 44px 44px"><div style="border-left:4px solid ${colors.accent};padding:8px 0 8px 24px;color:${colors.dark ? '#e8edf6' : '#475569'};font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.85">${message}</div>${action}<p style="margin:34px 0 0;padding-top:18px;border-top:1px solid rgba(120,113,108,.22);color:${colors.muted};font-size:11px;letter-spacing:.06em;text-transform:uppercase">Stories, people and places worth remembering.</p></td></tr>${footer()}</table>${commonEnd}`;

  if (layout === 'journey') return `${commonStart}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:630px;background:${colors.card};border-radius:22px;overflow:hidden;border:1px solid rgba(148,163,184,.24)">
    <tr><td class="gt-pad" style="padding:22px 38px;background:${colors.card}">${brand(input.logoUrl, colors.dark)}</td></tr>
    <tr><td class="gt-pad" style="padding:34px 40px;background:${colors.panel}"><p style="margin:0;color:${colors.accent};font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase">Your journey update</p><h1 class="gt-title" style="margin:14px 0 0;color:${colors.heading};font-size:39px;line-height:1.1;letter-spacing:-.035em">${subject}</h1></td></tr>
    <tr><td class="gt-pad" style="padding:36px 40px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="34" style="vertical-align:top"><div style="width:14px;height:14px;border-radius:50%;background:${colors.accent};margin-top:4px"></div><div style="width:2px;height:122px;background:${colors.panel};margin:4px 0 0 6px"></div></td><td style="vertical-align:top"><p style="margin:0 0 14px;color:${colors.heading};font-size:14px;font-weight:800">A note for ${name}</p><div style="color:${colors.dark ? '#e8edf6' : '#475569'};font-size:15px;line-height:1.8">${message}</div>${action}</td></tr></table></td></tr>${footer()}</table>${commonEnd}`;

  return `${commonStart}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${colors.card};border-radius:16px;overflow:hidden">
    <tr><td class="gt-pad" style="padding:32px 44px 18px">${brand(input.logoUrl, colors.dark)}</td></tr>
    <tr><td class="gt-pad" style="padding:34px 44px 54px"><p style="margin:0 0 28px;color:${colors.accent};font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase">${label}</p><h1 class="gt-title" style="margin:0;color:${colors.heading};font-size:40px;line-height:1.1;letter-spacing:-.035em">${subject}</h1><p style="margin:28px 0 12px;color:${colors.heading};font-size:14px;font-weight:700">Hello ${name},</p><div style="color:${colors.dark ? '#e8edf6' : '#475569'};font-size:15px;line-height:1.9">${message}</div>${action}<p style="margin:38px 0 0;color:${colors.muted};font-family:Georgia,serif;font-size:14px;font-style:italic">Until the next journey,<br><b style="color:${colors.heading};font-style:normal">Team GoTogether</b></p></td></tr>${footer()}</table>${commonEnd}`;
}

export function renderAdminCampaignEmail(input: AdminCampaignEmailInput): string {
  const name = escapeHtml(input.recipientName.trim() || 'Traveler');
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replace(/\r?\n/g, '<br>');
  const theme = input.theme || 'signature';
  const layout = input.layout || 'classic';

  if (layout !== 'classic') return renderLayoutCampaignEmail(input, layout, name, subject, message);

  if (theme !== 'signature') return renderThemedCampaignEmail(input, theme, name, subject, message);

  if (input.campaignType === 'retention') {
    return `<!doctype html><html><body style="margin:0;background:#fff7ed;font-family:Arial,'Segoe UI',sans-serif;color:#1e293b">
      <div style="display:none;max-height:0;overflow:hidden">A new journey is waiting for you.</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7ed;padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #fed7aa;border-radius:24px;overflow:hidden">
        <tr><td style="padding:18px 32px">${brand(input.logoUrl)}<span style="float:right;margin-top:-24px;color:#c2410c;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Your next chapter</span></td></tr>
        <tr><td style="padding:44px 36px;background:linear-gradient(135deg,#ffedd5,#fff7ed 60%,#fef3c7)">
          <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:#fff;color:#c2410c;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">Welcome back</span>
          <h1 style="margin:18px 0 12px;color:#431407;font-size:34px;line-height:1.12;letter-spacing:-.03em">${subject}</h1>
          <p style="margin:0;color:#9a3412;font-size:15px">Hi ${name}, the road is better with good company.</p>
        </td></tr>
        <tr><td style="padding:34px 36px"><p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.8">${message}</p>
          ${button(input.ctaLabel, input.ctaUrl, '#ea580c')}
          <div style="margin-top:30px;padding:18px 20px;background:#fff7ed;border-radius:16px;color:#7c2d12;font-size:13px;line-height:1.55"><b style="display:block;margin-bottom:4px">Pick up where you left off</b>Discover a trip, meet compatible travelers, and turn a saved idea into a real plan.</div>
        </td></tr>${footer()}
      </table></td></tr></table></body></html>`;
  }

  if (input.campaignType === 'notification') {
    return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,'Segoe UI',sans-serif;color:#172033">
      <div style="display:none;max-height:0;overflow:hidden">An important update from GoTogether.</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #dbe4f0;border-radius:18px;overflow:hidden">
        <tr><td style="padding:18px 32px;border-bottom:1px solid #e8eef6">${brand(input.logoUrl)}<span style="float:right;margin-top:-24px;color:#64748b;font-size:12px">Account update</span></td></tr>
        <tr><td style="padding:34px 36px 18px"><div style="width:42px;height:42px;line-height:42px;border-radius:12px;background:#eaf2ff;color:#2563eb;text-align:center;font-size:20px;font-weight:800">i</div>
          <p style="margin:22px 0 8px;color:#2563eb;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Important notification</p>
          <h1 style="margin:0;color:#101828;font-size:28px;line-height:1.22;letter-spacing:-.025em">${subject}</h1>
        </td></tr>
        <tr><td style="padding:8px 36px 36px"><p style="margin:0 0 16px;color:#475569;font-size:14px">Hello ${name},</p>
          <div style="border-left:3px solid #2563eb;padding:4px 0 4px 20px;margin-bottom:26px;color:#344054;font-size:15px;line-height:1.8">${message}</div>
          ${button(input.ctaLabel, input.ctaUrl, '#2563eb')}
          <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e8eef6;color:#64748b;font-size:12px;line-height:1.6">This is an official service message. Review the details above and take action only if requested.</p>
        </td></tr>${footer()}
      </table></td></tr></table></body></html>`;
  }

  if (input.campaignType === 'feedback' || input.campaignType === 'rating') {
    const rating = input.campaignType === 'rating';
    const accent = '#d97706';
    const soft = '#fffbeb';
    const border = '#fde68a';
    const eyebrow = rating ? 'Share your trip rating' : 'Share feedback & rate your experience';
    const symbol = '&#9733;';
    return `<!doctype html><html><body style="margin:0;background:${soft};font-family:Arial,'Segoe UI',sans-serif;color:#1e293b">
      <div style="display:none;max-height:0;overflow:hidden">${rating ? 'How was your GoTogether experience?' : 'Tell us what you think and rate your GoTogether experience.'}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${soft};padding:28px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid ${border};border-radius:24px;overflow:hidden;box-shadow:0 16px 42px rgba(15,23,42,.10)">
        <tr><td style="padding:18px 32px;border-bottom:1px solid ${border}">${brand(input.logoUrl)}<span style="float:right;margin-top:-24px;color:${accent};font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">${rating ? 'Trip rating' : 'Feedback & rating'}</span></td></tr>
        <tr><td style="padding:42px 36px 24px;text-align:center">
          <div style="margin:0 auto 18px;width:54px;height:54px;line-height:54px;border-radius:18px;background:${soft};color:${accent};font-size:25px;font-weight:800">${symbol}</div>
          <p style="margin:0 0 10px;color:${accent};font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase">${eyebrow}</p>
          <h1 style="margin:0;color:#0f172a;font-size:32px;line-height:1.15;letter-spacing:-.03em">${subject}</h1>
          <p style="margin:14px 0 0;color:#64748b;font-size:14px">Hi ${name}, your experience matters to us.</p>
        </td></tr>
        <tr><td style="padding:8px 36px 38px"><div style="padding:22px 24px;background:${soft};border-radius:16px;color:#475569;font-size:15px;line-height:1.8">${message}</div>
          <div style="margin-top:25px" align="center">${button(input.ctaLabel, input.ctaUrl, accent)}</div>
          <p style="margin:26px 0 0;text-align:center;color:#94a3b8;font-size:12px">${rating ? 'It only takes a minute, and it helps fellow travellers choose confidently.' : 'A quick rating and thoughtful feedback help us improve every journey.'}</p>
        </td></tr>${footer()}
      </table></td></tr></table></body></html>`;
  }

  return `<!doctype html><html><body style="margin:0;background:#f5f3ff;font-family:Arial,'Segoe UI',sans-serif;color:#1f1646">
    <div style="display:none;max-height:0;overflow:hidden">A special travel offer, selected for you.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f3ff;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 16px 45px rgba(76,29,149,.14)">
      <tr><td style="padding:18px 32px;background:#24124d">${brand(input.logoUrl, true)}<span style="float:right;margin-top:-24px;color:#ddd6fe;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Member offer</span></td></tr>
      <tr><td style="padding:48px 36px;background:linear-gradient(135deg,#5b21b6,#7c3aed 52%,#db2777);text-align:center">
        <span style="display:inline-block;padding:8px 13px;border:1px solid rgba(255,255,255,.35);border-radius:999px;color:#fff;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Exclusive for travelers</span>
        <h1 style="margin:20px auto 10px;color:#fff;font-size:36px;line-height:1.1;letter-spacing:-.035em">${subject}</h1>
        <p style="margin:0;color:#ede9fe;font-size:14px">A little more adventure for a little less.</p>
      </td></tr>
      <tr><td style="padding:0 36px 36px"><div style="margin-top:-18px;padding:26px;background:#fff;border:1px solid #ede9fe;border-radius:18px;box-shadow:0 8px 24px rgba(76,29,149,.08)">
        <p style="margin:0 0 12px;color:#6d28d9;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">Just for you, ${name}</p>
        <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.75">${message}</p>${button(input.ctaLabel, input.ctaUrl, '#db2777')}
      </div><p style="margin:22px 0 0;text-align:center;color:#7c6f9b;font-size:12px;line-height:1.6">Explore the offer while it is available. Eligibility and booking conditions on the linked page apply.</p></td></tr>${footer()}
    </table></td></tr></table></body></html>`;
}
