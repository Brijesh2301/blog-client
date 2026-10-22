import { siteConfig } from '@/config/site'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * STATIC PAGE CONTENT
 * ═════════════════════════════════════════════════════════════════════════════
 * The twelve non-article pages — about, contact, the legal set, and the
 * monetization-required ones.
 *
 * WHY THESE EXIST AT ALL
 * The sitemap has advertised all twelve since Phase 3. Every one of them 404ed.
 * A sitemap full of 404s is not a cosmetic problem: Search Console reports the
 * file as failing, the crawler spends budget on URLs that return nothing, and
 * the footer linked to several of them, so internal PageRank was flowing into
 * dead ends. Monetization is what forced the issue — AdSense review rejects
 * sites without a privacy policy, and the FTC requires a reachable affiliate
 * disclosure — but the bug predates it.
 *
 * WHY DATA RATHER THAN TWELVE page.tsx FILES
 * Twelve near-identical files drift. One renderer and one content module means
 * the heading hierarchy, metadata, `lastUpdated` handling and JSON-LD are
 * written once and are identical on every page. Adding a page is one entry.
 *
 * WHAT THIS IS NOT
 * Not legal advice, and the copy says so where it matters. The policies
 * describe what this codebase actually does — the cookies it sets, the
 * processors it uses — which is the part a template cannot get right and the
 * part a regulator actually asks about.
 */

export type PageSection = {
  heading: string
  /** Paragraphs. Plain text; no markup is interpreted. */
  body: string[]
  /** Optional bullet list rendered after the paragraphs. */
  list?: string[]
}

export type StaticPage = {
  slug: string
  title: string
  description: string
  /** Shown under the h1. One sentence. */
  intro: string
  /**
   * ISO date. Legal pages must show when they last changed — "last updated"
   * is the first thing anyone checks, and a policy with no date reads as
   * abandoned.
   */
  lastUpdated: string
  sections: PageSection[]
  /** Legal pages are indexable but low priority; none of them are noindex. */
  group: 'company' | 'legal' | 'commercial'
}

const UPDATED = '2026-10-09'
const BRAND = siteConfig.name
const DOMAIN = siteConfig.domain
const EMAIL = siteConfig.organization.email

