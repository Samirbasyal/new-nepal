// ========================================
// THE 77 DISTRICTS OF NEPAL
// ========================================
// This list is REFERENCE DATA, not organization data: the names of the
// districts are a matter of public record and never change from one year to the
// next (unlike statistics, which we never invent).
//
// WHY IT IS A FILE AND NOT A DATABASE TABLE
//   The drop-downs need this list on the server and in the browser, and it is
//   read far more often than it changes. Keeping it here means no extra database
//   work and no risk of somebody deleting "Humla" by accident.
//
// HOW IT IS USED
//   - Admin Panel -> District work: the district drop-down
//   - Admin Panel -> Members, Karya Samiti, Loan reports: the district filter
//   - the district analytics page, which groups activities by province
//
// "name" is the English spelling used in most official documents, "nameNe" is
// the Nepali name shown in brackets in the interface.
// ========================================

export type District = {
  name: string;
  nameNe: string;
  province: string;
};

export const PROVINCES = [
  'Koshi',
  'Madhesh',
  'Bagmati',
  'Gandaki',
  'Lumbini',
  'Karnali',
  'Sudurpashchim',
] as const;

export const DISTRICTS: District[] = [
  // ---------- Koshi Province (14) ----------
  { name: 'Bhojpur', nameNe: 'भोजपुर', province: 'Koshi' },
  { name: 'Dhankuta', nameNe: 'धनकुटा', province: 'Koshi' },
  { name: 'Ilam', nameNe: 'इलाम', province: 'Koshi' },
  { name: 'Jhapa', nameNe: 'झापा', province: 'Koshi' },
  { name: 'Khotang', nameNe: 'खोटाङ', province: 'Koshi' },
  { name: 'Morang', nameNe: 'मोरङ', province: 'Koshi' },
  { name: 'Okhaldhunga', nameNe: 'ओखलढुंगा', province: 'Koshi' },
  { name: 'Panchthar', nameNe: 'पाँचथर', province: 'Koshi' },
  { name: 'Sankhuwasabha', nameNe: 'संखुवासभा', province: 'Koshi' },
  { name: 'Solukhumbu', nameNe: 'सोलुखुम्बु', province: 'Koshi' },
  { name: 'Sunsari', nameNe: 'सुनसरी', province: 'Koshi' },
  { name: 'Taplejung', nameNe: 'ताप्लेजुङ', province: 'Koshi' },
  { name: 'Terhathum', nameNe: 'तेह्रथुम', province: 'Koshi' },
  { name: 'Udayapur', nameNe: 'उदयपुर', province: 'Koshi' },

  // ---------- Madhesh Province (8) ----------
  { name: 'Bara', nameNe: 'बारा', province: 'Madhesh' },
  { name: 'Dhanusha', nameNe: 'धनुषा', province: 'Madhesh' },
  { name: 'Mahottari', nameNe: 'महोत्तरी', province: 'Madhesh' },
  { name: 'Parsa', nameNe: 'पर्सा', province: 'Madhesh' },
  { name: 'Rautahat', nameNe: 'रौतहट', province: 'Madhesh' },
  { name: 'Saptari', nameNe: 'सप्तरी', province: 'Madhesh' },
  { name: 'Sarlahi', nameNe: 'सर्लाही', province: 'Madhesh' },
  { name: 'Siraha', nameNe: 'सिराहा', province: 'Madhesh' },

  // ---------- Bagmati Province (13) ----------
  { name: 'Bhaktapur', nameNe: 'भक्तपुर', province: 'Bagmati' },
  { name: 'Chitwan', nameNe: 'चितवन', province: 'Bagmati' },
  { name: 'Dhading', nameNe: 'धादिङ', province: 'Bagmati' },
  { name: 'Dolakha', nameNe: 'दोलखा', province: 'Bagmati' },
  { name: 'Kathmandu', nameNe: 'काठमाडौं', province: 'Bagmati' },
  { name: 'Kavrepalanchok', nameNe: 'काभ्रेपलाञ्चोक', province: 'Bagmati' },
  { name: 'Lalitpur', nameNe: 'ललितपुर', province: 'Bagmati' },
  { name: 'Makwanpur', nameNe: 'मकवानपुर', province: 'Bagmati' },
  { name: 'Nuwakot', nameNe: 'नुवाकोट', province: 'Bagmati' },
  { name: 'Ramechhap', nameNe: 'रामेछाप', province: 'Bagmati' },
  { name: 'Rasuwa', nameNe: 'रसुवा', province: 'Bagmati' },
  { name: 'Sindhuli', nameNe: 'सिन्धुली', province: 'Bagmati' },
  { name: 'Sindhupalchok', nameNe: 'सिन्धुपाल्चोक', province: 'Bagmati' },

  // ---------- Gandaki Province (11) ----------
  { name: 'Baglung', nameNe: 'बागलुङ', province: 'Gandaki' },
  { name: 'Gorkha', nameNe: 'गोरखा', province: 'Gandaki' },
  { name: 'Kaski', nameNe: 'कास्की', province: 'Gandaki' },
  { name: 'Lamjung', nameNe: 'लमजुङ', province: 'Gandaki' },
  { name: 'Manang', nameNe: 'मनाङ', province: 'Gandaki' },
  { name: 'Mustang', nameNe: 'मुस्ताङ', province: 'Gandaki' },
  { name: 'Myagdi', nameNe: 'म्याग्दी', province: 'Gandaki' },
  { name: 'Nawalpur', nameNe: 'नवलपुर', province: 'Gandaki' },
  { name: 'Parbat', nameNe: 'पर्वत', province: 'Gandaki' },
  { name: 'Syangja', nameNe: 'स्याङ्जा', province: 'Gandaki' },
  { name: 'Tanahun', nameNe: 'तनहुँ', province: 'Gandaki' },

  // ---------- Lumbini Province (12) ----------
  { name: 'Arghakhanchi', nameNe: 'अर्घाखाँची', province: 'Lumbini' },
  { name: 'Banke', nameNe: 'बाँके', province: 'Lumbini' },
  { name: 'Bardiya', nameNe: 'बर्दिया', province: 'Lumbini' },
  { name: 'Dang', nameNe: 'दाङ', province: 'Lumbini' },
  { name: 'Gulmi', nameNe: 'गुल्मी', province: 'Lumbini' },
  { name: 'Kapilvastu', nameNe: 'कपिलवस्तु', province: 'Lumbini' },
  { name: 'Palpa', nameNe: 'पाल्पा', province: 'Lumbini' },
  { name: 'Parasi', nameNe: 'परासी', province: 'Lumbini' },
  { name: 'Pyuthan', nameNe: 'प्युठान', province: 'Lumbini' },
  { name: 'Rolpa', nameNe: 'रोल्पा', province: 'Lumbini' },
  { name: 'Rukum East', nameNe: 'पूर्वी रुकुम', province: 'Lumbini' },
  { name: 'Rupandehi', nameNe: 'रुपन्देही', province: 'Lumbini' },

  // ---------- Karnali Province (10) ----------
  { name: 'Dailekh', nameNe: 'दैलेख', province: 'Karnali' },
  { name: 'Dolpa', nameNe: 'डोल्पा', province: 'Karnali' },
  { name: 'Humla', nameNe: 'हुम्ला', province: 'Karnali' },
  { name: 'Jajarkot', nameNe: 'जाजरकोट', province: 'Karnali' },
  { name: 'Jumla', nameNe: 'जुम्ला', province: 'Karnali' },
  { name: 'Kalikot', nameNe: 'कालिकोट', province: 'Karnali' },
  { name: 'Mugu', nameNe: 'मुगु', province: 'Karnali' },
  { name: 'Rukum West', nameNe: 'पश्चिमी रुकुम', province: 'Karnali' },
  { name: 'Salyan', nameNe: 'सल्यान', province: 'Karnali' },
  { name: 'Surkhet', nameNe: 'सुर्खेत', province: 'Karnali' },

  // ---------- Sudurpashchim Province (9) ----------
  { name: 'Achham', nameNe: 'अछाम', province: 'Sudurpashchim' },
  { name: 'Baitadi', nameNe: 'बैतडी', province: 'Sudurpashchim' },
  { name: 'Bajhang', nameNe: 'बझाङ', province: 'Sudurpashchim' },
  { name: 'Bajura', nameNe: 'बाजुरा', province: 'Sudurpashchim' },
  { name: 'Dadeldhura', nameNe: 'डडेल्धुरा', province: 'Sudurpashchim' },
  { name: 'Darchula', nameNe: 'दार्चुला', province: 'Sudurpashchim' },
  { name: 'Doti', nameNe: 'डोटी', province: 'Sudurpashchim' },
  { name: 'Kailali', nameNe: 'कैलाली', province: 'Sudurpashchim' },
  { name: 'Kanchanpur', nameNe: 'कञ्चनपुर', province: 'Sudurpashchim' },
];

/** Just the names, in the official order. */
export const DISTRICT_NAMES: string[] = DISTRICTS.map((d) => d.name);

/** For the drop-downs: "Kathmandu (काठमाडौं)". */
export const DISTRICT_OPTIONS = DISTRICTS.map((d) => ({
  value: d.name,
  label: d.nameNe ? `${d.name} (${d.nameNe})` : d.name,
}));

/** Districts of one province. */
export function districtsOf(province: string): District[] {
  return DISTRICTS.filter((d) => d.province === province);
}

/** Which province is a district in? Unknown names return an empty string. */
export function provinceOf(district: string): string {
  return DISTRICTS.find((d) => d.name === district)?.province ?? '';
}
