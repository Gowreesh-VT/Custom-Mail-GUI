"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getPendingDrafts, clearPendingDraft } from "@/lib/offline-storage";

export function PwaSyncHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncDrafts = async () => {
      if (!navigator.onLine) return;

      try {
        const pending = await getPendingDrafts();
        if (!pending.length) return;

        let syncedCount = 0;
        for (const draft of pending) {
          try {
            const toAddresses = draft.toAddresses ? JSON.parse(draft.toAddresses) : [];
            const ccAddresses = draft.ccAddresses ? JSON.parse(draft.ccAddresses) : [];
            const bccAddresses = draft.bccAddresses ? JSON.parse(draft.bccAddresses) : [];
            const attachments = draft.attachments ? JSON.parse(draft.attachments) : [];

            const res = await fetch("/api/drafts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: toAddresses,
                cc: ccAddresses,
                bcc: bccAddresses,
                replyTo: draft.replyTo || "",
                subject: draft.subject || "",
                bodyHtml: draft.bodyHtml || "",
                attachments
              })
            });

            if (res.ok) {
              syncedCount++;
              if (draft.key) {
                await clearPendingDraft(draft.key);
              }
            }
          } catch (itemErr) {
            console.error("Failed to sync individual offline draft:", itemErr);
          }
        }

        if (syncedCount > 0) {
          toast.success(`✅ ${syncedCount} draft(s) synced from offline storage`);
        }
      } catch (error) {
        console.error("Error syncing offline drafts:", error);
      }
    };

    // Run on mount
    syncDrafts();

    // Listen for SYNC_DRAFTS from custom worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_DRAFTS") {
        syncDrafts();
      }
    };
    
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handleSWMessage);
    }

    // Run when network comes online
    window.addEventListener("online", syncDrafts);

    return () => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handleSWMessage);
      }
      window.removeEventListener("online", syncDrafts);
    };
  }, []);

  return null;
}
