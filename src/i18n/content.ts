// All landing copy, per locale. HU is the owner's text (docs/tartalom-hu.md); EN is its translation.
// SYNTHETIC (Cserelista): menu dishes, prices, opening hours and the e-mail address are placeholders
// until the owner supplies the real ones. Prices (HUF) are estimates from 2025–26 Budapest
// home-style restaurant menus, set in the mid-range of what comparable sit-down places charge.

export type Lang = 'hu' | 'en';

export const business = {
  name: 'Talizmán Hetes',
  legalName: 'TALIZMÁN HETES Korlátolt Felelősségű Társaság',
  shortLegalName: 'TALIZMÁN HETES Kft.',
  taxNumber: '32195916-2-41',
  companyRegNumber: '01-09-411435',
  street: 'Dinamó utca 7.',
  postalCode: '1031',
  city: 'Budapest',
  // SYNTHETIC: placeholder address, replace with the real one.
  email: 'info@talizmanhetes.hu',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Budapest%2C+Dinam%C3%B3+utca+7.',
} as const;

// SYNTHETIC: placeholder opening hours, replace with the real ones.
const hours = {
  hu: [
    { days: 'Hétfő – Csütörtök', time: '12:00 – 22:00' },
    { days: 'Péntek – Szombat', time: '12:00 – 23:00' },
    { days: 'Vasárnap', time: '12:00 – 21:00' },
  ],
  en: [
    { days: 'Monday – Thursday', time: '12:00 – 22:00' },
    { days: 'Friday – Saturday', time: '12:00 – 23:00' },
    { days: 'Sunday', time: '12:00 – 21:00' },
  ],
};

// SYNTHETIC: sample of classic Hungarian home-style dishes, replace with the real menu.
const menu = {
  hu: [
    {
      title: 'Levesek',
      items: [
        { name: 'Gulyásleves', desc: 'marhahússal, csipetkével, ahogy a bográcsban készül', price: 2990 },
        { name: 'Újházi tyúkhúsleves', desc: 'házi cérnametélttel, zöldségekkel', price: 2690 },
        { name: 'Hideg meggyleves', desc: 'nyáron, tejszínnel', price: 2490 },
      ],
    },
    {
      title: 'Főételek',
      items: [
        { name: 'Töltött káposzta', desc: 'füstölt tarjával, tejföllel', price: 4690 },
        { name: 'Paprikás csirke', desc: 'galuskával, uborkasalátával', price: 4590 },
        { name: 'Marhapörkölt', desc: 'nokedlivel, savanyúsággal', price: 5290 },
        { name: 'Rántott szelet', desc: 'petrezselymes burgonyával', price: 4490 },
      ],
    },
    {
      title: 'Desszertek',
      items: [
        { name: 'Somlói galuska', desc: 'csokoládéöntettel, tejszínhabbal', price: 2390 },
        { name: 'Túrós csusza', desc: 'pirított szalonnával, ahogy a nagymamánál', price: 3290 },
        { name: 'Palacsinta', desc: 'házi lekvárral vagy dióval', price: 1890 },
      ],
    },
  ],
  en: [
    {
      title: 'Soups',
      items: [
        {
          name: 'Goulash soup',
          desc: 'with beef and pinched noodles, the way it is cooked in the kettle',
          price: 2990,
        },
        { name: 'Újházi chicken soup', desc: 'with homemade fine noodles and vegetables', price: 2690 },
        { name: 'Cold sour cherry soup', desc: 'in summer, with cream', price: 2490 },
      ],
    },
    {
      title: 'Main courses',
      items: [
        { name: 'Stuffed cabbage', desc: 'with smoked pork and sour cream', price: 4690 },
        { name: 'Chicken paprikash', desc: 'with dumplings and cucumber salad', price: 4590 },
        { name: 'Beef stew (pörkölt)', desc: 'with nokedli and pickles', price: 5290 },
        { name: 'Breaded cutlet', desc: 'with parsley potatoes', price: 4490 },
      ],
    },
    {
      title: 'Desserts',
      items: [
        { name: 'Somlói galuska', desc: 'sponge trifle with chocolate sauce and whipped cream', price: 2390 },
        {
          name: 'Túrós csusza',
          desc: 'pasta with cottage cheese and crispy bacon, like grandma makes',
          price: 3290,
        },
        { name: 'Pancakes', desc: 'with homemade jam or walnuts', price: 1890 },
      ],
    },
  ],
};

