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

const BRAND = {
  name: "Postly",
  tagline: "Mail campaigns, tracked.",
  dark: "#022c22",
  accent: "#10b981",
  soft: "#ecfdf5",
  border: "#a7f3d0",
  text: "#0f172a",
  muted: "#64748b",
};

async function loadLogo(): Promise<{ url: string; base64: string } | null> {
  try {
    const url = `${window.location.origin}/main-logo.png`;
    const buf = await (await fetch(url)).arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { url, base64: btoa(bin) };
  } catch {
    return null;
  }
}

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
  const { pdf, Document, Page, Text, View, Image, StyleSheet } = await import("@react-pdf/renderer");
  const logo = await loadLogo();
  const s = StyleSheet.create({
    page: { paddingTop: 0, paddingBottom: 40, paddingHorizontal: 0, fontSize: 9, fontFamily: "Helvetica", color: BRAND.text },
    banner: { backgroundColor: BRAND.dark, paddingVertical: 20, paddingHorizontal: 32, flexDirection: "row", alignItems: "center", borderBottom: `3 solid ${BRAND.accent}` },
    logo: { width: 36, height: 36, marginRight: 12, borderRadius: 8 },
    brand: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
    tagline: { color: "#6ee7b7", fontSize: 8, marginTop: 2 },
    bannerRight: { marginLeft: "auto", alignItems: "flex-end" },
    bannerTitle: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
    bannerDate: { color: "#a7f3d0", fontSize: 8, marginTop: 2 },
    body: { paddingHorizontal: 32, paddingTop: 18 },
    title: { fontSize: 16, fontWeight: "bold", marginBottom: 3 },
    subtitle: { fontSize: 9, color: BRAND.muted, marginBottom: 14 },
    h2: { fontSize: 11, fontWeight: "bold", color: BRAND.dark, marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottom: `1.5 solid ${BRAND.accent}` },
    cards: { flexDirection: "row", flexWrap: "wrap" },
    card: { width: "32%", backgroundColor: BRAND.soft, borderLeft: `3 solid ${BRAND.accent}`, borderRadius: 3, padding: 8, marginRight: "1.3%", marginBottom: 6 },
    cardLabel: { fontSize: 8, color: BRAND.muted, marginBottom: 2 },
    cardValue: { fontSize: 14, fontWeight: "bold", color: BRAND.dark },
    head: { flexDirection: "row", backgroundColor: BRAND.soft, paddingVertical: 4, paddingHorizontal: 4, marginBottom: 2, fontWeight: "bold", color: BRAND.dark },
    row: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4, borderBottom: "0.5 solid #e2e8f0" },
    cols3: { flexDirection: "row", justifyContent: "space-between" },
    box: { width: "32%" },
    footer: { position: "absolute", bottom: 14, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: BRAND.muted, borderTop: "0.5 solid #cbd5e1", paddingTop: 5 },
  });
  const { campaign: c } = data;

  const doc = (
    <Document title={`Campaign report - ${c.subject}`} author={BRAND.name} creator={BRAND.name}>
      <Page size="A4" style={s.page}>
        <View style={s.banner} fixed={false}>
          {logo && <Image src={logo.url} style={s.logo} />}
          <View>
            <Text style={s.brand}>{BRAND.name}</Text>
            <Text style={s.tagline}>{BRAND.tagline}</Text>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.bannerTitle}>Campaign Analytics Report</Text>
            <Text style={s.bannerDate}>{new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</Text>
          </View>
        </View>
        <View style={s.body}>
        <Text style={s.title}>{c.subject}</Text>
        <Text style={s.subtitle}>
          Template: {c.templateName} · Sent {fmtDate(c.sentAt)}
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
              <Text style={{ fontWeight: "bold", marginBottom: 3, color: BRAND.dark }}>{title}</Text>
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

        <Text style={s.h2} minPresenceAhead={60}>Recipients ({data.recipients.length})</Text>
        <View style={s.head}>
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
        </View>
        <View style={s.footer} fixed>
          <Text>Generated by {BRAND.name} · {new Date().toLocaleString()}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
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
    `<table border="0" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%">` +
    `<tr>${headers.map((h) => `<th align="left" style="background:${BRAND.dark};color:#ffffff;font-size:10pt">${esc(h)}</th>`).join("")}</tr>` +
    rows
      .map(
        (r, i) =>
          `<tr>${r.map((c) => `<td style="border-bottom:1px solid #e2e8f0;background:${i % 2 ? BRAND.soft : "#ffffff"}">${esc(c)}</td>`).join("")}</tr>`
      )
      .join("") +
    `</table>`
  );
}

