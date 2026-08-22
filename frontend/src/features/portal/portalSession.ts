/* Customer-portal session (Zustand).
   ----------------------------------------------------------------------------
   Deliberately separate from the installer `useAuth` store: the portal has its
   own demo session and its own localStorage keys, so signing in (or out) here
   never disturbs a technician/admin session or the offline sync engine.

   Both the signed-in customer and the support tickets are persisted to
   localStorage, so a demo survives a page reload — and the whole thing keeps
   working offline once the app shell is cached. */

import { create } from "zustand";
import { newId } from "@/lib/util";
import {
  DEMO_CUSTOMER,
  DEMO_PASSWORD,
  SEED_TICKETS,
  type PortalCustomer,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from "./demo";

const SESSION_KEY = "solarhand.portal.session";
const TICKETS_KEY = "solarhand.portal.tickets";

type PortalStatus = "unknown" | "anon" | "authed";

export interface TicketDraft {
  subject: string;
  siteId: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
}

interface PortalState {
  customer: PortalCustomer | null;
  status: PortalStatus;
  error: string | null;
  tickets: Ticket[];
  bootstrap: () => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  clearError: () => void;
  raiseTicket: (draft: TicketDraft) => Ticket;
}

function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    if (!raw) return SEED_TICKETS;
    const parsed = JSON.parse(raw) as Ticket[];
    return Array.isArray(parsed) ? parsed : SEED_TICKETS;
  } catch {
    return SEED_TICKETS;
  }
}

function saveTickets(tickets: Ticket[]): void {
  try {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    /* ignore quota / private-mode errors — demo state is best-effort */
  }
}

function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function nextRef(tickets: Ticket[]): string {
  const nums = tickets
    .map((t) => Number.parseInt(t.ref.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 2050;
  return `SUP-${max + 1}`;
}

export const usePortal = create<PortalState>((set, get) => ({
  customer: null,
  status: "unknown",
  error: null,
  tickets: SEED_TICKETS,

  bootstrap() {
    const tickets = loadTickets();
    if (hasSession()) {
      set({ customer: DEMO_CUSTOMER, status: "authed", tickets });
    } else {
      set({ status: "anon", tickets });
    }
  },

  login(email, password) {
    if (password !== DEMO_PASSWORD) {
      set({ error: "That password doesn't match. Try the demo password shown below." });
      return false;
    }
    try {
      localStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore — session still holds in memory for this tab */
    }
    // Any email is accepted for the demo; the signed-in customer is always the
    // seeded school so the portal has data to show.
    void email;
    set({ customer: DEMO_CUSTOMER, status: "authed", error: null, tickets: loadTickets() });
    return true;
  },

  logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    set({ customer: null, status: "anon", error: null });
  },

  clearError() {
    set({ error: null });
  },

  raiseTicket(draft) {
    const now = new Date().toISOString();
    const ticket: Ticket = {
      id: newId(),
      ref: nextRef(get().tickets),
      subject: draft.subject.trim(),
      siteId: draft.siteId,
      category: draft.category,
      priority: draft.priority,
      description: draft.description.trim(),
      status: "open",
      createdAt: now,
      updates: [
        { at: now, by: "You", note: "Request submitted to your installer.", status: "open" },
      ],
    };
    const tickets = [ticket, ...get().tickets];
    saveTickets(tickets);
    set({ tickets });
    return ticket;
  },
}));
