import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Postly",
  description: "Terms of Service for Postly, the custom SMTP email client.",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    items: [
      "You are at least 13 years of age, or the minimum age required in your jurisdiction.",
      "You have the legal capacity to enter into a binding agreement.",
      "You have read, understood, and agree to be bound by these Terms and our Privacy Policy.",
      "If you are using Postly on behalf of an organization, you have authority to bind that organization.",
    ],
  },
  {
    title: "2. Description of Service",
    items: [
      "Postly is a web-based email client that lets users send emails using their own custom SMTP server credentials.",
      "Postly does not provide email hosting and does not operate SMTP servers on behalf of users.",
    ],
  },
  {
    title: "3. Account Registration and Security",
    subsections: [
      {
        title: "3.1 Account Creation",
        items: [
          "You must create an account with a valid email address and password.",
          "You agree to provide accurate, current, and complete information and keep it updated.",
        ],
      },
      {
        title: "3.2 Account Security",
        items: [
          "You are solely responsible for the confidentiality of your credentials and all activity under your account.",
          "Choose a strong, unique password and keep it confidential.",
          "Do not share your credentials with any third party.",
          "Notify us immediately at vt.gowreesh43@gmail.com if you suspect unauthorized access.",
          "Log out at the end of each session, especially on shared devices.",
        ],
      },
    ],
  },
  {
    title: "4. SMTP Credentials and Email Sending",
    subsections: [
      {
        title: "4.1 Your SMTP Credentials",
        items: [
          "You must provide your own valid SMTP server credentials.",
          "You represent that you have the legal right and authorization to use the credentials you provide.",
          "The SMTP account belongs to you or you have explicit permission from the account owner to use it.",
          "You will comply with your SMTP provider's terms and acceptable use policies.",
        ],
      },
      {
        title: "4.2 Responsibility for Email Content",
        items: [
          "You are solely responsible for all emails sent through Postly using your account and credentials.",
          "Postly acts as a technical conduit only and does not review or endorse your email content.",
        ],
      },
    ],
  },
  {
    title: "5. Acceptable Use Policy",
    intro: "You agree to use Postly only for lawful purposes and in a manner that does not infringe the rights of others. You must not use Postly to:",
    items: [
      "Send spam, unsolicited bulk email, or messages that violate applicable anti-spam laws.",
      "Send phishing emails, fraudulent messages, or impersonate any person or organization.",
      "Distribute malware, viruses, ransomware, or any other malicious code.",
      "Harass, threaten, defame, or abuse any individual.",
      "Send content that is illegal, obscene, defamatory, or infringes intellectual property rights.",
      "Conduct or facilitate unauthorized access to computer systems or networks.",
      "Engage in activity that violates applicable laws or regulations.",
      "Probe, scan, or test the vulnerability of Postly or related systems.",
      "Overburden, disrupt, or impair the integrity or performance of the Service.",
    ],
    outro: "We may suspend or terminate your account immediately if we determine you violated this policy.",
  },
  {
    title: "6. Intellectual Property",
    subsections: [
      {
        title: "6.1 Our Intellectual Property",
        items: [
          "Postly and its content, features, functionality, trademarks, logos, and software are owned by the operator of https://gowreesh.me .",
          "You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service for its intended purpose.",
        ],
      },
      {
        title: "6.2 Your Content",
        items: [
          "You retain all rights in the emails and content you create and send through Postly.",
          "You grant us a limited, temporary license to process your content solely to provide the Service.",
        ],
      },
    ],
  },
  {
    title: "7. Privacy",
    content: [
      "Your use of Postly is subject to our Privacy Policy, which is incorporated into these Terms by reference.",
      "Review our Privacy Policy at https://https://gowreesh.me /privacy-policy to understand how we collect and use personal information.",
    ],
  },
  {
    title: "8. Third-Party Services",
    content: [
      "Postly may integrate with or depend on third-party services such as cloud hosting providers.",
      "We are not responsible for the availability, accuracy, or practices of any third-party services.",
      "Links or references to third-party websites or services do not constitute endorsement.",
    ],
  },
  {
    title: "9. Disclaimers and Limitation of Liability",
    subsections: [
      {
        title: "9.1 Disclaimer of Warranties",
        items: [
          "The Service is provided on an as-is and as-available basis without warranties of any kind.",
          "We do not warrant uninterrupted or error-free operation, or that the Service will be free of harmful components.",
        ],
      },
      {
        title: "9.2 Limitation of Liability",
        items: [
          "To the maximum extent permitted by law, Postly and its operators are not liable for indirect, incidental, special, consequential, or punitive damages.",
          "This includes loss of data, emails, business information, unauthorized access to SMTP credentials, or email transmission errors.",
          "Our total liability for claims arising from these Terms or your use of the Service will not exceed the amount you paid us, if any, in the preceding twelve months.",
        ],
      },
    ],
  },
  {
    title: "10. Indemnification",
    items: [
      "You agree to indemnify and hold harmless Postly and its operators from claims, liabilities, damages, losses, and expenses arising from your use of the Service.",
      "This includes claims related to your violation of these Terms, third-party rights, emails you send through Postly, or applicable laws and regulations.",
    ],
  },
  {
    title: "11. Termination",
    subsections: [
      {
        title: "11.1 Termination by You",
        items: [
          "You may terminate your account at any time by discontinuing use of the Service and, if applicable, requesting account deletion.",
          "We will process deletion requests within 30 days.",
        ],
      },
      {
        title: "11.2 Termination by Us",
        items: [
          "We may suspend or terminate your account at any time, with or without cause and with or without notice.",
          "This may occur if we reasonably believe you violated the Terms, used the account for abusive or illegal activity, or pose a risk to us, other users, or third parties.",
        ],
      },
      {
        title: "11.3 Effect of Termination",
        items: [
          "Upon termination, your right to use the Service immediately ceases.",
          "Some provisions of these Terms survive termination, including intellectual property, disclaimers, limitation of liability, and indemnification.",
        ],
      },
    ],
  },
  {
    title: "12. Modifications to the Service and Terms",
    subsections: [
      {
        title: "12.1 Service Changes",
        items: [
          "We may modify, suspend, or discontinue any aspect of the Service at any time, including features, availability, and pricing, with or without notice.",
        ],
      },
      {
        title: "12.2 Changes to Terms",
        items: [
          "We may update these Terms from time to time.",
          "When we make material changes, we will update the Last Updated date and notify you by email or a prominent notice at least 14 days before the new Terms take effect.",
          "Your continued use of Postly after the effective date constitutes acceptance of the updated Terms.",
        ],
      },
    ],
  },
  {
    title: "13. Governing Law and Dispute Resolution",
    content: [
      "These Terms are governed by the laws of India, without regard to conflict of law principles.",
      "Disputes should first be addressed through good-faith negotiation.",
      "If a dispute cannot be resolved within 30 days, it may be submitted to binding arbitration or the competent courts of jurisdiction in India, as required by applicable law.",
    ],
  },
  {
    title: "14. General Provisions",
    subsections: [
      {
        title: "14.1 Entire Agreement",
        items: [
          "These Terms, together with our Privacy Policy, constitute the entire agreement between you and Postly.",
        ],
      },
      {
        title: "14.2 Severability",
        items: [
          "If any provision is found unenforceable or invalid, it will be modified to the minimum extent necessary and the remaining provisions will continue in full force and effect.",
        ],
      },
      {
        title: "14.3 No Waiver",
        items: [
          "Failure to enforce any right or provision is not a waiver of that right or provision.",
        ],
      },
      {
        title: "14.4 Assignment",
        items: [
          "You may not assign or transfer these Terms without our prior written consent.",
          "We may assign our rights and obligations without restriction.",
        ],
      },
      {
        title: "14.5 Force Majeure",
        items: [
          "We are not liable for performance failures or delays caused by events beyond our reasonable control, including outages, disasters, war, government action, or third-party service failures.",
        ],
      },
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-6 shadow-2xl shadow-black/40 sm:p-10">
          <div className="space-y-4 border-b border-zinc-900 pb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Postly</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Terms of Service</h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Effective Date: May 29, 2026 · Last Updated: May 29, 2026
            </p>
            <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              These Terms govern your access to and use of Postly, a custom SMTP email client
              available at https://postly.gowreesh.me . By using the service, you agree to these Terms.
            </p>
          </div>

          <div className="space-y-10 pt-8">
            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                {"intro" in section && section.intro ? (
                  <p className="text-sm leading-7 text-zinc-300 sm:text-base">{section.intro}</p>
                ) : null}

                {"items" in section && section.items ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300 sm:text-base">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                {"subsections" in section && section.subsections ? (
                  <div className="space-y-5">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.title} className="space-y-2">
                        <h3 className="text-lg font-semibold text-zinc-200">{subsection.title}</h3>
                        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300 sm:text-base">
                          {subsection.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}

                {"outro" in section && section.outro ? (
                  <p className="text-sm leading-7 text-zinc-300 sm:text-base">{section.outro}</p>
                ) : null}
              </section>
            ))}

            <section className="space-y-4 rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5">
              <h2 className="text-2xl font-bold text-white">15. Contact Us</h2>
              <p className="text-sm leading-7 text-zinc-300 sm:text-base">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-sm leading-7 text-zinc-300 sm:text-base">
                <p><span className="font-semibold text-white">Website:</span> <a className="text-primary hover:underline" href="https://https://gowreesh.me " target="_blank" rel="noreferrer">https://https://gowreesh.me </a></p>
                <p><span className="font-semibold text-white">Email:</span> <a className="text-primary hover:underline" href="mailto:vt.gowreesh43@gmail.com">vt.gowreesh43@gmail.com</a></p>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-zinc-900 pt-6 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <p>We aim to respond to all inquiries within 5 business days.</p>
              <Link href="/" className="text-primary hover:underline">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}