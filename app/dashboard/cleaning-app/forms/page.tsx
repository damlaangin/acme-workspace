"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "@/styles/app/forms/Forms.module.scss";
import {
  LuCalendarDays,
  LuClock,
  LuMapPin,
  LuTriangleAlert,
  LuFlag,
  LuCircleCheck,
} from "react-icons/lu";
import CleaningBreadcrumb from "@/components/app/cleaning-app/CleaningBreadcrumb";
import ZoneSelector, {
  type ZoneFilter,
} from "@/components/app/cleaning-app/ZoneSelector";
import EmptyLook from "@/components/ui/EmptyLook";
import { formsService } from "@/lib/services/forms.service";
import { proxyAuthService } from "@/lib/services/proxy-auth.service";
import { useWorkspace } from "@/context/workspace-context";
import {
  FormSubmissionFull,
  FormSubmissionList,
  FormSubmissionStatus,
} from "@/types/api";

type StatusFilter = "all" | FormSubmissionStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_followup", label: "Flagged" },
];

const STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  needs_followup: "Needs Follow-Up",
};

const REVIEW_VERB: Record<FormSubmissionStatus, string> = {
  pending: "Reviewed",
  approved: "Approved",
  rejected: "Rejected",
  needs_followup: "Flagged",
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
};

