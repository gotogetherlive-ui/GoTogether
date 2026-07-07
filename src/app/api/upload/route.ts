import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_CONFIGURED =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

const ALLOWED_FOLDERS = new Set([
  'gotogether',
  'gotogether/avatars',
  'gotogether/stories',
  'gotogether/business',
  'gotogether/business-trips',
  'gotogether/brochures',
  'gotogether/buddy',
  'gotogether/businesses',
]);
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dataUrl, folder = 'gotogether' } = body;

    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:') || !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }
    const match = dataUrl.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match || !/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(match[1])) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    const estimatedBytes = Math.floor((match[2].length * 3) / 4);
    if (estimatedBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds the 6 MB upload limit' }, { status: 413 });
    }

    if (!CLOUDINARY_CONFIGURED) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Upload service is not configured' }, { status: 503 });
      }
      // Fallback to returning the base64 dataUrl directly for sandbox/testing purposes
      return NextResponse.json({ url: dataUrl });
    }

    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: 'auto',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
