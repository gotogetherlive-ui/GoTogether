export type BusinessIntroduction = {
  id: string;
  full_name: string;
  phone_number: string;
  travel_name: string;
  company_address: string | null;
  status: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
};

export function parseBusinessIntroduction(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Please enter your business details.');
  }
  const fields = body as Record<string, unknown>;
  const read = (key: string) => typeof fields[key] === 'string' ? fields[key].trim() : '';
  const fullName = read('fullName');
  const phoneNumber = read('phoneNumber');
  const travelName = read('travelName');
  const companyAddress = read('companyAddress');
  if (fullName.length < 2 || fullName.length > 120) throw new Error('Enter your full name (2–120 characters).');
  if (!/^\+?[\d\s().-]+$/.test(phoneNumber) || !/^\d{7,15}$/.test(phoneNumber.replace(/\D/g, '')) || phoneNumber.length > 30) {
    throw new Error('Enter a valid phone number, including your country code.');
  }
  if (travelName.length < 2 || travelName.length > 160) throw new Error('Enter your travel business name (2–160 characters).');
  if (companyAddress.length > 500) throw new Error('Company address must be 500 characters or fewer.');
  return { fullName, phoneNumber, travelName, companyAddress: companyAddress || null };
}
