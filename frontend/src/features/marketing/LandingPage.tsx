import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  WifiOff,
  Gauge,
  ShieldCheck,
  Activity,
  RadioTower,
  FileWarning,
  MapPin,
  ClipboardCheck,
  RefreshCw,
  ArrowRight,
  Wrench,
  Building2,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";

/* Public landing page — the only unauthenticated marketing surface.
   Signature element: the Expected-vs-Actual performance instrument, which is
   exactly how SolarHand detects underperformance (a modelled expectation vs a
   captured reading — no telemetry). Everything else stays quiet around it. */

export function LandingPage() {
  const navigate = useNavigate();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goDemo = () => navigate("/login");
  const goPortal = () => navigate("/portal");
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="sh-lp">
      {/* Top bar */}
      <header className={`sh-lp__bar${stuck ? " is-stuck" : ""}`}>
        <div className="sh-lp__wrap sh-lp__bar-inner">
          <span className="sh-lp__brand">
            <BrandMark />
            SolarHand
          </span>
          <span className="sh-lp__bar-actions">
            <Button size="sm" variant="ghost" onClick={goDemo}>
              Sign in
            </Button>
            <Button size="sm" onClick={goPortal}>
              Owner portal
            </Button>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="sh-lp__wrap sh-lp__hero">
        <div className="sh-lp__herocopy">
          <span className="sh-lp__eyebrow">Field service &amp; EPRA compliance</span>
          <h1 className="sh-lp__title">
            Keep the solar you&apos;ve already installed <em>actually working.</em>
          </h1>
          <p className="sh-lp__lede">
            SolarHand is the offline-first operations platform for Kenya&apos;s solar
            installers. Spot underperforming systems, dispatch the fix, and prove it was
            done — even where there&apos;s no signal.
          </p>
          <div className="sh-lp__actions">
            <Button onClick={goDemo} icon={<ArrowRight size={18} />}>
              Open the live demo
            </Button>
            <Button variant="ghost" onClick={() => scrollTo("how")}>
              See how it works
            </Button>
          </div>
          <p className="sh-lp__note">
            Demo sign-in: <code>admin@lakesidesolar.co.ke</code> · <code>solarhand</code>
          </p>
        </div>

        {/* Signature instrument */}
        <div className="sh-lp__inst-frame">
          <div className="sh-lp__inst" role="img"
            aria-label="Performance reading for Lakeside Primary, Kisumu: expected 42.0 kilowatt-hours, actual 31.1, performance ratio 74 percent — underperforming.">
            <div className="sh-lp__inst-head">
              <span className="sh-lp__inst-site">Lakeside Primary · Kisumu</span>
              <span className="sh-lp__live">
                <span className="sh-lp__live-dot" aria-hidden /> Modelled
              </span>
            </div>

            <div className="sh-lp__figs">
              <div className="sh-lp__fig">
                <div className="sh-lp__fig-label">Expected</div>
                <div className="sh-lp__fig-value">
                  42.0<small>kWh</small>
                </div>
              </div>
              <div className="sh-lp__fig sh-lp__fig--actual">
                <div className="sh-lp__fig-label">Actual</div>
                <div className="sh-lp__fig-value">
                  31.1<small>kWh</small>
                </div>
              </div>
            </div>

            <div className="sh-lp__meter" aria-hidden>
              <div className="sh-lp__meter-track">
                <div className="sh-lp__meter-fill" style={{ ["--fill" as string]: "74%" }}>
                  <span className="sh-lp__meter-target" />
                </div>
              </div>
              <div className="sh-lp__meter-scale">
                <span>0</span>
                <span>expected output</span>
              </div>
            </div>

            <div className="sh-lp__inst-foot">
              <div className="sh-lp__pr">
                <b>74%</b>
                <span className="sh-lp__fig-label">Performance ratio · IEC 61724</span>
              </div>
              <span className="sh-lp__flag">
                <Activity size={15} /> Underperforming
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Signal strip */}
      <div className="sh-lp__wrap">
        <div className="sh-lp__signals">
          <span className="sh-lp__signal">
            <WifiOff /> <span><b>Works fully offline</b> in the field</span>
          </span>
          <span className="sh-lp__signal">
            <Gauge /> <span><b>Physics-based</b> — any panel or inverter brand</span>
          </span>
          <span className="sh-lp__signal">
            <ShieldCheck /> <span><b>Hash-chained</b> audit trail for EPRA</span>
          </span>
        </div>
      </div>

      {/* Two ways in — make both audiences first-class (owners had no obvious
          door before; this is the fix). */}
      <section className="sh-lp__wrap sh-lp__ways" aria-label="Choose your entry point">
        <article className="sh-lp__way sh-lp__way--run">
          <span className="sh-lp__way-ico"><Wrench /></span>
          <span className="sh-lp__way-tag">For installers &amp; operations</span>
          <h3>Run your installations</h3>
          <p>
            The offline-first console and field app: catch underperformance, dispatch the
            fix, and keep an EPRA-ready audit trail across your whole fleet.
          </p>
          <button type="button" className="sh-lp__way-go" onClick={goDemo}>
            Open the live demo <ArrowRight size={16} />
          </button>
        </article>
        <article className="sh-lp__way sh-lp__way--own">
          <span className="sh-lp__way-ico"><Building2 /></span>
          <span className="sh-lp__way-tag">For system owners</span>
          <h3>Check the solar you own</h3>
          <p>
            The owner portal: a plain-language read on every system you own, reports you can
            hand to your board or the bank, and a direct line to your installer.
          </p>
          <button type="button" className="sh-lp__way-go" onClick={goPortal}>
            Go to the owner portal <ArrowRight size={16} />
          </button>
        </article>
      </section>

      {/* Problem */}
      <section className="sh-lp__wrap sh-lp__section">
        <p className="sh-lp__kicker">The gap</p>
        <h2 className="sh-lp__h2">Installing solar is the easy part. Keeping it running isn&apos;t.</h2>
        <p className="sh-lp__sublede">
          Once a system is on a roof, what&apos;s known about it scatters across memory,
          notebooks and WhatsApp — so problems surface late and nothing is provable. Three
          gaps quietly erode the return on every installation.
        </p>
        <div className="sh-lp__grid3">
          <article className="sh-lp__pain">
            <span className="sh-lp__pain-ico"><Activity /></span>
            <h3>Silent underperformance</h3>
            <p>
              Systems drift below spec for weeks. With no expected baseline to compare
              against, nobody notices until output — or a customer — complains.
            </p>
          </article>
          <article className="sh-lp__pain">
            <span className="sh-lp__pain-ico"><RadioTower /></span>
            <h3>Connectivity fails on site</h3>
            <p>
              Rural installations have the weakest signal, so cloud-only tools stop working
              exactly where the technician is standing.
            </p>
          </article>
          <article className="sh-lp__pain">
            <span className="sh-lp__pain-ico"><FileWarning /></span>
            <h3>No defensible record</h3>
            <p>
              EPRA-licensed contractors must show who did what and when — and prove it
              wasn&apos;t edited afterwards. Paper and WhatsApp can&apos;t.
            </p>
          </article>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="sh-lp__wrap sh-lp__section">
        <p className="sh-lp__kicker">How it works</p>
        <h2 className="sh-lp__h2">From a single reading to a verified repair.</h2>
        <p className="sh-lp__sublede">
          SolarHand never streams data off your inverters. It models what a system{" "}
          <em>should</em> produce and closes the loop when reality falls short.
        </p>
        <ol className="sh-lp__steps">
          <li className="sh-lp__step">
            <h3>Reading</h3>
            <p>A meter reading is captured on a visit — online or offline.</p>
          </li>
          <li className="sh-lp__step">
            <h3>Model</h3>
            <p>The Digital Twin Lite computes expected output from rating, location and the day&apos;s weather.</p>
          </li>
          <li className="sh-lp__step">
            <h3>Flag</h3>
            <p>Actual below expected raises an underperformance or fault flag.</p>
          </li>
          <li className="sh-lp__step">
            <h3>Fix</h3>
            <p>A work order reaches a technician, who completes it in the field, fully offline.</p>
          </li>
          <li className="sh-lp__step is-verify">
            <h3>Verify</h3>
            <p>A follow-up reading confirms recovery — then every step is hash-chained to the audit trail.</p>
          </li>
        </ol>
      </section>

      {/* Two apps */}
      <section className="sh-lp__wrap sh-lp__section">
        <p className="sh-lp__kicker">One platform, two jobs</p>
        <h2 className="sh-lp__h2">A console for the office. A field app for the roof.</h2>
        <div className="sh-lp__split">
          <div className="sh-lp__panel">
            <span className="sh-lp__panel-tag">For the operations manager</span>
            <h3>Admin console</h3>
            <ul className="sh-lp__list">
              <li><Gauge /><span><b>Fleet dashboard</b> — portfolio health, open faults and underperforming sites at a glance.</span></li>
              <li><MapPin /><span><b>Fleet map</b> — every installation plotted with its current health.</span></li>
              <li><ClipboardCheck /><span><b>Dispatch</b> — assign and track jobs through their whole lifecycle.</span></li>
              <li><ShieldCheck /><span><b>Compliance &amp; audit</b> — licence status and one-click integrity checks.</span></li>
            </ul>
          </div>
          <div className="sh-lp__panel">
            <span className="sh-lp__panel-tag">For the field technician</span>
            <h3>Offline-first field app</h3>
            <ul className="sh-lp__list">
              <li><WifiOff /><span><b>My jobs</b> — the day&apos;s work, downloaded and usable with no signal.</span></li>
              <li><ClipboardCheck /><span><b>Checklists &amp; photos</b> — structured inspections completed on site.</span></li>
              <li><Gauge /><span><b>Reading capture</b> — an instant expected-vs-actual verdict in hand.</span></li>
              <li><RefreshCw /><span><b>Sync</b> — everything reconciles automatically when you reconnect.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="sh-lp__wrap">
        <div className="sh-lp__cta-band">
          <h2>See a full solar fleet, faults and all.</h2>
          <p>
            The demo is seeded with a licensed Kisumu contractor, six PV systems, live jobs
            across every status, and a genuinely underperforming site to investigate.
          </p>
          <Button onClick={goDemo} icon={<ArrowRight size={18} />}>
            Open the live demo
          </Button>
          <p className="sh-lp__creds">
            Demo admin — <b>admin@lakesidesolar.co.ke</b> · <b>solarhand</b>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="sh-lp__wrap sh-lp__foot">
        <span className="sh-lp__foot-brand">
          <BrandMark /> SolarHand
        </span>
        <span>Zone01 Kisumu GreenTech 2026 · Track 4 — Solar Installation Monitoring &amp; Asset Management</span>
      </footer>
    </div>
  );
}
