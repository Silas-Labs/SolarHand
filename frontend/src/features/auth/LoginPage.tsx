import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { InputField } from "@/components/ui/Field";
import { useAuth } from "@/store/auth";
import type { RegisterRequest } from "@/lib/types";

type Mode = "signin" | "register";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const registerOrg = useAuth((s) => s.registerOrg);
  const error = useAuth((s) => s.error);
  const status = useAuth((s) => s.status);
  const clearError = useAuth((s) => s.clearError);

  const [mode, setMode] = useState<Mode>("signin");
  const busy = status === "authenticating";

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register (org onboarding) fields
  const [orgName, setOrgName] = useState("");
  const [county, setCounty] = useState("");
  const [fullName, setFullName] = useState("");
  const [contractorLicense, setContractorLicense] = useState("");

  function switchMode(next: Mode) {
    clearError();
    setMode(next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        const payload: RegisterRequest = {
          company: {
            name: orgName.trim(),
            county: county.trim() || null,
            epra_contractor_license: contractorLicense.trim() || null,
          },
          admin: { email: email.trim(), full_name: fullName.trim(), password },
        };
        await registerOrg(payload);
      }
      navigate("/jobs", { replace: true });
    } catch {
      /* error surfaced via the store banner */
    }
  }

  return (
    <div className="sh-authwrap">
      <div className="sh-authhero">
        <BrandMark className="sh-authhero__mark" />
        <div>
          <p className="sh-eyebrow">Field service &amp; EPRA compliance</p>
          <h1>
            Solar work,
            <br />
            <span className="sh-authhero__accent">verified on site.</span>
          </h1>
        </div>
        <p>
          Log jobs, capture meter readings, and catch underperforming systems —
          even with no signal. Everything syncs when you reconnect.
        </p>
      </div>

      <form className="sh-card sh-stack" onSubmit={onSubmit} noValidate>
        {error && (
          <div className="sh-formbanner" role="alert">
            {error}
          </div>
        )}

        {mode === "register" && (
          <>
            <InputField
              label="Company name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              autoComplete="organization"
              required
              placeholder="e.g. Rift Solar Ltd"
            />
            <InputField
              label="County"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g. Kisumu"
            />
            <InputField
              label="EPRA contractor licence"
              hint="Optional — you can add this later."
              value={contractorLicense}
              onChange={(e) => setContractorLicense(e.target.value)}
              placeholder="e.g. T3/1234"
            />
            <InputField
              label="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
              placeholder="Full name"
            />
          </>
        )}

        <InputField
          label="Email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="you@company.co.ke"
        />
        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 8 : undefined}
          hint={mode === "register" ? "At least 8 characters." : undefined}
          placeholder="••••••••"
        />

        <Button type="submit" block loading={busy}>
          {mode === "signin" ? "Sign in" : "Create organisation"}
        </Button>

        <div className="sh-authtoggle">
          {mode === "signin" ? (
            <span>
              New installer?{" "}
              <button type="button" onClick={() => switchMode("register")}>
                Create an organisation
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")}>
                Sign in
              </button>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
