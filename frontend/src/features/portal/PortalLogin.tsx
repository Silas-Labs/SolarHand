/* Portal sign-in for site owners. Reuses the shared auth-screen styling; the
   session is the portal's own demo session (see portalSession.ts), separate
   from the installer/technician login. */

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { usePortal } from "./portalSession";
import { DEMO_EMAIL, DEMO_PASSWORD } from "./demo";

export function PortalLogin() {
  const navigate = useNavigate();
  const login = usePortal((s) => s.login);
  const error = usePortal((s) => s.error);
  const clearError = usePortal((s) => s.clearError);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(nextEmail: string, nextPassword: string) {
    if (login(nextEmail, nextPassword)) {
      navigate("/portal/overview", { replace: true });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(email, password);
  }

  function useDemo() {
    clearError();
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    submit(DEMO_EMAIL, DEMO_PASSWORD);
  }

  return (
    <div className="sh-authwrap">
      <div className="sh-authhero">
        <Link to="/portal" className="sh-authhero__mark" aria-label="SolarHand owner portal">
          <BrandMark />
        </Link>
        <div>
          <p className="sh-eyebrow">Owner portal</p>
          <h1>
            See your solar,
            <br />
            <span className="sh-authhero__accent">clearly.</span>
          </h1>
        </div>
        <p>
          Sign in to check how your systems are performing, download reports, and get help from your
          installer — all in one place.
        </p>
      </div>

      <form className="sh-card sh-stack" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="sh-formbanner" role="alert">
            {error}
          </div>
        )}

        <InputField
          label="Email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            clearError();
            setEmail(e.target.value);
          }}
          autoComplete="email"
          required
          placeholder="you@organisation.co.ke"
        />
        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => {
            clearError();
            setPassword(e.target.value);
          }}
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />

        <Button type="submit" block icon={<ArrowRight size={18} />}>
          Sign in
        </Button>

        <button type="button" className="sh-pt-demo-btn" onClick={useDemo}>
          Use the demo account
        </button>

        <p className="sh-pt-creds">
          Demo sign-in: <code>{DEMO_EMAIL}</code> · <code>{DEMO_PASSWORD}</code>
        </p>

        <div className="sh-authtoggle">
          <span>
            Are you an installer?{" "}
            <Link to="/login">Sign in to the field app</Link>
          </span>
        </div>
      </form>
    </div>
  );
}
