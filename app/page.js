"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "del-aire-email-tracker-v1";
const AUTH_KEY = "del-aire-auth-unlocked";
const APP_PASSWORD = process.env.NEXT_PUBLIC_TRACKER_PASSWORD || "";

const defaultSubjectTemplate =
  "Invitation for [[Organization]] to Join Del Aire CDC Day of Opportunity - Saturday, May 23";

const defaultBodyTemplate = `Hello [[Organization]] team,
[[ContactLine]]
My name is Anthony, and I am reaching out on behalf of the Del Aire Community Development Corporation. We would love to invite [[Organization]] to participate in our upcoming Day of Opportunity on Saturday, May 23.
Day of Opportunity is a community resource event where local organizations are invited to host tables on our campus and connect directly with residents. It is a chance to speak face-to-face with community members, share information about your services, and help connect people with resources they may need.
This event will take place from 10:00 AM to 2:00 PM at:
Del Aire Baptist Church
4951 W 119th Place
Hawthorne, CA 90250
Setup will take place in the church parking lot near the pink shipping container. We ask participating organizations to arrive by 9:00 AM for setup, though you are welcome to arrive as early as 8:30 AM.
We will provide up to two tables for your materials, along with canopies for shade.
This event will also take place alongside a large food giveaway that is expected to bring in well over 100 community members, helping create strong visibility and meaningful opportunities for engagement throughout the day.
Please let me know if [[Organization]] would like to attend. We would be grateful for the opportunity to have you join us.
Thank you for the work you do in the community.
Best,
Anthony Cavuoti
Del Aire Community Development Corporation
(310) 676-8352
contact@delairecdc.org`;

const seedOrganizations = [
  {
    name: "Department of Social Services",
    emails: ["falonjordan@dpss.lacounty.gov"],
    note: "",
  },
  {
    name: "Child Support Office",
    emails: [],
    note: "",
  },
  {
    name: "DCFS",
    emails: [
      "fithye@dcfs.lacounty.gov",
      "choisa@dcfs.lacounty.gov",
      "corbela@dcfs.lacounty.gov",
      "Martag@dcfs.lacounty.gov",
      "lopezje@dcfs.lacounty.gov",
      "Pounds@dcfs.lacounty.gov",
      "mealak@dcfs.lacounty.gov",
      "pageda@dcfs.lacounty.gov",
    ],
    note: "",
  },
  {
    name: "Foster to Family",
    emails: [],
    note: "Nancy Haris",
  },
  {
    name: "Financial Planning Services",
    emails: [],
    note: "",
  },
  {
    name: "Funeral Home",
    emails: ["LHawkins@inglewoodpark.org"],
    note: "",
  },
  {
    name: "So Cal Edison",
    emails: [],
    note: "",
  },
  {
    name: "Grid Alternatives",
    emails: [],
    note: "Ask Bryan",
  },
  {
    name: "Justice Center",
    emails: [],
    note: "",
  },
  {
    name: "West Angeles CDC",
    emails: [],
    note: "",
  },
  {
    name: "Center of Hope CDC",
    emails: ["ewilliams@go2hope.com"],
    note: "",
  },
  {
    name: "LA Co. Dept of Economic Development",
    emails: [],
    note: "Ask Anna.",
  },
  {
    name: "Good Plus Foundation",
    emails: [],
    note: "It is Dr. Graves",
  },
  {
    name: "Reconcile LA",
    emails: [],
    note: "",
  },
].map((org) =>
  normalizeOrg({
    ...org,
    id: uid(),
    sent: false,
    sentDate: "",
    confirmed: false,
    notes: "",
  })
);

function buildInitialState() {
  return {
    globalSubjectTemplate: defaultSubjectTemplate,
    globalBodyTemplate: defaultBodyTemplate,
    activeFilter: "all",
    search: "",
    newOrgForm: { name: "", emails: "", note: "" },
    orgs: structuredClone(seedOrganizations),
  };
}

function loadState() {
  if (typeof window === "undefined") return buildInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.orgs)) return buildInitialState();

    const globalSubjectTemplate =
      parsed.globalSubjectTemplate || defaultSubjectTemplate;
    const globalBodyTemplate = parsed.globalBodyTemplate || defaultBodyTemplate;

    return {
      globalSubjectTemplate,
      globalBodyTemplate,
      activeFilter: parsed.activeFilter || "all",
      search: parsed.search || "",
      newOrgForm: { name: "", emails: "", note: "" },
      orgs: parsed.orgs.map((org) =>
        normalizeOrg(org, globalSubjectTemplate, globalBodyTemplate)
      ),
    };
  } catch {
    return buildInitialState();
  }
}

