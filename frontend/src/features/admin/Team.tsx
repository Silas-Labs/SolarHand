/* Team — manage the company's people. Admins add members, change roles, edit
   EPRA technician licences, reset passwords and deactivate accounts. The signed-
   in admin is guarded from demoting or deactivating themselves so they can't get
   locked out. Online-first via useAsync + direct API writes. */

import { useMemo, useState } from "react";
import { ShieldCheck, UserPlus, Wrench, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { InputField, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Spinner";
import { toast } from "@/store/toast";
import type { Role, UserCreate, UserRead, UserUpdate } from "@/lib/types";

interface MemberForm {
  email: string;
  full_name: string;
  password: string;
  role: Role;
  epra_technician_license: string;
}

const EMPTY_FORM: MemberForm = {
  email: "",
  full_name: "",
  password: "",
  role: "technician",
  epra_technician_license: "",
};

export function Team() {
  const currentUserId = useAuth((s) => s.user?.id ?? null);
  const { data, loading, error, reload } = useAsync(() => api.listUsers(), []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const members = useMemo(
    () =>
      [...(Array.isArray(data) ? data : [])].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      }),
    [data],
  );

  const canSubmit =
    form.email.trim() !== "" &&
    form.full_name.trim() !== "" &&
    form.password.length >= 8 &&
    !submitting;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const payload: UserCreate = {
      email: form.email.trim(),
      full_name: form.full_name.trim(),
      password: form.password,
      role: form.role,
      epra_technician_license: form.epra_technician_license.trim() || null,
    };
    try {
      await api.createUser(payload);
      toast.success("Member added.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(
        err && typeof err === "object" && "detail" in err
          ? String((err as { detail: unknown }).detail)
          : "Couldn't add that member. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const set = <K extends keyof MemberForm>(key: K, value: MemberForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <div className="sh-pagehead">
        <div>
          <p className="sh-eyebrow">People &amp; access</p>
          <h1>Team</h1>
        </div>
        <Button
          icon={showForm ? <X aria-hidden /> : <UserPlus aria-hidden />}
          variant={showForm ? "ghost" : "primary"}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "Add member"}
        </Button>
      </div>

      {showForm && (
        <form className="sh-card sh-adm-form" onSubmit={onCreate}>
          <div className="sh-adm-form__grid">
            <InputField
              label="Full name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              autoComplete="off"
              required
            />
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="off"
              required
            />
            <InputField
              label="Temporary password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              hint="At least 8 characters — the member can change it later"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <SelectField
              label="Role"
              value={form.role}
              onChange={(e) => set("role", e.target.value as Role)}
            >
              <option value="technician">Technician</option>
              <option value="admin">Administrator</option>
            </SelectField>
            <InputField
              label="EPRA licence"
              hint="Technician licence no. (optional)"
              value={form.epra_technician_license}
              onChange={(e) => set("epra_technician_license", e.target.value)}
            />
          </div>
          <div className="sh-btnrow">
            <Button type="submit" variant="primary" loading={submitting} disabled={!canSubmit}>
              Add member
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading label="Loading team…" />
      ) : error ? (
        <EmptyState title="Couldn't load the team">
          {error} <button className="sh-linklike" onClick={reload}>Retry</button>
        </EmptyState>
      ) : members.length === 0 ? (
        <EmptyState title="No team members yet">
          Add your first technician to start assigning work.
        </EmptyState>
      ) : (
        <div className="sh-list">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isSelf={member.id === currentUserId}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* One member, with role/active controls and an expandable edit panel. */
function MemberRow({
  member,
  isSelf,
  onChanged,
}: {
  member: UserRead;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(member.full_name);
  const [license, setLicense] = useState(member.epra_technician_license ?? "");
  const [password, setPassword] = useState("");

  async function patch(payload: UserUpdate, okMsg: string) {
    setBusy(true);
    try {
      await api.updateUser(member.id, payload);
      toast.success(okMsg);
      onChanged();
    } catch {
      toast.error("Update failed. Try again.");
      setBusy(false);
    }
  }

  async function onSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    const payload: UserUpdate = {};
    if (fullName.trim() && fullName.trim() !== member.full_name) {
      payload.full_name = fullName.trim();
    }
    const nextLicense = license.trim() || null;
    if (nextLicense !== (member.epra_technician_license ?? null)) {
      payload.epra_technician_license = nextLicense;
    }
    if (password.length > 0) {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      payload.password = password;
    }
    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }
    await patch(payload, "Member updated.");
    setPassword("");
    setEditing(false);
  }

  return (
    <div className="sh-card sh-adm-member" data-busy={busy || undefined}>
      <div className="sh-row sh-row--between">
        <div style={{ minWidth: 0 }}>
          <div className="sh-row" style={{ gap: "var(--sh-sp-2)" }}>
            <span className="sh-title-sm sh-truncate">{member.full_name}</span>
            <Chip tone={member.role === "admin" ? "amber" : "neutral"}>
              {member.role === "admin" ? (
                <>
                  <ShieldCheck aria-hidden /> Admin
                </>
              ) : (
                <>
                  <Wrench aria-hidden /> Technician
                </>
              )}
            </Chip>
            {!member.is_active && <Chip tone="alert">Inactive</Chip>}
          </div>
          <p className="sh-adm-member__email sh-truncate">{member.email}</p>
          {member.epra_technician_license ? (
            <p className="sh-adm-member__lic sh-mono">
              EPRA {member.epra_technician_license}
            </p>
          ) : null}
        </div>
      </div>

      <div className="sh-adm-member__controls">
        <label className="sh-adm-minifield">
          <span>Role</span>
          <select
            className="sh-select sh-select--sm"
            value={member.role}
            disabled={busy || isSelf}
            title={isSelf ? "You can't change your own role" : undefined}
            onChange={(e) => void patch({ role: e.target.value as Role }, "Role updated.")}
          >
            <option value="technician">Technician</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <div className="sh-adm-member__actions">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing((v) => !v)}
            disabled={busy}
          >
            {editing ? "Close" : "Edit"}
          </Button>
          <Button
            size="sm"
            variant={member.is_active ? "danger" : "go"}
            disabled={busy || isSelf}
            title={isSelf ? "You can't deactivate yourself" : undefined}
            onClick={() =>
              void patch(
                { is_active: !member.is_active },
                member.is_active ? "Member deactivated." : "Member reactivated.",
              )
            }
          >
            {member.is_active ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {editing && (
        <form className="sh-adm-member__edit" onSubmit={onSaveDetails}>
          <div className="sh-adm-form__grid">
            <InputField
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <InputField
              label="EPRA licence"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="—"
            />
            <InputField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="Leave blank to keep the current password"
              autoComplete="new-password"
            />
          </div>
          <div className="sh-btnrow">
            <Button type="submit" variant="primary" size="sm" loading={busy}>
              Save changes
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