const hu = {
  meta: {
    title: 'Talizmán Hetes étterem – házias magyar ízek Óbudán',
    description:
      'Talizmán Hetes, ahol a szerencse asztalhoz ül. Friss, házias magyar ízek, figyelmes kiszolgálás és kellemes hangulat Óbudán. Foglalj asztalt!',
    ogAlt: 'Meleg fényű étteremasztal esti hangulatban',
  },
  skip: 'Ugrás a tartalomra',
  nav: {
    label: 'Fő navigáció',
    menuToggle: 'Menü',
    items: [
      { href: '#rolunk', label: 'Rólunk' },
      { href: '#etlap', label: 'Étlap' },
      { href: '#alkalmak', label: 'Alkalmak' },
      { href: '#kapcsolat', label: 'Kapcsolat' },
    ],
    book: 'Asztalfoglalás',
    langSwitch: { href: '/en/', label: 'English', short: 'EN', lang: 'en' },
  },
  hero: {
    titleA: 'Talizmán Hetes,',
    titleB: 'ahol a szerencse asztalhoz ül.',
    lead: 'Friss ízek, figyelmes kiszolgálás és kellemes hangulat. Foglalj asztalt, és érezd magad szerencsésnek nálunk.',
    book: 'Asztalfoglalás',
    menu: 'Étlap',
    where: 'Óbuda',
    imgAlt: 'Félhomályos, meleg fényű étterem esti vendégekkel',
  },
  about: {
    title: 'Rólunk',
    quote: 'A nevünk a szerencsét idézi, a hetes pedig a szerencseszám.',
    body: [
      'A Talizmán Hetes egy étterem, ahol a minőségi alapanyagok és a vendégek elégedettsége áll az első helyen.',
      'Azt szeretnénk, hogy minden vendégünk jó hangulatban, kellemes emlékekkel távozzon tőlünk, legyen szó hétköznapi ebédről, romantikus vacsoráról vagy családi ünnepről.',
    ],
    imgAlt: 'Családias étteremterem vörös falakkal, terített asztalokkal',
  },
  restaurant: {
    title: 'Az éttermünk',
    items: [
      'Frissen, gondosan elkészített ételek',
      'Változatos étlap minden ízlésnek',
      'Barátságos, nyugodt környezet',
      'Figyelmes, gyors kiszolgálás',
    ],
    imgAlt: 'Töltött káposzta tejföllel, mély tányérban',
  },
  menu: {
    title: 'Ízelítő az étlapunkról',
    lead: 'Házias magyar konyha, igényes tálalással. A teljes, aktuális étlapért keress minket bizalommal.',
    priceNote: 'Az árak forintban értendők.',
    sections: menu.hu,
    imgAlt: 'Pörkölt bográcsban, fakanállal',
    book: 'Asztalt foglalok',
  },
  why: {
    title: 'Miért válassz minket?',
    items: [
      'Gondosan válogatott, friss alapanyagok',
      'Házias ízek, igényes tálalás',
      'Családias, vendégközpontú hangulat',
    ],
    occasionsLead: 'Alkalomtól függetlenül jó választás:',
    occasions: ['ebéd', 'vacsora', 'baráti találkozó', 'ünnep'],
    imgAlt: 'Igényesen tálalt főétel fatányéron',
  },
  booking: {
    title: 'Asztalfoglalás',
    lead: 'Asztalt e-mailben foglalhatsz nálunk. Írd meg, mikor jönnél és hányan lesztek.',
    checklistTitle: 'Ezeket írd bele a leveledbe:',
    checklist: ['dátum és időpont', 'létszám', 'a neved', 'alkalom vagy kérés, ha van'],
    submit: 'Foglalás e-mailben',
    subject: 'Asztalfoglalás',
    bodyTemplate: [
      'Szia! Asztalt szeretnék foglalni.',
      '',
      'Dátum:',
      'Időpont:',
      'Létszám:',
      'Név:',
      'Alkalom / kérés:',
    ],
    imgAlt: 'Asztali lámpa meleg fénye egy terített asztalon',
  },
  contact: {
    title: 'Kapcsolat',
    address: 'Cím',
    route: 'Útvonaltervezés',
    hours: 'Nyitvatartás',
    hoursList: hours.hu,
    write: 'Írj nekünk',
  },
  footer: {
    tagline: 'ahol a szerencse asztalhoz ül',
    company: 'Cégadatok',
    tax: 'Adószám',
    reg: 'Cégjegyzékszám',
    seat: 'Székhely',
    photos: 'A fotók illusztrációk (Unsplash).',
    top: 'Vissza az oldal tetejére',
  },
};

