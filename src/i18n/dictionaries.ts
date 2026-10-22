import type { Locale } from '@/i18n/config'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * UI DICTIONARIES
 * ═════════════════════════════════════════════════════════════════════════════
 * Every piece of interface chrome, in both languages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES AND DOES NOT COVER
 * ─────────────────────────────────────────────────────────────────────────────
 * This translates the INTERFACE — navigation, buttons, labels, empty states,
 * form copy. It does not translate ARTICLES, and it cannot: article text lives
 * in Postgres, written by a person, and machine-translating a technical essay
 * into Hindi would produce something worse than useless to the reader it is
 * supposedly for.
 *
 * Articles carry their own `locale` column instead. A Hindi article is a real
 * article someone wrote in Hindi, linked to its English counterpart through
 * `translationOfId` so the two can point `hreflang` at each other. Until one
 * exists, the Hindi listing is honestly empty rather than filled with
 * machine output.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A PLAIN OBJECT RATHER THAN next-intl OR i18next
 * ─────────────────────────────────────────────────────────────────────────────
 * Two locales and a few hundred strings do not need a runtime, a plural engine
 * or an ICU parser. A typed object is checked at COMPILE time: the `Dictionary`
 * type below is derived from the English one, so a missing Hindi key is a
 * build error rather than a string that silently renders in English in
 * production. A runtime library gives up that guarantee to buy features this
 * app does not use.
 *
 * The handful of places that genuinely need plurals or interpolation use small
 * functions, below, rather than a template syntax.
 */

