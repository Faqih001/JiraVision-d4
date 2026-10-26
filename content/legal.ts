// Data-driven content for the five legal/utility documents.
// All substantive legal copy is preserved VERBATIM from the previous page files;
// only structure (section ids, headings, paragraphs) was introduced. Headings that
// carry an "Introduction" or "Questions and assistance" label are structural scaffolding
// added around untouched body text — no legal meaning was rewritten.

export interface LegalSection {
  /** Stable anchor id used by the TOC links and deep links. */
  id: string
  /** Section heading (numbering is added by the renderer). */
  heading: string
  /** Body paragraphs, verbatim. Use "\n" inside a string for hard line breaks. */
  paragraphs: string[]
  /** Optional bullet list (e.g. data categories, features). */
  bullets?: LegalBullet[]
  /** Optional h3-level subsections (kept from the original markup). */
  subsections?: { heading: string; paragraphs: string[]; bullets?: LegalBullet[] }[]
}

/** A bullet is plain text, or text that wraps/contains a link. */
export type LegalBullet =
  | string
  | {
      /** Text rendered before the link; when `linkLabel` is omitted this string is the link label. */
      text: string
      linkLabel?: string
      href: string
      external?: boolean
    }

// NOTE(PLACEHOLDER): "last reviewed" date is a placeholder carried over from the previous
// site copy. OWNER MUST CONFIRM the real review date before publishing — this is not the
// same field as the per-document "last updated" stamp.
export const legalLastReviewed = "May 1, 2025"

export const legalDocLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Legal Notice", href: "/legal-notice" },
  { label: "Accessibility Statement", href: "/accessibility" },
]

const currentYear = new Date().getFullYear()

/* ------------------------------------------------------------------ */
/* Terms of Service                                                    */
/* ------------------------------------------------------------------ */