/**
 * Word opens MHTML saved as .doc natively, and MHTML can embed the logo —
 * no extra dependency needed.
 */
export async function downloadCampaignWord(data: CampaignReportData) {
  const { campaign: c } = data;
  const logo = await loadLogo();
  const h2 = (t: string) =>
    `<h2 style="color:${BRAND.dark};font-size:14pt;border-bottom:2px solid ${BRAND.accent};padding-bottom:3px;margin-top:20pt">${esc(t)}</h2>`;
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><title>Campaign Analytics Report</title>` +
    `<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:${BRAND.text}}</style></head><body>` +
    `<table width="100%" cellspacing="0" cellpadding="10" style="background:${BRAND.dark};border-collapse:collapse"><tr>` +
    (logo ? `<td width="56"><img src="cid:logo" width="44" height="44" alt="${BRAND.name}"></td>` : "") +
    `<td><span style="color:#ffffff;font-size:20pt;font-weight:bold">${BRAND.name}</span><br><span style="color:#6ee7b7;font-size:9pt">${BRAND.tagline}</span></td>` +
    `<td align="right"><span style="color:#ffffff;font-size:12pt;font-weight:bold">Campaign Analytics Report</span><br><span style="color:#a7f3d0;font-size:9pt">${esc(new Date().toLocaleDateString(undefined, { dateStyle: "long" }))}</span></td>` +
    `</tr></table><div style="height:3px;background:${BRAND.accent}"></div>` +
    `<h1 style="font-size:18pt;margin-bottom:2pt">${esc(c.subject)}</h1>` +
    `<p style="color:${BRAND.muted};margin-top:0">Template: ${esc(c.templateName)} · Sent ${esc(fmtDate(c.sentAt))}</p>` +
    h2("Summary") + table(["Metric", "Value"], summaryRows(c)) +
    breakdowns(data.analytics)
      .map(([title, rows]) => h2(title) + (rows.length ? table(["Name", "Count"], rows) : "<p>No data</p>"))
      .join("") +
    h2("Hourly interactions") + table(["Hour", "Opens", "Clicks"], data.timeSeries.map((t) => [t.time, t.opens, t.clicks])) +
    (data.clickBreakdown.length
      ? h2("Link performance") + table(["Label", "Link", "Clicks", "Unique clicks"], data.clickBreakdown.map((l) => [l.label, l.url, l.clicks, l.uniqueClicks]))
      : "") +
    h2(`Recipients (${data.recipients.length})`) +
    table(["Email", "Status", "Opens", "Clicks", "First opened"], data.recipients.map((r) => [r.email, r.status, r.openCount, r.clickCount, fmtDate(r.firstOpenedAt)])) +
    `<p style="color:${BRAND.muted};font-size:9pt;margin-top:24pt;border-top:1px solid #cbd5e1;padding-top:6pt">Generated by ${BRAND.name} · ${esc(new Date().toLocaleString())}</p>` +
    `</body></html>`;

  const boundary = "----=_Postly_Report";
  const parts = [
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(html))).replace(/(.{76})/g, "$1\r\n"),
  ];
  if (logo) {
    parts.push(
      `--${boundary}`,
      `Content-Type: image/png`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <logo>`,
      ``,
      logo.base64.replace(/(.{76})/g, "$1\r\n")
    );
  }
  parts.push(`--${boundary}--`, ``);
  download(new Blob([parts.join("\r\n")], { type: "application/msword" }), `campaign-report-${safeName(c.subject)}.doc`);
}
