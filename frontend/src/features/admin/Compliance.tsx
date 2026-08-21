/* Compliance — generates an EPRA compliance certificate for an installed
   system. It composes the licensed contractor (the company), the selected
   system with its components, and the commissioning technician's EPRA licence
   into a printable document. No backend endpoint is needed: the certificate is
   assembled client-side and printed via the browser (Print → Save as PDF).

   Under Kenya's Energy (Solar Photovoltaic Systems) Regulations, 2012, solar PV
   systems must be installed and commissioned by technicians and contractors
   licensed by the Energy and Petroleum Regulatory Authority (EPRA). This
   certificate is a contractor attestation to that effect and is valid only once
   signed and stamped. */

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/store/auth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { fmtCoords, fmtDate, fmtNumber, fmtKwp, humanize } from "@/lib/format";
import { todayIso } from "@/lib/util";
import type {
  AssetDetail,
  CompanyRead,
  ComponentRead,
  UserRead,
} from "@/lib/types";

export function Compliance() {
  const currentUserId = useAuth((s) => s.user?.id ?? null);

  const head = useAsync(async () => {
    const [company, assets, users] = await Promise.all([
      api.getCompany(),
      api.listAssets(),
      api.listUsers(),
    ]);
    return { company, assets, users };
  }, []);

  const [assetId, setAssetId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [reference, setReference] = useState("");
  const [commissioned, setCommissioned] = useState("");

  const detail = useAsync(
    async () => (assetId ? api.getAsset(assetId) : null),
    [assetId],
  );

  // Default the commissioning technician once the team loads: prefer the
  // signed-in admin if they hold a licence, else the first licensed technician.
  useEffect(() => {
    if (!head.data || technicianId) return;
    const licensed = head.data.users.filter(
      (u) => u.is_active && u.epra_technician_license,
    );
    const mine = licensed.find((u) => u.id === currentUserId);
    setTechnicianId((mine ?? licensed[0])?.id ?? "");
  }, [head.data, technicianId, currentUserId]);

  // Derive a reference number and commissioning date each time a system is
  // chosen. Both stay editable afterwards.
  const detailId = detail.data?.id ?? null;
  useEffect(() => {
    const a = detail.data;
    if (!a) return;
    setReference(`SH-${a.id.slice(0, 6).toUpperCase()}-${todayIso().replace(/-/g, "")}`);
    setCommissioned(a.install_date ?? todayIso());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  const assets = [...(head.data?.assets ?? [])].sort((a, b) =>
    a.customer_name.localeCompare(b.customer_name),
  );
  const licensedTechs = (head.data?.users ?? [])
    .filter((u) => u.is_active)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const technician = head.data?.users.find((u) => u.id === technicianId) ?? null;

  const canPrint = Boolean(detail.data);

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">EPRA compliance</p>
          <h1>Compliance certificate</h1>
        </div>
        <Button
          icon={<Printer aria-hidden />}
          variant="primary"
          disabled={!canPrint}
          onClick={() => window.print()}
        >
          Print / Save PDF
        </Button>
      </div>

      {head.loading ? (
        <Loading label="Loading compliance data…" />
      ) : !head.data ? (
        <EmptyState title="Couldn't load compliance data">
          {head.error ?? "Something went wrong."}{" "}
          <button className="sh-linklike" onClick={head.reload}>Retry</button>
        </EmptyState>
      ) : (
        <>
          <div className="sh-card sh-adm-form sh-cert__controls">
            <div className="sh-adm-form__grid">
              <SelectField
                label="System"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">Choose a system…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.customer_name} · {a.location_name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Commissioning technician"
                hint="Signs off installation compliance"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">Select technician…</option>
                {licensedTechs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                    {u.epra_technician_license ? ` · EPRA ${u.epra_technician_license}` : " · no licence"}
                  </option>
                ))}
              </SelectField>
              <InputField
                label="Certificate reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <InputField
                label="Commissioning date"
                type="date"
                value={commissioned}
                onChange={(e) => setCommissioned(e.target.value)}
              />
            </div>
          </div>

          {!assetId ? (
            <EmptyState title="Choose a system">
              Pick an installed system above to generate its EPRA compliance
              certificate.
            </EmptyState>
          ) : detail.loading ? (
            <Loading label="Loading system…" />
          ) : detail.error ? (
            <EmptyState title="Couldn't load the system">
              {detail.error}{" "}
              <button className="sh-linklike" onClick={detail.reload}>Retry</button>
            </EmptyState>
          ) : detail.data ? (
            <Certificate
              company={head.data.company}
              asset={detail.data}
              technician={technician}
              reference={reference}
              commissioned={commissioned}
            />
          ) : null}
        </>
      )}
    </>
  );
}

/* -- The printable document ------------------------------------------------- */