const formatDateOnly = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTimeRange = (
  start?: string | null,
  end?: string | null,
): string => {
  if (!start) return "";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "";
  const startStr = startDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!end) return startStr;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startStr;
  const endStr = endDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} - ${endStr}`;
};

type ChatMessage = {
  id: number;
  role: "cleaner" | "admin";
  sender_name: string;
  text: string;
  created_at: string;
};

type AnswerRow = { id: number; question: string; answerType: string; answer: string };

const formatClock = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

export default function FormsPage() {
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    document.body.classList.add("cleaning-forms");
    return () => document.body.classList.remove("cleaning-forms");
  }, []);

  const [submissions, setSubmissions] = useState<FormSubmissionList[]>([]);
  const [selectedSubmission, setSelectedSubmission] =
    useState<FormSubmissionList | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [imageFailed, setImageFailed] = useState(false);

  // Filled-in answers (center) and cleaner/admin chat (right) for the selected submission.
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Bumped on filter or selection change. Captured before each review API
  // call and re-checked after the await — if it changed, the user moved on
  // and the response is stale, so we skip applying it.
  const actionTokenRef = useRef(0);

  // Auto-clear the action banner after 5s so it doesn't linger forever
  useEffect(() => {
    if (!actionError) return;
    const handle = window.setTimeout(() => setActionError(null), 5000);
    return () => window.clearTimeout(handle);
  }, [actionError]);

  // Fetch submissions whenever the workspace, status filter, or zone filter
  // changes (server-side filtering via ?status=, ?country_id=, etc.).
  useEffect(() => {
    actionTokenRef.current++;
    if (!currentWorkspace?.id) {
      setSubmissions([]);
      setSelectedSubmission(null);
      return;
    }

    let isActive = true;

    const fetchSubmissions = async () => {
      const response = await formsService.getFormSubmissions(
        currentWorkspace.id,
        {
          ...(filter === "all" ? {} : { status: filter }),
          country_id: zoneFilter.countryId,
          state_id: zoneFilter.stateId,
          city_id: zoneFilter.cityId,
        },
      );

      if (!isActive) return;

      if (response.success && response.data?.results) {
        const results = response.data.results;
        setSubmissions(results);
        setSelectedSubmission((prev) => {
          if (prev) {
            const stillThere = results.find((item) => item.id === prev.id);
            if (stillThere) return stillThere;
          }
          return results[0] ?? null;
        });
      } else {
        setSubmissions([]);
        setSelectedSubmission(null);
      }
    };

    fetchSubmissions();

    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id, filter, zoneFilter]);

  // Reset the per-submission UI bits when selection changes
  useEffect(() => {
    actionTokenRef.current++;
    setImageFailed(false);
    setReviewNote("");
    setActionError(null);
  }, [selectedSubmission?.id]);

  useEffect(() => {
    const workspaceId = currentWorkspace?.id;
    const submissionId = selectedSubmission?.id;
    if (!workspaceId || !submissionId) {
      setAnswers([]);
      setChat([]);
      return;
    }
    let isActive = true;

    formsService.getFormSubmission(workspaceId, submissionId).then((response) => {
      if (!isActive) return;
      const full: any = response.success ? response.data : null;
      const questions: any[] = full?.form_definition?.questions ?? [];
      const given: any[] = full?.answers ?? [];
      setAnswers(
        questions.map((q) => ({
          id: q.id,
          question: q.question,
          answerType: q.answer_type,
          answer: String(given.find((a) => a.question === q.id)?.answer ?? ""),
        })),
      );
    });

    fetch(`/api/proxy/workspaces/${workspaceId}/form-submissions/${submissionId}/chat/`, {
      headers: { Authorization: `Token ${proxyAuthService.getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isActive) setChat(data?.results ?? []);
      })
      .catch(() => {
        if (isActive) setChat([]);
      });

    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id, selectedSubmission?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [chat.length]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !currentWorkspace?.id || !selectedSubmission) return;
    setChatInput("");
    const response = await fetch(
      `/api/proxy/workspaces/${currentWorkspace.id}/form-submissions/${selectedSubmission.id}/chat/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${proxyAuthService.getToken()}` },
        body: JSON.stringify({ text }),
      },
    );
    if (response.ok) {
      const created: ChatMessage = await response.json();
      setChat((prev) => [...prev, created]);
    }
  };

  const renderAnswer = (row: AnswerRow) => {
    if (!row.answer) return <span className={styles.answerEmpty}>No answer</span>;
    if (row.answerType === "image") {
      return <img src={row.answer} alt={row.question} className={styles.answerImage} />;
    }
    if (row.answerType === "rating") {
      const n = Math.max(0, Math.min(5, Number(row.answer) || 0));
      return (
        <span className={styles.answerStars} aria-label={`${n} out of 5`}>
          {"★".repeat(n)}
          <span className={styles.answerStarsOff}>{"★".repeat(5 - n)}</span>
        </span>
      );
    }
    if (row.answerType === "yesno") {
      return <span className={row.answer.toLowerCase() === "yes" ? styles.answerYes : styles.answerNo}>{row.answer}</span>;
    }
    return <span>{row.answer}</span>;
  };

  const handleAction = async (action: "approve" | "reject" | "flag") => {
    if (!currentWorkspace?.id || !selectedSubmission) return;
    if (selectedSubmission.status !== "pending") return;
    setSubmitting(true);
    setActionError(null);

    const note = reviewNote.trim() || undefined;
    const targetStatus: FormSubmissionStatus =
      action === "approve"
        ? "approved"
        : action === "reject"
          ? "rejected"
          : "needs_followup";

    // Optimistic update — flip the status (and the note, if supplied) locally
    // so the UI feels instant. We snapshot the previous state to roll back
    // on API failure.
    const previousSubmissions = submissions;
    const previousSelected = selectedSubmission;
    const optimistic: FormSubmissionList = {
      ...selectedSubmission,
      status: targetStatus,
      review_note: note ?? selectedSubmission.review_note,
    };
    setSubmissions((prev) =>
      prev.map((item) => (item.id === optimistic.id ? optimistic : item)),
    );
    setSelectedSubmission(optimistic);

    const myToken = actionTokenRef.current;

    const response =
      action === "approve"
        ? await formsService.approveFormSubmission(
            currentWorkspace.id,
            selectedSubmission.id,
            note,
          )
        : action === "reject"
          ? await formsService.rejectFormSubmission(
              currentWorkspace.id,
              selectedSubmission.id,
              note,
            )
          : await formsService.flagFormSubmission(
              currentWorkspace.id,
              selectedSubmission.id,
              note,
            );

    setSubmitting(false);

    // Bail if the user moved on (changed filter or selected another row)
    // while the API call was in flight. The list/selection now belongs to
    // a different context — applying this response would yank focus back.
    if (actionTokenRef.current !== myToken) return;

    if (response.success && response.data) {
      // Replace the optimistic row with the authoritative server payload —
      // picks up reviewed_by + reviewed_at that we couldn't fake locally.
      const confirmed = mergeSubmission(optimistic, response.data);
      setSubmissions((prev) =>
        prev.map((item) => (item.id === confirmed.id ? confirmed : item)),
      );
      setSelectedSubmission(confirmed);
      setReviewNote("");
      return;
    }

    // Rollback on failure
    setSubmissions(previousSubmissions);
    setSelectedSubmission(previousSelected);

    const code = response.error?.code;
    if (code === "401" || code === "403") {
      setActionError(
        "You don't have permission to review form submissions.",
      );
    } else {
      setActionError(
        response.error?.message ?? "Action failed. Please try again.",
      );
    }
  };

  const propertyName =
    selectedSubmission?.property?.name ?? "Unassigned property";
  const staffName = selectedSubmission?.staff?.name ?? "Unknown staff";
  const propertyImage = selectedSubmission?.property?.first_image ?? null;
  const propertyAddress =
    selectedSubmission?.property?.address?.address_line_1 ?? "";
  const taskStart = selectedSubmission?.task?.planned_start_time;
  const taskEnd = selectedSubmission?.task?.planned_end_time;
  const isDecided =
    !!selectedSubmission && selectedSubmission.status !== "pending";
  const hasLocation =
    !!selectedSubmission?.latitude && !!selectedSubmission?.longitude;

  // Client-side search across staff name, property name, and address line.
  // Empty query passes the list through unchanged. Status filtering happens
  // server-side via the API call above.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSubmissions = normalizedQuery
    ? submissions.filter((submission) =>
        [
          submission.staff?.name,
          submission.property?.name,
          submission.property?.address?.address_line_1,
        ].some((field) => field?.toLowerCase().includes(normalizedQuery)),
      )
    : submissions;

  return (
    <div className={styles.formsPageWrapper}>
      <div className={styles.headerRow}>
        <ZoneSelector onApply={setZoneFilter} />
        <CleaningBreadcrumb />
      </div>
      <div className={styles.formsPage}>
        <div className={styles.left}>
          <input
            type="text"
            placeholder="Search staff or property"
            className={styles.search}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className={styles.filterRow}>
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`${styles.filterBtn} ${
                  filter === option.value ? styles.active : ""
                }`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={styles.list}>
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`${styles.formItem} ${
                    selectedSubmission?.id === submission.id
                      ? styles.selected
                      : ""
                  } ${styles[`formItem--${submission.status}`] ?? ""}`}
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className={styles.info}>
                    <div className={styles.infoTop}>
                      <span className={styles.property}>
                        {submission.property?.name ?? "Unassigned property"}
                      </span>
                      <span
                        className={styles.statusBadge}
                        data-status={submission.status}
                      >
                        {STATUS_LABELS[submission.status]}
                      </span>
                    </div>
                    <span className={styles.staff}>
                      {submission.staff?.name ?? "Unknown staff"}
                    </span>
                    <span className={styles.date}>
                      {formatDateTime(submission.created_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyLook
                label="cleaning forms"
                message={
                  filter === "all"
                    ? undefined
                    : `No ${
                        FILTER_OPTIONS.find((o) => o.value === filter)
                          ?.label.toLowerCase() ?? filter
                      } submissions yet.`
                }
              />
            )}
          </div>
        </div>

        {submissions.length > 0 && selectedSubmission ? (
          <>
            <div className={styles.center}>
              <div className={styles.formDetail}>
                <div
                  className={`${styles.formDetail__img} ${styles.overlayDark}`}
                >
                  {propertyImage && !imageFailed ? (
                    <img
                      src={propertyImage}
                      alt={propertyName}
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <div
                      className={styles.formDetail__imgPlaceholder}
                      aria-hidden="true"
                    />
                  )}
                  <div
                    className={`${styles.formDetail__overlay} ${styles.overlayDark}`}
                  >
                    <h3>{propertyName}</h3>
                    <div className={styles.formDetail__meta}>
                      {propertyAddress ? (
                        <span>
                          <LuMapPin aria-hidden="true" />
                          {propertyAddress}
                        </span>
                      ) : null}
                      <span>
                        <LuCalendarDays aria-hidden="true" />
                        {formatDateOnly(
                          taskStart ?? selectedSubmission.created_at,
                        )}
                      </span>
                      {taskStart ? (
                        <span>
                          <LuClock aria-hidden="true" />
                          {formatTimeRange(taskStart, taskEnd)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className={styles.formContent}>
                  <h2>Form #{selectedSubmission.id}</h2>
                  <p>
                    <strong>Personnel:</strong> {staffName}
                  </p>
                  <p>
                    <strong>Property:</strong> {propertyName}
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {formatDateTime(selectedSubmission.created_at)}
                  </p>
                  {hasLocation ? (
                    <span
                      className={styles.locationBadge}
                      title={`${selectedSubmission.latitude}, ${selectedSubmission.longitude}`}
                    >
                      📍 Location captured
                    </span>
                  ) : null}
                  {selectedSubmission.review_note ? (
                    <p>
                      <strong>Review note:</strong>{" "}
                      {selectedSubmission.review_note}
                    </p>
                  ) : null}
                </div>

                <div className={styles.answers}>
                  <h3 className={styles.answersTitle}>Form answers</h3>
                  {answers.length > 0 ? (
                    <ol className={styles.answerList}>
                      {answers.map((row, index) => (
                        <li key={row.id} className={styles.answerItem}>
                          <span className={styles.answerQuestion}>
                            {index + 1}. {row.question}
                          </span>
                          <div className={styles.answerValue}>{renderAnswer(row)}</div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className={styles.answerEmpty}>No answers recorded for this form.</p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.right}>
              <div className={styles.rightDetail}>
                <div className={styles.rightDetail__commentsWrapper}>
                  <div className={styles.actionTop}>
                    <div className={styles.actionHeader}>
                      <img
                        src={"/images/avatar.png"}
                        alt={staffName}
                        className={styles.actionAvatar}
                      />
                      <div>
                        <h4>{staffName}</h4>
                        {selectedSubmission.reviewed_by &&
                        selectedSubmission.reviewed_at ? (
                          <span className={styles.reviewerLabel}>
                            {REVIEW_VERB[selectedSubmission.status]} by{" "}
                            {selectedSubmission.reviewed_by.name} on{" "}
                            {formatDateTime(selectedSubmission.reviewed_at)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {actionError ? (
                      <div className={styles.actionBanner} role="alert">
                        {actionError}
                      </div>
                    ) : null}

                    <div className={styles.actionButtons}>
                      <button
                        type="button"
                        className={styles.actionApprove}
                        onClick={() => handleAction("approve")}
                        disabled={submitting || isDecided}
                      >
                        <LuCircleCheck aria-hidden="true" />
                        Approve
                      </button>
                      <button
                        type="button"
                        className={styles.actionReject}
                        onClick={() => handleAction("reject")}
                        disabled={submitting || isDecided}
                      >
                        <LuTriangleAlert aria-hidden="true" />
                        Reject
                      </button>
                    </div>

                    <div className={styles.actionDivider}>
                      <span>OR MARK AS</span>
                    </div>

                    <button
                      type="button"
                      className={styles.actionFlag}
                      onClick={() => handleAction("flag")}
                      disabled={submitting || isDecided}
                    >
                      <LuFlag aria-hidden="true" />
                      Flag for Attention
                    </button>
                  </div>

                  <div className={styles.chat}>
                    <span className={styles.notesLabel}>Chat with {staffName}</span>
                    <div className={styles.chatMessages}>
                      {chat.map((message) => (
                        <div
                          key={message.id}
                          className={`${styles.chatBubble} ${
                            message.role === "admin" ? styles.chatAdmin : styles.chatCleaner
                          }`}
                        >
                          <span className={styles.chatMeta}>
                            {message.sender_name} · {formatClock(message.created_at)}
                          </span>
                          <p>{message.text}</p>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                    <div className={styles.chatComposer}>
                      <input
                        type="text"
                        className={styles.chatInput}
                        placeholder="Write a message..."
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") sendChat();
                        }}
                      />
                      <button type="button" className={styles.chatSend} onClick={sendChat} disabled={!chatInput.trim()}>
                        Send
                      </button>
                    </div>
                  </div>

                  <div className={styles.actionBottom}>
                    <div className={styles.notesSection}>
                      <span className={styles.notesLabel}>
                        Review note (saved with your decision)
                      </span>
                      <textarea
                        className={styles.commentInput}
                        placeholder="Optional note for the cleaner..."
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.center} />
            <div className={styles.right} />
          </>
        )}
      </div>
    </div>
  );
}

// Merge a server response (FormSubmissionFull) into the list-shape
// FormSubmissionList we keep in state. The detail response contains every
// list field plus extras (form_definition, answers); the list shape is a
// strict subset, so a structural copy is safe.
function mergeSubmission(
  prev: FormSubmissionList,
  full: FormSubmissionFull,
): FormSubmissionList {
  return {
    ...prev,
    id: full.id,
    form: full.form,
    property: full.property,
    task: full.task,
    staff: full.staff,
    status: full.status,
    review_note: full.review_note,
    reviewed_by: full.reviewed_by,
    reviewed_at: full.reviewed_at,
    latitude: full.latitude,
    longitude: full.longitude,
  };
}
