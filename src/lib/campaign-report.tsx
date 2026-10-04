import * as React from "react";

export type CampaignReportData = {
  campaign: {
    bulkJobId: string;
    subject: string;
    sentAt: string;
    templateName: string;
    totalSent: number;
    totalSuccessful: number;
    totalFailed: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
  timeSeries: Array<{ time: string; opens: number; clicks: number }>;
  clickBreakdown: Array<{ label: string; url: string; clicks: number; uniqueClicks: number }>;
  analytics: {
    deviceStats: Record<string, number>;
    browserStats: Record<string, number>;
    osStats: Record<string, number>;
  };
  recipients: Array<{
    email: string;
    status: string;
    openCount: number;
    clickCount: number;
    firstOpenedAt: string | null;
    errorMsg?: string | null;
  }>;
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : "Never");
const pct = (n: number) => `${n.toFixed(1)}%`;

function summaryRows(c: CampaignReportData["campaign"]): Array<[string, string]> {
  return [
    ["Dispatched", String(c.totalSent)],
    ["Successful", String(c.totalSuccessful)],
    ["Failed", String(c.totalFailed)],
    ["Delivery rate", pct(c.deliveryRate)],
    ["Unique opens", `${c.totalOpened} (${pct(c.openRate)})`],
    ["Unique clicks", `${c.totalClicked} (${pct(c.clickRate)})`],
  ];
}

function breakdowns(a: CampaignReportData["analytics"]): Array<[string, Array<[string, number]>]> {
  const toRows = (r: Record<string, number>) =>
    Object.entries(r).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
  return [
    ["Devices", toRows(a.deviceStats)],
    ["Browsers", toRows(a.browserStats)],
    ["Operating systems", toRows(a.osStats)],
  ];
}

function safeName(subject: string) {
  return subject.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "campaign";
}

function download(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function downloadCampaignPdf(data: CampaignReportData) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const s = StyleSheet.create({
    page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
    title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
    subtitle: { fontSize: 10, color: "#666", marginBottom: 14 },
    h2: { fontSize: 12, fontWeight: "bold", marginTop: 14, marginBottom: 6 },
    cards: { flexDirection: "row", flexWrap: "wrap" },
    card: { width: "32%", border: "1 solid #ddd", borderRadius: 4, padding: 8, marginRight: "1%", marginBottom: 6 },
    cardLabel: { fontSize: 8, color: "#666", marginBottom: 2 },
    cardValue: { fontSize: 13, fontWeight: "bold" },
    head: { flexDirection: "row", borderBottom: "1 solid #ddd", paddingBottom: 3, marginBottom: 3, fontWeight: "bold" },
    row: { flexDirection: "row", paddingVertical: 2.5, borderBottom: "0.5 solid #f0f0f0" },
    cols3: { flexDirection: "row", justifyContent: "space-between" },
    box: { width: "32%" },
  });
  const { campaign: c } = data;

  const doc = (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Campaign Analytics Report</Text>
        <Text style={s.subtitle}>
          {c.subject} · Template: {c.templateName} · Sent {fmtDate(c.sentAt)} · Generated {new Date().toLocaleString()}
        </Text>

        <View style={s.cards}>
          {summaryRows(c).map(([k, v]) => (
            <View key={k} style={s.card}>
              <Text style={s.cardLabel}>{k}</Text>
              <Text style={s.cardValue}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h2}>Audience breakdown</Text>
        <View style={s.cols3}>
          {breakdowns(data.analytics).map(([title, rows]) => (
            <View key={title} style={s.box}>
              <Text style={{ fontWeight: "bold", marginBottom: 3 }}>{title}</Text>
              {rows.length === 0 && <Text style={{ color: "#888" }}>No data</Text>}
              {rows.map(([k, v]) => (
                <Text key={k}>{k}: {v}</Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={s.h2}>Hourly interactions</Text>
        <View style={s.head}>
          <Text style={{ width: "40%" }}>Hour</Text>
          <Text style={{ width: "30%" }}>Opens</Text>
          <Text style={{ width: "30%" }}>Clicks</Text>
        </View>
        {data.timeSeries.map((t, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={{ width: "40%" }}>{t.time}</Text>
            <Text style={{ width: "30%" }}>{t.opens}</Text>
            <Text style={{ width: "30%" }}>{t.clicks}</Text>
          </View>
        ))}

        {data.clickBreakdown.length > 0 && (
          <>
            <Text style={s.h2}>Link performance</Text>
            <View style={s.head}>
              <Text style={{ width: "20%" }}>Label</Text>
              <Text style={{ width: "50%" }}>Link</Text>
              <Text style={{ width: "15%" }}>Clicks</Text>
              <Text style={{ width: "15%" }}>Unique</Text>
            </View>
            {data.clickBreakdown.map((l, i) => (
              <View key={i} style={s.row} wrap={false}>
                <Text style={{ width: "20%" }}>{l.label}</Text>
                <Text style={{ width: "50%", paddingRight: 4 }}>{l.url.slice(0, 80)}</Text>
                <Text style={{ width: "15%" }}>{l.clicks}</Text>
                <Text style={{ width: "15%" }}>{l.uniqueClicks}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.h2} break>Recipients ({data.recipients.length})</Text>
        <View style={s.head} fixed>
          <Text style={{ width: "38%" }}>Email</Text>
          <Text style={{ width: "12%" }}>Status</Text>
          <Text style={{ width: "10%" }}>Opens</Text>
          <Text style={{ width: "10%" }}>Clicks</Text>
          <Text style={{ width: "30%" }}>First opened</Text>
        </View>
        {data.recipients.map((r, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={{ width: "38%", paddingRight: 4 }}>{r.email}</Text>
            <Text style={{ width: "12%" }}>{r.status}</Text>
            <Text style={{ width: "10%" }}>{r.openCount}</Text>
            <Text style={{ width: "10%" }}>{r.clickCount}</Text>
            <Text style={{ width: "30%" }}>{fmtDate(r.firstOpenedAt)}</Text>
          </View>
        ))}
        <Text
          fixed
          style={{ position: "absolute", bottom: 14, left: 0, right: 0, textAlign: "center", fontSize: 8, color: "#888" }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  download(blob, `campaign-report-${safeName(c.subject)}.pdf`);
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function table(headers: string[], rows: Array<Array<string | number>>) {
  return (
    `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;border-color:#cccccc;width:100%">` +
    `<tr style="background:#f1f5f9">${headers.map((h) => `<th align="left">${esc(h)}</th>`).join("")}</tr>` +
    rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") +
    `</table>`
  );
}

/** Word opens HTML saved as .doc natively — no extra dependency needed. */
export function downloadCampaignWord(data: CampaignReportData) {
  const { campaign: c } = data;
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><title>Campaign Analytics Report</title>` +
    `<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{font-size:20pt}h2{font-size:14pt;margin-top:18pt}</style></head><body>` +
    `<h1>Campaign Analytics Report</h1>` +
    `<p><b>Subject:</b> ${esc(c.subject)}<br><b>Template:</b> ${esc(c.templateName)}<br><b>Sent:</b> ${esc(fmtDate(c.sentAt))}<br><b>Generated:</b> ${esc(new Date().toLocaleString())}</p>` +
    `<h2>Summary</h2>${table(["Metric", "Value"], summaryRows(c))}` +
    breakdowns(data.analytics)
      .map(([title, rows]) => `<h2>${esc(title)}</h2>` + (rows.length ? table(["Name", "Count"], rows) : "<p>No data</p>"))
      .join("") +
    `<h2>Hourly interactions</h2>${table(["Hour", "Opens", "Clicks"], data.timeSeries.map((t) => [t.time, t.opens, t.clicks]))}` +
    (data.clickBreakdown.length
      ? `<h2>Link performance</h2>${table(["Label", "Link", "Clicks", "Unique clicks"], data.clickBreakdown.map((l) => [l.label, l.url, l.clicks, l.uniqueClicks]))}`
      : "") +
    `<h2>Recipients (${data.recipients.length})</h2>` +
    table(["Email", "Status", "Opens", "Clicks", "First opened"], data.recipients.map((r) => [r.email, r.status, r.openCount, r.clickCount, fmtDate(r.firstOpenedAt)])) +
    `</body></html>`;
  download(new Blob(["﻿", html], { type: "application/msword" }), `campaign-report-${safeName(c.subject)}.doc`);
}