function Certificate({
  company,
  asset,
  technician,
  reference,
  commissioned,
}: {
  company: CompanyRead;
  asset: AssetDetail;
  technician: UserRead | null;
  reference: string;
  commissioned: string;
}) {
  return (
    <article className="sh-cert" aria-label="EPRA compliance certificate">
      <div className="sh-cert__accent" aria-hidden />

      <header className="sh-cert__head">
        <div className="sh-cert__brand">
          <BrandMark className="sh-cert__mark" />
          <span className="sh-cert__word">
            Solar<b>Hand</b>
          </span>
        </div>
        <div className="sh-cert__ref">
          <span className="sh-eyebrow">Certificate no.</span>
          <span className="sh-mono">{reference || "—"}</span>
        </div>
      </header>

      <div className="sh-cert__titleblock">
        <p className="sh-eyebrow">Energy &amp; Petroleum Regulatory Authority</p>
        <h2 className="sh-cert__title">Solar PV Compliance Certificate</h2>
      </div>

      <p className="sh-cert__decl">
        This certifies that the solar photovoltaic installation described below
        was designed, installed and commissioned by{" "}
        <strong>{company.name}</strong>, a contractor licensed by the Energy and
        Petroleum Regulatory Authority (EPRA), in accordance with the Energy
        (Solar Photovoltaic Systems) Regulations, 2012 and the applicable Kenyan
        standards for solar PV systems.
      </p>

      <div className="sh-cert__grid">
        <section className="sh-cert__section">
          <h3 className="sh-cert__h">Installation site</h3>
          <dl className="sh-cert__dl">
            <CertRow label="Customer" value={asset.customer_name} />
            <CertRow label="Contact" value={asset.customer_phone ?? "—"} />
            <CertRow label="Location" value={asset.location_name} />
            <CertRow label="County" value={asset.county ?? "—"} />
            <CertRow label="GPS" value={fmtCoords(asset.latitude, asset.longitude)} />
          </dl>
        </section>

        <section className="sh-cert__section">
          <h3 className="sh-cert__h">System</h3>
          <dl className="sh-cert__dl">
            <CertRow label="Array size" value={fmtKwp(asset.system_kwp)} />
            <CertRow
              label="Inverter"
              value={asset.inverter_kva ? `${fmtNumber(asset.inverter_kva, 1)} kVA` : "—"}
            />
            <CertRow
              label="Battery"
              value={asset.battery_kwh ? `${fmtNumber(asset.battery_kwh, 1)} kWh` : "None"}
            />
            <CertRow
              label="Orientation"
              value={`${fmtNumber(asset.tilt_deg, 0)}° tilt · ${fmtNumber(asset.azimuth_deg, 0)}° azimuth`}
            />
            <CertRow label="Commissioned" value={fmtDate(commissioned)} />
          </dl>
        </section>
      </div>

      <section className="sh-cert__section">
        <h3 className="sh-cert__h">Installed equipment</h3>
        <table className="sh-cert__table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Make / model</th>
              <th>Rating</th>
              <th className="sh-cert__num">Qty</th>
              <th>Serial</th>
            </tr>
          </thead>
          <tbody>
            {asset.components.length === 0 ? (
              <tr>
                <td colSpan={5} className="sh-cert__empty">
                  No components recorded for this system.
                </td>
              </tr>
            ) : (
              asset.components.map((c) => (
                <tr key={c.id}>
                  <td>{humanize(c.kind)}</td>
                  <td>{[c.make, c.model].filter(Boolean).join(" ") || "—"}</td>
                  <td>{rating(c)}</td>
                  <td className="sh-cert__num">{c.quantity}</td>
                  <td className="sh-mono">{c.serial_number ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="sh-cert__sign">
        <div className="sh-cert__signbox">
          <span className="sh-cert__h">Commissioned by</span>
          <p className="sh-cert__signname">{technician?.full_name ?? "—"}</p>
          <p className="sh-cert__signlic sh-mono">
            {technician?.epra_technician_license
              ? `EPRA T-licence ${technician.epra_technician_license}`
              : "Technician licence not on file"}
          </p>
          <span className="sh-cert__signline" />
          <span className="sh-cert__signcap">Signature &amp; date</span>
        </div>
        <div className="sh-cert__signbox">
          <span className="sh-cert__h">Licensed contractor</span>
          <p className="sh-cert__signname">{company.name}</p>
          <p className="sh-cert__signlic sh-mono">
            {company.epra_contractor_license
              ? `EPRA C-licence ${company.epra_contractor_license}`
              : "Contractor licence not on file"}
          </p>
          <span className="sh-cert__signline" />
          <span className="sh-cert__signcap">Signature &amp; company stamp</span>
        </div>
      </div>

      <footer className="sh-cert__foot">
        <span>Issued {fmtDate(todayIso())}</span>
        <span>
          Valid only when signed and stamped by the licensed contractor. Retain
          for EPRA inspection and warranty claims.
        </span>
      </footer>
    </article>
  );
}

function CertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sh-cert__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function rating(c: ComponentRead): string {
  if (c.rating_value === null || c.rating_unit === null) return "—";
  return `${fmtNumber(c.rating_value, c.rating_value < 10 ? 1 : 0)} ${c.rating_unit}`;
}