type Dict = typeof hu;

const en: Dict = {
  meta: {
    title: 'Talizmán Hetes restaurant – Hungarian home cooking in Óbuda',
    description:
      'Talizmán Hetes, where luck takes a seat at your table. Fresh Hungarian home-style food, attentive service and a warm atmosphere in Óbuda, Budapest.',
    ogAlt: 'A warmly lit restaurant table in the evening',
  },
  skip: 'Skip to content',
  nav: {
    label: 'Main navigation',
    menuToggle: 'Menu',
    items: [
      { href: '#rolunk', label: 'About' },
      { href: '#etlap', label: 'Menu' },
      { href: '#alkalmak', label: 'Occasions' },
      { href: '#kapcsolat', label: 'Contact' },
    ],
    book: 'Book a table',
    langSwitch: { href: '/', label: 'Magyar', short: 'HU', lang: 'hu' },
  },
  hero: {
    titleA: 'Talizmán Hetes,',
    titleB: 'where luck takes a seat at your table.',
    lead: 'Fresh flavours, attentive service and a warm atmosphere. Book a table and feel lucky with us.',
    book: 'Book a table',
    menu: 'Menu',
    where: 'Óbuda',
    imgAlt: 'A dimly lit, warm restaurant with evening guests',
  },
  about: {
    title: 'About us',
    quote: 'Our name recalls luck, and seven is the lucky number.',
    body: [
      'Talizmán Hetes is a restaurant where quality ingredients and happy guests come first.',
      'We want every guest to leave in good spirits and with fond memories, whether it is an everyday lunch, a romantic dinner or a family celebration.',
    ],
    imgAlt: 'A family-style dining room with red walls and laid tables',
  },
  restaurant: {
    title: 'Our restaurant',
    items: [
      'Freshly and carefully prepared dishes',
      'A varied menu for every taste',
      'A friendly, relaxed setting',
      'Attentive, quick service',
    ],
    imgAlt: 'Stuffed cabbage with sour cream in a deep plate',
  },
  menu: {
    title: 'A taste of our menu',
    lead: 'Hungarian home cooking, carefully plated. For the full, current menu, just get in touch.',
    priceNote: 'Prices are in Hungarian forints (HUF).',
    sections: menu.en,
    imgAlt: 'Stew in a kettle with a wooden spoon',
    book: 'Book a table',
  },
  why: {
    title: 'Why choose us?',
    items: [
      'Carefully selected, fresh ingredients',
      'Home-style flavours, refined plating',
      'A family-like, guest-first atmosphere',
    ],
    occasionsLead: 'A good choice for any occasion:',
    occasions: ['lunch', 'dinner', 'friends', 'celebrations'],
    imgAlt: 'A carefully plated main course on a wooden plate',
  },
  booking: {
    title: 'Book a table',
    lead: 'You can book a table with us by e-mail. Just tell us when you would like to come and how many of you there will be.',
    checklistTitle: 'Please include in your e-mail:',
    checklist: ['date and time', 'number of guests', 'your name', 'occasion or request, if any'],
    submit: 'Book by e-mail',
    subject: 'Table booking',
    bodyTemplate: [
      'Hello! I would like to book a table.',
      '',
      'Date:',
      'Time:',
      'Guests:',
      'Name:',
      'Occasion / request:',
    ],
    imgAlt: 'The warm light of a table lamp on a laid table',
  },
  contact: {
    title: 'Contact',
    address: 'Address',
    route: 'Get directions',
    hours: 'Opening hours',
    hoursList: hours.en,
    write: 'Write to us',
  },
  footer: {
    tagline: 'where luck takes a seat at your table',
    company: 'Company details',
    tax: 'Tax number',
    reg: 'Company reg. no.',
    seat: 'Registered office',
    photos: 'Photos are illustrative (Unsplash).',
    top: 'Back to top',
  },
};

export const content: Record<Lang, Dict> = { hu, en };