export const STATIC_PAGES: StaticPage[] = [
  // ── Company ───────────────────────────────────────────────────────────────
  {
    slug: 'about',
    title: `About ${BRAND}`,
    description: `${BRAND} publishes deeply researched engineering guides on web development, AI and performance — written by people who ship.`,
    intro: 'Engineering guides for people who ship, written by people who ship.',
    lastUpdated: UPDATED,
    group: 'company',
    sections: [
      {
        heading: 'What we publish',
        body: [
          `${BRAND} publishes long-form engineering guides about modern web development, AI engineering and performance. Every article is written against a working implementation — if we say a change moved a metric, we measured it.`,
          'We would rather publish one article a week that is right than five that are plausible. Most of what we write starts as a problem we hit ourselves.',
        ],
      },
      {
        heading: 'How we write',
        body: [
          'Every article carries a named author with a real background in the subject, a published date and a visible revision date. Where an article makes a measurable claim, it says how it was measured and on what hardware.',
          'We correct articles rather than quietly deleting them. A correction is noted inline with the date it was made.',
        ],
      },
      {
        heading: 'How we pay for it',
        body: [
          'Advertising, affiliate links and reader subscriptions. All three are disclosed where they appear: ads are labelled, affiliate links carry a disclosure above them and the sponsored attribute in their markup, and nothing we recommend depends on whether there is a commission attached.',
          `No article is sold. If an article were ever sponsored it would say so in the first screen, not in a footer. See our editorial policy and affiliate disclosure for the long version.`,
        ],
      },
      {
        heading: 'Contact',
        body: [`Corrections, questions and pitches: ${EMAIL}.`],
      },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact',
    description: `How to reach ${BRAND} about corrections, article pitches, advertising or legal notices.`,
    intro: 'Corrections, pitches, advertising and legal notices.',
    lastUpdated: UPDATED,
    group: 'company',
    sections: [
      {
        heading: 'General and corrections',
        body: [
          `${EMAIL} reaches the editorial team. If you have found a factual error, say which article and which claim — corrections are made quickly and noted inline, and we would rather hear about it from you than from a reader six months later.`,
        ],
      },
      {
        heading: 'Pitches',
        body: [
          'We commission from practitioners. A pitch that describes a problem you actually solved, with the numbers, is worth more than a polished outline of a topic you have read about.',
        ],
      },
      {
        heading: 'Advertising and partnerships',
        body: [`See the advertise page for formats and policy, then write to ${EMAIL}.`],
      },
      {
        heading: 'Legal',
        body: [
          `Copyright, privacy requests and DMCA notices should go to ${EMAIL} with the relevant page URL. See the DMCA page for what a complete notice needs to contain.`,
        ],
      },
    ],
  },
  {
    slug: 'resources',
    title: 'Resources',
    description: `Tools, references and reading that ${BRAND} actually uses — with honest notes on what each one is good and bad at.`,
    intro: 'Tools and references we actually use, with honest notes on each.',
    lastUpdated: UPDATED,
    group: 'company',
    sections: [
      {
        heading: 'How this list works',
        body: [
          'Everything here is something used in production or in writing the articles on this site. Where a link earns a commission it is marked, and the disclosure appears above it. A commission has never put anything on this list and never will.',
          'Entries are removed when they stop being the right answer. A resources page that only grows is a resources page nobody maintains.',
        ],
      },
      {
        heading: 'Measurement',
        body: [
          'Performance claims on this site are measured, not estimated. These are the tools used for that.',
        ],
        list: [
          'Chrome DevTools, throttled to Slow 4G and 4x CPU — the baseline every performance number here is taken against.',
          'The Chrome User Experience Report, for field data rather than lab data. Lab numbers are a hypothesis; CrUX is the answer.',
          'WebPageTest, when a waterfall from a real device somewhere else is the only way to see the problem.',
        ],
      },
      {
        heading: 'Reference',
        body: ['Primary sources, in the order we reach for them.'],
        list: [
          'MDN, for anything the platform does.',
          'The relevant specification, when MDN and reality disagree.',
          'The framework changelog, which is almost always more honest than the release blog post.',
        ],
      },
    ],
  },

  // ── Commercial ────────────────────────────────────────────────────────────
  {
    slug: 'advertise',
    title: 'Advertise',
    description: `Advertising formats, audience and editorial policy for sponsors on ${BRAND}.`,
    intro:
      'What we sell, what we do not, and what it costs you in trust if we get it wrong.',
    lastUpdated: UPDATED,
    group: 'commercial',
    sections: [
      {
        heading: 'Who reads this',
        body: [
          'Working engineers: people choosing a framework, chasing a performance regression, or deciding whether an AI feature is worth shipping. They are the hardest audience to reach with advertising because they are the quickest to leave a page that wastes their time.',
          'We publish real audience numbers to advertisers on request rather than on this page, because a number on a public page goes stale and then becomes a lie.',
        ],
      },
      {
        heading: 'Formats',
        body: ['Three, deliberately.'],
        list: [
          'Display units in defined positions, each in reserved space so they never shift the article. No interstitials, no pop-ups, nothing that covers the text.',
          'Newsletter placements — one per issue, clearly marked.',
          'Sponsored articles, written to the same editorial standard as everything else and labelled as sponsored in the first screen, in the title, and in the structured data.',
        ],
      },
      {
        heading: 'What we will not do',
        body: [
          'We do not sell links in editorial articles, we do not remove the sponsored attribute from paid links, and we do not let a sponsor review an unsponsored article before publication.',
          'This is not principle for its own sake. Paid links without disclosure are a manual-action risk for us and for the advertiser, and an audience of engineers notices the first time a recommendation reads like it was bought.',
        ],
      },
      {
        heading: 'Getting in touch',
        body: [`${EMAIL}, with the campaign, the timing and the budget range.`],
      },
    ],
  },
  {
    slug: 'newsletter',
    title: 'Newsletter',
    description: `One deeply researched engineering essay a week from ${BRAND}. Double opt-in, one-click unsubscribe, no cross-promotion.`,
    intro: 'One essay a week. Double opt-in, one click to leave, nothing sold.',
    lastUpdated: UPDATED,
    group: 'commercial',
    sections: [
      {
        heading: 'What arrives',
        body: [
          'One email a week containing one article. Not a digest, not a link roundup, not a summary of other people’s writing. If there is nothing worth sending in a given week, nothing is sent.',
        ],
      },
      {
        heading: 'How your address is handled',
        body: [
          'Double opt-in: subscribing sends a confirmation email, and nothing else is sent until you click it. That exists so nobody can subscribe you to this.',
          'Your address is stored to send the newsletter and for nothing else. It is never sold, never shared with advertisers, and never used to build a profile. Every issue carries a one-click unsubscribe link that works without a form or a login.',
        ],
      },
      {
        heading: 'Leaving',
        body: [
          'The unsubscribe link in any issue, or the unsubscribe page. Removal is immediate and there is no retention offer.',
        ],
      },
    ],
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  {
    slug: 'editorial-policy',
    title: 'Editorial policy',
    description: `How ${BRAND} researches, reviews, corrects and discloses — the standard every article is held to.`,
    intro:
      'The standard every article here is held to, and what happens when we miss it.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'Authorship',
        body: [
          'Every article has a named author with a real, checkable background in what they are writing about. Author pages list credentials and link to profiles elsewhere so the claim can be verified rather than taken on trust.',
          'We do not publish under invented personas, and we do not publish machine-generated articles under a human byline. Where a tool was used in research, the article says so.',
        ],
      },
      {
        heading: 'Evidence',
        body: [
          'A claim about behaviour is backed by a working example. A claim about performance is backed by a measurement, with the conditions stated — device, network throttling, and whether it is lab or field data.',
          'Where we are uncertain, the article says so in the sentence that makes the claim, not in a caveat at the end.',
        ],
      },
      {
        heading: 'Review and revision',
        body: [
          'Articles are reviewed before publication against a checklist that the publishing system itself enforces: an excerpt, a described cover image, a category, a focus keyword and a meta description are all required before an article can go live.',
          'Articles are revisited when the underlying technology changes. A revised article shows its revision date; a substantially rewritten one says what changed.',
        ],
      },
      {
        heading: 'Corrections',
        body: [
          'Factual errors are corrected and the correction is noted inline with its date. We do not silently edit a claim out of existence, because an article that changes without saying so is worse than one that was wrong.',
          `Report an error to ${EMAIL} with the URL and the claim.`,
        ],
      },
      {
        heading: 'Independence from commercial interests',
        body: [
          'Advertisers and affiliate partners have no input into editorial articles and no advance sight of them. Affiliate links never determine a recommendation, and removing a commission would not change any recommendation on this site.',
          'Sponsored articles are labelled as sponsored and are never presented as editorial.',
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy policy',
    description: `What ${BRAND} collects, why, who processes it, and the rights you have over it.`,
    intro: 'What we collect, why, who touches it, and how to make us stop.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'Who is responsible',
        body: [
          `${siteConfig.organization.legalName} operates ${DOMAIN} and is the data controller for the personal data described here. Contact: ${EMAIL}.`,
        ],
      },
      {
        heading: 'What we collect',
        body: ['Four things, and nothing else.'],
        list: [
          'Nothing at all, if you only read. Reading an article sets no identifying cookie and requires no account.',
          'Your email address, if you subscribe to the newsletter or create an account. Subscribing is double opt-in.',
          'Your name, email address and IP address, if you post a comment. The IP is kept for spam prevention and is not displayed.',
          'Aggregate analytics, only if you consent to analytics cookies. This is page-level and is not used to identify you.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'Strictly necessary cookies keep you signed in, protect forms against cross-site request forgery, and remember your cookie choice itself. These are set without consent because the site cannot function without them, which is the exemption they fall under.',
          'Analytics and advertising cookies are set only after you turn them on. They are off by default, and closing the cookie banner without choosing is treated as a refusal, not as consent.',
          'You can change or withdraw your choice at any time from the cookie settings link in the footer. See the cookie policy for the specific cookies in each category.',
        ],
      },
      {
        heading: 'Advertising',
        body: [
          'If you consent to advertising cookies, our advertising partner may set cookies to measure and personalise ads. We send Google Consent Mode signals reflecting your choice, so a refusal is respected by the ad stack and not just by this site.',
          'If you decline, ad slots stay empty. They still occupy their reserved space, because collapsing them would move the article under you.',
        ],
      },
      {
        heading: 'Who processes your data',
        body: [
          'We use third-party processors for hosting, email delivery, media storage and — with your consent — analytics and advertising. Each receives only what it needs to do its job.',
          'We do not sell personal data. We have never sold personal data, and the business model described on the advertise page does not require it.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: [
          'Newsletter addresses until you unsubscribe. Comments for as long as the article is published, or until you ask for removal. Consent choices for twelve months, after which we ask again. Server logs for thirty days.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'Under the GDPR and comparable laws you can ask for a copy of your data, ask us to correct or delete it, object to processing, and withdraw consent at any time without it being harder than giving it was.',
          `Write to ${EMAIL}. We answer within thirty days. If you are in the EEA or the UK and are not satisfied with our answer, you can complain to your national supervisory authority.`,
        ],
      },
      {
        heading: 'Children',
        body: [
          'This site is not directed at children under 16 and we do not knowingly collect their data.',
        ],
      },
    ],
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie policy',
    description: `Every cookie ${BRAND} sets, what it is for, how long it lasts, and how to turn it off.`,
    intro: 'Every cookie this site sets, what it does, and how to switch it off.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'Strictly necessary',
        body: [
          'Set without consent, because the site does not work without them. They identify a session, not a person, and none of them is used for advertising.',
        ],
        list: [
          'Session and refresh tokens, if you sign in. HttpOnly, so no script on this page can read them. Cleared when you sign out.',
          'A CSRF token, so a form submitted from another site cannot act as you.',
          'Your cookie choice itself. Without it we would have to ask on every page view.',
        ],
      },
      {
        heading: 'Analytics',
        body: [
          'Off until you turn them on. Used to count page views in aggregate so we know which articles are worth more of. Not used to identify you and not shared with advertisers.',
        ],
      },
      {
        heading: 'Advertising',
        body: [
          'Off until you turn them on. Used by our advertising partner to measure ad performance and, if you allow it, to personalise ads.',
          'Declining does not mean fewer ads loaded badly — it means no advertising script runs at all. The slot stays empty rather than loading a non-personalised ad.',
        ],
      },
      {
        heading: 'Changing your mind',
        body: [
          'The cookie settings link in the footer reopens the banner with your current choices. Withdrawing consent is exactly as easy as giving it, which is the legal standard and also just how it should work.',
          'Your choice is remembered for twelve months. After that we ask again, because consent given two years ago to a different set of partners is not consent to this one.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of use',
    description: `The terms under which ${BRAND} is made available, including comments, accounts and acceptable use.`,
    intro: 'The terms you agree to by using this site.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'Using the site',
        body: [
          `By using ${DOMAIN} you agree to these terms. If you do not, please do not use the site.`,
          'You may read, link to and quote articles with attribution. You may not republish them in full, or use them to train a model, without written permission.',
        ],
      },
      {
        heading: 'Accounts',
        body: [
          'You are responsible for what happens under your account and for keeping your password to yourself. Tell us promptly if you think it has been compromised.',
          'We may suspend an account that is used to post spam, abuse, or anything unlawful.',
        ],
      },
      {
        heading: 'Comments',
        body: [
          'You keep ownership of what you write, and you give us a non-exclusive licence to display it alongside the article it was posted on.',
          'Comments are moderated. Anything containing a link is held for review regardless of who posted it, because links are what comment spam exists to place. We may remove any comment, and we do not owe an explanation for removing spam.',
        ],
      },
      {
        heading: 'Accuracy and liability',
        body: [
          'Articles are written carefully and are still not a substitute for your own judgement about your own system. Technical guidance is provided as-is; what works on our hardware may not work on yours.',
          'To the extent the law allows, we are not liable for loss arising from acting on what you read here. Nothing in these terms limits liability that cannot lawfully be limited.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'We may update these terms. The revision date at the top of this page is when they last changed. Continuing to use the site after a change means accepting it.',
        ],
      },
    ],
  },
  {
    slug: 'affiliate-disclosure',
    title: 'Affiliate disclosure',
    description: `How ${BRAND} uses affiliate links, how they are marked, and why they never change a recommendation.`,
    intro: 'Some links here earn a commission. Here is exactly how that works.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'The short version',
        body: [
          'Some links on this site are affiliate links. If you buy through one, we may earn a commission at no extra cost to you. It does not change what we recommend, and it has never put anything on a recommendation list.',
        ],
      },
      {
        heading: 'How you can tell',
        body: [
          'Every article containing an affiliate link shows a disclosure above the first one — not in the footer, and not after the point where you would have clicked.',
          'In the markup, affiliate links carry rel="sponsored nofollow", which tells search engines the link is commercial. We do not remove that attribute for any partner, and a partner who asks us to is not a partner.',
        ],
      },
      {
        heading: 'How recommendations are made',
        body: [
          'We recommend what we use. Where a better tool has no affiliate programme and a worse one pays well, we recommend the better one and earn nothing — that has already happened more than once.',
          'If we have not used something, we say we have not used it rather than recommending it on a specification sheet.',
        ],
      },
      {
        heading: 'Programmes',
        body: [
          `We participate in affiliate programmes with vendors relevant to what we write about. Specific programmes are named in the article where their links appear, and questions are welcome at ${EMAIL}.`,
        ],
      },
    ],
  },
  {
    slug: 'disclaimer',
    title: 'Disclaimer',
    description: `The limits of what ${BRAND} articles are: technical guidance, not professional advice for your specific system.`,
    intro: 'What the articles here are, and what they are not.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'Technical guidance, not advice for your system',
        body: [
          'Articles describe approaches that worked in a stated context, with the measurements to back them. Your context is different: different data shapes, different traffic, different constraints. Test before you ship.',
          'Performance numbers are measured under the conditions each article states. Reproducing them requires reproducing those conditions.',
        ],
      },
      {
        heading: 'Not professional advice',
        body: [
          'Nothing here is legal, financial or security advice. Where an article touches those areas — a privacy requirement, a licence, a vulnerability class — treat it as a prompt to ask someone qualified, not as the answer.',
        ],
      },
      {
        heading: 'External links',
        body: [
          'We link to external sources because citing primary material is better than paraphrasing it. We do not control those sites and are not responsible for what they do after we link to them.',
        ],
      },
      {
        heading: 'Age of articles',
        body: [
          'Every article shows its published and revised dates. The ecosystem moves; an article from two years ago may describe a problem that no longer exists. The dates are there so you can judge that for yourself.',
        ],
      },
    ],
  },
  {
    slug: 'dmca',
    title: 'DMCA and copyright',
    description: `How to send ${BRAND} a copyright notice, what it must contain, and how counter-notices work.`,
    intro: 'How to report copyright infringement, and what a valid notice needs.',
    lastUpdated: UPDATED,
    group: 'legal',
    sections: [
      {
        heading: 'Our position',
        body: [
          'We respect copyright and expect the same. Articles here are original work; where we quote, we quote briefly and attribute. If we have got that wrong somewhere, tell us and we will fix it quickly.',
        ],
      },
      {
        heading: 'Sending a notice',
        body: [
          `Send copyright notices to ${EMAIL} with "DMCA" in the subject line. To be actionable a notice must include:`,
        ],
        list: [
          'Identification of the copyrighted work you say has been infringed.',
          'The exact URL on this site where the material appears.',
          'Your contact details — name, address and email.',
          'A statement that you believe in good faith that the use is not authorised by the owner, its agent, or the law.',
          'A statement, under penalty of perjury, that the information is accurate and that you are the owner or authorised to act for them.',
          'Your physical or electronic signature.',
        ],
      },
      {
        heading: 'What happens next',
        body: [
          'Material that is the subject of a valid notice is removed or disabled promptly, and whoever posted it is told why.',
          'Sending a notice in bad faith has consequences for the sender. Please be sure before you send one.',
        ],
      },
      {
        heading: 'Counter-notice',
        body: [
          'If your material was removed and you believe that was a mistake or a misidentification, send a counter-notice to the same address with your contact details, identification of the removed material and where it appeared, and a statement under penalty of perjury to that effect.',
        ],
      },
    ],
  },
]

export function getStaticPage(slug: string): StaticPage | undefined {
  return STATIC_PAGES.find((page) => page.slug === slug)
}

/** Every slug, for `generateStaticParams` and for the sitemap to agree with. */
export const STATIC_PAGE_SLUGS = STATIC_PAGES.map((page) => page.slug)
