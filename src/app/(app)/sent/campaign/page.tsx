import { CampaignsDirectory } from "@/components/campaigns-directory";

export const metadata = {
  title: "All Campaigns Analytics - Postly",
  description: "Performance metrics and diagnostics across all dispatched bulk email campaigns."
};

export default function SentCampaignsIndexPage() {
  return (
    <div className="space-y-6">
      <CampaignsDirectory showTitle={true} />
    </div>
  );
}