const en = {
  // ── Chrome ──────────────────────────────────────────────────────────────
  nav: {
    siteNavigation: 'Site navigation',
    articles: 'Articles',
    topics: 'Topics',
    series: 'Series',
    resources: 'Resources',
    about: 'About',
    search: 'Search articles',
    searchShort: 'Search',
    subscribe: 'Subscribe',
    menu: 'Menu',
    close: 'Close',
    skipToContent: 'Skip to content',
    theme: 'Theme',
    language: 'Language',
    changeLanguage: 'Change language',
  },

  footer: {
    read: 'Read',
    topics: 'Topics',
    company: 'Devlume',
    legal: 'Legal',
    allArticles: 'All articles',
    authors: 'Authors',
    cookieSettings: 'Cookie settings',
    rightsReserved: 'All rights reserved.',
    weeklyDispatch: 'Weekly dispatch',
  },

  // ── Articles ────────────────────────────────────────────────────────────
  article: {
    minRead: 'min read',
    updated: 'Updated',
    publishedOn: 'Published on',
    tableOfContents: 'On this page',
    relatedReading: 'Related reading',
    tags: 'Tags',
    share: 'Share',
    listen: 'Listen to this article',
    hidePlayer: 'Hide player',
    narratedAudio: 'Narrated audio',
    audioUnsupported:
      'This browser cannot read articles aloud — Chrome, Edge and Safari can.',
    faqHeading: 'Frequently asked questions',
    writtenBy: 'Written by',
    like: 'Like this article',
    unlike: 'Remove your like',
    save: 'Save',
    saved: 'Saved',
    savedNotice: 'Saved.',
    viewSaved: 'View your saved articles',
    signInToReact: 'Sign in to save and react to articles.',
    reactionFailed: 'That did not go through. Try again.',
  },

  // ── Comments ────────────────────────────────────────────────────────────
  comments: {
    heading: 'Discussion',
    none: 'No comments yet. Yours would be the first.',
    closed: 'Comments are closed on this article.',
    join: 'Join the discussion',
    replyingTo: 'Replying to',
    cancelReply: 'Cancel reply',
    reply: 'Reply',
    member: 'Member',
    yourComment: 'Your comment',
    placeholder: 'Add to the discussion…',
    yourName: 'Your name',
    yourEmail: 'Email (never published)',
    emailHint: 'Only used to notify you of replies.',
    post: 'Post comment',
    postReply: 'Post reply',
    posting: 'Posting…',
    moderationNotice:
      'Comments are reviewed before they appear. Markdown is not supported; links are allowed but held for review.',
    signedInNotice: 'Comments with links are reviewed before they appear.',
    writeSomething: 'Write something first.',
    failed: 'Could not post that. Please try again.',
  },

  // ── Listings ────────────────────────────────────────────────────────────
  listing: {
    allArticles: 'All articles',
    latest: 'Latest',
    featured: 'Featured',
    editorsPick: "Editor's pick",
    noResults: 'No matches',
    noResultsHint: 'Try a broader term, or browse by topic.',
    loadMore: 'Load more',
    page: 'Page',
    previous: 'Previous',
    next: 'Next',
    browseArticles: 'Browse articles',
    startReading: 'Start reading',
    keepReading: 'Keep reading',
    backToHome: 'Back to the homepage',
  },

  search: {
    title: 'Search',
    placeholder: 'Search articles',
    resultsFor: 'Results for',
    resultCount: 'result',
    resultCountPlural: 'results',
    empty: 'Type to search across every article.',
  },

  // ── Newsletter ──────────────────────────────────────────────────────────
  newsletter: {
    heading: 'The Devlume dispatch',
    blurb:
      'One deeply researched engineering essay a week. No digests, no cross-promotion, one click to leave.',
    emailLabel: 'Email address',
    subscribe: 'Subscribe',
    subscribing: 'Subscribing…',
    successTitle: 'Almost there.',
    successBody:
      'Check your inbox and confirm the subscription — we use double opt-in, so nothing is sent until you do.',
    enterEmail: 'Enter your email address.',
    invalidEmail: 'That does not look like a valid email address.',
    failed: 'Something went wrong. Please try again.',
    confirming: 'Confirming your subscription…',
    confirmedTitle: 'You are subscribed',
    confirmedBody:
      'One deeply researched engineering essay a week. Every issue has a one-click unsubscribe link in the footer — no form, no questions.',
    confirmFailedTitle: 'That link did not work',
    confirmFailedBody:
      'Confirmation links can only be used once, and they expire if a newer one has been sent.',
    unsubscribe: 'Unsubscribe',
    unsubscribing: 'Removing…',
    unsubscribedTitle: 'Done',
    unsubscribedBody:
      'That address has been removed. Nothing further will be sent, and the articles stay free to read without a subscription.',
  },

  // ── Saved ───────────────────────────────────────────────────────────────
  saved: {
    title: 'Saved',
    blurb:
      'Articles you saved to come back to. Saving is tied to your account, so the list is the same on every device you sign in on.',
    signInTitle: 'Sign in to see your saved articles',
    signInBody: 'Saving is tied to your account so the list follows you between devices.',
    signIn: 'Sign in',
    emptyTitle: 'Nothing saved yet',
    emptyBody: 'The Save button at the top of any article adds it here.',
    failedTitle: 'Could not load your saved articles',
    failedBody: 'The request did not go through. Reloading usually fixes it.',
    countSuffix: 'most recent first.',
  },

  // ── Consent ─────────────────────────────────────────────────────────────
  consent: {
    heading: 'Cookies on Devlume',
    body: 'We use strictly necessary cookies to run the site. Analytics and advertising cookies are optional and off until you turn them on.',
    cookiePolicy: 'Cookie policy',
    acceptAll: 'Accept all',
    rejectAll: 'Reject all',
    chooseIndividually: 'Choose individually',
    saveChoices: 'Save my choices',
    closeAndReject: 'Reject optional cookies and close',
    necessary: 'Strictly necessary',
    necessaryHint: 'Session, security and your consent choice. Cannot be turned off.',
    analytics: 'Analytics',
    analyticsHint:
      'Aggregate page views, so we know which articles are worth writing more of.',
    advertising: 'Advertising',
    advertisingHint: 'Ad measurement and personalisation. Ads only load if this is on.',
  },

  // ── Errors ──────────────────────────────────────────────────────────────
  error: {
    notFoundTitle: 'Page not found',
    notFoundBody:
      'That page does not exist. It may have moved, or the link may have a typo.',
    genericTitle: 'Something went wrong',
    genericBody: 'An unexpected error occurred. Reloading usually fixes it.',
    tryAgain: 'Try again',
  },

  // ── Ads ─────────────────────────────────────────────────────────────────
  ads: {
    label: 'Advertisement',
    declined: 'Ads are off because you declined advertising cookies.',
    affiliateDisclosure:
      'This article contains affiliate links. If you buy through one we may earn a commission, at no extra cost to you. It never changes what we recommend — see our',
    affiliateDisclosureLink: 'affiliate disclosure',
  },

  // ── Language switching ──────────────────────────────────────────────────
  language: {
    switchTo: 'Switch to',
    notAvailable: 'This article is not available in Hindi yet.',
    readInstead: 'Read it in English',
    availableIn: 'Also available in',
  },
} as const

