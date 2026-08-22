/* Portal landing — the public entry page for site owners (distinct from the
   installer marketing page, which sells the ops platform). The register here is
   reassurance and transparency for someone who owns the asset but doesn't
   operate it. Signature: an owner-facing "system health statement" — the calm
   counterpart to the installer landing's diagnostic instrument. */

import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Gauge,
  FileCheck,
  LifeBuoy,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { HealthMeter, VerifiedSeal } from "./widgets";

export function PortalLanding() {
  const navigate = useNavigate();
  const goIn = () => navigate("/portal/login");
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="sh-ptl">
      <header className="sh-ptl__bar">
        <div className="sh-ptl__wrap sh-ptl__bar-inner">
          <span className="sh-ptl__brand">
            <BrandMark />
            Solar<b>Hand</b>
            <span className="sh-ptl__tag">Owner portal</span>
          </span>
          <div className="sh-ptl__bar-right">
            <a className="sh-ptl__forlink" href="/">
              For installers
            </a>
            <Button size="sm" onClick={goIn}>
              Sign in
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="sh-ptl__hero">
        <div className="sh-ptl__wrap sh-ptl__hero-inner">
          <div className="sh-ptl__herocopy">
            <span className="sh-ptl__eyebrow">For the people who own the solar</span>
            <h1 className="sh-ptl__title">
              Know your solar is working — <em>without lifting a spanner.</em>
            </h1>
            <p className="sh-ptl__lede">
              A clear view of every system you own: how it's performing, reports you can hand to your
              board or the bank, and a direct line to your installer when something needs fixing.
            </p>
            <div className="sh-ptl__actions">
              <Button onClick={goIn} icon={<ArrowRight size={18} />}>
                Sign in to your portal
              </Button>
              <Button variant="ghost" onClick={() => scrollTo("inside")}>
                See what's inside
              </Button>
            </div>
            <p className="sh-ptl__note">
              <WifiOff size={15} aria-hidden /> Modelled from verified readings — never streamed off
              your inverters.
            </p>
          </div>

          {/* Signature: the owner's health statement */}
          <div className="sh-ptl__stmt-frame">
            <div className="sh-ptl__stmt" role="img" aria-label="System health statement for the main campus array: 96 percent of expected output, performing as expected, verified 19 August 2026.">
              <div className="sh-ptl__stmt-head">
                <span className="sh-ptl__stmt-site">Main campus array · Kisumu</span>
                <span className="sh-ptl__stmt-chip">
                  <ShieldCheck size={13} aria-hidden /> Verified
                </span>
              </div>
              <div className="sh-ptl__stmt-figure">
                <div className="sh-ptl__stmt-pr">96%</div>
                <div className="sh-ptl__stmt-verdict">
                  <b>Performing as expected</b>
                  <span>of modelled output · 40 kWp</span>
                </div>
              </div>
              <HealthMeter ratio={0.96} tone="go" />
              <div className="sh-ptl__stmt-foot">
                <VerifiedSeal size={44} />
                <div>
                  <b>Verified 19 Aug 2026</b>
                  <span>Checked against a real meter reading · recorded in the audit trail</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section id="inside" className="sh-ptl__wrap sh-ptl__features">
        <p className="sh-ptl__kicker">What's inside</p>
        <h2 className="sh-ptl__h2">Everything about your solar, in one place.</h2>
        <div className="sh-ptl__grid3">
          <article className="sh-ptl__feature">
            <span className="sh-ptl__feature-ico">
              <Gauge />
            </span>
            <h3>Performance at a glance</h3>
            <p>
              A plain-language read on each system — on spec, or needs attention — with the trend
              over recent months, so nothing drifts unnoticed.
            </p>
          </article>
          <article className="sh-ptl__feature">
            <span className="sh-ptl__feature-ico">
              <FileCheck />
            </span>
            <h3>Reports ready to share</h3>
            <p>
              Monthly performance statements, an EPRA compliance record, and a savings summary —
              download or print them for your board, a lender or the regulator.
            </p>
          </article>
          <article className="sh-ptl__feature">
            <span className="sh-ptl__feature-ico">
              <LifeBuoy />
            </span>
            <h3>Help, one tap away</h3>
            <p>
              Raise a request straight from a performance alert and follow it through — every update
              from your installer, in one thread.
            </p>
          </article>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="sh-ptl__wrap">
        <div className="sh-ptl__cta">
          <h2>Sign in to see your systems.</h2>
          <p>The demo portal is a Kisumu school with two arrays — one healthy, one that needs a look.</p>
          <Button onClick={goIn} icon={<ArrowRight size={18} />}>
            Open the demo portal
          </Button>
        </div>
      </section>

      <footer className="sh-ptl__wrap sh-ptl__foot">
        <span className="sh-ptl__foot-brand">
          <BrandMark /> SolarHand
        </span>
        <span>Zone01 Kisumu GreenTech 2026 · Track 4 — Solar Installation Monitoring &amp; Asset Management</span>
      </footer>
    </div>
  );
}
