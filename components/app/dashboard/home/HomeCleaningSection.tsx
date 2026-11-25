"use client";

import { useEffect, useMemo, useState } from "react";
import { LuBrush } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import PanelSkeleton from "@/components/ui/skeleton";
import { useWorkspace } from "@/context/workspace-context";
import { tasksService } from "@/lib/services/tasks.service";
import styles from "@/styles/app/dashboard/HomeCleaningSection.module.scss";
import type { SupervisorTaskToday } from "@/types/api";

type HomeCleaningTaskRow = {
  id: number;
  name: string;
  role: string;
  property: string;
  time: string;
  status: string;
  statusTone: "approved" | "declined" | "pending" | "progress";
  propertyImage?: string;
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getTaskStatus = (
  task: SupervisorTaskToday
): HomeCleaningTaskRow["status"] => {
  if (task.result === "successful") return "Done";
  if (task.result === "failed" || task.result === "faulty") {
    return "Needs Attention";
  }
  if (!task.assigned_to) return "Unassigned";
  if (task.start_time && !task.end_time) return "In Progress";
  return "Pending";
};

const getTaskStatusTone = (
  status: HomeCleaningTaskRow["status"]
): HomeCleaningTaskRow["statusTone"] => {
  if (status === "Done") return "approved";
  if (status === "Needs Attention") return "declined";
  if (status === "In Progress") return "progress";
  return "pending";
};

const formatFeesCollected = (tasks: SupervisorTaskToday[]) => {
  const feesByCurrency = new Map<string, { amount: number; symbol: string }>();

  tasks.forEach((task) => {
    if (task.result !== "successful") return;
    const fee = task.cleaning_fee;
    if (!fee?.amount) return;
    const amount = Number(fee.amount);
    if (!Number.isFinite(amount)) return;
    const code = fee.currency.code;
    const existing = feesByCurrency.get(code);
    if (existing) {
      existing.amount += amount;
      return;
    }
    feesByCurrency.set(code, { amount, symbol: fee.currency.symbol });
  });

  if (feesByCurrency.size === 0) return "—";
  const [, dominant] = Array.from(feesByCurrency.entries()).sort(
    (a, b) => b[1].amount - a[1].amount
  )[0];
  return `${dominant.symbol}${new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.trunc(dominant.amount))}`;
};

const getStatusClassName = (tone: HomeCleaningTaskRow["statusTone"]) =>
  `${styles["home__cleaning-status"]} ${
    tone === "approved"
      ? styles["home__cleaning-status--approved"]
      : tone === "declined"
        ? styles["home__cleaning-status--declined"]
        : tone === "progress"
          ? styles["home__cleaning-status--progress"]
          : styles["home__cleaning-status--pending"]
  }`;

const HomeCleaningSection = () => {
  const { currentWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState<SupervisorTaskToday[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    if (!workspaceId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const loadTasks = async () => {
      setIsLoading(true);
      const result = await tasksService.getTodayAll(workspaceId);
      if (!isActive) return;

      if (result.success && result.data) {
        setTasks(result.data.filter((task) => task.type === "cleaning"));
      } else {
        setTasks([]);
      }
      setIsLoading(false);
    };

    loadTasks();
    return () => {
      isActive = false;
    };
  }, [workspaceId]);

  const scheduleRows = useMemo<HomeCleaningTaskRow[]>(
    () =>
      [...tasks]
        .sort(
          (a, b) =>
            new Date(a.planned_start_time).getTime() -
            new Date(b.planned_start_time).getTime()
        )
        .map((task) => {
          const status = getTaskStatus(task);
          return {
            id: task.id,
            name: task.assigned_to?.name ?? "Unassigned",
            role: task.assigned_to ? "Cleaning Staff" : "Awaiting Assignment",
            property: task.property?.name ?? "Unassigned property",
            time: formatTime(task.planned_start_time),
            status,
            statusTone: getTaskStatusTone(status),
            propertyImage: task.property?.first_image ?? undefined,
          };
        }),
    [tasks]
  );

  const totalCleanings = tasks.length;
  const feesCollected = useMemo(() => formatFeesCollected(tasks), [tasks]);

  return (
    <section className={styles["home__cleaning-section"]}>
      <div className={styles["home__cleaning-header"]}>
        <div className={styles["home__cleaning-title"]}>
          <div className={`${styles["home__icon"]} ${styles["home__cleaning-icon"]}`}>
            <LuBrush />
          </div>
          <div className={styles["home__cleaning-title-group"]}>
            <h2>Cleaning Operations</h2>
            <p>Live feed from Cleaning App</p>
          </div>
        </div>
        <div className={styles["home__cleaning-stats"]}>
          <div className={styles["home__cleaning-stat"]}>
            <span>Total Cleanings</span>
            <strong>{isLoading ? "..." : totalCleanings}</strong>
          </div>
          <div className={styles["home__cleaning-stat"]}>
            <span>Fees Collected</span>
            <strong>{isLoading ? "..." : feesCollected}</strong>
          </div>
        </div>
      </div>
      <div className={styles["home__cleaning-tableWrap"]}>
        <table className={styles["home__cleaning-table"]}>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3}>
                  <PanelSkeleton lines={4} lineHeight="4.5rem" />
                </td>
              </tr>
            ) : scheduleRows.length > 0 ? (
              scheduleRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles["home__cleaning-person"]}>
                      <div>
                        <p className={styles["home__cleaning-name"]}>
                          {item.name}
                        </p>
                        <span className={styles["home__cleaning-role"]}>
                          {item.role}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles["home__cleaning-property"]}>
                      <div className={styles["home__cleaning-propertyImage"]}>
                        {item.propertyImage ? (
                          <img src={item.propertyImage} alt={item.property} />
                        ) : null}
                      </div>
                      <div>
                        <p className={styles["home__cleaning-propertyName"]}>
                          {item.property}
                        </p>
                        <span className={styles["home__cleaning-time"]}>
                          {item.time}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={getStatusClassName(item.statusTone)}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>
                  <EmptyLook label="today's cleaning tasks" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default HomeCleaningSection;
