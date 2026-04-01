"use client";

import { useEffect, useState } from "react";
import {
  buildResumePreview,
  getContacts,
  getNetworkSummary,
  getProjectTargets,
  getProjects,
  getResumeReadiness,
  getResumeVersions,
  saveResumeVersions,
  upsertContact,
  upsertProject,
  type NetworkContact,
  type ProjectEntry,
  type ResumeVersion,
} from "@/lib/career-store";
import { getProfileMeta, saveProfileMeta } from "@/lib/momentum";

type HuntTab = "NETWORK" | "PROJECTS" | "RESUME";

function emptyContact(): NetworkContact {
  return {
    id: crypto.randomUUID(),
    name: "",
    company: "",
    role: "",
    linkedinUrl: "",
    lastContactDate: "",
    nextFollowUpDate: "",
    relationshipStrength: 3,
    notes: "",
    context: "",
    response: "",
  };
}

function emptyProject(): ProjectEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    status: "IN_PROGRESS",
    stack: "",
    githubUrl: "",
    liveUrl: "",
    oneLiner: "",
    impressiveFacts: ["", "", ""],
    resumeBullet: "",
    qualityRating: 0,
    qualityFeedback: "",
  };
}

function emptyVersion(): ResumeVersion {
  return {
    id: crypto.randomUUID(),
    name: "Custom version",
    tone: "STARTUP",
    emphasis: "",
  };
}

function parseScore(text: string, label: "ATS Score" | "Project Quality") {
  const match = text.match(new RegExp(`${label}:\\s*(\\d+)\\/(\\d+)`));
  return match ? Number(match[1]) : 0;
}

function statusTone(status: ProjectEntry["status"]) {
  if (status === "COMPLETE") return "border-[#13442f] bg-[#081b14] text-[#79e2ae]";
  if (status === "ABANDONED") return "border-[#4a1717] bg-[#1b0909] text-[#f0a6a6]";
  return "border-[#14386d] bg-[#091526] text-[#8dbdff]";
}

function formatStars(value: number) {
  return "★".repeat(value) + "☆".repeat(Math.max(0, 5 - value));
}

