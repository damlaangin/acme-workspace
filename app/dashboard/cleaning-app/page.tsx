"use client";

import { useEffect, useMemo, useState } from "react";
import dashboardStyles from "@/styles/app/cleaning-app/CleaningDashboard.module.scss";
import CleaningBreadcrumb from "@/components/app/cleaning-app/CleaningBreadcrumb";
import ZoneSelector, {
  type ZoneFilter,
} from "@/components/app/cleaning-app/ZoneSelector";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";
import PanelSkeleton from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { workspaceService } from "@/lib/services/workspace.service";
import { tasksService } from "@/lib/services/tasks.service";
import { formsService } from "@/lib/services/forms.service";
import { propertiesService } from "@/lib/services/properties.service";
import { leaveRequestsService } from "@/lib/services/leave-requests.service";
import { aiService, type ChronicIssue } from "@/lib/services/ai.service";
import { useWorkspace } from "@/context/workspace-context";
import { useAuth } from "@/context/auth-context";
import {
  LeaveRequest,
  Property,
  SupervisorTaskToday,
  Task,
  WorkspaceUser,
} from "@/types/api";
import {
  LuUsers,
} from "react-icons/lu";

type TaskStatus = "unassigned" | "pending" | "wip" | "done" | "attn";

type TodayFilter = "all" | TaskStatus;

interface SimpleTaskRow {
  id: number;
  time: string;
  sortKey: number;
  unit: string;
  staff: string;
  status: TaskStatus;
  image?: string;
  isOverdue?: boolean;
}

interface CleanerStat {
  id: number;
  name: string;
  avatar: string;
  doneToday: number;
  totalToday: number;
  earnedByCurrency: Record<string, { amount: number; symbol: string }>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Bounds the given Date's local day, returned as UTC ISO strings the
// backend filters `planned_start_time` against. Workspace timezone
// support is a follow-up; browser-local matches user expectation
// better than UTC for the typical case where browser tz ≈ workspace tz.
const getLocalDayRange = (date: Date) => {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
  return { start: start.toISOString(), end: end.toISOString() };
};

const formatTime = (value?: string | null) => {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Locale-independent sort key. `formatTime` is for display; sorting on
// its output breaks for 12-hour locales ("01:30 PM" < "12:30 PM").
const toSortKey = (value?: string | null): number => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start) return "";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "";
  const startStr = startDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  if (!end) return startStr;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startStr;
  const sameDay =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCDate() === endDate.getUTCDate();
  if (sameDay) return startStr;
  const endStr = endDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return `${startStr} – ${endStr}`;
};

const computeSupervisorTaskStatus = (task: SupervisorTaskToday): TaskStatus => {
  if (task.result === "successful") return "done";
  if (task.result === "failed" || task.result === "faulty") return "attn";
  if (!task.assigned_to) return "unassigned";
  if (task.start_time && !task.end_time) return "wip";
  return "pending";
};

const computeSimpleTaskStatus = (task: Task): TaskStatus => {
  if (task.result === "successful") return "done";
  if (task.result === "failed" || task.result === "faulty") return "attn";
  if (!task.assignee) return "unassigned";
  if (task.start_time && !task.end_time) return "wip";
  return "pending";
};

const isOverdue = (task: SupervisorTaskToday, now: Date) => {
  if (task.start_time) return false;
  if (!task.planned_start_time) return false;
  return new Date(task.planned_start_time).getTime() < now.getTime();
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  unassigned: "UNASSIGNED",
  pending: "PENDING",
  wip: "WIP",
  done: "DONE",
  attn: "ATTN",
};

const formatLeaveType = (leaveType: string) => {
  if (!leaveType) return "";
  return leaveType.charAt(0).toUpperCase() + leaveType.slice(1);
};

