import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { RSVP_PREVIEW_ID, verifyRsvpToken } from "@/lib/rsvp";
import { isRsvpChoice } from "@/lib/rsvp-shared";
import { toStringArray } from "@/lib/json-fields";
import { RsvpForm } from "./rsvp-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RSVP · Postly",
  robots: { index: false, follow: false }
};

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-4">{children}</main>;
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </Shell>
  );
}

// Opening the link never records anything (mail scanners prefetch links); the recipient confirms with a button press.
export default async function RsvpPage({
  params,
  searchParams
}: {
  params: Promise<{ emailId: string }>;
  searchParams: Promise<{ r?: string; t?: string }>;
}) {
  const { emailId } = await params;
  const { r, t } = await searchParams;
  const initialChoice = isRsvpChoice(r) ? r : null;

  if (emailId === RSVP_PREVIEW_ID) {
    return (
      <Shell>
        <RsvpForm
          emailId={emailId}
          token=""
          preview
          subject="Test email"
          senderName="You"
          recipient=""
          initialChoice={initialChoice}
          existing={null}
        />
      </Shell>
    );
  }

  if (!verifyRsvpToken(emailId, t)) {
    return <ErrorCard title="Invalid RSVP link" message="This link is incomplete or has been altered. Please use the button in your original email." />;
  }

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    select: { subject: true, toAddresses: true, user: { select: { name: true } }, rsvp: true }
  });
  if (!email) {
    return <ErrorCard title="Invitation not found" message="This invitation no longer exists. Please contact the sender." />;
  }

  return (
    <Shell>
      <RsvpForm
        emailId={emailId}
        token={t!}
        preview={false}
        subject={email.subject}
        senderName={email.user.name}
        recipient={toStringArray(email.toAddresses)[0] || ""}
        initialChoice={initialChoice}
        existing={
          email.rsvp && isRsvpChoice(email.rsvp.response)
            ? { response: email.rsvp.response, note: email.rsvp.note, respondedAt: email.rsvp.respondedAt.toISOString() }
            : null
        }
      />
    </Shell>
  );
}
