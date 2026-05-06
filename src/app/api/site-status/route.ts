import { NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/settings';

export async function GET() {
  try {
    const settings = getAppSettings();
    return NextResponse.json({
      maintenance_mode: settings.maintenance_mode,
      site_name: settings.site_name,
      site_tagline: settings.site_tagline,
    });
  } catch {
    return NextResponse.json({ maintenance_mode: false });
  }
}