const formatIssueCategory = (category: string) => {
  if (!category) return "";
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const TaskStatusPill = ({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) => (
  <span
    className={cx(dashboardStyles.panelTag, className)}
    data-status={status}
  >
    {STATUS_LABELS[status]}
  </span>
);

const PanelTaskText = ({ task }: { task: SimpleTaskRow }) => (
  <div className={dashboardStyles.panelText}>
    <span className={dashboardStyles.panelTitle}>{task.unit}</span>
    <span className={dashboardStyles.panelSubtitle}>{task.staff}</span>
  </div>
);

const ReviewTaskRow = ({ task }: { task: SimpleTaskRow }) => (
  <div
    className={cx(dashboardStyles.panelItem, dashboardStyles.panelItemReview)}
  >
    <div className={dashboardStyles.panelMain}>
      <PanelTaskText task={task} />
    </div>
    <TaskStatusPill
      status={task.status}
      className={dashboardStyles.panelStatusPill}
    />
  </div>
);

const TodayTaskRow = ({ task }: { task: SimpleTaskRow }) => (
  <div className={dashboardStyles.panelItemWide}>
    <div className={dashboardStyles.panelTime}>{task.time}</div>
    <div className={dashboardStyles.panelCard}>
      <div className={dashboardStyles.panelCardMain}>
        <div className={dashboardStyles.panelThumb}>
          {task.image ? <img src={task.image} alt={task.unit} /> : null}
        </div>
        <PanelTaskText task={task} />
      </div>
      <div className={dashboardStyles.panelTags}>
        <TaskStatusPill status={task.status} />
        {task.isOverdue ? (
          <span className={dashboardStyles.panelTag}>OVERDUE</span>
        ) : null}
      </div>
    </div>
  </div>
);

const PlanTaskRow = ({ task }: { task: SimpleTaskRow }) => (
  <div className={dashboardStyles.panelItem}>
    <div className={dashboardStyles.panelMain}>
      <span className={dashboardStyles.panelTimeBadge}>{task.time}</span>
      <PanelTaskText task={task} />
    </div>
  </div>
);

const sortRowsByTime = (rows: SimpleTaskRow[]) =>
  rows.sort((a, b) => a.sortKey - b.sortKey);

export default function CleaningAppPage() {
  const { currentWorkspace } = useWorkspace();
  const { hasPermission } = useAuth();
  const canManageLeave = hasPermission("manage_leaverequest");
  useEffect(() => {
    document.body.classList.add("cleaning-dashboard");
    return () => document.body.classList.remove("cleaning-dashboard");
  }, []);

  const [staff, setStaff] = useState<WorkspaceUser[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [todayTasks, setTodayTasks] = useState<SupervisorTaskToday[]>([]);
  const [yesterdayTasks, setYesterdayTasks] = useState<Task[]>([]);
  const [tomorrowTasks, setTomorrowTasks] = useState<Task[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequest[]>([]);
  const [chronicIssues, setChronicIssues] = useState<ChronicIssue[]>([]);
  const [formsCount, setFormsCount] = useState(0);
  const [todayFilter, setTodayFilter] = useState<TodayFilter>("all");
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actingLeaveId, setActingLeaveId] = useState<number | null>(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isLoadingFormsCount, setIsLoadingFormsCount] = useState(false);
  const [isLoadingTodayTasks, setIsLoadingTodayTasks] = useState(false);
  const [isLoadingAdjacentDayTasks, setIsLoadingAdjacentDayTasks] =
    useState(false);
  const [isLoadingLeaveRequests, setIsLoadingLeaveRequests] = useState(false);
  const [isLoadingChronicIssues, setIsLoadingChronicIssues] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>({});

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setStaff([]);
      setProperties([]);
      setTodayTasks([]);
      setYesterdayTasks([]);
      setTomorrowTasks([]);
      setPendingLeaves([]);
      setApprovedLeaves([]);
      setChronicIssues([]);
      setFormsCount(0);
      setIsLoadingStaff(false);
      setIsLoadingProperties(false);
      setIsLoadingFormsCount(false);
      setIsLoadingTodayTasks(false);
      setIsLoadingAdjacentDayTasks(false);
      setIsLoadingLeaveRequests(false);
      setIsLoadingChronicIssues(false);
      return;
    }

    let isActive = true;
    const workspaceId = currentWorkspace.id;
    // Backend honors snake_case ids; only include keys that have a value so
    // we don't send empty params. Chronic-issues is intentionally excluded —
    // backend does not support zone filters there.
    const zoneParams = {
      country_id: zoneFilter.countryId,
      state_id: zoneFilter.stateId,
      city_id: zoneFilter.cityId,
    };

    const loadStaff = async () => {
      setIsLoadingStaff(true);
      const response = await workspaceService.getWorkspaceUsers(workspaceId, {
        user_type: "app_user",
        workspace_id: workspaceId,
        page_size: 200,
      });
      if (!isActive) return;
      if (response.success && response.data?.results) {
        setStaff(response.data.results);
      } else {
        setStaff([]);
      }
      setIsLoadingStaff(false);
    };

    const loadProperties = async () => {
      setIsLoadingProperties(true);
      const response = await propertiesService.getAllProperties(workspaceId);
      if (!isActive) return;
      if (response.success && response.data) {
        setProperties(response.data);
      } else {
        setProperties([]);
      }
      setIsLoadingProperties(false);
    };

    const loadFormsCount = async () => {
      setIsLoadingFormsCount(true);
      const response = await formsService.getFormSubmissions(workspaceId, {
        ...zoneParams,
      });
      if (!isActive) return;
      if (response.success && response.data) {
        setFormsCount(response.data.count ?? 0);
      } else {
        setFormsCount(0);
      }
      setIsLoadingFormsCount(false);
    };

    const loadTodayTasks = async () => {
      setIsLoadingTodayTasks(true);
      const response = await tasksService.getTodayAll(workspaceId, zoneParams);
      if (!isActive) return;
      if (response.success && Array.isArray(response.data)) {
        setTodayTasks(response.data);
      } else {
        setTodayTasks([]);
      }
      setIsLoadingTodayTasks(false);
    };

    const loadAdjacentDayTasks = async () => {
      setIsLoadingAdjacentDayTasks(true);
      const today = new Date();
      const yesterday = new Date(today.getTime() - MS_PER_DAY);
      const tomorrow = new Date(today.getTime() + MS_PER_DAY);
      const yesterdayRange = getLocalDayRange(yesterday);
      const tomorrowRange = getLocalDayRange(tomorrow);
      const [yesterdayResp, tomorrowResp] = await Promise.all([
        tasksService.getTasks(workspaceId, {
          ...zoneParams,
          planned_start_time_gte: yesterdayRange.start,
          planned_start_time_lte: yesterdayRange.end,
          page_size: 200,
        }),
        tasksService.getTasks(workspaceId, {
          ...zoneParams,
          planned_start_time_gte: tomorrowRange.start,
          planned_start_time_lte: tomorrowRange.end,
          page_size: 200,
        }),
      ]);
      if (!isActive) return;
      setYesterdayTasks(
        yesterdayResp.success && yesterdayResp.data?.results
          ? yesterdayResp.data.results
          : [],
      );
      setTomorrowTasks(
        tomorrowResp.success && tomorrowResp.data?.results
          ? tomorrowResp.data.results
          : [],
      );
      setIsLoadingAdjacentDayTasks(false);
    };

    const loadLeaveRequests = async () => {
      setIsLoadingLeaveRequests(true);
      const [pendingResp, approvedResp] = await Promise.all([
        leaveRequestsService.list(workspaceId, {
          status: "pending",
          page_size: 200,
        }),
        leaveRequestsService.list(workspaceId, {
          status: "approved",
          page_size: 200,
        }),
      ]);
      if (!isActive) return;
      setPendingLeaves(
        pendingResp.success && pendingResp.data?.results
          ? pendingResp.data.results
          : [],
      );
      setApprovedLeaves(
        approvedResp.success && approvedResp.data?.results
          ? approvedResp.data.results
          : [],
      );
      setIsLoadingLeaveRequests(false);
    };

    const loadChronicIssues = async () => {
      setIsLoadingChronicIssues(true);
      const response = await aiService.getChronicIssues(workspaceId, {
        is_resolved: false,
        ordering: "-report_count",
        page_size: 5,
      });
      if (!isActive) return;
      setChronicIssues(
        response.success && response.data?.results ? response.data.results : [],
      );
      setIsLoadingChronicIssues(false);
    };

    loadStaff();
    loadProperties();
    loadFormsCount();
    loadTodayTasks();
    loadAdjacentDayTasks();
    loadLeaveRequests();
    loadChronicIssues();

    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id, zoneFilter]);

  const propertiesById = useMemo(() => {
    const map = new Map<number, Property>();
    properties.forEach((property) => map.set(property.id, property));
    return map;
  }, [properties]);

  const staffById = useMemo(() => {
    const map = new Map<number, WorkspaceUser>();
    staff.forEach((member) => map.set(member.id, member));
    return map;
  }, [staff]);

  const staffNameById = (id: number | null | undefined) => {
    if (!id) return "Unassigned";
    const member = staffById.get(id);
    if (!member) return `Cleaner #${id}`;
    const user = member.user;
    return (
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      user?.username ||
      `Cleaner #${id}`
    );
  };

  const cleanerOnLeaveIds = useMemo(() => {
    // start_date / end_date are YYYY-MM-DD strings. `new Date('YYYY-MM-DD')`
    // parses to UTC midnight, so timestamp compare drops anyone whose
    // leave ends today after 00:00 UTC. String compare is robust.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const ids = new Set<number>();
    approvedLeaves.forEach((leave) => {
      if (!leave.start_date || !leave.end_date) return;
      if (leave.start_date <= todayStr && todayStr <= leave.end_date) {
        ids.add(leave.requested_by);
      }
    });
    return ids;
  }, [approvedLeaves]);

  const todayBuckets = useMemo(() => {
    const buckets = {
      total: todayTasks.length,
      unassigned: 0,
      pending: 0,
      wip: 0,
      done: 0,
      attn: 0,
      overdue: 0,
    };
    const now = new Date();
    todayTasks.forEach((task) => {
      const status = computeSupervisorTaskStatus(task);
      buckets[status] += 1;
      if (isOverdue(task, now)) buckets.overdue += 1;
    });
    return buckets;
  }, [todayTasks]);

  const completionPct = todayBuckets.total
    ? Math.round((todayBuckets.done / todayBuckets.total) * 100)
    : 0;

  const cleanerStats = useMemo<CleanerStat[]>(() => {
    const map = new Map<number, CleanerStat>();
    staff.forEach((member) => {
      const user = member.user;
      const name =
        [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
        user?.username ||
        `Cleaner #${member.id}`;
      const avatar =
        user?.profile_picture ||
        "/images/avatar.png";
      map.set(member.id, {
        id: member.id,
        name,
        avatar,
        doneToday: 0,
        totalToday: 0,
        earnedByCurrency: {},
      });
    });
    todayTasks.forEach((task) => {
      const assigneeId = task.assigned_to?.id;
      if (!assigneeId) return;
      let entry = map.get(assigneeId);
      if (!entry) {
        const fallbackName = task.assigned_to?.name || `Cleaner #${assigneeId}`;
        entry = {
          id: assigneeId,
          name: fallbackName,
          avatar: "/images/avatar.png",
          doneToday: 0,
          totalToday: 0,
          earnedByCurrency: {},
        };
        map.set(assigneeId, entry);
      }
      entry.totalToday += 1;
      if (task.result === "successful") {
        entry.doneToday += 1;
        if (task.cleaning_fee) {
          const code = task.cleaning_fee.currency.code;
          const symbol = task.cleaning_fee.currency.symbol;
          const amount = parseFloat(task.cleaning_fee.amount);
          if (!Number.isNaN(amount)) {
            const existing = entry.earnedByCurrency[code] ?? {
              amount: 0,
              symbol,
            };
            existing.amount += amount;
            entry.earnedByCurrency[code] = existing;
          }
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (b.doneToday !== a.doneToday) return b.doneToday - a.doneToday;
      return b.totalToday - a.totalToday;
    });
  }, [staff, todayTasks]);

  const staffCapacity = useMemo(() => {
    const total = staff.length;
    const onLeave = staff.reduce(
      (acc, member) => (cleanerOnLeaveIds.has(member.id) ? acc + 1 : acc),
      0,
    );
    const workingIds = new Set<number>();
    todayTasks.forEach((task) => {
      const assigneeId = task.assigned_to?.id;
      if (!assigneeId) return;
      if (task.start_time && !task.end_time) workingIds.add(assigneeId);
    });
    const working = workingIds.size;
    const available = Math.max(total - onLeave - working, 0);
    return { total, working, available, onLeave };
  }, [staff, todayTasks, cleanerOnLeaveIds]);

  const overdueRows = useMemo<SimpleTaskRow[]>(() => {
    const now = new Date();
    return todayTasks
      .filter((task) => isOverdue(task, now))
      .map((task) => ({
        id: task.id,
        time: formatTime(task.planned_start_time),
        sortKey: toSortKey(task.planned_start_time),
        unit: task.property?.name || `Property #${task.property?.id ?? "?"}`,
        staff: task.assigned_to?.name || "Unassigned",
        status: computeSupervisorTaskStatus(task),
        image: task.property?.first_image ?? undefined,
        isOverdue: true,
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [todayTasks]);

  const todayRows = useMemo<SimpleTaskRow[]>(() => {
    const now = new Date();
    return todayTasks
      .map((task) => ({
        id: task.id,
        time: formatTime(task.planned_start_time),
        sortKey: toSortKey(task.planned_start_time),
        unit: task.property?.name || `Property #${task.property?.id ?? "?"}`,
        staff: task.assigned_to?.name || "Unassigned",
        status: computeSupervisorTaskStatus(task),
        image: task.property?.first_image ?? undefined,
        isOverdue: isOverdue(task, now),
      }))
      .sort((a, b) => a.sortKey - b.sortKey);
  }, [todayTasks]);

  const yesterdayRows = useMemo<SimpleTaskRow[]>(
    () =>
      sortRowsByTime(
        yesterdayTasks.map((task) => ({
          id: task.id,
          time: formatTime(task.planned_start_time),
          sortKey: toSortKey(task.planned_start_time),
          unit:
            propertiesById.get(task.property)?.name ||
            `Property #${task.property}`,
          staff: staffNameById(task.assignee),
          status: computeSimpleTaskStatus(task),
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [yesterdayTasks, propertiesById, staffById],
  );

  const tomorrowRows = useMemo<SimpleTaskRow[]>(
    () =>
      sortRowsByTime(
        tomorrowTasks.map((task) => ({
          id: task.id,
          time: formatTime(task.planned_start_time),
          sortKey: toSortKey(task.planned_start_time),
          unit:
            propertiesById.get(task.property)?.name ||
            `Property #${task.property}`,
          staff: staffNameById(task.assignee),
          status: computeSimpleTaskStatus(task),
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tomorrowTasks, propertiesById, staffById],
  );

  const filteredTodayRows = useMemo(() => {
    if (todayFilter === "all") return todayRows;
    return todayRows.filter((row) => row.status === todayFilter);
  }, [todayFilter, todayRows]);

  const closeLeaveDialog = () => {
    setSelectedLeave(null);
    setReviewNote("");
  };

  const handleApproveLeave = async (id: number, note?: string) => {
    if (!currentWorkspace?.id) return;
    setActingLeaveId(id);
    const response = await leaveRequestsService.approve(
      currentWorkspace.id,
      id,
      note,
    );
    if (response.success) {
      setPendingLeaves((prev) => prev.filter((leave) => leave.id !== id));
      if (response.data) {
        setApprovedLeaves((prev) => [response.data as LeaveRequest, ...prev]);
      }
      closeLeaveDialog();
    }
    setActingLeaveId(null);
  };

  const handleRejectLeave = async (id: number, note?: string) => {
    if (!currentWorkspace?.id) return;
    setActingLeaveId(id);
    const response = await leaveRequestsService.reject(
      currentWorkspace.id,
      id,
      note,
    );
    if (response.success) {
      setPendingLeaves((prev) => prev.filter((leave) => leave.id !== id));
      closeLeaveDialog();
    }
    setActingLeaveId(null);
  };

  const formatEarnings = (
    earnedByCurrency: CleanerStat["earnedByCurrency"],
  ) => {
    const entries = Object.entries(earnedByCurrency);
    if (entries.length === 0) return null;
    return entries
      .map(([code, value]) => {
        const formatted = value.amount.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        });
        return `${value.symbol}${formatted} ${code}`;
      })
      .join(" · ");
  };

  return (
    <>
      <div className={dashboardStyles["dashboard__header-section"]}>
        <div className={dashboardStyles["dashboard__greeting"]}>
          <div className={dashboardStyles["dashboard__greeting-top"]}>
            <PageGreeting
              className={dashboardStyles["dashboard__greeting-text"]}
              title="Cleaning App Operations"
            />
            <div className={dashboardStyles.dashboard__greetingActions}>
              <ZoneSelector onApply={setZoneFilter} />
              <CleaningBreadcrumb />
            </div>
          </div>
        </div>
      </div>

      <section className={dashboardStyles.dashboard__insights}>
        <div className={dashboardStyles.insightsGrid}>
          <article className={dashboardStyles.insightCard}>
            <div className={dashboardStyles.insightHeader}>
              <span>Today&apos;s Status</span>
            </div>
            {isLoadingTodayTasks ? (
              <PanelSkeleton lines={4} lineHeight="1.25rem" />
            ) : (
              <>
                <div className={dashboardStyles.statusHero}>
                  <span className={dashboardStyles.statusPct}>
                    {completionPct}%
                  </span>
                  <span className={dashboardStyles.statusClean}>
                    {todayBuckets.done}/{todayBuckets.total} Completed
                  </span>
                </div>
                <div className={dashboardStyles.progressTrack}>
                  <span
                    className={dashboardStyles.progressBar}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <div className={dashboardStyles.statusFooter}>
                  <span>Overdue starts</span>
                  <strong>{todayBuckets.overdue}</strong>
                </div>
              </>
            )}
          </article>

          <article className={dashboardStyles.insightCard}>
            <div className={dashboardStyles.insightHeader}>
              <span>Workflow</span>
            </div>
            {isLoadingTodayTasks ? (
              <PanelSkeleton lines={4} lineHeight="1.25rem" />
            ) : todayBuckets.total > 0 ? (
              <>
                <div className={dashboardStyles.workflowGrid}>
                  <div className={dashboardStyles.statusStat}>
                    <span className={dashboardStyles.statusLabel}>
                      Unassigned
                    </span>
                    <strong className={dashboardStyles.statusValue}>
                      {todayBuckets.unassigned}
                    </strong>
                  </div>
                  <div className={dashboardStyles.statusStat}>
                    <span className={dashboardStyles.statusLabel}>Pending</span>
                    <strong className={dashboardStyles.statusValue}>
                      {todayBuckets.pending}
                    </strong>
                  </div>
                  <div className={dashboardStyles.statusStat}>
                    <span className={dashboardStyles.statusLabel}>WIP</span>
                    <strong className={dashboardStyles.statusValue}>
                      {todayBuckets.wip}
                    </strong>
                  </div>
                  <div className={dashboardStyles.statusStat}>
                    <span className={dashboardStyles.statusLabel}>Attn</span>
                    <strong className={dashboardStyles.statusValue}>
                      {todayBuckets.attn}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <EmptyLook label="today's tasks" />
            )}
          </article>

          <article className={dashboardStyles.insightCard}>
            <div className={dashboardStyles.insightHeader}>
              <span>Staff Capacity</span>
            </div>
            {isLoadingStaff || isLoadingTodayTasks ? (
              <PanelSkeleton lines={2} lineHeight="1.5rem" />
            ) : (
              <>
                <div className={dashboardStyles.capacityRow}>
                  <h3>
                    {staffCapacity.available}
                    <span>/{staffCapacity.total}</span>
                  </h3>
                  <LuUsers
                    aria-hidden="true"
                    className={dashboardStyles.staffCapacityIcon}
                  />
                </div>
                <p className={dashboardStyles.capacityMeta}>
                  {staffCapacity.working} Working · {staffCapacity.onLeave} On
                  Leave
                </p>
              </>
            )}
          </article>

          <article className={dashboardStyles.insightCard}>
            <div className={dashboardStyles.insightHeader}>
              <span>Forms</span>
            </div>
            {isLoadingFormsCount ? (
              <PanelSkeleton lines={2} lineHeight="1.5rem" />
            ) : (
              <div className={dashboardStyles.statusHero}>
                <span className={dashboardStyles.statusPct}>{formsCount}</span>
                <span className={dashboardStyles.statusClean}>Submissions</span>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className={dashboardStyles.dashboard__operations}>
        <div className={dashboardStyles.operationsGrid}>
          <article className={dashboardStyles.operationsPanel}>
            <div className={dashboardStyles.panelHeader}>Yesterday (Review)</div>
            <div className={dashboardStyles.panelList}>
              {isLoadingAdjacentDayTasks ||
              isLoadingProperties ||
              isLoadingStaff ? (
                <PanelSkeleton lines={4} lineHeight="2.5rem" />
              ) : yesterdayRows.length > 0 ? (
                yesterdayRows.map((task) => (
                  <ReviewTaskRow key={task.id} task={task} />
                ))
              ) : (
                <EmptyLook label="yesterday's tasks" />
              )}
            </div>
          </article>

          <article
            className={`${dashboardStyles.operationsPanel} ${dashboardStyles.operationsPanelToday}`}
          >
            <div className={dashboardStyles.panelHeaderToday}>
              <span>⚡ Today&apos;s Action</span>
              <div className={dashboardStyles.panelFilters}>
                <button
                  type="button"
                  className={
                    todayFilter === "all" ? dashboardStyles.isActive : ""
                  }
                  onClick={() => setTodayFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={
                    todayFilter === "unassigned" ? dashboardStyles.isActive : ""
                  }
                  onClick={() => setTodayFilter("unassigned")}
                >
                  Unassigned
                </button>
                <button
                  type="button"
                  className={
                    todayFilter === "pending" ? dashboardStyles.isActive : ""
                  }
                  onClick={() => setTodayFilter("pending")}
                >
                  Pending
                </button>
                <button
                  type="button"
                  className={
                    todayFilter === "done" ? dashboardStyles.isActive : ""
                  }
                  onClick={() => setTodayFilter("done")}
                >
                  Done
                </button>
                <button
                  type="button"
                  className={
                    todayFilter === "attn" ? dashboardStyles.isActive : ""
                  }
                  onClick={() => setTodayFilter("attn")}
                >
                  Attn
                </button>
              </div>
            </div>
            <div className={dashboardStyles.panelList}>
              {isLoadingTodayTasks ? (
                <PanelSkeleton lines={5} lineHeight="3rem" />
              ) : filteredTodayRows.length > 0 ? (
                filteredTodayRows.map((task) => (
                  <TodayTaskRow key={task.id} task={task} />
                ))
              ) : (
                <EmptyLook label="today's tasks" />
              )}
            </div>
          </article>

          <article className={dashboardStyles.operationsPanel}>
            <div className={dashboardStyles.panelHeader}>Tomorrow (Plan)</div>
            <div className={dashboardStyles.panelList}>
              {isLoadingAdjacentDayTasks ||
              isLoadingProperties ||
              isLoadingStaff ? (
                <PanelSkeleton lines={4} lineHeight="2.5rem" />
              ) : tomorrowRows.length > 0 ? (
                tomorrowRows.map((task) => (
                  <PlanTaskRow key={task.id} task={task} />
                ))
              ) : (
                <EmptyLook label="tomorrow's tasks" />
              )}
            </div>
          </article>
        </div>
      </section>

      <section className={dashboardStyles.dashboard__lower}>
        <article className={dashboardStyles.panelCardSection}>
          <div className={dashboardStyles.panelCardHeader}>
            <div className={dashboardStyles.panelCardTitle}>
              <h3>Staff (today)</h3>
            </div>
          </div>
          <div className={dashboardStyles.panelCardList}>
            {isLoadingStaff || isLoadingTodayTasks ? (
              <PanelSkeleton lines={4} lineHeight="2.5rem" />
            ) : cleanerStats.length > 0 ? (
              cleanerStats.map((member) => {
                const earnings = formatEarnings(member.earnedByCurrency);
                return (
                  <div key={member.id} className={dashboardStyles.leaderRow}>
                    <div className={dashboardStyles.leaderProfile}>
                      <div className={dashboardStyles.leaderAvatar}>
                        <img src={member.avatar} alt={member.name} />
                      </div>
                      <div className={dashboardStyles.leaderInfo}>
                        <span className={dashboardStyles.leaderName}>
                          {member.name}
                        </span>
                        <span className={dashboardStyles.leaderMeta}>
                          {member.doneToday}/{member.totalToday} done
                          {earnings ? ` · ${earnings}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyLook label="cleaners" />
            )}
          </div>
        </article>

        <article className={dashboardStyles.panelCardSection}>
          <div className={dashboardStyles.panelCardHeader}>
            <div className={dashboardStyles.panelCardTitle}>
              <h3>Pending Leave Requests</h3>
            </div>
          </div>
          <div className={dashboardStyles.panelCardList}>
            {isLoadingLeaveRequests ? (
              <PanelSkeleton lines={3} lineHeight="2.5rem" />
            ) : pendingLeaves.length > 0 ? (
              pendingLeaves.map((leave) => (
                <button
                  key={leave.id}
                  type="button"
                  className={`${dashboardStyles.requestRow} ${dashboardStyles.requestRowButton}`}
                  onClick={() => {
                    setSelectedLeave(leave);
                    setReviewNote("");
                  }}
                >
                  <div className={dashboardStyles.requestProfile}>
                    <div className={dashboardStyles.leaveContent}>
                      <span className={dashboardStyles.requestName}>
                        {leave.requested_by_name}
                      </span>
                      <span className={dashboardStyles.leavePill}>
                        {formatLeaveType(leave.leave_type)}
                      </span>
                      <span className={dashboardStyles.leavePill}>
                        {formatDateRange(leave.start_date, leave.end_date)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <EmptyLook label="pending leave requests" />
            )}
          </div>
        </article>

        <Dialog
          open={Boolean(selectedLeave)}
          onOpenChange={(open) => {
            if (!open) closeLeaveDialog();
          }}
        >
          <DialogContent className={dashboardStyles.leaveRequestDialog}>
            {selectedLeave && (
              <>
                <DialogHeader>
                  <DialogTitle>Request Details</DialogTitle>
                </DialogHeader>
                <div className={dashboardStyles.leaveRequestDetails}>
                  <div>
                    <span>Name</span>
                    <strong>{selectedLeave.requested_by_name}</strong>
                  </div>
                  <div>
                    <span>Leave Type</span>
                    <strong>{formatLeaveType(selectedLeave.leave_type)}</strong>
                  </div>
                  <div>
                    <span>Dates</span>
                    <strong>
                      {formatDateRange(
                        selectedLeave.start_date,
                        selectedLeave.end_date,
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Reason</span>
                    <p>{selectedLeave.reason || "—"}</p>
                  </div>
                  <label className={dashboardStyles.leaveReviewNoteField}>
                    <span>review note</span>
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Optional note"
                    />
                  </label>
                </div>
                <DialogFooter className={dashboardStyles.leaveRequestActions}>
                  <button
                    type="button"
                    className={dashboardStyles.leaveActionApprove}
                    disabled={
                      !canManageLeave || actingLeaveId === selectedLeave.id
                    }
                    onClick={() =>
                      handleApproveLeave(
                        selectedLeave.id,
                        reviewNote.trim() || undefined,
                      )
                    }
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={dashboardStyles.leaveActionReject}
                    disabled={
                      !canManageLeave || actingLeaveId === selectedLeave.id
                    }
                    onClick={() =>
                      handleRejectLeave(
                        selectedLeave.id,
                        reviewNote.trim() || undefined,
                      )
                    }
                  >
                    Reject
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <article className={dashboardStyles.panelCardSection}>
          <div className={dashboardStyles.panelCardHeader}>
            <div className={dashboardStyles.panelCardTitle}>
              <h3>Overdue Starts</h3>
            </div>
          </div>
          <div className={dashboardStyles.panelCardList}>
            {isLoadingTodayTasks ? (
              <PanelSkeleton lines={3} lineHeight="2.5rem" />
            ) : overdueRows.length > 0 ? (
	              overdueRows.map((task) => (
	                <div key={task.id} className={dashboardStyles.requestRow}>
	                  <div className={dashboardStyles.requestProfile}>
	                    <span className={dashboardStyles.requestName}>
	                      {task.unit}
	                    </span>
	                    <span className={dashboardStyles.requestMeta}>
	                      Planned {task.time} · {task.staff}
	                    </span>
	                  </div>
	                </div>
	              ))
            ) : (
              <EmptyLook label="overdue tasks" />
            )}
          </div>
        </article>

        <article className={dashboardStyles.panelCardSection}>
          <div className={dashboardStyles.panelCardHeader}>
            <div className={dashboardStyles.panelCardTitle}>
              <h3>Chronic Issues</h3>
            </div>
          </div>
          <div className={dashboardStyles.panelCardList}>
            {isLoadingChronicIssues ? (
              <PanelSkeleton lines={3} lineHeight="2.5rem" />
            ) : chronicIssues.length > 0 ? (
              chronicIssues.map((issue) => {
                const propertyName =
	                  propertiesById.get(issue.property)?.name ||
	                  `Property #${issue.property}`;
	                return (
	                  <div key={issue.id} className={dashboardStyles.requestRow}>
	                    <div className={dashboardStyles.requestProfile}>
	                      <div className={dashboardStyles.requestContent}>
	                        <span className={dashboardStyles.requestName}>
	                          {propertyName}
	                        </span>
	                        <div className={dashboardStyles.requestPills}>
	                          <span className={dashboardStyles.requestPill}>
	                            {issue.report_count} issues
	                          </span>
	                          <span className={dashboardStyles.requestPill}>
	                            {formatIssueCategory(issue.issue_category)}
	                          </span>
	                        </div>
	                        <span className={dashboardStyles.requestMeta}>
	                          {issue.issue}
	                        </span>
	                      </div>
	                    </div>
	                  </div>
	                );
              })
            ) : (
              <EmptyLook label="chronic issues" />
            )}
          </div>
        </article>
      </section>
    </>
  );
}