function parseEmails(value) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function nameFromEmail(email) {
  const localPart = String(email || "").split("@")[0] || "";
  const cleaned = localPart.replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
  if (!cleaned) return "there";
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function applyTemplate(template, org) {
  const selectedEmail =
    org.selectedEmail && org.emails.includes(org.selectedEmail)
      ? org.selectedEmail
      : "";
  const recipientName = selectedEmail ? nameFromEmail(selectedEmail) : org.name;
  const contactLine = selectedEmail
    ? `I am sending this directly to ${selectedEmail} so it reaches the right contact for ${org.name}.`
    : "";

  return String(template || "")
    .replaceAll("[[Organization]]", org.name || "")
    .replaceAll("[[SelectedEmail]]", selectedEmail)
    .replaceAll("[[RecipientEmail]]", selectedEmail)
    .replaceAll("[[RecipientName]]", recipientName)
    .replaceAll("[[ContactLine]]\n", contactLine ? `${contactLine}\n` : "")
    .replaceAll("[[ContactLine]]", contactLine)
    .replace(/\n{3,}/g, "\n\n");
}

function normalizeOrg(
  org,
  subjectTemplate = defaultSubjectTemplate,
  bodyTemplate = defaultBodyTemplate
) {
  const emails = Array.isArray(org?.emails)
    ? org.emails.map((email) => String(email || "").trim()).filter(Boolean)
    : parseEmails(org?.emails);
  const selectedEmail = emails.includes(org?.selectedEmail)
    ? org.selectedEmail
    : emails[0] || "";

  const normalized = {
    id: org?.id ? String(org.id) : uid(),
    name: org?.name ? String(org.name) : "Untitled Organization",
    emails,
    selectedEmail,
    note: org?.note ? String(org.note) : "",
    notes: org?.notes ? String(org.notes) : "",
    confirmed: Boolean(org?.confirmed),
    sent: Boolean(org?.sent),
    sentDate: org?.sentDate ? String(org.sentDate) : "",
  };

  return {
    ...normalized,
    subject: org?.subject
      ? String(org.subject)
      : applyTemplate(subjectTemplate, normalized),
    body: org?.body ? String(org.body) : applyTemplate(bodyTemplate, normalized),
  };
}

function uid() {
  return `org-${Math.random().toString(36).slice(2, 10)}`;
}

function buildImportedState(parsed, current) {
  if (Array.isArray(parsed)) {
    return {
      globalSubjectTemplate: current.globalSubjectTemplate || defaultSubjectTemplate,
      globalBodyTemplate: current.globalBodyTemplate || defaultBodyTemplate,
      activeFilter: "all",
      search: "",
      newOrgForm: { name: "", emails: "", note: "" },
      orgs: parsed.map((org) =>
        normalizeOrg(
          org,
          current.globalSubjectTemplate || defaultSubjectTemplate,
          current.globalBodyTemplate || defaultBodyTemplate
        )
      ),
    };
  }

  if (!parsed || !Array.isArray(parsed.orgs)) return null;

  const subjectTemplate = parsed.globalSubjectTemplate || defaultSubjectTemplate;
  const bodyTemplate = parsed.globalBodyTemplate || defaultBodyTemplate;

  return {
    globalSubjectTemplate: subjectTemplate,
    globalBodyTemplate: bodyTemplate,
    activeFilter: parsed.activeFilter || "all",
    search: parsed.search || "",
    newOrgForm: { name: "", emails: "", note: "" },
    orgs: parsed.orgs.map((org) => normalizeOrg(org, subjectTemplate, bodyTemplate)),
  };
}

async function copyText(text) {
  const value = String(text || "");
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export default function Home() {
  const [state, setState] = useState(buildInitialState);
  const [ready, setReady] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    const unlocked = sessionStorage.getItem(AUTH_KEY) === "1";
    setIsUnlocked(unlocked);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !isUnlocked) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready, isUnlocked]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1900);
    return () => clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(() => {
    const total = state.orgs.length;
    const sent = state.orgs.filter((org) => org.sent).length;
    const confirmed = state.orgs.filter((org) => org.confirmed).length;
    const needsContact = state.orgs.filter((org) => org.emails.length === 0).length;
    return { total, sent, unsent: total - sent, confirmed, needsContact };
  }, [state.orgs]);

  const visibleOrgs = useMemo(() => {
    const query = state.search.trim().toLowerCase();
    return state.orgs.filter((org) => {
      const haystack = [
        org.name,
        org.note,
        org.notes,
        org.selectedEmail,
        org.emails.join(", "),
        org.subject,
        org.body,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesFilter =
        state.activeFilter === "all"
          ? true
          : state.activeFilter === "sent"
            ? org.sent
            : state.activeFilter === "pending"
              ? !org.sent
              : state.activeFilter === "confirmed"
                ? org.confirmed
                : state.activeFilter === "needs-contact"
                  ? org.emails.length === 0
                  : true;
      return matchesSearch && matchesFilter;
    });
  }, [state]);

  const updateOrg = (id, updater) => {
    setState((current) => ({
      ...current,
      orgs: current.orgs.map((org) => (org.id === id ? updater(org) : org)),
    }));
  };

  const showToast = (message) => setToast(message);

  const handleUnlock = (event) => {
    event.preventDefault();
    if (!APP_PASSWORD) {
      setAuthError(
        "Set NEXT_PUBLIC_TRACKER_PASSWORD in your .env.local before using the tracker."
      );
      return;
    }
    if (passwordInput !== APP_PASSWORD) {
      setAuthError("Incorrect password.");
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "1");
    setIsUnlocked(true);
    setAuthError("");
    setPasswordInput("");
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const nextState = buildImportedState(parsed, state);
      if (!nextState) {
        showToast("Could not import that JSON file.");
        return;
      }
      setState(nextState);
      showToast(`Imported ${nextState.orgs.length} organizations.`);
    } catch {
      showToast("Could not import that JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "del-aire-email-tracker.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Tracker JSON downloaded.");
  };

  const handleApplyTemplateAll = () => {
    setState((current) => ({
      ...current,
      orgs: current.orgs.map((org) => ({
        ...org,
        subject: applyTemplate(current.globalSubjectTemplate, org),
        body: applyTemplate(current.globalBodyTemplate, org),
      })),
    }));
    showToast("Template applied to all organizations.");
  };

  const handleAddOrganization = () => {
    const name = state.newOrgForm.name.trim();
    if (!name) {
      showToast("Organization name is required.");
      return;
    }
    const emails = parseEmails(state.newOrgForm.emails);
    const base = normalizeOrg(
      {
        id: uid(),
        name,
        emails,
        note: state.newOrgForm.note || "",
        notes: "",
        confirmed: false,
        sent: false,
        sentDate: "",
      },
      state.globalSubjectTemplate,
      state.globalBodyTemplate
    );
    setState((current) => ({
      ...current,
      orgs: [base, ...current.orgs],
      newOrgForm: { name: "", emails: "", note: "" },
    }));
    showToast(`${name} added.`);
  };

  const setNewOrgForm = (patch) => {
    setState((current) => ({
      ...current,
      newOrgForm: { ...current.newOrgForm, ...patch },
    }));
  };

  if (!ready) return <main className="loading">Loading tracker...</main>;

  if (!isUnlocked) {
    return (
      <main className="lock-screen">
        <section className="lock-card glass-card">
          <h1>Del Aire Vendor Tracker</h1>
          <p>
            Enter the access password to unlock. It validates against{" "}
            <code>NEXT_PUBLIC_TRACKER_PASSWORD</code>.
          </p>
          <form onSubmit={handleUnlock} className="lock-form">
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => {
                setPasswordInput(event.target.value);
                if (authError) setAuthError("");
              }}
              placeholder="Password"
              autoComplete="current-password"
            />
            <button type="submit">Unlock</button>
          </form>
          {authError ? <p className="error-text">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="liquid-blob blob-a" />
      <div className="liquid-blob blob-b" />

      <div className="wrap">
        <section className="hero glass-card">
          <h1>Organization Email Tracker</h1>
          <p>
            Track who you emailed, when you sent it, and quickly copy each
            organization&apos;s recipients, subject, and body. Everything saves in
            your browser.
          </p>
          <div className="stats-grid">
            <div className="stat-card skeuo-panel">
              <span>Total Orgs</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="stat-card skeuo-panel">
              <span>Sent</span>
              <strong>{stats.sent}</strong>
            </div>
            <div className="stat-card skeuo-panel">
              <span>Unsent</span>
              <strong>{stats.unsent}</strong>
            </div>
            <div className="stat-card skeuo-panel">
              <span>Confirmed</span>
              <strong>{stats.confirmed}</strong>
            </div>
            <div className="stat-card skeuo-panel">
              <span>Need Email Address</span>
              <strong>{stats.needsContact}</strong>
            </div>
          </div>
        </section>

        <div className="layout">
          <aside className="control-panel glass-card">
            <h2>Controls</h2>

            <label className="field">
              Search organizations
              <input
                type="search"
                value={state.search}
                onChange={(event) =>
                  setState((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Search by organization, email, or note"
              />
            </label>

            <div className="field">
              Filter
              <div className="toolbar">
                {[
                  ["all", "All"],
                  ["pending", "Unsent"],
                  ["sent", "Sent"],
                  ["confirmed", "Confirmed"],
                  ["needs-contact", "Needs Contact Info"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={state.activeFilter === value ? "soft" : ""}
                    onClick={() =>
                      setState((current) => ({ ...current, activeFilter: value }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              Default subject template
              <input
                type="text"
                value={state.globalSubjectTemplate}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    globalSubjectTemplate: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              Default email template
              <textarea
                value={state.globalBodyTemplate}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    globalBodyTemplate: event.target.value,
                  }))
                }
              />
            </label>

            <div className="button-row">
              <button className="primary" type="button" onClick={handleApplyTemplateAll}>
                Apply template to all
              </button>
              <button
                type="button"
                onClick={async () => {
                  await copyText(state.globalSubjectTemplate);
                  showToast("Default subject copied.");
                }}
              >
                Copy template subject
              </button>
              <button
                type="button"
                onClick={async () => {
                  await copyText(state.globalBodyTemplate);
                  showToast("Default body copied.");
                }}
              >
                Copy template body
              </button>
            </div>

            <hr />

            <h2>Add organization</h2>

            <label className="field">
              Organization name
              <input
                type="text"
                value={state.newOrgForm.name}
                onChange={(event) => setNewOrgForm({ name: event.target.value })}
                placeholder="Organization name"
              />
            </label>

            <label className="field">
              Emails
              <textarea
                value={state.newOrgForm.emails}
                onChange={(event) => setNewOrgForm({ emails: event.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </label>

            <label className="field">
              Contact note
              <input
                type="text"
                value={state.newOrgForm.note}
                onChange={(event) => setNewOrgForm({ note: event.target.value })}
                placeholder="Ask Bryan / Ask Anna / contact person"
              />
            </label>

            <div className="button-row">
              <button className="primary" type="button" onClick={handleAddOrganization}>
                Add organization
              </button>
            </div>

            <hr />

            <div className="button-row">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Import tracker JSON
              </button>
              <button type="button" onClick={handleDownloadJson}>
                Download tracker JSON
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (!window.confirm("Reset all progress in this browser?")) return;
                  const reset = buildInitialState();
                  setState(reset);
                  localStorage.removeItem(STORAGE_KEY);
                  showToast("Tracker reset.");
                }}
              >
                Reset all progress
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />

            <p className="small-text">
              Contact notes such as "Nancy Haris", "Ask Bryan", "Ask Anna", and "It
              is Dr. Graves" are kept as reminders when no email is available.
            </p>
          </aside>

          <section className="list">
            {visibleOrgs.length === 0 ? (
              <article className="org-card glass-card">
                <h3>No organizations match this filter.</h3>
                <p className="small-text">Try another search term or filter.</p>
              </article>
            ) : (
              visibleOrgs.map((org) => {
                const selectedEmail = org.emails.includes(org.selectedEmail)
                  ? org.selectedEmail
                  : "";

                return (
                  <article key={org.id} className="org-card glass-card">
                    <div className="org-head">
                      <div>
                        <h3>{org.name}</h3>
                        <div className="tag-row">
                          <span className={`tag ${org.sent ? "sent" : "pending"}`}>
                            {org.sent ? "Sent" : "Not Sent"}
                          </span>
                          <span className={`tag ${org.confirmed ? "sent" : "pending"}`}>
                            {org.confirmed ? "Confirmed" : "Unconfirmed"}
                          </span>
                          <span
                            className={`tag ${org.emails.length ? "neutral" : "warning"}`}
                          >
                            {org.emails.length
                              ? "Has Email Address"
                              : "Needs Email Address"}
                          </span>
                        </div>
                      </div>
                      <div className="check-stack">
                        <label>
                          <input
                            type="checkbox"
                            checked={org.confirmed}
                            onChange={(event) =>
                              updateOrg(org.id, (current) => ({
                                ...current,
                                confirmed: event.target.checked,
                              }))
                            }
                          />
                          Mark confirmed
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={org.sent}
                            onChange={(event) =>
                              updateOrg(org.id, (current) => ({
                                ...current,
                                sent: event.target.checked,
                                sentDate: event.target.checked
                                  ? new Date().toLocaleString()
                                  : "",
                              }))
                            }
                          />
                          Mark email sent
                        </label>
                      </div>
                    </div>

                    <div className="meta-grid">
                      <div className="meta-box skeuo-panel">
                        <span>Sent Date</span>
                        <strong>{org.sentDate || "Not marked sent yet"}</strong>
                      </div>
                      <div className="meta-box skeuo-panel">
                        <span>Email Array</span>
                        <strong>{org.emails.length ? JSON.stringify(org.emails) : "[]"}</strong>
                      </div>
                      <div className="meta-box skeuo-panel">
                        <span>Selected Email</span>
                        <strong>{selectedEmail || "None selected"}</strong>
                      </div>
                    </div>

                    <div className="org-grid">
                      <label className="field">
                        Recipients
                        <textarea
                          value={org.emails.join(", ")}
                          onChange={(event) => {
                            const emails = parseEmails(event.target.value);
                            updateOrg(org.id, (current) => ({
                              ...current,
                              emails,
                              selectedEmail: emails.includes(current.selectedEmail)
                                ? current.selectedEmail
                                : emails[0] || "",
                            }));
                          }}
                        />
                        <div className="email-pills">
                          {org.emails.length ? (
                            org.emails.map((email) => (
                              <div
                                key={email}
                                className={`email-pill ${
                                  email === selectedEmail ? "selected" : ""
                                }`}
                              >
                                <span>{email}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateOrg(org.id, (current) => {
                                      const next = { ...current, selectedEmail: email };
                                      return {
                                        ...next,
                                        subject: applyTemplate(
                                          state.globalSubjectTemplate,
                                          next
                                        ),
                                        body: applyTemplate(state.globalBodyTemplate, next),
                                      };
                                    });
                                    showToast(`Selected ${email} for ${org.name}.`);
                                  }}
                                >
                                  {email === selectedEmail ? "Selected" : "Use"}
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await copyText(email);
                                    showToast(`Copied ${email}`);
                                  }}
                                >
                                  Copy
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="small-text">No email address entered yet.</span>
                          )}
                        </div>
                      </label>

                      <label className="field">
                        Contact note
                        <input
                          type="text"
                          value={org.note}
                          onChange={(event) =>
                            updateOrg(org.id, (current) => ({
                              ...current,
                              note: event.target.value,
                            }))
                          }
                          placeholder="Contact reminder or internal note"
                        />
                      </label>

                      <label className="field full">
                        Notes
                        <textarea
                          value={org.notes}
                          onChange={(event) =>
                            updateOrg(org.id, (current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field full">
                        Subject
                        <input
                          type="text"
                          value={org.subject}
                          onChange={(event) =>
                            updateOrg(org.id, (current) => ({
                              ...current,
                              subject: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="field full">
                        Email body
                        <textarea
                          value={org.body}
                          onChange={(event) =>
                            updateOrg(org.id, (current) => ({
                              ...current,
                              body: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="button-row">
                      <button
                        type="button"
                        onClick={async () => {
                          await copyText(org.emails.join(", "));
                          showToast(`Copied recipient list for ${org.name}.`);
                        }}
                      >
                        Copy emails
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyText(org.subject);
                          showToast(`Copied subject for ${org.name}.`);
                        }}
                      >
                        Copy subject
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await copyText(org.body);
                          showToast(`Copied email body for ${org.name}.`);
                        }}
                      >
                        Copy body
                      </button>
                      <button
                        type="button"
                        className="soft"
                        onClick={async () => {
                          await copyText(
                            `To: ${org.emails.join(", ")}\nSubject: ${org.subject}\n\n${org.body}`
                          );
                          showToast(`Copied full package for ${org.name}.`);
                        }}
                      >
                        Copy full package
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateOrg(org.id, (current) => ({
                            ...current,
                            subject: applyTemplate(state.globalSubjectTemplate, current),
                            body: applyTemplate(state.globalBodyTemplate, current),
                          }));
                          showToast(`Template reapplied to ${org.name}.`);
                        }}
                      >
                        Reapply template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const to = encodeURIComponent(org.emails.join(","));
                          const subject = encodeURIComponent(org.subject);
                          const body = encodeURIComponent(org.body);
                          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
                        }}
                      >
                        Open mail draft
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          if (!window.confirm(`Delete ${org.name} from the tracker?`)) {
                            return;
                          }
                          setState((current) => ({
                            ...current,
                            orgs: current.orgs.filter((entry) => entry.id !== org.id),
                          }));
                          showToast(`${org.name} deleted.`);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>

      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </main>
  );
}