export default function HuntPage() {
  const [tab, setTab] = useState<HuntTab>("NETWORK");
  const [, setContacts] = useState<NetworkContact[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [cgpa, setCgpa] = useState("6.5");
  const [selectedVersionId, setSelectedVersionId] = useState("amazon");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setContacts(getContacts());
      setProjects(getProjects());
      setVersions(getResumeVersions());
      setCgpa(String(getProfileMeta().cgpa || 6.5));
    };

    sync();
    window.addEventListener("momentum:data-changed", sync);
    return () => window.removeEventListener("momentum:data-changed", sync);
  }, []);

  useEffect(() => {
    if (projects.length === 0) return;
    const profile = getProfileMeta();
    const activeProjects = projects.filter((project) => project.status !== "ABANDONED").length;
    if (profile.projects !== activeProjects || profile.cgpa !== Number(cgpa || "0")) {
      saveProfileMeta({ projects: activeProjects, cgpa: Number(cgpa || "0") });
    }
  }, [cgpa, projects]);

  const network = getNetworkSummary();
  const projectTargets = getProjectTargets();
  const resumeReadiness = getResumeReadiness();
  const resumePreview = buildResumePreview(selectedVersionId);

  function updateContact(contact: NetworkContact) {
    upsertContact(contact);
    setContacts(getContacts());
  }

  function updateProject(project: ProjectEntry) {
    upsertProject(project);
    setProjects(getProjects());
  }

  async function generateNetworkMessage(contact: NetworkContact) {
    setLoadingId(contact.id);
    try {
      const response = await fetch("/api/hunt-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "network-message",
          name: contact.name,
          company: contact.company,
          role: contact.role,
          progress: `This month I stayed active on LeetCode, kept shipping MOMENTUM, and I am tracking progress toward the referral milestone.`,
          stats: `Relationship strength ${contact.relationshipStrength}/5. Context: ${contact.context}. Notes: ${contact.notes}.`,
        }),
      });
      const data = (await response.json()) as { text?: string };
      updateContact({ ...contact, notes: `${contact.notes}\n\nSuggested update:\n${data.text?.trim() || ""}`.trim() });
    } finally {
      setLoadingId(null);
    }
  }

  async function generateResumeBullet(project: ProjectEntry) {
    setLoadingId(project.id);
    try {
      const response = await fetch("/api/hunt-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "project-bullet",
          projectName: project.name,
          stack: project.stack,
          oneLiner: project.oneLiner,
          facts: project.impressiveFacts.filter(Boolean),
        }),
      });
      const data = (await response.json()) as { text?: string };
      updateProject({ ...project, resumeBullet: data.text?.trim() || project.resumeBullet });
    } finally {
      setLoadingId(null);
    }
  }

  async function rateProject(project: ProjectEntry) {
    setLoadingId(project.id);
    try {
      const response = await fetch("/api/hunt-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "project-rating",
          projectName: project.name,
          stack: project.stack,
          oneLiner: project.oneLiner,
          facts: project.impressiveFacts.filter(Boolean),
        }),
      });
      const data = (await response.json()) as { text?: string };
      const feedback = data.text?.trim() || "";
      updateProject({
        ...project,
        qualityRating: parseScore(feedback, "Project Quality"),
        qualityFeedback: feedback,
      });
    } finally {
      setLoadingId(null);
    }
  }

  async function scoreResume() {
    setLoadingId("resume-score");
    try {
      const response = await fetch("/api/hunt-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resume-score",
          resumeText: resumePreview,
        }),
      });
      const data = (await response.json()) as { text?: string };
      const current = versions.find((version) => version.id === selectedVersionId);
      if (!current) return;
      const score = parseScore(data.text?.trim() || "", "ATS Score");
      const nextVersion = {
        ...current,
        emphasis: `${current.emphasis}\n\n${data.text?.trim() || ""}\nATS parsed score: ${score}/100`.trim(),
      };
      const nextVersions = versions.map((version) => (version.id === current.id ? nextVersion : version));
      setVersions(nextVersions);
      saveResumeVersions(nextVersions);
    } finally {
      setLoadingId(null);
    }
  }

  function addNewContact() {
    updateContact(emptyContact());
  }

  function addNewProject() {
    updateProject(emptyProject());
  }

  function addResumeVersion() {
    const nextVersions = [...versions, emptyVersion()];
    setVersions(nextVersions);
    saveResumeVersions(nextVersions);
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-36 pt-5">
      <p className="text-[12px] tracking-[0.18em] text-white/45">HUNT</p>
      <p className="mt-3 text-[24px] font-semibold tracking-[0.04em] text-white">
        Warm the network. Build proof. Keep the resume ready.
      </p>

      <section className="mt-6 grid grid-cols-3 gap-2 rounded-[28px] border border-white/8 bg-[#090909] p-2">
        {(["NETWORK", "PROJECTS", "RESUME"] as HuntTab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-[20px] px-3 py-3 text-[11px] font-semibold tracking-[0.14em] ${
              tab === item ? "bg-white text-black" : "bg-black/20 text-white/55"
            }`}
          >
            {item}
          </button>
        ))}
      </section>

      {tab === "NETWORK" && (
        <>
          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">MONTHLY NETWORK GOAL</p>
            <p className="mt-3 text-[30px] font-semibold text-white">
              {network.contactedThisMonth}/{network.monthlyTarget}
            </p>
            <p className="mt-2 text-[14px] text-white/62">
              Contact 2 people in your network this month.
            </p>
          </section>

          <div className="mt-4 space-y-4">
            {network.contacts.map((contact) => (
              <section key={contact.id} className="rounded-[30px] border border-white/8 bg-[#090909] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-semibold text-white">{contact.name || "New contact"}</p>
                    <p className="mt-1 text-[13px] text-white/55">
                      {[contact.company, contact.role].filter(Boolean).join(" — ") || "Add company and role"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[0.12em] ${
                      contact.reminderTone === "RED"
                        ? "border-[#592222] bg-[#1d0a0a] text-[#f0aaaa]"
                        : contact.reminderTone === "AMBER"
                          ? "border-[#5f4610] bg-[#1f1605] text-[#fbbf24]"
                          : "border-white/10 bg-black/20 text-white/55"
                    }`}
                  >
                    {contact.staleDays >= 60 ? "FOLLOW UP NOW" : contact.staleDays >= 30 ? "UPDATE DUE" : "WARM"}
                  </span>
                </div>

                {contact.staleDays >= 30 && (
                  <p className="mt-4 text-[13px] text-[#fbbf24]">
                    You haven&apos;t updated {contact.name || "this contact"} in {contact.staleDays} days. Send a quick progress update.
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3 text-[13px] text-white/72">
                  <label>
                    <span className="text-white/45">Last contact</span>
                    <input
                      value={contact.lastContactDate}
                      onChange={(event) => updateContact({ ...contact, lastContactDate: event.target.value })}
                      type="date"
                      className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white"
                    />
                  </label>
                  <label>
                    <span className="text-white/45">Next follow-up</span>
                    <input
                      value={contact.nextFollowUpDate}
                      onChange={(event) => updateContact({ ...contact, nextFollowUpDate: event.target.value })}
                      type="date"
                      className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white"
                    />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-[13px] text-white/72">
                  <input
                    value={contact.name}
                    onChange={(event) => updateContact({ ...contact, name: event.target.value })}
                    placeholder="Name"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white placeholder:text-white/25"
                  />
                  <input
                    value={contact.company}
                    onChange={(event) => updateContact({ ...contact, company: event.target.value })}
                    placeholder="Company"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white placeholder:text-white/25"
                  />
                  <input
                    value={contact.role}
                    onChange={(event) => updateContact({ ...contact, role: event.target.value })}
                    placeholder="Role"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white placeholder:text-white/25"
                  />
                  <input
                    value={contact.linkedinUrl}
                    onChange={(event) => updateContact({ ...contact, linkedinUrl: event.target.value })}
                    placeholder="LinkedIn URL"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white placeholder:text-white/25"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-[13px] text-white/72">
                    <span className="text-white/45">Response</span>
                    <input
                      value={contact.response}
                      onChange={(event) => updateContact({ ...contact, response: event.target.value })}
                      placeholder="Waiting / Warm / Replied"
                      className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white placeholder:text-white/25"
                    />
                  </label>
                  <label className="text-[13px] text-white/72">
                    <span className="text-white/45">Relationship strength</span>
                    <select
                      value={String(contact.relationshipStrength)}
                      onChange={(event) =>
                        updateContact({ ...contact, relationshipStrength: Number(event.target.value) as NetworkContact["relationshipStrength"] })
                      }
                      className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value} star
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <textarea
                  value={contact.notes}
                  onChange={(event) => updateContact({ ...contact, notes: event.target.value })}
                  rows={4}
                  placeholder="Notes"
                  className="mt-3 w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-6 text-white placeholder:text-white/25"
                />
                <textarea
                  value={contact.context}
                  onChange={(event) => updateContact({ ...contact, context: event.target.value })}
                  rows={2}
                  placeholder="Context"
                  className="mt-3 w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-6 text-white placeholder:text-white/25"
                />

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[13px] text-[#fbbf24]">{formatStars(contact.relationshipStrength)}</p>
                  <button
                    type="button"
                    onClick={() => generateNetworkMessage(contact)}
                    className="rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/12 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-[#fbbf24]"
                  >
                    {loadingId === contact.id ? "GENERATING" : "GENERATE UPDATE MESSAGE"}
                  </button>
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={addNewContact}
            className="mt-4 w-full rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 text-[12px] font-semibold tracking-[0.14em] text-white"
          >
            ADD NEW CONTACT
          </button>
        </>
      )}

      {tab === "PROJECTS" && (
        <>
          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">PROJECT TARGETS</p>
            <p className="mt-3 text-[28px] font-semibold text-white">
              {projectTargets.activeProjects}/{projectTargets.phaseTwoTarget} projects
            </p>
            <div className="mt-4 h-2 rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[#3b82f6]"
                style={{ width: `${Math.min(100, (projectTargets.activeProjects / projectTargets.phaseTwoTarget) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-[14px] text-white/62">
              Phase 1 target: {projectTargets.phaseOneTarget} by Jun 2026. Phase 2 target: {projectTargets.phaseTwoTarget} by Oct 2026.
            </p>
            <p className="mt-2 text-[14px] text-[#fbbf24]">
              You need {Math.max(0, projectTargets.phaseTwoTarget - projectTargets.activeProjects)} more projects to unlock cousin&apos;s referral.
            </p>
          </section>

          <div className="mt-4 space-y-4">
            {projects.map((project, index) => (
              <section key={project.id} className="rounded-[30px] border border-white/8 bg-[#090909] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] tracking-[0.18em] text-white/45">PROJECT #{index + 1}</p>
                    <p className="mt-2 text-[18px] font-semibold text-white">{project.name || "Untitled project"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] text-[#fbbf24]">{project.qualityRating > 0 ? formatStars(project.qualityRating) : "☆☆☆☆☆"}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[0.12em] ${statusTone(project.status)}`}>
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <input
                    value={project.name}
                    onChange={(event) => updateProject({ ...project, name: event.target.value })}
                    placeholder="Project name"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white placeholder:text-white/25"
                  />
                  <select
                    value={project.status}
                    onChange={(event) => updateProject({ ...project, status: event.target.value as ProjectEntry["status"] })}
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white"
                  >
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="COMPLETE">COMPLETE</option>
                    <option value="ABANDONED">ABANDONED</option>
                  </select>
                  <input
                    value={project.stack}
                    onChange={(event) => updateProject({ ...project, stack: event.target.value })}
                    placeholder="Stack"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white placeholder:text-white/25"
                  />
                  <input
                    value={project.githubUrl}
                    onChange={(event) => updateProject({ ...project, githubUrl: event.target.value })}
                    placeholder="GitHub URL"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white placeholder:text-white/25"
                  />
                  <input
                    value={project.liveUrl}
                    onChange={(event) => updateProject({ ...project, liveUrl: event.target.value })}
                    placeholder="Live URL"
                    className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white placeholder:text-white/25"
                  />
                  <div className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white/62">
                    Quality: {project.qualityRating}/5
                  </div>
                </div>

                <textarea
                  value={project.oneLiner}
                  onChange={(event) => updateProject({ ...project, oneLiner: event.target.value })}
                  rows={2}
                  placeholder="What it does in one line"
                  className="mt-3 w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-6 text-white placeholder:text-white/25"
                />

                <div className="mt-3 space-y-2">
                  {project.impressiveFacts.map((fact, factIndex) => (
                    <input
                      key={`${project.id}-fact-${factIndex}`}
                      value={fact}
                      onChange={(event) => {
                        const facts = [...project.impressiveFacts];
                        facts[factIndex] = event.target.value;
                        updateProject({ ...project, impressiveFacts: facts });
                      }}
                      placeholder={`Impressive fact ${factIndex + 1}`}
                      className="w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-[13px] text-white placeholder:text-white/25"
                    />
                  ))}
                </div>

                <textarea
                  value={project.resumeBullet}
                  onChange={(event) => updateProject({ ...project, resumeBullet: event.target.value })}
                  rows={3}
                  placeholder="Resume bullet"
                  className="mt-3 w-full rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-[13px] leading-6 text-white placeholder:text-white/25"
                />

                {project.qualityFeedback && (
                  <div className="mt-3 rounded-[22px] border border-white/8 bg-black/20 p-4 text-[13px] leading-6 text-white/72">
                    <pre className="whitespace-pre-wrap font-inherit">{project.qualityFeedback}</pre>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => generateResumeBullet(project)}
                    className="rounded-[18px] border border-white/12 bg-white/6 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-white"
                  >
                    {loadingId === project.id ? "GENERATING" : "GENERATE RESUME BULLET"}
                  </button>
                  <button
                    type="button"
                    onClick={() => rateProject(project)}
                    className="rounded-[18px] border border-[#fbbf24]/20 bg-[#fbbf24]/12 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-[#fbbf24]"
                  >
                    {loadingId === project.id ? "RATING" : "RATE MY PROJECT"}
                  </button>
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            onClick={addNewProject}
            className="mt-4 w-full rounded-[24px] border border-white/12 bg-white/6 px-4 py-4 text-[12px] font-semibold tracking-[0.14em] text-white"
          >
            ADD PROJECT
          </button>
        </>
      )}

      {tab === "RESUME" && (
        <>
          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">RESUME READINESS</p>
            <p className="mt-3 text-[32px] font-semibold text-white">{resumeReadiness.readiness}/100</p>
            <p className="mt-2 text-[14px] text-[#fbbf24]">{resumeReadiness.band}</p>
            <div className="mt-4 h-2 rounded-full bg-white/8">
              <div className="h-full rounded-full bg-[#fbbf24]" style={{ width: `${resumeReadiness.readiness}%` }} />
            </div>
          </section>

          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <p className="text-[11px] tracking-[0.18em] text-white/45">PROFILE INPUTS</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[13px] text-white/72">
                <span className="text-white/45">CGPA</span>
                <input
                  value={cgpa}
                  onChange={(event) => setCgpa(event.target.value)}
                  placeholder="6.5"
                  className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white placeholder:text-white/25"
                />
              </label>
              <label className="text-[13px] text-white/72">
                <span className="text-white/45">Version</span>
                <select
                  value={selectedVersionId}
                  onChange={(event) => setSelectedVersionId(event.target.value)}
                  className="mt-2 w-full rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-white"
                >
                  {versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {version.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <input
                    value={version.name}
                    onChange={(event) => {
                      const next = versions.map((item) => (item.id === version.id ? { ...item, name: event.target.value } : item));
                      setVersions(next);
                      saveResumeVersions(next);
                    }}
                    className="w-full bg-transparent text-[14px] font-semibold text-white"
                  />
                  <textarea
                    value={version.emphasis}
                    onChange={(event) => {
                      const next = versions.map((item) => (item.id === version.id ? { ...item, emphasis: event.target.value } : item));
                      setVersions(next);
                      saveResumeVersions(next);
                    }}
                    rows={3}
                    className="mt-3 w-full rounded-[18px] border border-white/10 bg-[#060606] px-3 py-3 text-[13px] leading-6 text-white"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addResumeVersion}
              className="mt-4 rounded-full border border-white/12 bg-white/6 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-white"
            >
              ADD VERSION
            </button>
          </section>

          <section className="mt-4 rounded-[30px] border border-white/8 bg-[#090909] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] tracking-[0.18em] text-white/45">RESUME PREVIEW</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={scoreResume}
                  className="rounded-full border border-[#fbbf24]/20 bg-[#fbbf24]/12 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-[#fbbf24]"
                >
                  {loadingId === "resume-score" ? "SCORING" : "SCORE MY RESUME FOR AMAZON"}
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(resumePreview)}
                  className="rounded-full border border-white/12 bg-white/6 px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-white"
                >
                  COPY TEXT
                </button>
              </div>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-[24px] border border-white/8 bg-black/20 p-4 text-[12px] leading-6 text-white/82">
              {resumePreview}
            </pre>
          </section>
        </>
      )}
    </main>
  );
}