/**
 * The shape every locale must satisfy.
 *
 * Derived from English, so adding a key there turns every other dictionary
 * into a type error until it is translated. That is the point: the failure
 * mode of a missing translation should be a red build, not a page that quietly
 * renders half in the wrong language.
 */
export type Dictionary = {
  [K in keyof typeof en]: { [P in keyof (typeof en)[K]]: string }
}

/**
 * Hindi.
 *
 * Translated rather than transliterated. Where a term is genuinely used in
 * English by Hindi-speaking developers — "SEO", "cookie" — it stays in
 * English, because translating it into formal Hindi would make it HARDER to
 * read for the audience, not easier. That is a judgement call made per string,
 * not a blanket rule.
 */
const hi: Dictionary = {
  nav: {
    siteNavigation: 'साइट नेविगेशन',
    articles: 'लेख',
    topics: 'विषय',
    series: 'श्रृंखला',
    resources: 'संसाधन',
    about: 'परिचय',
    search: 'लेख खोजें',
    searchShort: 'खोजें',
    subscribe: 'सब्सक्राइब करें',
    menu: 'मेन्यू',
    close: 'बंद करें',
    skipToContent: 'मुख्य सामग्री पर जाएँ',
    theme: 'थीम',
    language: 'भाषा',
    changeLanguage: 'भाषा बदलें',
  },

  footer: {
    read: 'पढ़ें',
    topics: 'विषय',
    company: 'Devlume',
    legal: 'कानूनी',
    allArticles: 'सभी लेख',
    authors: 'लेखक',
    cookieSettings: 'कुकी सेटिंग्स',
    rightsReserved: 'सर्वाधिकार सुरक्षित।',
    weeklyDispatch: 'साप्ताहिक डिस्पैच',
  },

  article: {
    minRead: 'मिनट का पठन',
    updated: 'अपडेट किया गया',
    publishedOn: 'प्रकाशित',
    tableOfContents: 'इस पृष्ठ पर',
    relatedReading: 'संबंधित लेख',
    tags: 'टैग',
    share: 'साझा करें',
    listen: 'यह लेख सुनें',
    hidePlayer: 'प्लेयर छिपाएँ',
    narratedAudio: 'ऑडियो उपलब्ध',
    audioUnsupported:
      'यह ब्राउज़र लेख पढ़कर नहीं सुना सकता — Chrome, Edge और Safari कर सकते हैं।',
    faqHeading: 'अक्सर पूछे जाने वाले प्रश्न',
    writtenBy: 'लेखक',
    like: 'इस लेख को पसंद करें',
    unlike: 'पसंद हटाएँ',
    save: 'सहेजें',
    saved: 'सहेजा गया',
    savedNotice: 'सहेज लिया गया।',
    viewSaved: 'अपने सहेजे गए लेख देखें',
    signInToReact: 'लेख सहेजने और प्रतिक्रिया देने के लिए साइन इन करें।',
    reactionFailed: 'यह नहीं हो सका। फिर से कोशिश करें।',
  },

  comments: {
    heading: 'चर्चा',
    none: 'अभी तक कोई टिप्पणी नहीं। पहली आपकी हो सकती है।',
    closed: 'इस लेख पर टिप्पणियाँ बंद हैं।',
    join: 'चर्चा में शामिल हों',
    replyingTo: 'उत्तर दे रहे हैं',
    cancelReply: 'उत्तर रद्द करें',
    reply: 'उत्तर दें',
    member: 'सदस्य',
    yourComment: 'आपकी टिप्पणी',
    placeholder: 'चर्चा में कुछ जोड़ें…',
    yourName: 'आपका नाम',
    yourEmail: 'ईमेल (कभी प्रकाशित नहीं होगा)',
    emailHint: 'केवल उत्तर मिलने पर सूचित करने के लिए।',
    post: 'टिप्पणी भेजें',
    postReply: 'उत्तर भेजें',
    posting: 'भेजा जा रहा है…',
    moderationNotice:
      'टिप्पणियाँ प्रकाशित होने से पहले जाँची जाती हैं। Markdown समर्थित नहीं है; लिंक भेजे जा सकते हैं पर समीक्षा के लिए रोके जाते हैं।',
    signedInNotice: 'लिंक वाली टिप्पणियाँ प्रकाशित होने से पहले जाँची जाती हैं।',
    writeSomething: 'पहले कुछ लिखें।',
    failed: 'टिप्पणी नहीं भेजी जा सकी। कृपया फिर से कोशिश करें।',
  },

  listing: {
    allArticles: 'सभी लेख',
    latest: 'नवीनतम',
    featured: 'विशेष',
    editorsPick: 'संपादक की पसंद',
    noResults: 'कुछ नहीं मिला',
    noResultsHint: 'कोई व्यापक शब्द आज़माएँ, या विषय से ब्राउज़ करें।',
    loadMore: 'और देखें',
    page: 'पृष्ठ',
    previous: 'पिछला',
    next: 'अगला',
    browseArticles: 'लेख ब्राउज़ करें',
    startReading: 'पढ़ना शुरू करें',
    keepReading: 'पढ़ते रहें',
    backToHome: 'होमपेज पर वापस',
  },

  search: {
    title: 'खोज',
    placeholder: 'लेख खोजें',
    resultsFor: 'परिणाम',
    resultCount: 'परिणाम',
    resultCountPlural: 'परिणाम',
    empty: 'सभी लेखों में खोजने के लिए टाइप करें।',
  },

  newsletter: {
    heading: 'Devlume डिस्पैच',
    blurb:
      'हर हफ़्ते एक गहराई से शोध किया गया इंजीनियरिंग लेख। कोई डाइजेस्ट नहीं, कोई क्रॉस-प्रमोशन नहीं, छोड़ना एक क्लिक में।',
    emailLabel: 'ईमेल पता',
    subscribe: 'सब्सक्राइब करें',
    subscribing: 'सब्सक्राइब हो रहा है…',
    successTitle: 'लगभग हो गया।',
    successBody:
      'अपना इनबॉक्स देखें और सब्सक्रिप्शन की पुष्टि करें — हम डबल ऑप्ट-इन का उपयोग करते हैं, इसलिए तब तक कुछ नहीं भेजा जाएगा।',
    enterEmail: 'अपना ईमेल पता दर्ज करें।',
    invalidEmail: 'यह एक मान्य ईमेल पता नहीं लगता।',
    failed: 'कुछ गड़बड़ हुई। कृपया फिर से कोशिश करें।',
    confirming: 'आपके सब्सक्रिप्शन की पुष्टि हो रही है…',
    confirmedTitle: 'आप सब्सक्राइब हो गए',
    confirmedBody:
      'हर हफ़्ते एक गहराई से शोध किया गया इंजीनियरिंग लेख। हर अंक के फ़ुटर में एक-क्लिक अनसब्सक्राइब लिंक होता है — कोई फ़ॉर्म नहीं, कोई सवाल नहीं।',
    confirmFailedTitle: 'यह लिंक काम नहीं किया',
    confirmFailedBody:
      'पुष्टि लिंक केवल एक बार उपयोग किए जा सकते हैं, और नया भेजे जाने पर पुराने समाप्त हो जाते हैं।',
    unsubscribe: 'अनसब्सक्राइब करें',
    unsubscribing: 'हटाया जा रहा है…',
    unsubscribedTitle: 'हो गया',
    unsubscribedBody:
      'वह पता हटा दिया गया है। आगे कुछ नहीं भेजा जाएगा, और लेख बिना सब्सक्रिप्शन के मुफ़्त पढ़ने योग्य रहेंगे।',
  },

  saved: {
    title: 'सहेजे गए',
    blurb:
      'वे लेख जो आपने बाद में पढ़ने के लिए सहेजे। सहेजना आपके खाते से जुड़ा है, इसलिए सूची हर डिवाइस पर एक जैसी रहती है।',
    signInTitle: 'अपने सहेजे गए लेख देखने के लिए साइन इन करें',
    signInBody: 'सहेजना आपके खाते से जुड़ा है, इसलिए सूची हर डिवाइस पर साथ चलती है।',
    signIn: 'साइन इन करें',
    emptyTitle: 'अभी कुछ सहेजा नहीं गया',
    emptyBody: 'किसी भी लेख के शीर्ष पर दिए "सहेजें" बटन से वह यहाँ जुड़ जाता है।',
    failedTitle: 'आपके सहेजे गए लेख लोड नहीं हो सके',
    failedBody: 'अनुरोध पूरा नहीं हुआ। आमतौर पर पेज रीलोड करने से ठीक हो जाता है।',
    countSuffix: 'सबसे नए पहले।',
  },

  consent: {
    heading: 'Devlume पर कुकीज़',
    body: 'साइट चलाने के लिए हम केवल आवश्यक कुकीज़ का उपयोग करते हैं। Analytics और विज्ञापन कुकीज़ वैकल्पिक हैं और तब तक बंद रहती हैं जब तक आप उन्हें चालू न करें।',
    cookiePolicy: 'कुकी नीति',
    acceptAll: 'सभी स्वीकारें',
    rejectAll: 'सभी अस्वीकारें',
    chooseIndividually: 'अलग-अलग चुनें',
    saveChoices: 'मेरी पसंद सहेजें',
    closeAndReject: 'वैकल्पिक कुकीज़ अस्वीकारें और बंद करें',
    necessary: 'अनिवार्य',
    necessaryHint: 'सेशन, सुरक्षा और आपकी कुकी पसंद। इन्हें बंद नहीं किया जा सकता।',
    analytics: 'Analytics',
    analyticsHint: 'कुल पेज व्यू, ताकि हमें पता चले कि किन लेखों पर और काम करना चाहिए।',
    advertising: 'विज्ञापन',
    advertisingHint:
      'विज्ञापन मापन और वैयक्तिकरण। विज्ञापन तभी लोड होते हैं जब यह चालू हो।',
  },

  error: {
    notFoundTitle: 'पृष्ठ नहीं मिला',
    notFoundBody:
      'यह पृष्ठ मौजूद नहीं है। हो सकता है यह हटा दिया गया हो, या लिंक में कोई त्रुटि हो।',
    genericTitle: 'कुछ गड़बड़ हुई',
    genericBody: 'एक अनपेक्षित त्रुटि हुई। आमतौर पर पेज रीलोड करने से ठीक हो जाता है।',
    tryAgain: 'फिर से कोशिश करें',
  },

  ads: {
    label: 'विज्ञापन',
    declined: 'आपने विज्ञापन कुकीज़ अस्वीकार की हैं, इसलिए विज्ञापन बंद हैं।',
    affiliateDisclosure:
      'इस लेख में एफ़िलिएट लिंक हैं। इनके ज़रिए खरीदने पर हमें कमीशन मिल सकता है, आपको कोई अतिरिक्त शुल्क नहीं लगता। इससे हमारी सिफ़ारिश कभी नहीं बदलती — देखें हमारा',
    affiliateDisclosureLink: 'एफ़िलिएट डिस्क्लोज़र',
  },

  language: {
    switchTo: 'इसमें बदलें',
    notAvailable: 'यह लेख अभी हिन्दी में उपलब्ध नहीं है।',
    readInstead: 'इसे अंग्रेज़ी में पढ़ें',
    availableIn: 'इसमें भी उपलब्ध',
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, hi }

/**
 * The dictionary for a locale.
 *
 * Synchronous and statically imported rather than a dynamic `import()`. Two
 * locales of plain strings are a few kilobytes; code-splitting them would add
 * an await to every Server Component render to save less than one image.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}

/**
 * "1 result" / "5 results", without an ICU runtime.
 *
 * Hindi pluralises like English for this case — one form for 1, another for
 * everything else — so a single helper covers both. A language with a dual or
 * a paucal form would need more, and this is where that would go.
 */
export function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString()} ${count === 1 ? one : many}`
}
