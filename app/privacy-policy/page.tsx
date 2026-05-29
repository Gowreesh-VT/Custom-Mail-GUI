import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Postly",
  description: "Privacy policy for Postly, the custom SMTP email client.",
};

const sections = [
  {
    title: "1. Information We Collect",
    items: [
      {
        title: "Information you provide directly",
        content: [
          "Account credentials such as your email address and password.",
          "SMTP configuration details including hostname, port, username, and authentication credentials.",
          "Email content you compose and send, including recipient addresses, subject lines, and message bodies.",
          "Messages you send to us for support or feedback.",
        ],
      },
      {
        title: "Information collected automatically",
        content: [
          "Log data such as IP address, browser type and version, operating system, referring URLs, pages visited, and timestamps.",
          "Device information including hardware model, operating system version, and unique device identifiers.",
          "Usage data such as features used, actions taken in the app, and error or crash reports.",
        ],
      },
      {
        title: "Cookies and tracking technologies",
        content: [
          "Session cookies and similar technologies may be used to keep you signed in and improve your experience.",
          "We do not use third-party advertising cookies or tracking pixels.",
        ],
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: [
      "To provide, operate, and maintain the Postly service and your account.",
      "To authenticate your identity and process SMTP email sending requests.",
      "To monitor usage patterns and improve performance, reliability, and features.",
      "To detect, prevent, and address technical issues, abuse, and security threats.",
      "To respond to support inquiries, comments, and feedback.",
      "To send service-related notices, including security alerts and policy updates.",
      "To comply with legal obligations and enforce our Terms of Service.",
      "We do not use your email content to build advertising profiles or sell data to third parties.",
    ],
  },
  {
    title: "3. Legal Basis for Processing (GDPR)",
    content: [
      "Contractual necessity: processing required to provide the service you requested.",
      "Legitimate interests: improving and securing the service, where those interests are not overridden by your rights.",
      "Legal obligation: complying with applicable laws and regulations.",
      "Consent: where you have given explicit consent for optional communications.",
    ],
  },
  {
    title: "4. How We Share Your Information",
    content: [
      "We do not sell, rent, or trade your personal information.",
      "We may share data with trusted third-party service providers that help us operate Postly, such as hosting or error monitoring providers.",
      "We may disclose information if required by law, court order, or government authority, or when needed to protect our rights, prevent fraud, or ensure user safety.",
      "In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction with appropriate notice.",
    ],
  },
  {
    title: "5. Data Retention",
    content: [
      "We retain personal data for as long as your account is active or as needed to provide the service.",
      "You may request deletion of your account and associated data at any time by contacting us.",
      "SMTP credentials are stored only as long as necessary to provide the sending service.",
      "Email content sent through Postly is not stored beyond the transmission process unless required for troubleshooting with your explicit consent.",
    ],
  },
  {
    title: "6. Data Security",
    content: [
      "We use technical and organizational safeguards to protect your information against unauthorized access, alteration, disclosure, or destruction.",
      "These safeguards include TLS/HTTPS for data in transit, secure credential storage, access controls, and regular security reviews.",
      "No method of electronic transmission or storage is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    title: "7. Your Rights and Choices",
    content: [
      "Access: request a copy of the personal data we hold about you.",
      "Correction: request correction of inaccurate or incomplete data.",
      "Deletion: request deletion of your personal data.",
      "Portability: request transfer of your data in a structured, machine-readable format.",
      "Restriction: request that we restrict processing in certain circumstances.",
      "Objection: object to processing based on legitimate interests.",
      "Withdraw consent: withdraw consent at any time where processing is based on consent.",
    ],
  },
  {
    title: "8. Children's Privacy",
    content: [
      "Postly is not directed to children under 13, and we do not knowingly collect personal information from children under 13.",
      "If we become aware that a child under 13 has provided personal information, we will promptly delete it.",
    ],
  },
  {
    title: "9. International Data Transfers",
    content: [
      "Postly is operated from India.",
      "If you access the service from outside India, your data may be transferred to, stored, and processed in India or other countries where our providers operate.",
      "We ensure that such transfers comply with applicable data protection laws and use appropriate safeguards.",
    ],
  },
  {
    title: "10. Changes to This Privacy Policy",
    content: [
      "We may update this policy from time to time to reflect changes in our practices or applicable laws.",
      "When we make material changes, we will post the updated policy with a new Last Updated date and, for significant changes, notify you by email at least 30 days before the change takes effect.",
      "Your continued use of Postly after the effective date constitutes acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-6 shadow-2xl shadow-black/40 sm:p-10">
          <div className="space-y-4 border-b border-zinc-900 pb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Postly</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Privacy Policy</h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              Effective Date: May 29, 2026 · Last Updated: May 29, 2026
            </p>
            <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
              Welcome to Postly, a custom SMTP email client available at postly.gowreesh.me.
              Your privacy is important to us. This policy explains how we collect, use,
              disclose, and safeguard your information when you use our service.
            </p>
          </div>

          <div className="space-y-10 pt-8">
            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                {"items" in section && section.items ? (
                  <div className="space-y-5">
                    {section.items.map((subsection) => (
                      <div key={subsection.title} className="space-y-2">
                        <h3 className="text-lg font-semibold text-zinc-200">{subsection.title}</h3>
                        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300">
                          {subsection.content.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-300 sm:text-base">
                    {section.content.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section className="space-y-4 rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5">
              <h2 className="text-2xl font-bold text-white">11. Contact Us</h2>
              <p className="text-sm leading-7 text-zinc-300 sm:text-base">
                If you have questions, concerns, or requests about this policy or our data
                practices, please contact us:
              </p>
              <div className="space-y-2 text-sm leading-7 text-zinc-300 sm:text-base">
                <p><span className="font-semibold text-white">Website:</span> <a className="text-primary hover:underline" href="https://gowreesh.me" target="_blank" rel="noreferrer">https://gowreesh.me</a></p>
                <p><span className="font-semibold text-white">Email:</span> <a className="text-primary hover:underline" href="mailto:vt.gowreesh43@gmail.com">vt.gowreesh43@gmail.com</a></p>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-zinc-900 pt-6 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <p>We are committed to resolving privacy concerns promptly and transparently.</p>
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