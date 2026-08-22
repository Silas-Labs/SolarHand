/* Portal Overview — the owner's home. A calm read on every system they own:
   how each is performing against modelled expectation, the 6-month trend, and
   a clear next step when something needs attention. */

import { useNavigate } from "react-router-dom";
import { MapPin, ShieldCheck, LifeBuoy, FileText, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { fmtDate, fmtKwp } from "@/lib/format";
import { usePortal } from "./portalSession";
import { healthOf, verdictOf, type PortalSite } from "./demo";
import { HealthMeter, Sparkline, VerifiedSeal } from "./widgets";

function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function PortalOverview() {
  const navigate = useNavigate();
  const customer = usePortal((s) => s.customer);
  if (!customer) return null;

  const sites = customer.sites;
  const totalKwp = sites.reduce((sum, s) => sum + s.systemKwp, 0);
  const needing = sites.filter((s) => s.openIssue).length;
  const allHealthy = sites.every((s) => healthOf(s) === "healthy");

  function requestSupport(site: PortalSite) {
    navigate("/portal/support", {
      state: {
        siteId: site.id,
        subject: `Support for ${site.name}`,
        category: site.ratio < 0.9 ? "underperformance" : "question",
      },
    });
  }

  return (
    <div className="sh-pt-page">
      <div className="sh-pt-head">
        <div>
          <p className="sh-pt-eyebrow">Welcome back, {customer.contactName.split(" ")[0]}</p>
          <h1 className="sh-pt-h1">Your solar systems</h1>
        </div>
      </div>

      {/* Portfolio assurance banner — the portal's signature moment. */}
      <Card className={`sh-pt-assure${allHealthy ? " is-ok" : " is-watch"}`}>
        <VerifiedSeal size={72} className="sh-pt-assure__seal" />
        <div className="sh-pt-assure__body">
          <h2>
            {allHealthy
              ? "Your systems are performing as expected."
              : `${needing} of your ${sites.length} systems needs attention.`}
          </h2>
          <p>
            {sites.length} {sites.length === 1 ? "system" : "systems"} · {fmtKwp(totalKwp)} installed ·
            maintained by {customer.installer}. Every reading and repair is recorded in a
            tamper-evident audit trail.
          </p>
        </div>
        <div className="sh-pt-assure__stat">
          <span className="sh-pt-assure__num">{sites.length}</span>
          <span className="sh-pt-assure__caption">systems monitored</span>
        </div>
      </Card>

      <div className="sh-pt-sites">
        {sites.map((site) => {
          const v = verdictOf(site);
          return (
            <Card key={site.id} className="sh-pt-site">
              <div className="sh-pt-site__top">
                <div>
                  <h3 className="sh-pt-site__name">{site.name}</h3>
                  <p className="sh-pt-site__loc">
                    <MapPin size={14} aria-hidden /> {site.locationName} · {site.county}
                  </p>
                </div>
                {site.telemetryEnabled ? (
                  <Chip tone="info" dot>
                    Connected
                  </Chip>
                ) : (
                  <Chip tone="neutral">Metered</Chip>
                )}
              </div>

              <div className="sh-pt-site__body">
                <div className="sh-pt-site__figure">
                  <div className={`sh-pt-site__pr sh-pt-site__pr--${v.tone}`}>{pct(site.ratio)}</div>
                  <div className="sh-pt-site__prlabel">of expected output</div>
                  <Chip tone={v.tone} dot>
                    {v.label}
                  </Chip>
                </div>
                <div className="sh-pt-site__chart">
                  <HealthMeter ratio={site.ratio} tone={v.tone} />
                  <div className="sh-pt-site__trend">
                    <Sparkline values={site.history} tone={v.tone} />
                    <span>6-month trend</span>
                  </div>
                </div>
              </div>

              <dl className="sh-pt-site__meta">
                <div>
                  <dt>System size</dt>
                  <dd>{fmtKwp(site.systemKwp)}</dd>
                </div>
                <div>
                  <dt>Produced in July</dt>
                  <dd>{site.monthKwh.toLocaleString()} kWh</dd>
                </div>
                <div>
                  <dt>Last verified</dt>
                  <dd>{fmtDate(site.lastVerifiedOn)}</dd>
                </div>
              </dl>

              {site.openIssue ? (
                <div className="sh-pt-site__issue">
                  <AlertTriangle size={18} aria-hidden />
                  <div className="sh-pt-site__issue-body">
                    <p>{site.openIssue}</p>
                    <div className="sh-pt-site__actions">
                      <Button size="sm" icon={<LifeBuoy size={16} />} onClick={() => requestSupport(site)}>
                        Request support
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<FileText size={16} />}
                        onClick={() => navigate("/portal/reports")}
                      >
                        View report
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sh-pt-site__ok">
                  <ShieldCheck size={18} aria-hidden />
                  <span>
                    Verified healthy — checked {fmtDate(site.lastVerifiedOn)} against modelled expectation.
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<FileText size={16} />}
                    onClick={() => navigate("/portal/reports")}
                  >
                    View report
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
