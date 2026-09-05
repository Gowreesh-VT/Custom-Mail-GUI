import { QrCertificatesStudio } from "@/components/qr-certificates-studio";

export const metadata = {
  title: "QR & Certificates Studio - Postly",
  description: "Create branded dynamic QR passes and personalized certificate templates."
};

export default function CertificatesPage() {
  return <QrCertificatesStudio defaultTab="certificates" />;
}
