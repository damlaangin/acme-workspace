"use client";

import React, { useEffect, useState } from "react";
import { LuCircleAlert, LuSparkles } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/ai/AiPriorities.module.scss";
import { useWorkspace } from "@/context/workspace-context";
import { workspaceService } from "@/lib/services/workspace.service";

export type AiPriorityItem = {
  name: string;
  issue: string;
  property: string;
  reservationId?: string | number;
  time: string;
  aiNote: string;
  suggestion: string;
};

type AiPrioritiesProps = {
  items: AiPriorityItem[];
};

const AiPriorities: React.FC<AiPrioritiesProps> = ({ items }) => {
  const { currentWorkspace } = useWorkspace();
  const [staffOptions, setStaffOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [taskModal, setTaskModal] = useState<{
    source: AiPriorityItem;
    type: "cleaning" | "maintenance";
    staffMember: string;
    property: string;
    reservation: string;
    date: string;
    notes: string;
  } | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setStaffOptions([]);
      return;
    }

    let isActive = true;

    const loadUsers = async () => {
      const response = await workspaceService.getWorkspaceUsers(
        currentWorkspace.id,
        { user_type: "app_user", workspace_id: currentWorkspace.id },
      );
      if (!isActive) return;
      if (response.success && response.data?.results) {
        const mapped = response.data.results.map((entry) => {
          const user = entry.user;
          const name =
            [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
            user?.username ||
            `User ${entry.id}`;
          return {
            id: entry.id.toString(),
            name,
          };
        });
        setStaffOptions(mapped);
      } else {
        setStaffOptions([]);
      }
    };

    loadUsers();

    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id]);

  const openTaskModal = (item: AiPriorityItem) => {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    setTaskModal({
      source: item,
      type: "cleaning",
      staffMember: "",
      property: item.property ?? "",
      reservation:
        item.reservationId !== undefined ? String(item.reservationId) : "",
      date,
      notes: item.aiNote ?? "",
    });
  };

  return (
    <div className={styles["ai__priorities"]}>
      <div className={styles["ai__priorities-header"]}>
        <span className={styles["ai__section-icon"]}>
          <LuCircleAlert aria-hidden="true" />
        </span>
        <span className={styles["ai__priorities-title"]}>Live Priorities</span>
      </div>
      <div className={styles["ai__priorities-grid"]}>
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.name} className={styles["ai__priority-card"]}>
              <div className={styles["ai__priority-top"]}>
                <div className={styles["ai__priority-identity"]}>
                  <div>
                    <div className={styles["ai__priority-name"]}>
                      {item.name}
                    </div>
                    <div className={styles["ai__priority-meta"]}>
                      {item.issue} • {item.property}
                    </div>
                  </div>
                </div>
                <span className={styles["ai__priority-time"]}>{item.time}</span>
              </div>
              <div className={styles["ai__priority-note"]}>
                <LuSparkles
                  aria-hidden="true"
                  className={styles["ai__priority-noteIcon"]}
                />
                {item.aiNote}
                <button
                  type="button"
                  className={styles["ai__priority-create"]}
                  onClick={() => openTaskModal(item)}
                >
                  Create Task
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyLook label="live priorities" />
        )}
      </div>
      {taskModal ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setTaskModal(null)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Create Task</div>
                <div className={styles.modalSubtitle}>
                  Assign prioritized task to a staff
                </div>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setTaskModal(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Type</label>
                <select
                  className={styles.modalSelect}
                  value={taskModal.type}
                  onChange={(event) =>
                    setTaskModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            type:
                              event.target.value === "maintenance"
                                ? "maintenance"
                                : "cleaning",
                          }
                        : prev,
                    )
                  }
                >
                  <option value="cleaning">cleaning</option>
                  <option value="maintenance">maintenance</option>
                </select>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Staff member</label>
                <select
                  className={styles.modalSelect}
                  value={taskModal.staffMember}
                  onChange={(event) =>
                    setTaskModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            staffMember: event.target.value,
                          }
                        : prev,
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {staffOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Property</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Property"
                  value={taskModal.property}
                  onChange={(event) =>
                    setTaskModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            property: event.target.value,
                          }
                        : prev,
                    )
                  }
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Reservation</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Reservation ID"
                  value={taskModal.reservation}
                  onChange={(event) =>
                    setTaskModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            reservation: event.target.value,
                          }
                        : prev,
                    )
                  }
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Date</label>
                <input
                  type="date"
                  className={styles.modalInput}
                  value={taskModal.date}
                  onChange={(event) =>
                    setTaskModal((prev) =>
                      prev ? { ...prev, date: event.target.value } : prev,
                    )
                  }
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Notes</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={3}
                  value={taskModal.notes}
                  onChange={(event) =>
                    setTaskModal((prev) =>
                      prev ? { ...prev, notes: event.target.value } : prev,
                    )
                  }
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalGhost}
                onClick={() => setTaskModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={() => setTaskModal(null)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AiPriorities;
