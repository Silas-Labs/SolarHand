/* Portal Reports — performance statements, an EPRA compliance record, and a
   savings summary. Everything an owner might need to hand to a board, a bank or
   the regulator. Reports open in an in-app view and download as CSV or print to
   PDF, all client-side (no server round-trip, works offline). */

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Gauge, ShieldCheck, Coins, Download, Printer, X, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { fmtDate } from "@/lib/format";
import { usePortal } from "./portalSession";
import { DEMO_REPORTS, downloadText, reportToCsv, type PortalReport, type ReportKind } from "./demo";

const KIND: Record<ReportKind, { label: string; icon: LucideIcon; tone: ChipTone }> = {
  performance: { label: "Performance", icon: Gauge, tone: "info" },
  compliance: { label: "Compliance", icon: ShieldCheck, tone: "go" },
  savings: { label: "Savings", icon: Coins, tone: "amber" },
};

export function PortalReports() {
  const customer = usePortal((s) => s.customer);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!customer) return null;

  const siteName = (id: string | null) =>
    id ? (customer.sites.find((s) => s.id === id)?.name ?? "Portfolio") : "Whole portfolio";

  const open = openId ? DEMO_REPORTS.find((r) => r.id === openId) ?? null : null;

  function download(report: PortalReport) {
    downloadText(`solarhand-${report.id}.csv`, reportToCsv(report));
  }

  return (
    <div className="sh-pt-page">
      <div className="sh-pt-head">
        <div>
          <p className="sh-pt-eyebrow">Documents</p>
          <h1 className="sh-pt-h1">Reports</h1>
          <p className="sh-pt-sub">
            Performance, compliance and savings — ready to view, download or print for your records.
          </p>
        </div>
      </div>

      <div className="sh-pt-reports">
        {DEMO_REPORTS.map((report) => {
          const meta = KIND[report.kind];
          const Icon = meta.icon;
          return (
            <Card key={report.id} className="sh-pt-report-card">
              <div className={`sh-pt-report-card__ico sh-pt-report-card__ico--${meta.tone}`}>
                <Icon size={20} aria-hidden />
              </div>
              <div className="sh-pt-report-card__body">
                <div className="sh-pt-report-card__tags">
                  <Chip tone={meta.tone}>{meta.label}</Chip>
                  <span className="sh-pt-report-card__scope">{siteName(report.siteId)}</span>
                </div>
                <h3>{report.title}</h3>
                <p className="sh-pt-report-card__period">
                  {report.period} · issued {fmtDate(report.issuedOn)}
                </p>
                <p className="sh-pt-report-card__summary">{report.summary}</p>
                <div className="sh-pt-report-card__actions">
                  <Button size="sm" icon={<FileText size={16} />} onClick={() => setOpenId(report.id)}>
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Download size={16} />}
                    onClick={() => download(report)}
                  >
                    Download CSV
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {open && (
        <div className="sh-pt-modal" role="dialog" aria-modal="true" aria-label={open.title}>
          <div className="sh-pt-modal__backdrop" onClick={() => setOpenId(null)} aria-hidden />
          <div className="sh-pt-doc" role="document">
            <button className="sh-pt-doc__close" onClick={() => setOpenId(null)} aria-label="Close report">
              <X size={18} aria-hidden />
            </button>

            <div className="sh-pt-doc__sheet">
              <header className="sh-pt-doc__head">
                <div className="sh-pt-doc__brand">
                  Solar<b>Hand</b>
                </div>
                <span className="sh-pt-doc__kind">{KIND[open.kind].label} report</span>
              </header>

              <h2 className="sh-pt-doc__title">{open.title}</h2>
              <p className="sh-pt-doc__meta">
                {customer.org} · {siteName(open.siteId)} · {open.period}
                <br />
                Issued {fmtDate(open.issuedOn)} · maintained by {customer.installer}
              </p>
              <p className="sh-pt-doc__summary">{open.summary}</p>

              <table className="sh-pt-doc__table">
                <tbody>
                  {open.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="sh-pt-doc__foot">
                Performance figures are modelled from the system's rating, location and weather,
                compared against verified meter readings (IEC 61724). SolarHand does not stream data
                off inverters. Records are secured in a hash-chained audit trail.
              </p>
            </div>

            <div className="sh-pt-doc__actions">
              <Button icon={<Download size={16} />} onClick={() => download(open)}>
                Download CSV
              </Button>
              <Button variant="ghost" icon={<Printer size={16} />} onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
