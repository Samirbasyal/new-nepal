// ========================================
// ENGLISH -> NEPALI SENTENCES FOR THE PANEL
// ========================================
// The Admin and Member panels were written with their words inside the pages:
// "Donors & supporters", "Add new", "Payment method". Translating those pages
// one by one would mean touching several hundred places and risking the panel.
//
// Instead this file holds a plain list of sentences and their Nepali versions.
// The panel asks translatePhrase(lang, 'Add new') and gets back
// "नयाँ थप्नुहोस्" when the site language is Nepali.
//
// THREE RULES
//   1. A sentence that is not listed here is returned unchanged (English).
//      A missing line therefore never breaks a screen - it just stays English.
//   2. Single words are looked up in WORDS, longer sentences in PHRASES. A
//      sentence wins over a word, so "Member ID" is not translated word by word.
//   3. Keys are matched exactly as written in the code, including punctuation
//      and capitals. When you add a new label, copy it here character for
//      character.
// ========================================

import type { Lang } from './i18n';

// ========================================
// SINGLE WORDS
// ========================================
const WORDS: Record<string, string> = {
  // Table and form vocabulary
  Action: 'कार्य',
  Actions: 'कार्यहरू',
  Active: 'सक्रिय',
  Activity: 'गतिविधि',
  Address: 'ठेगाना',
  Album: 'एल्बम',
  Albums: 'एल्बमहरू',
  All: 'सबै',
  Amount: 'रकम',
  Available: 'उपलब्ध',
  Benefited: 'लाभान्वित',
  Branch: 'शाखा',
  Caption: 'क्याप्सन',
  Category: 'श्रेणी',
  Collections: 'संकलन',
  Currency: 'मुद्रा',
  Date: 'मिति',
  Deadline: 'म्याद',
  Description: 'विवरण',
  Designation: 'पदनाम',
  District: 'जिल्ला',
  Donor: 'दाता',
  Due: 'बाँकी',
  Edit: 'सम्पादन',
  Email: 'इमेल',
  English: 'अंग्रेजी',
  Event: 'इभेन्ट',
  Events: 'इभेन्टहरू',
  Expense: 'खर्च',
  Expenses: 'खर्चहरू',
  Featured: 'विशेष',
  Filter: 'फिल्टर',
  From: 'बाट',
  Group: 'समूह',
  Heading: 'शीर्षक',
  Icon: 'आइकन',
  Impact: 'प्रभाव',
  Interest: 'ब्याज',
  Loading: 'लोड हुँदैछ',
  Location: 'स्थान',
  Member: 'सदस्य',
  Members: 'सदस्यहरू',
  Message: 'सन्देश',
  Method: 'माध्यम',
  Month: 'महिना',
  Municipality: 'नगरपालिका',
  Name: 'नाम',
  Next: 'अर्को',
  Note: 'नोट',
  Number: 'नम्बर',
  Objectives: 'उद्देश्यहरू',
  Occupation: 'पेशा',
  Order: 'क्रम',
  Other: 'अन्य',
  Outstanding: 'बाँकी रकम',
  Overdue: 'म्याद नाघेको',
  Phone: 'फोन',
  Photo: 'फोटो',
  Photos: 'फोटोहरू',
  Picture: 'तस्बिर',
  Post: 'पद',
  Previous: 'अघिल्लो',
  Priority: 'प्राथमिकता',
  Program: 'कार्यक्रम',
  Programs: 'कार्यक्रमहरू',
  Published: 'प्रकाशित',
  Purpose: 'उद्देश्य',
  Received: 'प्राप्त',
  Recommended: 'सिफारिस गरिएको',
  Remarks: 'कैफियत',
  Repaid: 'तिरेको',
  Responsibility: 'जिम्मेवारी',
  Results: 'नतिजा',
  Role: 'भूमिका',
  Section: 'खण्ड',
  Shown: 'देखाइएको',
  Slug: 'स्लग',
  Starts: 'सुरु हुन्छ',
  Status: 'स्थिति',
  Subject: 'विषय',
  Task: 'कार्य',
  Title: 'शीर्षक',
  Today: 'आज',
  Type: 'प्रकार',
  Unit: 'इकाइ',
  Visibility: 'देखिने स्थिति',
  Visible: 'देखिने',
  Ward: 'वडा',
  When: 'कहिले',
  Who: 'को',
};

