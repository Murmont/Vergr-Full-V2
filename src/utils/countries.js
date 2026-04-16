// Country → E.164 dial-code map used by the phone-add flow so the user
// only has to type their local number. Order: UK first (VERGR is based
// there, so it's the most common signup country), then the rest
// alphabetically. Flags are emoji so no extra asset weight.
//
// Data trimmed down to commonly-used entries — if a country is missing,
// the modal also has a manual-entry fallback where the user can type
// +<code> directly.

export const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom',  dial: '+44',  flag: '🇬🇧' },
  { code: 'US', name: 'United States',   dial: '+1',   flag: '🇺🇸' },
  { code: 'CA', name: 'Canada',          dial: '+1',   flag: '🇨🇦' },
  { code: 'AU', name: 'Australia',       dial: '+61',  flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand',     dial: '+64',  flag: '🇳🇿' },
  { code: 'IE', name: 'Ireland',         dial: '+353', flag: '🇮🇪' },
  { code: 'ZA', name: 'South Africa',    dial: '+27',  flag: '🇿🇦' },
  { code: 'IN', name: 'India',           dial: '+91',  flag: '🇮🇳' },
  { code: 'DE', name: 'Germany',         dial: '+49',  flag: '🇩🇪' },
  { code: 'FR', name: 'France',          dial: '+33',  flag: '🇫🇷' },
  { code: 'ES', name: 'Spain',           dial: '+34',  flag: '🇪🇸' },
  { code: 'IT', name: 'Italy',           dial: '+39',  flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands',     dial: '+31',  flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium',         dial: '+32',  flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland',     dial: '+41',  flag: '🇨🇭' },
  { code: 'AT', name: 'Austria',         dial: '+43',  flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden',          dial: '+46',  flag: '🇸🇪' },
  { code: 'NO', name: 'Norway',          dial: '+47',  flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark',         dial: '+45',  flag: '🇩🇰' },
  { code: 'FI', name: 'Finland',         dial: '+358', flag: '🇫🇮' },
  { code: 'IS', name: 'Iceland',         dial: '+354', flag: '🇮🇸' },
  { code: 'PT', name: 'Portugal',        dial: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece',          dial: '+30',  flag: '🇬🇷' },
  { code: 'PL', name: 'Poland',          dial: '+48',  flag: '🇵🇱' },
  { code: 'CZ', name: 'Czechia',         dial: '+420', flag: '🇨🇿' },
  { code: 'SK', name: 'Slovakia',        dial: '+421', flag: '🇸🇰' },
  { code: 'HU', name: 'Hungary',         dial: '+36',  flag: '🇭🇺' },
  { code: 'RO', name: 'Romania',         dial: '+40',  flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria',        dial: '+359', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia',         dial: '+385', flag: '🇭🇷' },
  { code: 'SI', name: 'Slovenia',        dial: '+386', flag: '🇸🇮' },
  { code: 'EE', name: 'Estonia',         dial: '+372', flag: '🇪🇪' },
  { code: 'LV', name: 'Latvia',          dial: '+371', flag: '🇱🇻' },
  { code: 'LT', name: 'Lithuania',       dial: '+370', flag: '🇱🇹' },
  { code: 'UA', name: 'Ukraine',         dial: '+380', flag: '🇺🇦' },
  { code: 'RU', name: 'Russia',          dial: '+7',   flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey',          dial: '+90',  flag: '🇹🇷' },
  { code: 'IL', name: 'Israel',          dial: '+972', flag: '🇮🇱' },
  { code: 'AE', name: 'UAE',             dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia',    dial: '+966', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt',           dial: '+20',  flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria',         dial: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya',           dial: '+254', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana',           dial: '+233', flag: '🇬🇭' },
  { code: 'MA', name: 'Morocco',         dial: '+212', flag: '🇲🇦' },
  { code: 'BR', name: 'Brazil',          dial: '+55',  flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico',          dial: '+52',  flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina',       dial: '+54',  flag: '🇦🇷' },
  { code: 'CL', name: 'Chile',           dial: '+56',  flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia',        dial: '+57',  flag: '🇨🇴' },
  { code: 'PE', name: 'Peru',            dial: '+51',  flag: '🇵🇪' },
  { code: 'JP', name: 'Japan',           dial: '+81',  flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea',     dial: '+82',  flag: '🇰🇷' },
  { code: 'CN', name: 'China',           dial: '+86',  flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong',       dial: '+852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan',          dial: '+886', flag: '🇹🇼' },
  { code: 'SG', name: 'Singapore',       dial: '+65',  flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia',        dial: '+60',  flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand',        dial: '+66',  flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia',       dial: '+62',  flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines',     dial: '+63',  flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam',         dial: '+84',  flag: '🇻🇳' },
  { code: 'PK', name: 'Pakistan',        dial: '+92',  flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh',      dial: '+880', flag: '🇧🇩' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // GB

// Combine a country dial code with a local number. Strips the leading 0
// (common in UK/ES/etc. local formatting) and any non-digits. Returns
// E.164 `+<digits>` or null if the result looks invalid.
export function toE164(dial, localNumber) {
  if (!dial || !localNumber) return null;
  let local = String(localNumber).trim().replace(/[\s\-()]/g, '');
  // Drop a leading "0" trunk prefix if present.
  if (local.startsWith('0')) local = local.slice(1);
  local = local.replace(/\D/g, '');
  const combined = `${dial}${local}`;
  return /^\+\d{8,15}$/.test(combined) ? combined : null;
}
