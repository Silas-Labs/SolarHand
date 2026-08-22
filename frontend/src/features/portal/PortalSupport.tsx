/* Portal Support — the owner raises a request to their installer and tracks it
   through to resolution. Tickets are kept in the portal session (persisted
   locally for the demo); each carries a plain update timeline so the owner can
   see exactly where things stand. */

import { useMemo, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { LifeBuoy, Plus, CheckCircle2, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { InputField, SelectField, TextareaField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmtDate, fmtRelative } from "@/lib/format";
import { cx } from "@/lib/util";
import { usePortal } from "./portalSession";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  type TicketCategory,
  type TicketPriority,
} from "./demo";

interface PrefillState {
  siteId?: string;
  subject?: string;
  category?: TicketCategory;
}

export function PortalSupport() {
  const location = useLocation();
  const prefill = (location.state ?? {}) as PrefillState;
  const customer = usePortal((s) => s.customer);
  const tickets = usePortal((s) => s.tickets);
  const raiseTicket = usePortal((s) => s.raiseTicket);

  const [subject, setSubject] = useState(prefill.subject ?? "");
  const [siteId, setSiteId] = useState<string>(prefill.siteId ?? "");
  const [category, setCategory] = useState<TicketCategory>(prefill.category ?? "question");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const siteName = useMemo(
    () => (id: string | null) =>
      id ? customer?.sites.find((s) => s.id === id)?.name ?? "—" : "Not site-specific",
    [customer],
  );

  if (!customer) return null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setFormError("Please add a subject and a short description.");
      setCreatedRef(null);
      return;
    }
    const ticket = raiseTicket({
      subject,
      siteId: siteId || null,
      category,
      priority,
      description,
    });
    setCreatedRef(ticket.ref);
    setFormError(null);
    setSubject("");
    setSiteId("");
    setCategory("question");
    setPriority("normal");
    setDescription("");
    setExpanded(ticket.id);
  }

  return (
    <div className="sh-pt-page">
      <div className="sh-pt-head">
        <div>
          <p className="sh-pt-eyebrow">Help</p>
          <h1 className="sh-pt-h1">Support</h1>
          <p className="sh-pt-sub">
            Raise a request with {customer.installer} and follow it through to resolution.
          </p>
        </div>
      </div>

      <div className="sh-pt-support">
        {/* New request */}
        <Card className="sh-pt-ticketform">
          <h2 className="sh-pt-card-title">
            <Plus size={18} aria-hidden /> New request
          </h2>

          {createdRef && (
            <div className="sh-pt-success" role="status">
              <CheckCircle2 size={18} aria-hidden />
              <span>
                Request <b>{createdRef}</b> sent to {customer.installer}. They'll respond here.
              </span>
            </div>
          )}

          <form className="sh-pt-form" onSubmit={onSubmit} noValidate>
            {formError && (
              <div className="sh-formbanner" role="alert">
                {formError}
              </div>
            )}
            <InputField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Dormitory array underperforming"
              required
            />
            <div className="sh-pt-form__row">
              <SelectField
                label="Which system?"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">Not site-specific</option>
                {customer.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </SelectField>
            </div>
            <SelectField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
            >
              {(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {TICKET_CATEGORY_LABEL[c]}
                </option>
              ))}
            </SelectField>
            <TextareaField
              label="What's happening?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe what you're seeing — dates, times and anything unusual help."
              required
            />
            <Button type="submit" icon={<LifeBuoy size={16} />}>
              Send request
            </Button>
          </form>
        </Card>

        {/* Tracked requests */}
        <div className="sh-pt-tickets">
          <h2 className="sh-pt-card-title">Your requests</h2>
          {tickets.length === 0 ? (
            <Card>
              <EmptyState icon={<LifeBuoy />} title="No requests yet">
                When you raise a request it appears here, with every update from your installer.
              </EmptyState>
            </Card>
          ) : (
            tickets.map((t) => {
              const isOpen = expanded === t.id;
              const latest = t.updates[t.updates.length - 1];
              return (
                <Card key={t.id} className="sh-pt-ticket">
                  <button
                    className="sh-pt-ticket__head"
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="sh-pt-ticket__lead">
                      <div className="sh-pt-ticket__subject">
                        <span className="sh-pt-ticket__ref">{t.ref}</span>
                        {t.subject}
                      </div>
                      <div className="sh-pt-ticket__sub">
                        {siteName(t.siteId)} · {TICKET_CATEGORY_LABEL[t.category]} · raised{" "}
                        {fmtRelative(t.createdAt)}
                      </div>
                    </div>
                    <div className="sh-pt-ticket__right">
                      <Chip tone={TICKET_STATUS_TONE[t.status]} dot>
                        {TICKET_STATUS_LABEL[t.status]}
                      </Chip>
                      <ChevronDown
                        size={18}
                        className={cx("sh-pt-ticket__chev", isOpen && "is-open")}
                        aria-hidden
                      />
                    </div>
                  </button>

                  {!isOpen && latest && (
                    <p className="sh-pt-ticket__preview">
                      <b>{latest.by}:</b> {latest.note}
                    </p>
                  )}

                  {isOpen && (
                    <div className="sh-pt-ticket__detail">
                      <p className="sh-pt-ticket__desc">{t.description}</p>
                      <ol className="sh-pt-timeline">
                        {t.updates
                          .slice()
                          .reverse()
                          .map((u, i) => (
                            <li key={`${u.at}-${i}`} className="sh-pt-timeline__item">
                              <span className={`sh-pt-timeline__dot sh-pt-timeline__dot--${TICKET_STATUS_TONE[u.status]}`} aria-hidden />
                              <div>
                                <div className="sh-pt-timeline__meta">
                                  <b>{u.by}</b>
                                  <span>{fmtDate(u.at)}</span>
                                  <Chip tone={TICKET_STATUS_TONE[u.status]}>
                                    {TICKET_STATUS_LABEL[u.status]}
                                  </Chip>
                                </div>
                                <p>{u.note}</p>
                              </div>
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