// ========================================
// SENTENCES
// ========================================
const PHRASES: Record<string, string> = {
  // ---------- Small words used all over the panel ----------
  'Add new': 'नयाँ थप्नुहोस्',
  'Add new record': 'नयाँ अभिलेख थप्नुहोस्',
  'All statuses': 'सबै स्थिति',
  'Any status': 'कुनै पनि स्थिति',
  Cancel: 'रद्द गर्नुहोस्',
  Close: 'बन्द गर्नुहोस्',
  Delete: 'हटाउनुहोस्',
  'Edit record': 'अभिलेख सम्पादन गर्नुहोस्',
  'New record': 'नयाँ अभिलेख',
  Refresh: 'रिफ्रेस',
  Save: 'सुरक्षित गर्नुहोस्',
  'Save changes': 'परिवर्तन सुरक्षित गर्नुहोस्',
  Saving: 'सुरक्षित हुँदैछ',
  Search: 'खोज्नुहोस्',
  'Search records': 'अभिलेख खोज्नुहोस्',
  'Try again': 'फेरि प्रयास गर्नुहोस्',
  Yes: 'हो',
  No: 'होइन',
  'Not set': 'तोकिएको छैन',
  None: 'कुनै छैन',
  Optional: 'वैकल्पिक',
  Required: 'अनिवार्य',
  'Select an option': 'विकल्प छान्नुहोस्',
  'Uploading': 'अपलोड हुँदैछ',
  'Please wait…': 'कृपया पर्खनुहोस्…',

  // ---------- The resource screens (ResourceManager / ResourceForm) ----------
  'No matching records': 'मिल्ने अभिलेख भेटिएन',
  'Could not load this list': 'यो सूची लोड गर्न सकिएन',
  'Try a different search word, or clear the filter to see everything.':
    'अर्को शब्दले खोज्नुहोस्, वा फिल्टर हटाएर सबै हेर्नुहोस्।',
  'Nothing has been recorded here yet.': 'यहाँ अझै केही अभिलेख गरिएको छैन।',
  'Click to publish': 'वेबसाइटमा देखाउन थिच्नुहोस्',
  'Click to hide from the website': 'वेबसाइटबाट लुकाउन थिच्नुहोस्',
  'Could not delete this item.': 'यो अभिलेख हटाउन सकिएन।',
  'This cannot be undone.': 'यो फिर्ता गर्न सकिँदैन।',
  'Saved.': 'सुरक्षित भयो।',
  'Deleted.': 'हटाइयो।',
  'Please fill in the required fields.': 'कृपया अनिवार्य विवरणहरू भर्नुहोस्।',
  'Something went wrong. Please try again.': 'केही गडबड भयो। फेरि प्रयास गर्नुहोस्।',

  'Everything you change here is saved to the database immediately and appears on the public website as soon as it is published. You do not need to edit any code.':
    'यहाँ गरेको परिवर्तन तुरुन्तै डेटाबेसमा सुरक्षित हुन्छ र प्रकाशित भएपछि वेबसाइटमा देखिन्छ। कुनै कोड सम्पादन गर्नु पर्दैन।',
  'Fields marked * are required.': '* चिन्ह लागेका विवरणहरू अनिवार्य छन्।',
  'Fill in the details and save. Nothing is shown on the public website until you switch on "Published".':
    'विवरण भरेर सुरक्षित गर्नुहोस्। "प्रकाशित" नगरेसम्म वेबसाइटमा केही देखिँदैन।',
  'Change the values you need and save.': 'आवश्यक विवरण परिवर्तन गरेर सुरक्षित गर्नुहोस्।',
  'Upload an image file': 'फोटो फाइल अपलोड गर्नुहोस्',

  'Member panel':
    'सदस्य प्यानल',
  'Monthly fund':
    'मासिक कोष',
  'Your contribution, your history and your payment button.':
    'तपाईंको योगदान, तपाईंको इतिहास र भुक्तानी बटन।',
  'Pay your contribution':
    'तपाईंको योगदान तिर्नुहोस्',
  'My fund history':
    'मेरो कोष इतिहास',
  'Every payment you have submitted, and what happened to it.':
    'तपाईंले पेस गर्नुभएको हरेक भुक्तानी र त्यसको अवस्था।',
  'My loans':
    'मेरा ऋणहरू',
  'Money borrowed from the organization and what has been repaid so far. This is kept completely separate from your monthly fund.':
    'संस्थाबाट लिएको ऋण र हालसम्म तिरेको रकम। यो तपाईंको मासिक कोषभन्दा पूर्ण रूपमा अलग राखिएको छ।',
  'Your own notebook for plans, reminders and meeting preparation. Only you can read these notes.':
    'योजना, सम्झाउनी र बैठकको तयारीका लागि तपाईंको आफ्नै नोटबुक। यी नोट केवल तपाईंले मात्र पढ्न सक्नुहुन्छ।',
  'Notifications':
    'सूचनाहरू',
  'Monthly fund reminders, payment decisions, loan news and notices from the office - all in one place.':
    'मासिक कोषको सम्झाउनी, भुक्तानी निर्णय, ऋण समाचार र कार्यालयका सूचना - सबै एकै ठाउँमा।',
  'Messages with the office':
    'कार्यालयसँगको सन्देश',
  'Ask about your membership, your monthly contribution, a loan or anything else. Only you and the office can read this.':
    'सदस्यता, मासिक योगदान, ऋण वा अन्य कुरा सोध्नुहोस्। यो केवल तपाईं र कार्यालयले मात्र पढ्न सक्नुहुन्छ।',
  'Your Role & Responsibilities':
    'तपाईंको भूमिका र जिम्मेवारी',
  'You are not on the committee list yet':
    'तपाईं अझै समिति सूचीमा छैनन्',
  'You have no tasks at the moment':
    'अहिले तपाईंलाई कुनै कार्य तोकिएको छैन',
  'No tasks assigned to you':
    'तपाईंलाई कुनै कार्य तोकिएको छैन',
  'When an administrator gives you a task it will appear here.':
    'प्रशासकले तपाईंलाई कार्य दिएपछि यहाँ देखिनेछ।',
  'When an administrator assigns you a task it will appear here, and you will be able to mark your progress.':
    'प्रशासकले तपाईंलाई कार्य तोकेपछि यहाँ देखिनेछ र तपाईंले प्रगति अद्यावधिक गर्न सक्नुहुनेछ।',
  'You have no loans':
    'तपाईंसँग कुनै ऋण छैन',
  'When the organization records a loan for you, it appears here with the repayment history.':
    'संस्थाले तपाईंको नाममा ऋण अभिलेख गरेपछि त्यो तिरेको इतिहाससहित यहाँ देखिनेछ।',
  'You have not submitted a payment yet':
    'तपाईंले अझै कुनै भुक्तानी पेस गर्नुभएको छैन',
  'Use the Pay monthly fund button to record your first contribution.':
    'पहिलो योगदान अभिलेख गर्न "मासिक कोष भुक्तानी" बटन प्रयोग गर्नुहोस्।',
  'When you pay your monthly contribution it will appear here with its status.':
    'तपाईंले मासिक योगदान तिरेपछि त्यो स्थितिसहित यहाँ देखिनेछ।',
  'No payments yet':
    'अझै कुनै भुक्तानी छैन',
  'Your membership is pending':
    'तपाईंको सदस्यता स्वीकृतिको प्रतीक्षामा छ',
  'Your membership is not active':
    'तपाईंको सदस्यता सक्रिय छैन',
  'Private':
    'निजी',
  'Verify your email address':
    'आफ्नो इमेल ठेगाना प्रमाणित गर्नुहोस्',
  'This one step keeps the member records accurate and stops strangers creating accounts.':
    'यही एक कदमले सदस्य अभिलेख सही राख्छ र अपरिचित व्यक्तिलाई खाता खोल्नबाट रोक्छ।',
  'Use the link from your email, or the 6 digit code, and type the password you want.':
    'इमेलमा आएको लिङ्क वा ६ अंकको कोड प्रयोग गरेर आफ्नो इच्छाको पासवर्ड लेख्नुहोस्।',
  'Choose a new password':
    'नयाँ पासवर्ड छान्नुहोस्',
  'We will email you a link to choose a new one. It expires after 30 minutes.':
    'नयाँ पासवर्ड छान्नको लागि हामी इमेलमा लिङ्क पठाउँछौं। त्यो ३० मिनेटपछि अमान्य हुन्छ।',
  'Forgot your password?':
    'पासवर्ड बिर्सनुभयो?',
  'Direct registration is not available':
    'सिधै दर्ता उपलब्ध छैन',
  'Please pay first, then submit this form':
    'पहिले भुक्तानी गर्नुहोस्, त्यसपछि यो फारम पेस गर्नुहोस्',

  'Language Settings':
    'भाषा सेटिङ',
  'Website Language':
    'वेबसाइटको भाषा',
  'Choose the language that will be displayed on the entire website for all users.':
    'सबै प्रयोगकर्ताका लागि वेबसाइटभरि देखाइने भाषा छान्नुहोस्।',
  'Active Website Language':
    'हाल सक्रिय भाषा',
  'Save Changes':
    'परिवर्तन सुरक्षित गर्नुहोस्',
  'Language updated successfully!':
    'भाषा सफलतापूर्वक अद्यावधिक भयो!',
  'The website language has been changed to':
    'वेबसाइटको भाषा परिवर्तन भई',
  'Could not save the language.':
    'भाषा सुरक्षित गर्न सकिएन।',
  'Could not reach the server. Please check your connection and try again.':
    'सर्भरसँग जोडिन सकिएन। इन्टरनेट जाँचेर फेरि प्रयास गर्नुहोस्।',
  'Set the global language for the entire website. This will be applied to all users.':
    'सम्पूर्ण वेबसाइटको भाषा यहाँबाट तोक्नुहोस्। यो सबै प्रयोगकर्तामा लागू हुन्छ।',
  'Admin Panel Language Settings':
    'एडमिन प्यानल भाषा सेटिङ',
  'One switch for the public website and every panel.':
    'सार्वजनिक वेबसाइट र सबै प्यानलका लागि एउटै सेटिङ।',
  'Admin can select Nepali or English':
    'एडमिनले नेपाली वा अंग्रेजी छान्न सक्ने',
  'Global setting for all users':
    'सबै प्रयोगकर्ताका लागि साझा सेटिङ',
  'Saved in database':
    'डेटाबेसमा सुरक्षित',
  'Changes apply immediately':
    'परिवर्तन तुरुन्तै लागू हुने',
  'Only authorized admins can change':
    'अधिकार प्राप्त एडमिनले मात्र परिवर्तन गर्न सक्ने',
  'Currently live:':
    'हाल लागू:',
  'This is a single global setting: every visitor, member and administrator sees the website in the language chosen here. It is stored in the database, so it stays the same after a refresh, a sign-out or a new deployment.':
    'यो एउटै साझा सेटिङ हो: यहाँ छानिएको भाषामै सबै आगन्तुक, सदस्य र एडमिनले वेबसाइट देख्छन्। यो डेटाबेसमा सुरक्षित हुने हुँदा पेज रिफ्रेस, लगआउट वा नयाँ डिप्लोयपछि पनि यथावत् रहन्छ।',

  'Community Support':
    'सामुदायको सहयोग',
  'Our work brings positive change in the community.':
    'हाम्रो कामले समुदायमा सकारात्मक परिवर्तन ल्याउँछ।',
  'Social Equality':
    'सामाजिक समानता',
  'Support for the rights and dignity of the Dalit community.':
    'दलित समुदायको अधिकार र सम्मानका लागि सहयोग।',
  'Education & Awareness':
    'शिक्षा र जनचेतना',
  'Education and awareness builds a better future.':
    'शिक्षा र चेतनाले समृद्ध भविष्य निर्माण गर्छ।',
  'Women Empowerment':
    'महिला सशक्तिकरण',
  'Support and protection for women affected by violence.':
    'हिंसा प्रभावित महिलाको सहयोग र संरक्षण।',

  // ---------- Page titles ----------
  'Donors & supporters': 'दाता र सहयोगीहरू',
  'Donation records': 'चन्दा अभिलेख',
  'All donation records': 'सबै चन्दा अभिलेख',
  'Donation & fund dashboard': 'चन्दा र कोष ड्यासबोर्ड',
  'Activity log': 'गतिविधि लग',
  'Activity records': 'गतिविधि अभिलेख',
  'District work': 'जिल्ला कार्य',
  'District work (77 districts)': 'जिल्ला कार्य (७७ जिल्ला)',
  'Join applications': 'सदस्यता आवेदनहरू',
  Beneficiaries: 'लाभग्राहीहरू',
  'Committee posts': 'समिति पदहरू',
  'Committee responsibilities': 'समितिका जिम्मेवारीहरू',
  'Permanent duties for a post': 'पदको स्थायी जिम्मेवारी',
  'Role responsibilities': 'पदीय जिम्मेवारीहरू',
  'Contact messages': 'सम्पर्क सन्देशहरू',
  'Messages from members': 'सदस्यका सन्देशहरू',
  'Member tasks': 'सदस्य कार्यहरू',
  'Member contribution report': 'सदस्य योगदान प्रतिवेदन',
  'Karya Samiti': 'कार्य समिति',
  'Master dashboard': 'मास्टर ड्यासबोर्ड',
  'My notes': 'मेरा नोटहरू',
  'Payment activity': 'भुक्तानी गतिविधि',
  'Payment settings and QR codes': 'भुक्तानी सेटिङ र QR कोड',
  'Payment verification': 'भुक्तानी प्रमाणीकरण',
  'Projects & Our Works': 'परियोजना र हाम्रा कामहरू',
  'Projects & works': 'परियोजना र कामहरू',
  'Removed donations': 'हटाइएका चन्दा',
  'Reports & export': 'प्रतिवेदन र निर्यात',
  'Expense categories (money out)': 'खर्च श्रेणीहरू (बाहिर जाने पैसा)',
  'Fund & expense categories': 'कोष र खर्च श्रेणीहरू',
  'Fund categories (money in)': 'कोष श्रेणीहरू (भित्र आउने पैसा)',
  'Fund records': 'कोष अभिलेख',
  'Monthly fund records': 'मासिक कोष अभिलेख',
  'Monthly collection accounting': 'मासिक संकलन हिसाब',
  'Monthly contribution tracking': 'मासिक योगदान ट्र्याकिङ',
  'Monthly tracking': 'मासिक ट्र्याकिङ',
  'Bank, QR and eSewa details': 'बैंक, QR र eSewa विवरण',
  'Accounts members can pay into': 'सदस्यहरूले भुक्तानी गर्न सक्ने खाताहरू',
  'Loan management': 'ऋण व्यवस्थापन',
  'Loan amount and balance': 'ऋण रकम र बाँकी',
  'Loan records': 'ऋण अभिलेख',
  Loans: 'ऋणहरू',
  'Gallery albums': 'ग्यालरी एल्बमहरू',
  'Gallery photos': 'ग्यालरी फोटोहरू',
  'News & Notices': 'समाचार र सूचना',
  'No member has written yet': 'कुनै सदस्यले अझै लेखेको छैन',
  'No members match this report': 'यो प्रतिवेदनसँग मिल्ने सदस्य भेटिएन',
  'No payment matches these filters': 'यी फिल्टरसँग मिल्ने भुक्तानी भेटिएन',
  'Nothing is waiting': 'पर्खिरहेको केही छैन',
  'Nothing is waiting for verification': 'प्रमाणीकरणका लागि पर्खिरहेको केही छैन',
  'The last 12 months': 'पछिल्ला १२ महिना',
  'What each supporter has given': 'हरेक सहयोगीले दिएको रकम',
  'You have new messages to review': 'समीक्षा गर्न नयाँ सन्देशहरू छन्',
  'The database is not connected yet': 'डेटाबेस अझै जोडिएको छैन',
  'The database is not set up yet': 'डेटाबेस अझै तयार गरिएको छैन',
  'Connect the database': 'डेटाबेस जोड्नुहोस्',
  'How placeholders work': 'प्लेसहोल्डर कसरी काम गर्छ',
  'How do members pay into this?': 'सदस्यहरूले यसमा कसरी भुक्तानी गर्छन्?',

  // ---------- Form prompts and options ----------
  'Account holder name': 'खातावालाको नाम',
  'Account is active': 'खाता सक्रिय छ',
  'Account number / wallet ID': 'खाता नम्बर / वालेट आईडी',
  'Active supporter': 'सक्रिय सहयोगी',
  'Activities carried out': 'सम्पन्न गतिविधिहरू',
  'Activity name': 'गतिविधिको नाम',
  'Add a member': 'सदस्य थप्नुहोस्',
  'Add a program': 'कार्यक्रम थप्नुहोस्',
  'Add a project': 'परियोजना थप्नुहोस्',
  'Add an event': 'इभेन्ट थप्नुहोस्',
  'Add some photos': 'केही फोटो थप्नुहोस्',
  'Add your first content': 'पहिलो सामग्री थप्नुहोस्',
  'Added by': 'थप्ने',
  'Agreement date': 'सम्झौता मिति',
  'Agreement file': 'सम्झौता फाइल',
  'Agreement number': 'सम्झौता नम्बर',
  'Agreement status': 'सम्झौताको स्थिति',
  'Album cover picture': 'एल्बम कभर तस्बिर',
  'Album title': 'एल्बमको शीर्षक',
  'All time': 'सबै समय',
  'Amount (whole rupees)': 'रकम (पूरा रुपैयाँ)',
  'Article date': 'लेखको मिति',
  'Assign to': 'जिम्मा दिनुहोस्',
  'Assigned to': 'जिम्मा दिइएको',
  'Available balance': 'उपलब्ध बाँकी',
  'Available for new records': 'नयाँ अभिलेखका लागि उपलब्ध',
  'Bank / wallet': 'बैंक / वालेट',
  'Bank account': 'बैंक खाता',
  'Bank name (kept on the record)': 'बैंकको नाम (अभिलेखमा रहन्छ)',
  'Banks & QR': 'बैंक र QR',
  'Bank-wise collection report': 'बैंकअनुसार संकलन प्रतिवेदन',
  'Beneficiaries (how many people benefited)': 'लाभग्राही (कति मानिस लाभान्वित)',
  'Beneficiary groups': 'लाभग्राही समूहहरू',
  'Bill / receipt': 'बिल / रसिद',
  'Bullet list': 'बुँदा सूची',
  'Category-wise expense report': 'श्रेणीअनुसार खर्च प्रतिवेदन',
  'Change contact details': 'सम्पर्क विवरण परिवर्तन गर्नुहोस्',
  'Citizenship issued district': 'नागरिकता जारी जिल्ला',
  'Citizenship number': 'नागरिकता नम्बर',
  'Committee member': 'समिति सदस्य',
  'Create an administrator account': 'एडमिन खाता बनाउनुहोस्',
  'Current / Former': 'हाल / पूर्व',
  'Current address': 'हालको ठेगाना',
  'Current or former': 'हालको वा पूर्व',
  'Custom range': 'आफ्नै अवधि',
  'Date and time': 'मिति र समय',
  'Date of birth': 'जन्म मिति',
  'Date of the activity': 'गतिविधिको मिति',
  'Date paid out (optional)': 'भुक्तानी गरेको मिति (वैकल्पिक)',
  'Date received': 'प्राप्त मिति',
  'Date requested': 'अनुरोध मिति',
  'Date taken': 'लिएको मिति',
  'Date the money was given': 'पैसा दिएको मिति',
  'Date-wise transaction report': 'मितिअनुसार कारोबार प्रतिवेदन',
  'Department / area': 'विभाग / क्षेत्र',
  'Describe who you serve': 'कसलाई सेवा दिनुहुन्छ, वर्णन गर्नुहोस्',
  'Description (optional)': 'विवरण (वैकल्पिक)',
  'Description / note': 'विवरण / नोट',
  'Display order': 'देखाउने क्रम',
  'Document links (one per line)': 'कागजात लिङ्क (प्रत्येक लाइनमा एक)',
  'Donation purpose': 'चन्दाको उद्देश्य',
  'Donor email (optional)': 'दाताको इमेल (वैकल्पिक)',
  'Donor name': 'दाताको नाम',
  'Donor phone (optional)': 'दाताको फोन (वैकल्पिक)',
  'Donor photo': 'दाताको फोटो',
  'Due date': 'तिर्ने मिति',
  'Email address': 'इमेल ठेगाना',
  'Email the member a verification link now': 'सदस्यलाई अहिलेै प्रमाणीकरण लिङ्क इमेल गर्नुहोस्',
  'Email verified': 'इमेल प्रमाणित',
  'End date': 'अन्त्य मिति',
  'Ends at': 'अन्त्य हुने समय',
  'English name (optional)': 'अंग्रेजी नाम (वैकल्पिक)',
  'eSewa wallet': 'eSewa वालेट',
  'Event picture': 'इभेन्टको तस्बिर',
  'Event title': 'इभेन्टको शीर्षक',
  'Expected / upcoming fund': 'अपेक्षित / आउँदो कोष',
  'Expense date': 'खर्च मिति',
  'Expense title': 'खर्चको शीर्षक',
  'Extra supporting document': 'थप सहयोगी कागजात',
  'Featured picture': 'विशेष तस्बिर',
  'Full address': 'पूरा ठेगाना',
  'Full article': 'पूरा लेख',
  'Full description': 'पूरा विवरण',
  'Full details': 'पूरा विवरण',
  'Full name': 'पूरा नाम',
  'Fund amount': 'कोष रकम',
  'Fund balance report': 'कोष बाँकी प्रतिवेदन',
  'Fund category': 'कोष श्रेणी',
  'Fund used': 'प्रयोग भएको कोष',
  'Fund used (whole rupees)': 'प्रयोग भएको कोष (पूरा रुपैयाँ)',
  'Group name': 'समूहको नाम',
  'Hero slider (the moving banner at the top of the home page)':
    'हिरो स्लाइडर (गृहपृष्ठको माथिल्लो चल्ने ब्यानर)',
  'Photo wall (gallery on /gallery and the home page)':
    'फोटो वाल (ग्यालरी पेज र गृहपृष्ठको ग्यालरी)',
  'How it arrived': 'कसरी आयो',
  'How to take part': 'कसरी सहभागी हुने',
  'Interest (Rs.)': 'ब्याज (रु.)',
  'Internal note': 'आन्तरिक नोट',
  'Internal notes': 'आन्तरिक नोटहरू',
  'Joined the committee': 'समितिमा जोडिएको',
  'Joined the organization': 'संस्थामा जोडिएको',
  'Khalti wallet': 'खल्ती वालेट',
  'Link to a saved position (optional)': 'सुरक्षित पदसँग लिङ्क (वैकल्पिक)',
  'Listed publicly': 'सार्वजनिक रूपमा सूचीबद्ध',
  'Loan amount': 'ऋण रकम',
  'Loan amount (Rs.)': 'ऋण रकम (रु.)',
  'Loan no.': 'ऋण नं.',
  'Main picture': 'मुख्य तस्बिर',
  'Main text': 'मुख्य पाठ',
  'Member ID': 'सदस्य आईडी',
  'Member number': 'सदस्य नम्बर',
  'Member since': 'सदस्यता सुरु',
  'Members involved': 'संलग्न सदस्यहरू',
  'Members pending': 'बाँकी सदस्यहरू',
  'Members who paid': 'भुक्तानी गरेका सदस्यहरू',
  'Membership number': 'सदस्यता नम्बर',
  'Membership status': 'सदस्यता स्थिति',
  'Member-wise contribution report': 'सदस्यअनुसार योगदान प्रतिवेदन',
  'Month this payment is for': 'यो भुक्तानी कुन महिनाको',
  'Monthly collection report': 'मासिक संकलन प्रतिवेदन',
  'Monthly expense report': 'मासिक खर्च प्रतिवेदन',
  'Municipality / rural municipality': 'नगरपालिका / गाउँपालिका',
  'Name shown to members': 'सदस्यहरूलाई देखाइने नाम',
  'Not paid yet': 'अझै तिरेको छैन',
  'Number / ID': 'नम्बर / आईडी',
  'Number of instalments agreed': 'सहमत किस्ताको संख्या',
  'Number supported': 'सहयोग गरिएको संख्या',
  'Open member tasks': 'खुला सदस्य कार्यहरू',
  'Order in the list': 'सूचीमा क्रम',
  'Organization (optional)': 'संस्था (वैकल्पिक)',
  'Page group': 'पेज समूह',
  'Paid in full': 'पूरा तिरिएको',
  'Paid on': 'तिरेको मिति',
  'Paid to': 'कसलाई तिरियो',
  'Paid to / vendor': 'कसलाई तिरियो / विक्रेता',
  'Part of which project?': 'कुन परियोजनाको भाग?',
  'Part paid': 'आंशिक तिरिएको',
  'Payment date': 'भुक्तानी मिति',
  'Payment instructions': 'भुक्तानी निर्देशनहरू',
  'Payment method': 'भुक्तानी माध्यम',
  'Payment QR code': 'भुक्तानी QR कोड',
  'Pending payment report': 'बाँकी भुक्तानी प्रतिवेदन',
  'Pending payments': 'बाँकी भुक्तानीहरू',
  'Permanent address': 'स्थायी ठेगाना',
  'Phone number': 'फोन नम्बर',
  'Photo links (one per line)': 'फोटो लिङ्क (प्रत्येक लाइनमा एक)',
  'Picture (optional)': 'तस्बिर (वैकल्पिक)',
  'Placement name (slug)': 'राख्ने स्थान (स्लग)',
  'Position (Nepali)': 'पद (नेपाली)',
  'Position name (Nepali)': 'पदको नाम (नेपाली)',
  'Post (पद)': 'पद',
  'Post / position': 'पद / स्थान',
  'Private - only in this panel (default)': 'निजी - यही प्यानलमा मात्र (पूर्वनिर्धारित)',
  'Private instructions': 'निजी निर्देशनहरू',
  'Profile photo': 'प्रोफाइल फोटो',
  'Program title': 'कार्यक्रमको शीर्षक',
  'Public - show on the website': 'सार्वजनिक - वेबसाइटमा देखाउनुहोस्',
  'Published on the website': 'वेबसाइटमा प्रकाशित',
  'Purpose (what the donor wanted it used for)': 'उद्देश्य (दाताले कुन कामका लागि दिए)',
  'Purpose of the loan': 'ऋणको उद्देश्य',
  'Receipt / reference number': 'रसिद / सन्दर्भ नम्बर',
  'Receipt / screenshot': 'रसिद / स्क्रिनसट',
  'Receipt no.': 'रसिद नं.',
  'Recommend this account': 'यो खाता सिफारिस गर्नुहोस्',
  'Reference number': 'सन्दर्भ नम्बर',
  'Related event': 'सम्बन्धित इभेन्ट',
  'Related program': 'सम्बन्धित कार्यक्रम',
  'Related project / work': 'सम्बन्धित परियोजना / काम',
  'Repaid %': 'तिरेको %',
  'Repayment deadline': 'भुक्तानीको म्याद',
  'Responsible team / person': 'जिम्मेवार टोली / व्यक्ति',
  'Results / impact so far': 'हालसम्मको नतिजा / प्रभाव',
  'Short description': 'छोटो विवरण',
  'Short introduction': 'छोटो परिचय',
  'Short summary': 'छोटो सारांश',
  'Show in the homepage preview': 'गृहपृष्ठ पूर्वावलोकनमा देखाउनुहोस्',
  'Show on the public Members page': 'सार्वजनिक सदस्य पेजमा देखाउनुहोस्',
  'Show on the website': 'वेबसाइटमा देखाउनुहोस्',
  'Show to members': 'सदस्यहरूलाई देखाउनुहोस्',
  'Shown in': 'कहाँ देखाइन्छ',
  'Small line under the heading': 'शीर्षकमुनिको सानो लाइन',
  'Sort order': 'क्रम',
  'Start date': 'सुरु मिति',
  'Starting password': 'सुरुको पासवर्ड',
  'Starts at': 'सुरु हुने समय',
  'Task title': 'कार्यको शीर्षक',
  'The paper agreement has been signed': 'कागजी सम्झौता हस्ताक्षर भएको छ',
  'This month': 'यो महिना',
  'This month collection': 'यो महिनाको संकलन',
  'This month expense': 'यो महिनाको खर्च',
  'This week': 'यो हप्ता',
  'This year': 'यो वर्ष',
  'Total fund collected': 'कुल संकलित कोष',
  'Total fund spent': 'कुल खर्च भएको कोष',
  'Total payable': 'कुल तिर्नुपर्ने',
  'Transaction ID': 'कारोबार आईडी',
  'Type of activity': 'गतिविधिको प्रकार',
  'Type of donation': 'चन्दाको प्रकार',
  'Upload photos': 'फोटो अपलोड गर्नुहोस्',
  'Verified by': 'प्रमाणित गर्ने',
  'Verified on': 'प्रमाणित मिति',
  'View the website': 'वेबसाइट हेर्नुहोस्',
  'Visible on the website': 'वेबसाइटमा देखिने',
  'Waived (excused)': 'माफ (छुट)',
  'Web address (advanced)': 'वेब ठेगाना (उन्नत)',
  'Website (optional)': 'वेबसाइट (वैकल्पिक)',
  'What has to be done': 'के गर्नुपर्छ',
  'What needs to be done?': 'के गर्नुपर्छ?',
  'What the agreement says': 'सम्झौतामा के लेखिएको छ',
  'What the number counts': 'यो नम्बरले के गन्छ',
  'What the position is responsible for (optional)': 'पदको जिम्मेवारी (वैकल्पिक)',
  'What to call the number above': 'माथिको नम्बरलाई के भन्ने',
  'What was done': 'के गरियो',
  'Where this photo is shown': 'यो फोटो कहाँ देखाइन्छ',
  'Which page does this belong to?': 'यो कुन पेजसँग सम्बन्धित छ?',
  'Who benefited': 'कसले लाभ लियो',
  'Who is this for?': 'यो कसका लागि हो?',
  'Write news': 'समाचार लेख्नुहोस्',

  // ---------- Fund and payment states ----------
  Pending: 'बाँकी',
  Verified: 'प्रमाणित',
  Rejected: 'अस्वीकृत',
  Approved: 'स्वीकृत',
  Paid: 'तिरिएको',
  Unpaid: 'नतिरिएको',
  Partial: 'आंशिक',
  Inactive: 'निष्क्रिय',
  Draft: 'मस्यौदा',
  Archived: 'संग्रहित',
  High: 'उच्च',
  Medium: 'मध्यम',
  Low: 'निम्न',
  Open: 'खुला',
  Closed: 'बन्द',
  Completed: 'सम्पन्न',
  Cancelled: 'रद्द',
  Income: 'आम्दानी',
  Cash: 'नगद',
  Bank: 'बैंक',
  'All records': 'सबै अभिलेख',
  'No records found': 'कुनै अभिलेख भेटिएन',
  'Report': 'प्रतिवेदन',
  'Export': 'निर्यात',
  'Download': 'डाउनलोड',
  'Print': 'प्रिन्ट',
  'Total': 'कुल',
  'Balance': 'बाँकी',
  'Summary': 'सारांश',
  'Overview': 'सिंहावलोकन',
  'Recent activity': 'हालैको गतिविधि',
  'View all': 'सबै हेर्नुहोस्',
  'Read more': 'थप पढ्नुहोस्',
  'Back': 'पछाडि',
  'Back to list': 'सूचीमा फर्कनुहोस्',
  'Details': 'विवरण',
  'Contact': 'सम्पर्क',
  'Send': 'पठाउनुहोस्',
  'Sending': 'पठाउँदै',
  'Sent': 'पठाइयो',
  'Write a message': 'सन्देश लेख्नुहोस्',
  'Type a message…': 'सन्देश लेख्नुहोस्…',
};

/**
 * Translate one English sentence into the current panel language.
 * Returns the English text untouched when no translation is recorded, so a
 * missing entry can never blank out a label.
 */
export function translatePhrase(lang: Lang, text: string): string {
  if (!text || lang === 'en') return text;

  const exact = PHRASES[text];
  if (exact) return exact;

  const word = WORDS[text];
  if (word) return word;

  return text;
}
