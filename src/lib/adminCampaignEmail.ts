export type AdminCampaignType = 'retention' | 'notification' | 'offer';

export type AdminCampaignEmailInput = {
  campaignType: AdminCampaignType;
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

export function renderAdminCampaignEmail(input: AdminCampaignEmailInput): string {
  const name = escapeHtml(input.recipientName.trim() || 'Traveler');
  const subject = escapeHtml(input.subject);
  const message = escapeHtml(input.message).replace(/\r?\n/g, '<br>');

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