export const termsDoc: {
  title: string
  lastUpdated: string
  closingNote: string
  sections: LegalSection[]
} = {
  title: "Terms of Service",
  lastUpdated: "May 1, 2025",
  closingNote: "If you have any questions about our Terms of Service, please contact our legal team.",
  sections: [
    {
      id: "introduction",
      heading: "Introduction",
      paragraphs: [
        'Welcome to JiraVision. These Terms of Service ("Terms") govern your access to and use of JiraVision\'s website, products, and services ("Services"). Please read these Terms carefully, and contact us if you have any questions.',
      ],
    },
    {
      id: "acceptance-of-terms",
      heading: "Acceptance of Terms",
      paragraphs: [
        "By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you are using our Services on behalf of an organization, you are agreeing to these Terms on behalf of that organization.",
      ],
    },
    {
      id: "description-of-services",
      heading: "Description of Services",
      paragraphs: [
        "JiraVision provides AI-powered project management tools designed to improve team collaboration, wellbeing, and productivity. Our Services include, but are not limited to, AI Scrum Master, Team Wellbeing, Gamification Suite, and Ethical Metrics.",
      ],
    },
    {
      id: "your-account",
      heading: "Your Account",
      paragraphs: [
        "To use our Services, you may need to create an account. You are responsible for safeguarding your account and for all activities that occur under your account. You must provide accurate and complete information when creating your account and keep your account information updated.",
      ],
    },
    {
      id: "subscription-and-payments",
      heading: "Subscription and Payments",
      paragraphs: [
        "Some of our Services require payment. When you subscribe to a paid Service, you agree to pay the subscription fees as described at the time of purchase. Subscription fees are billed in advance and are non-refundable except as required by law or as explicitly stated in these Terms.",
      ],
    },
    {
      id: "data-and-privacy",
      heading: "Data and Privacy",
      paragraphs: [
        "Our Privacy Policy describes how we handle the information you provide to us when you use our Services. By using our Services, you consent to our collection and use of your data as described in our Privacy Policy.",
      ],
    },
    {
      id: "intellectual-property-rights",
      heading: "Intellectual Property Rights",
      paragraphs: [
        "JiraVision and its licensors own all intellectual property rights in the Services. You may not copy, modify, distribute, sell, or lease any part of our Services without our permission.",
      ],
    },
    {
      id: "user-content",
      heading: "User Content",
      paragraphs: [
        "Our Services may allow you to upload, submit, store, send, or receive content. You retain ownership of any intellectual property rights that you hold in that content. By uploading content to our Services, you grant JiraVision a worldwide license to use, host, store, reproduce, modify, create derivative works, communicate, publish, publicly perform, publicly display, and distribute such content.",
      ],
    },
    {
      id: "termination",
      heading: "Termination",
      paragraphs: [
        "We may suspend or terminate your access to the Services at any time for any reason, including if you violate these Terms. You may terminate your account at any time by following the instructions on our website.",
      ],
    },
    {
      id: "disclaimers",
      heading: "Disclaimers",
      paragraphs: [
        'THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. JIRAVISION DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED OR ERROR-FREE.',
      ],
    },
    {
      id: "limitation-of-liability",
      heading: "Limitation of Liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, JIRAVISION SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.",
      ],
    },
    {
      id: "changes-to-terms",
      heading: "Changes to Terms",
      paragraphs: [
        "We may modify these Terms from time to time. We will notify you of material changes by posting the new Terms on our website or sending you an email. Your continued use of the Services after the effective date of the revised Terms constitutes your acceptance of the changes.",
      ],
    },
    {
      id: "governing-law",
      heading: "Governing Law",
      paragraphs: [
        "These Terms shall be governed by the laws of the State of California, without regard to its conflict of law provisions.",
      ],
    },
    {
      id: "contact-information",
      heading: "Contact Information",
      paragraphs: ["If you have any questions about these Terms, please contact us at legal@jiravision.com."],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Privacy Policy                                                      */
/* ------------------------------------------------------------------ */

export const privacyDoc: {
  title: string
  lastUpdated: string
  closingNote: string
  sections: LegalSection[]
} = {
  title: "Privacy Policy",
  lastUpdated: "May 1, 2025",
  closingNote:
    "If you have any questions about our Privacy Policy or how we handle your data, please contact our privacy team.",
  sections: [
    {
      id: "introduction",
      heading: "Introduction",
      paragraphs: [
        'At JiraVision, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, products, and services ("Services").',
      ],
    },
    {
      id: "information-we-collect",
      heading: "Information We Collect",
      paragraphs: [
        "We collect information that you provide directly to us, information we collect automatically when you use our Services, and information from third-party sources.",
      ],
      subsections: [
        {
          heading: "Information You Provide",
          paragraphs: [
            "We collect information you provide when you create an account, fill out forms, communicate with us, or otherwise use our Services. This may include:",
          ],
          bullets: [
            "Personal information (name, email address, phone number)",
            "Account credentials",
            "Payment information",
            "Profile information",
            "Content you upload or share through our Services",
          ],
        },
        {
          heading: "Information We Collect Automatically",
          paragraphs: ["When you use our Services, we automatically collect certain information, including:"],
          bullets: [
            "Device information (IP address, browser type, operating system)",
            "Usage information (pages visited, time spent on pages)",
            "Location information",
            "Cookies and similar technologies",
          ],
        },
      ],
    },
    {
      id: "how-we-use-your-information",
      heading: "How We Use Your Information",
      paragraphs: ["We use the information we collect for various purposes, including:"],
      bullets: [
        "Providing, maintaining, and improving our Services",
        "Processing transactions and managing your account",
        "Communicating with you about our Services",
        "Personalizing your experience",
        "Analyzing usage patterns and trends",
        "Protecting against fraud and abuse",
        "Complying with legal obligations",
      ],
    },
    {
      id: "sharing-of-information",
      heading: "Sharing of Information",
      paragraphs: ["We may share your information with:"],
      bullets: [
        "Service providers who perform services on our behalf",
        "Business partners with your consent",
        "In response to legal requests or to protect our rights",
        "In connection with a merger, sale, or acquisition",
      ],
    },
    {
      id: "data-security",
      heading: "Data Security",
      paragraphs: [
        "We implement appropriate technical and organizational measures to protect your information from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.",
      ],
    },
    {
      id: "data-retention",
      heading: "Data Retention",
      paragraphs: [
        "We retain your information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements.",
      ],
    },
    {
      id: "your-rights-and-choices",
      heading: "Your Rights and Choices",
      paragraphs: [
        "Depending on your location, you may have certain rights regarding your personal information, including:",
      ],
      bullets: [
        "Accessing, correcting, or deleting your information",
        "Objecting to or restricting certain processing",
        "Data portability",
        "Withdrawing consent",
      ],
    },
    {
      id: "childrens-privacy",
      heading: "Children's Privacy",
      paragraphs: [
        "Our Services are not directed to children under 16, and we do not knowingly collect personal information from children under 16.",
      ],
    },
    {
      id: "international-data-transfers",
      heading: "International Data Transfers",
      paragraphs: [
        "Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information.",
      ],
    },
    {
      id: "changes-to-this-privacy-policy",
      heading: "Changes to This Privacy Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on our website or sending you an email.",
      ],
    },
    {
      id: "contact-us",
      heading: "Contact Us",
      paragraphs: ["If you have any questions about this Privacy Policy, please contact us at privacy@jiravision.com."],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Cookie Policy                                                       */
/* ------------------------------------------------------------------ */

export const cookiesDoc: {
  title: string
  lastUpdated: string
  closingNote: string
  sections: LegalSection[]
} = {
  title: "Cookie Policy",
  lastUpdated: "October 25, 2026",
  closingNote: "If you have any questions about our Cookie Policy, please contact our privacy team.",
  sections: [
    {
      id: "introduction",
      heading: "Introduction",
      paragraphs: [
        'This Cookie Policy explains how JiraVision ("we", "us", or "our") uses cookies and similar technologies on our website and services. This policy is part of our Privacy Policy.',
      ],
    },
    {
      id: "what-are-cookies",
      heading: "What Are Cookies?",
      paragraphs: [
        "Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.",
      ],
    },
    {
      id: "types-of-cookies",
      heading: "Types of Cookies We Use",
      paragraphs: ["We use the following types of cookies:"],
    },
    {
      id: "essential-cookies",
      heading: "Essential Cookies",
      paragraphs: [
        "These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas of the website. The website cannot function properly without these cookies.",
      ],
    },
    {
      id: "performance-cookies",
      heading: "Performance Cookies",
      paragraphs: [
        "These cookies collect information about how visitors use our website, such as which pages they visit most often and if they receive error messages. These cookies don't collect information that identifies a visitor.",
      ],
    },
    {
      id: "functionality-cookies",
      heading: "Functionality Cookies",
      paragraphs: [
        "These cookies allow the website to remember choices you make (such as your username, language, or region) and provide enhanced, more personal features.",
      ],
    },
    {
      id: "targeting-cookies",
      heading: "Targeting Cookies",
      paragraphs: [
        "These cookies are used to deliver advertisements that are more relevant to you and your interests. They are also used to limit the number of times you see an advertisement and help measure the effectiveness of advertising campaigns.",
      ],
    },
    {
      id: "third-party-cookies",
      heading: "Third-Party Cookies",
      paragraphs: [
        "Some cookies are placed by third parties on our website. These third parties may include analytics providers, advertising networks, and social media platforms. These third parties may use cookies, web beacons, and similar technologies to collect information about your use of our website and other websites.",
      ],
    },
    {
      id: "translation-by-google",
      heading: "Translation by Google",
      paragraphs: [
        "The footer offers a Translate control powered by Google Translate. It stays inactive until you choose a language: only then does your browser load Google's script, which reads the text of the page and stores the translation in a googtrans cookie on this domain.",
        "The signed-in workspace puts the language dropdown itself in its top bar, so Google's script is requested as soon as a workspace page is opened there. It is the same script and the same cookie, and the control can be dismissed the same way.",
        "Your language choice is also remembered locally (jv-translate-lang) so the site comes back in the same language. Choosing \"Show original\" clears both and reloads the page in English.",
        "Machine translation is a convenience, not a guarantee. The English text remains the authoritative version of any legal or product statement.",
      ],
    },
    {
      id: "preferences-stored-on-your-device",
      heading: "Preferences Stored on Your Device",
      paragraphs: [
        "Several choices are saved in your browser's local storage instead of being sent to us, so the site can honour them before it paints:",
      ],
      bullets: [
        "jv-consent-v1 — your cookie category choice",
        "jv-accessibility-v1 — the adjustments selected in the accessibility menu (text size, contrast, colour, motion, reading aids)",
        "jv-translate-lang — the translation language, if you use the Translate control",
        "jv-announcement-dismissed — whether you closed the announcement bar",
        "theme — your light or dark theme choice",
      ],
    },
    {
      id: "how-to-manage-cookies",
      heading: "How to Manage Cookies",
      paragraphs: [
        'Most web browsers allow you to control cookies through their settings. You can usually find these settings in the "Options" or "Preferences" menu of your browser. You can also use the "Help" feature in your browser for more information.',
        "Please note that if you disable or delete certain cookies, some features of our website may not function properly.",
      ],
    },
    {
      id: "changes-to-this-cookie-policy",
      heading: "Changes to This Cookie Policy",
      paragraphs: [
        "We may update this Cookie Policy from time to time. We will notify you of material changes by posting the new Cookie Policy on our website.",
      ],
    },
    {
      id: "contact-us",
      heading: "Contact Us",
      paragraphs: ["If you have any questions about this Cookie Policy, please contact us at privacy@jiravision.com."],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Legal Notice                                                        */
/* ------------------------------------------------------------------ */

export const legalNoticeDoc: {
  title: string
  lastUpdated: string
  closingNote: string
  sections: LegalSection[]
} = {
  title: "Legal Notice",
  lastUpdated: "May 1, 2025",
  closingNote: "If you have any questions about our Legal Notice, please contact our legal team.",
  sections: [
    {
      id: "company-information",
      heading: "Company Information",
      paragraphs: [
        "JiraVision, Inc.\n123 Innovation Way\nSan Francisco, CA 94107\nUnited States",
        "Email: legal@jiravision.com\nPhone: +254 741 140 250",
        "Registered in Delaware\nCompany Registration Number: 12345678\nVAT ID: US123456789",
      ],
    },
    {
      id: "legal-representatives",
      heading: "Legal Representatives",
      paragraphs: ["Michael Chen, Chief Executive Officer\nSarah Johnson, Chief Technology Officer"],
    },
    {
      id: "regulatory-information",
      heading: "Regulatory Information",
      paragraphs: [
        "JiraVision is registered with the U.S. Securities and Exchange Commission (SEC) and complies with all applicable laws and regulations in the jurisdictions where it operates.",
      ],
    },
    {
      id: "copyright-notice",
      heading: "Copyright Notice",
      paragraphs: [
        `© ${currentYear} JiraVision, Inc. All rights reserved. The text, images, graphics, sound files, animation files, video files, and their arrangement on JiraVision websites are all subject to copyright and other intellectual property protection. These objects may not be copied for commercial use or distribution, nor may these objects be modified or reposted to other sites without explicit written permission.`,
      ],
    },
    {
      id: "trademarks",
      heading: "Trademarks",
      paragraphs: [
        "JiraVision™, the JiraVision logo, and all product names mentioned on this website are trademarks or registered trademarks of JiraVision, Inc. or its subsidiaries. Other product and company names mentioned herein may be trademarks of their respective owners.",
      ],
    },
    {
      id: "disclaimer",
      heading: "Disclaimer",
      paragraphs: [
        "The information provided on this website is for general informational purposes only. While we strive to keep the information up to date and correct, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, suitability, or availability with respect to the website or the information, products, services, or related graphics contained on the website for any purpose.",
        "In no event will we be liable for any loss or damage including without limitation, indirect or consequential loss or damage, or any loss or damage whatsoever arising from loss of data or profits arising out of, or in connection with, the use of this website.",
      ],
    },
    {
      id: "external-links",
      heading: "External Links",
      paragraphs: [
        "This website may contain links to external websites that are not provided or maintained by or in any way affiliated with JiraVision. Please note that JiraVision does not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites.",
      ],
    },
    {
      id: "governing-law",
      heading: "Governing Law",
      paragraphs: [
        "These terms and conditions are governed by and construed in accordance with the laws of the State of California, and any disputes relating to these terms and conditions will be subject to the exclusive jurisdiction of the courts of San Francisco, California.",
      ],
    },
    {
      id: "changes-to-legal-notice",
      heading: "Changes to Legal Notice",
      paragraphs: [
        "JiraVision reserves the right to make changes to this Legal Notice at any time. We encourage visitors to frequently check this page for any changes. Your continued use of this website after any changes are made constitutes your acceptance of the new Legal Notice.",
      ],
    },
  ],
}

/* ------------------------------------------------------------------ */
/* Accessibility Statement                                             */
/* ------------------------------------------------------------------ */

export const accessibilityDoc: {
  title: string
  lastUpdated: string
  closingNote: string
  sections: LegalSection[]
} = {
  title: "Accessibility Statement",
  lastUpdated: "October 25, 2026",
  // The closing sentence now lives as the "Questions and Assistance" section, so the
  // standalone closing band stays empty to avoid rendering it twice.
  closingNote: "",
  sections: [
    {
      id: "introduction",
      heading: "Introduction",
      paragraphs: [
        "JiraVision is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.",
      ],
    },
    {
      id: "our-commitment",
      heading: "Our Commitment",
      paragraphs: [
        "We strive to ensure that our website and services are accessible to all users, regardless of ability or technology. Our goal is to meet and exceed the requirements of the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.",
      ],
    },
    {
      id: "conformance-status",
      heading: "Conformance Status",
      paragraphs: [
        "The Web Content Accessibility Guidelines (WCAG) define requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.",
        "JiraVision is partially conformant with WCAG 2.1 level AA. Partially conformant means that some parts of the content do not fully conform to the accessibility standard.",
      ],
    },
    {
      id: "accessibility-features",
      heading: "Accessibility Features",
      paragraphs: ["Our website includes the following accessibility features:"],
      bullets: [
        "An accessibility menu on every page (bottom-left), with profiles for visual impairment, seizure and epilepsy risk, colour vision deficiency, ADHD and learning differences",
        "From the same menu: text size, line height and letter spacing, readable font, heading/link/button highlighting, image hiding, control tooltips, read-aloud, stop animations, eight contrast and colour modes (one at a time), a reading guide, a reading mask and enlarged cursors",
        "Translation of the whole site into any language Google Translate supports, from the footer",
        "Semantic HTML to ensure proper structure and navigation",
        "ARIA landmarks to identify regions of the page",
        "Alt text for images",
        "Keyboard navigation",
        "Color contrast that meets WCAG 2.1 AA standards",
        "Resizable text without loss of functionality",
        "Focus indicators for keyboard navigation",
      ],
    },
    {
      id: "known-limitations",
      heading: "Known Limitations",
      paragraphs: ["Despite our best efforts, there may be some aspects of our website that are not fully accessible:"],
      bullets: [
        "Some older PDF documents may not be fully accessible",
        "Some third-party content may not be fully accessible",
        "Some interactive elements may not be fully accessible via keyboard navigation",
      ],
    },
    {
      id: "feedback",
      heading: "Feedback",
      paragraphs: [
        "We welcome your feedback on the accessibility of JiraVision. Please let us know if you encounter accessibility barriers:",
        "We try to respond to feedback within 3 business days.",
      ],
      bullets: [
        "Email: accessibility@jiravision.com",
        "Phone: +254 741 140 250",
        { text: "Contact form:", linkLabel: "Contact Us", href: "/contact" },
      ],
    },
    {
      id: "assessment-and-remediation",
      heading: "Assessment and Remediation",
      paragraphs: [
        "JiraVision assesses the accessibility of our website regularly. We address accessibility issues as they are identified and prioritize fixes based on severity and impact.",
      ],
    },
    {
      id: "additional-resources",
      heading: "Additional Resources",
      paragraphs: ["For more information about web accessibility, please visit:"],
      bullets: [
        {
          text: "Web Content Accessibility Guidelines (WCAG)",
          href: "https://www.w3.org/WAI/standards-guidelines/wcag/",
          external: true,
        },
        { text: "Web Accessibility Initiative (WAI)", href: "https://www.w3.org/WAI/", external: true },
      ],
    },
    {
      id: "questions-and-assistance",
      heading: "Questions and Assistance",
      paragraphs: [
        "If you have any questions about our accessibility efforts or need assistance, please contact our accessibility team.",
      ],
    },
  ],
}
