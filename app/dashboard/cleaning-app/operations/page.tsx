"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { LuCircleOff, LuCirclePlus } from "react-icons/lu";
import {
  addDays,
  addMonths,
  addMinutes,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";

import styles from "@/styles/app/operations/Operations.module.scss";
import CleaningBreadcrumb from "@/components/app/cleaning-app/CleaningBreadcrumb";
import ZoneSelector from "@/components/app/cleaning-app/ZoneSelector";
import { useWorkspace } from "@/context/workspace-context";
import { propertiesService } from "@/lib/services/properties.service";
import { tasksService } from "@/lib/services/tasks.service";
import { workspaceService } from "@/lib/services/workspace.service";
import type { Property, Task } from "@/types/api";

type SchedulerMode = "day" | "week" | "month";

type SchedulerUser = {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
};

type TaskItem = {
  id: string;
  userId: string;
  title: string;
  location?: string;
  displayLocation?: string;
  start: Date;
  end: Date;
  color: "primary" | "secondary" | "accent" | "outline";
  propertyId?: number | null;
  reservationId?: string | null;
  taskType?: "cleaning" | "maintenance";
};

type SchedulerProps = {
  users: SchedulerUser[];
  tasks: TaskItem[];
  properties: Property[];
  onTaskCreate: (task: TaskItem) => void;
  onTaskUpdate: (task: TaskItem) => void;
};

type SlotInfo =
  | {
      id: string;
      view: "week";
      userId: string;
      day: Date;
      minutes: number;
    }
  | {
      id: string;
      view: "day";
      userId: string;
      minutes: number;
    }
  | {
      id: string;
      view: "month";
      day: Date;
    };

type BlockState = {
  userId: string;
  date: Date;
  start: Date;
  end: Date;
  type: "cleaning" | "maintenance";
  notes: string;
  propertyId?: number | null;
  reservationId?: string | null;
};

const rowHeight = 60;
const minutesPerPixel = 60 / rowHeight;
const snapMinutes = 15;
const visibleStartHour = 9;
const visibleEndHour = 17;
const visibleHours = visibleEndHour - visibleStartHour;
const visibleMinutes = visibleHours * 60;
const dayRowHeight = 70;
const dayHourWidth = 120;
const dayMinutesPerPixel = 60 / dayHourWidth;
const monthVisibleLimit = 3;
const monthPopoverOffset = 12;
const monthPopoverViewportPadding = 16;

const minutesFromDayStart = (date: Date) =>
  date.getHours() * 60 + date.getMinutes();
const minutesFromVisibleStart = (date: Date) =>
  minutesFromDayStart(date) - visibleStartHour * 60;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const snapToStep = (minutes: number) =>
  Math.round(minutes / snapMinutes) * snapMinutes;

const UNASSIGNED_USER_ID = "unassigned";
const taskPalette = ["primary", "secondary", "accent"] as const;
const randomTaskColor = (): TaskItem["color"] =>
  taskPalette[Math.floor(Math.random() * taskPalette.length)];
const resolveTaskColor = (
  userId: string,
  fallback?: TaskItem["color"],
): TaskItem["color"] => {
  if (userId === UNASSIGNED_USER_ID) {
    return "outline";
  }
  if (fallback && fallback !== "outline") {
    return fallback;
  }
  return randomTaskColor();
};

const UNASSIGNED_USER: SchedulerUser = {
  id: UNASSIGNED_USER_ID,
  name: "Unassigned",
  role: "Open tasks",
};

type LayoutTask = TaskItem & {
  startMinutes: number;
  endMinutes: number;
  col: number;
  cols: number;
  groupId: number;
};

const layoutTasks = (tasks: TaskItem[]) => {
  const sorted = [...tasks].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const layout: LayoutTask[] = [];
  let groupId = -1;
  const groupMax: Record<number, number> = {};
  const active: {
    id: string;
    endMinutes: number;
    col: number;
    groupId: number;
  }[] = [];

  sorted.forEach((task) => {
    const startMinutes = minutesFromVisibleStart(task.start);
    const endMinutes = minutesFromVisibleStart(task.end);
    const remaining = active.filter((item) => item.endMinutes > startMinutes);
    active.length = 0;
    active.push(...remaining);

    if (active.length === 0) {
      groupId += 1;
    }

    const taken = new Set(active.map((item) => item.col));
    let col = 0;
    while (taken.has(col)) {
      col += 1;
    }

    const current: LayoutTask = {
      ...task,
      startMinutes,
      endMinutes,
      col,
      cols: 1,
      groupId,
    };
    layout.push(current);
    active.push({ id: task.id, endMinutes, col, groupId });

    const currentCols = Math.max(...active.map((item) => item.col)) + 1;
    groupMax[groupId] = Math.max(groupMax[groupId] || 1, currentCols);
  });

  return layout.map((task) => ({
    ...task,
    cols: groupMax[task.groupId] || 1,
  }));
};

type DayLayoutTask = TaskItem & {
  startMinutes: number;
  endMinutes: number;
  lane: number;
  lanes: number;
};

const layoutDayTasks = (tasks: TaskItem[]) => {
  const sorted = [...tasks].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const layout: DayLayoutTask[] = [];
  const laneEnds: number[] = [];

  sorted.forEach((task) => {
    const startMinutes = minutesFromVisibleStart(task.start);
    const endMinutes = minutesFromVisibleStart(task.end);
    let laneIndex = laneEnds.findIndex((end) => end <= startMinutes);
    if (laneIndex === -1) {
      laneIndex = laneEnds.length;
      laneEnds.push(endMinutes);
    } else {
      laneEnds[laneIndex] = endMinutes;
    }
    layout.push({
      ...task,
      startMinutes,
      endMinutes,
      lane: laneIndex,
      lanes: laneEnds.length,
    });
  });

  return layout.map((task) => ({
    ...task,
    lanes: laneEnds.length || 1,
  }));
};

const getPropertyAddressLabel = (property?: Property | null) => {
  if (!property?.address) {
    return "";
  }

  const { address } = property;
  const cityName = typeof address.city === "object" ? address.city.name : "";
  const stateName =
    typeof address.state === "object" ? address.state.name : "";
  const countryName =
    typeof address.country === "object" ? address.country.name : "";

  return [
    address.address_line_1,
    address.address_line_2,
    cityName,
    stateName,
    address.postal_code,
    countryName,
  ]
    .filter(Boolean)
    .join(", ");
};

const createTaskItemFromApi = (
  task: Task,
  properties: Property[],
  fallbackColor?: TaskItem["color"],
): TaskItem => {
  const toValidDate = (value?: string) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const start = toValidDate(task.planned_start_time || task.start_time);
  const end = toValidDate(
    task.planned_end_time ||
      task.end_time ||
      task.planned_start_time ||
      task.start_time,
  );
  const userId = task.assignee ? task.assignee.toString() : UNASSIGNED_USER_ID;
  const property =
    properties.find((item) => item.id === task.property) ?? null;

  return {
    id: task.id.toString(),
    userId,
    title:
      property?.name ||
      (task.property ? `Property ${task.property}` : `Task ${task.id}`),
    location: task.description || "",
    displayLocation: getPropertyAddressLabel(property) || task.description || "",
    start,
    end,
    color: resolveTaskColor(userId, fallbackColor),
    propertyId: task.property ?? null,
    reservationId:
      task.reservation !== undefined && task.reservation !== null
        ? String(task.reservation)
        : null,
    taskType: task.type,
  };
};

type MonthPopoverState = {
  task: TaskItem;
  anchorRect: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
};

const resolveMonthPopoverPosition = (
  anchorRect: MonthPopoverState["anchorRect"],
  popoverWidth: number,
  popoverHeight: number,
) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const available = {
    right:
      viewportWidth - anchorRect.right - monthPopoverViewportPadding,
    left: anchorRect.left - monthPopoverViewportPadding,
    bottom:
      viewportHeight - anchorRect.bottom - monthPopoverViewportPadding,
    top: anchorRect.top - monthPopoverViewportPadding,
  };

  let placement: "right" | "left" | "bottom" | "top" = "right";
  if (available.right >= popoverWidth + monthPopoverOffset) {
    placement = "right";
  } else if (available.left >= popoverWidth + monthPopoverOffset) {
    placement = "left";
  } else if (available.bottom >= popoverHeight + monthPopoverOffset) {
    placement = "bottom";
  } else if (available.top >= popoverHeight + monthPopoverOffset) {
    placement = "top";
  } else {
    placement = (Object.entries(available).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "right") as "right" | "left" | "bottom" | "top";
  }

  let left = anchorRect.right + monthPopoverOffset;
  let top = anchorRect.top;

  if (placement === "left") {
    left = anchorRect.left - popoverWidth - monthPopoverOffset;
  } else if (placement === "bottom") {
    left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    top = anchorRect.bottom + monthPopoverOffset;
  } else if (placement === "top") {
    left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    top = anchorRect.top - popoverHeight - monthPopoverOffset;
  }

  left = clamp(
    left,
    monthPopoverViewportPadding,
    viewportWidth - popoverWidth - monthPopoverViewportPadding,
  );
  top = clamp(
    top,
    monthPopoverViewportPadding,
    viewportHeight - popoverHeight - monthPopoverViewportPadding,
  );

  return { left, top };
};

const DayCell = ({
  userId,
  day,
  tasks,
  onTaskClick,
  menuSlotId,
  onOpenMenu,
  onAddTask,
  onMore,
}: {
  userId: string;
  day: Date;
  tasks: TaskItem[];
  onTaskClick: (task: TaskItem) => void;
  menuSlotId: string | null;
  onOpenMenu: (slot: {
    id: string;
    view: "week";
    userId: string;
    day: Date;
    minutes: number;
  }) => void;
  onAddTask: (slot: {
    id: string;
    view: "week";
    userId: string;
    day: Date;
    minutes: number;
  }) => void;
  onMore: () => void;
}) => {
  const { setNodeRef } = useDroppable({
    id: `cell-${userId}-${day.toISOString()}`,
    data: { type: "cell", userId, day },
  });
  const layout = layoutTasks(tasks);
  const slotHeight = (snapMinutes / 60) * rowHeight;
  const slotMinutes = Array.from(
    { length: visibleMinutes / snapMinutes },
    (_, idx) => idx * snapMinutes,
  );
  return (
    <div ref={setNodeRef} className={styles.dayCell}>
      <div className={styles.weekSlots}>
        {slotMinutes.map((minutes) => {
          const slotId = `week-${userId}-${format(day, "yyyy-MM-dd")}-${minutes}`;
          return (
            <div
              key={slotId}
              className={styles.weekSlot}
              style={{ top: minutes / minutesPerPixel, height: slotHeight }}
            >
            </div>
          );
        })}
      </div>
      <div className={styles.timeGrid}>
        {layout.map((task) => {
          const top = task.startMinutes / minutesPerPixel;
          const height =
            (task.endMinutes - task.startMinutes) / minutesPerPixel;
          const width = 100 / task.cols;
          const left = task.col * width;

          return (
            <TaskCard
              key={task.id}
              task={task}
              y={top}
              height={height}
              widthPercent={width}
              leftPercent={left}
              onClick={(event) => {
                event.stopPropagation();
                onTaskClick(task);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const TaskCard = ({
  task,
  y,
  height,
  widthPercent,
  leftPercent,
  onClick,
  onPointerEnter,
}: {
  task: TaskItem;
  y: number;
  height: number;
  widthPercent: number;
  leftPercent: number;
  onClick: (event: MouseEvent) => void;
  onPointerEnter?: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      data: { type: "task", taskId: task.id },
    });
  const {
    attributes: resizeAttributes,
    listeners: resizeListeners,
    setNodeRef: setResizeRef,
  } = useDraggable({
    id: `resize-${task.id}`,
    data: { type: "resize", taskId: task.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.taskCard} ${styles[task.color]} ${
        isDragging ? styles.dragging : ""
      }`}
      style={{
        top: y,
        height,
        width: `${widthPercent}%`,
        left: `${leftPercent}%`,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      {...attributes}
      {...listeners}
    >
      <div className={styles.taskTime}>
        {format(task.start, "HH:mm")} - {format(task.end, "HH:mm")}
      </div>
      <div className={styles.taskTitle}>{task.title}</div>
      {task.displayLocation ? (
        <div className={styles.taskLocation}>{task.displayLocation}</div>
      ) : null}
      <div
        ref={setResizeRef}
        className={styles.resizeHandle}
        {...resizeAttributes}
        {...resizeListeners}
      />
    </div>
  );
};

const DayTaskCard = ({
  task,
  left,
  width,
  top,
  height,
  onClick,
  onPointerEnter,
}: {
  task: TaskItem;
  left: number;
  width: number;
  top: number;
  height: number;
  onClick: (event: MouseEvent) => void;
  onPointerEnter?: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `day-task-${task.id}`,
      data: { type: "day-task", taskId: task.id },
    });
  const {
    attributes: resizeStartAttributes,
    listeners: resizeStartListeners,
    setNodeRef: setResizeStartRef,
  } = useDraggable({
    id: `day-resize-start-${task.id}`,
    data: { type: "day-resize-start", taskId: task.id },
  });
  const {
    attributes: resizeEndAttributes,
    listeners: resizeEndListeners,
    setNodeRef: setResizeEndRef,
  } = useDraggable({
    id: `day-resize-end-${task.id}`,
    data: { type: "day-resize-end", taskId: task.id },
  });

  return (
    <div
      ref={setNodeRef}
      data-task
      className={`${styles.dayTaskCard} ${styles[task.color]} ${
        isDragging ? styles.dragging : ""
      }`}
      style={{
        left,
        width,
        top,
        height,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      {...attributes}
      {...listeners}
    >
      <span
        ref={setResizeStartRef}
        className={styles.dayResizeHandleStart}
        {...resizeStartAttributes}
        {...resizeStartListeners}
      />
      <span
        ref={setResizeEndRef}
        className={styles.dayResizeHandleEnd}
        {...resizeEndAttributes}
        {...resizeEndListeners}
      />
      <div className={styles.taskTime}>
        {format(task.start, "HH:mm")} - {format(task.end, "HH:mm")}
      </div>
      <div className={styles.taskTitle}>{task.title}</div>
      {task.displayLocation ? (
        <div className={styles.taskLocation}>{task.displayLocation}</div>
      ) : null}
    </div>
  );
};

const CornerFoldAdd = ({
  open,
  isVisible,
  onOpen,
  onAdd,
  onMore,
}: {
  open: boolean;
  isVisible: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onMore: () => void;
}) => (
  <div
    className={`${styles.cornerFold} ${isVisible ? styles.cornerFoldVisible : ""}`}
    data-hover-actions
    data-fold
  >
    <button
      type="button"
      className={styles.cornerFoldButton}
      onClick={onOpen}
      data-fold-button
    >
      <span className={styles.cornerFoldIcon}>+</span>
    </button>
    {open ? (
      <div className={styles.addTaskMenu} data-add-menu>
        <button type="button" onClick={onAdd}>
          Add Task
        </button>
        <button type="button" onClick={onMore}>
          Add unavailability
        </button>
      </div>
    ) : null}
  </div>
);

const DayRow = ({
  user,
  tasks,
  timelineWidth,
  onTaskClick,
  onAddTask,
  onAddBlock,
}: {
  user: SchedulerUser;
  tasks: TaskItem[];
  timelineWidth: number;
  onTaskClick: (task: TaskItem) => void;
  onAddTask: (slot: {
    id: string;
    view: "day";
    userId: string;
    minutes: number;
  }) => void;
  onAddBlock: (slot: {
    id: string;
    view: "day";
    userId: string;
    minutes: number;
  }) => void;
}) => {
  const layout = layoutDayTasks(tasks);
  const { setNodeRef } = useDroppable({
    id: `day-row-${user.id}`,
    data: { type: "day-row", userId: user.id },
  });
  const slotWidth = (snapMinutes / 60) * dayHourWidth;
  const slotMinutes = Array.from(
    { length: visibleMinutes / snapMinutes },
    (_, idx) => idx * snapMinutes,
  );
  return (
    <div className={styles.dayRow}>
      <div className={styles.daySidebarCell}>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.name}</div>
        </div>
        <div className={styles.daySidebarActions}>
          <button
            type="button"
            className={styles.addTaskTrigger}
            onClick={() =>
              onAddTask({
                id: `day-add-${user.id}`,
                view: "day",
                userId: user.id,
                minutes: 0,
              })
            }
          >
            <LuCirclePlus className={styles.addTaskIcon} />
          </button>
          <button
            type="button"
            className={styles.addUnavailabilityTrigger}
            onClick={() =>
              onAddBlock({
                id: `day-block-${user.id}`,
                view: "day",
                userId: user.id,
                minutes: 0,
              })
            }
          >
            <LuCircleOff className={styles.addTaskIcon} />
          </button>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={styles.dayRowCanvas}
        style={{ width: timelineWidth }}
      >
        <div className={styles.dayRowGrid} />
        <div className={styles.daySlots}>
          {slotMinutes.map((minutes) => {
            const slotId = `day-${user.id}-${minutes}`;
            const slot = {
              id: slotId,
              view: "day" as const,
              userId: user.id,
              minutes,
            };
            return (
              <div
                key={slotId}
                className={styles.daySlot}
                style={{ left: minutes * (dayHourWidth / 60), width: slotWidth }}
                onClick={() => onAddTask(slot)}
              />
            );
          })}
        </div>
        {layout.map((task) => {
          const left = task.startMinutes * (dayHourWidth / 60);
          const width =
            (task.endMinutes - task.startMinutes) * (dayHourWidth / 60);
          const laneHeight = Math.max(
            28,
            Math.min(44, Math.floor((dayRowHeight - 12) / task.lanes)),
          );
          const top = 6 + task.lane * laneHeight;
          const height = laneHeight - 6;

          return (
            <DayTaskCard
              key={task.id}
              task={task}
              left={left}
              width={width}
              top={top}
              height={height}
              onClick={(event) => {
                event.stopPropagation();
                onTaskClick(task);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const MonthView = ({
  monthDate,
  tasks,
  users,
  onTaskClick,
  hoveredSlotId,
  menuSlotId,
  onSlotEnter,
  onSlotLeave,
  onOpenMenu,
  onAddTask,
  onMore,
}: {
  monthDate: Date;
  tasks: TaskItem[];
  users: SchedulerUser[];
  onTaskClick: (task: TaskItem) => void;
  hoveredSlotId: string | null;
  menuSlotId: string | null;
  onSlotEnter: (slot: SlotInfo) => void;
  onSlotLeave: (slotId: string, immediate?: boolean) => void;
  onOpenMenu: (slot: SlotInfo) => void;
  onAddTask: (slot: SlotInfo) => void;
  onMore: () => void;
}) => {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [popover, setPopover] = useState<MonthPopoverState | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const popoverHover = useRef(false);
  const closeTimeout = useRef<number | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverAnchorRef = useRef<HTMLDivElement | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((task) => {
      const key = format(task.start, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    map.forEach((list, key) => {
      map.set(
        key,
        list.sort((a, b) => a.start.getTime() - b.start.getTime()),
      );
    });
    return map;
  }, [tasks]);

  const toggleExpanded = (key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleTaskEnter = (event: MouseEvent<HTMLDivElement>, task: TaskItem) => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    popoverAnchorRef.current = event.currentTarget;
    const targetRect = event.currentTarget.getBoundingClientRect();
    setPopover({
      task,
      anchorRect: {
        top: targetRect.top,
        right: targetRect.right,
        bottom: targetRect.bottom,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
      },
    });
  };

  const handleTaskLeave = () => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
    }
    closeTimeout.current = window.setTimeout(() => {
      if (!popoverHover.current) {
        setPopover(null);
        setPopoverPosition(null);
        popoverAnchorRef.current = null;
      }
    }, 120);
  };

  useLayoutEffect(() => {
    if (!popover || !popoverRef.current) {
      return;
    }
    const anchorRect = (
      popoverAnchorRef.current?.getBoundingClientRect() ?? popover.anchorRect
    );
    const { width, height } = popoverRef.current.getBoundingClientRect();
    setPopoverPosition(
      resolveMonthPopoverPosition(anchorRect, width, height),
    );
  }, [popover]);

  useEffect(() => {
    if (!popover) {
      return;
    }

    const updatePosition = () => {
      if (!popoverRef.current) {
        return;
      }
      if (popoverAnchorRef.current && !popoverAnchorRef.current.isConnected) {
        setPopover(null);
        setPopoverPosition(null);
        popoverAnchorRef.current = null;
        return;
      }
      const anchorRect = (
        popoverAnchorRef.current?.getBoundingClientRect() ?? popover.anchorRect
      );
      const { width, height } = popoverRef.current.getBoundingClientRect();
      setPopoverPosition(
        resolveMonthPopoverPosition(anchorRect, width, height),
      );
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [popover]);

  useEffect(() => {
    return () => {
      if (closeTimeout.current) {
        window.clearTimeout(closeTimeout.current);
      }
    };
  }, []);

  return (
    <div className={styles.monthView}>
      <div className={styles.monthWeekdays}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div key={label} className={styles.monthWeekday}>
            {label}
          </div>
        ))}
      </div>
      <div className={styles.monthGrid}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const list = taskMap.get(key) ?? [];
          return (
            <MonthCell
              key={key}
              day={day}
              monthDate={monthDate}
              tasks={list}
              expanded={expandedDays.has(key)}
              onToggleExpanded={() => toggleExpanded(key)}
              onTaskClick={onTaskClick}
              onTaskEnter={handleTaskEnter}
              onTaskLeave={handleTaskLeave}
              hoveredSlotId={hoveredSlotId}
              menuSlotId={menuSlotId}
              onSlotEnter={onSlotEnter}
              onSlotLeave={onSlotLeave}
              onOpenMenu={onOpenMenu}
              onAddTask={onAddTask}
              onMore={onMore}
            />
          );
        })}

      </div>
      {popover
        ? createPortal(
            <div
              ref={popoverRef}
              className={styles.monthPopover}
              style={{
                left: popoverPosition?.left ?? monthPopoverViewportPadding,
                top: popoverPosition?.top ?? monthPopoverViewportPadding,
                visibility: popoverPosition ? "visible" : "hidden",
              }}
              onMouseEnter={() => {
                popoverHover.current = true;
                if (closeTimeout.current) {
                  window.clearTimeout(closeTimeout.current);
                  closeTimeout.current = null;
                }
              }}
              onMouseLeave={() => {
                popoverHover.current = false;
                setPopover(null);
                setPopoverPosition(null);
                popoverAnchorRef.current = null;
              }}
            >
              <div className={styles.monthPopoverTitle}>
                {popover.task.title}
              </div>
              <div className={styles.monthPopoverRow}>
                <span className={styles.monthPopoverIcon}>📅</span>
                {format(popover.task.start, "dd/MM/yyyy")}
              </div>
              <div className={styles.monthPopoverRow}>
                <span className={styles.monthPopoverIcon}>🕒</span>
                {format(popover.task.start, "HH:mm")} -{" "}
                {format(popover.task.end, "HH:mm")}
              </div>
              <div className={styles.monthPopoverRow}>
                <span className={styles.monthPopoverIcon}>📍</span>
                {popover.task.displayLocation || "Location"}
              </div>
              <div className={styles.monthPopoverRow}>
                <span className={styles.monthPopoverIcon}>👤</span>
                {users.find((user) => user.id === popover.task.userId)?.name ||
                  "User"}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

function MonthTaskPill({
  task,
  slotId,
  foldSlotId,
  onTaskClick,
  onTaskEnter,
  onTaskLeave,
  onSlotLeave,
}: {
  task: TaskItem;
  slotId: string;
  foldSlotId: string;
  onTaskClick: (task: TaskItem) => void;
  onTaskEnter: (event: MouseEvent<HTMLDivElement>, task: TaskItem) => void;
  onTaskLeave: () => void;
  onSlotLeave: (slotId: string, immediate?: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setTaskRef,
    isDragging,
  } = useDraggable({
    id: `month-task-${task.id}`,
    data: { type: "month-task", taskId: task.id },
  });
  const text = `${format(task.start, "HH:mm")} - ${format(
    task.end,
    "HH:mm",
  )} ${task.title}`;

  return (
    <div
      data-task
      ref={setTaskRef}
      className={`${styles.monthTaskPill} ${
        task.color === "outline" ? styles.monthTaskOutline : styles[task.color]
      } ${isDragging ? styles.dragging : ""}`}
      onClick={() => onTaskClick(task)}
      onMouseEnter={(event) => onTaskEnter(event, task)}
      onMouseLeave={onTaskLeave}
      onPointerEnter={() => onSlotLeave(foldSlotId, true)}
      title={text}
      {...attributes}
      {...listeners}
    >
      {text}
    </div>
  );
}

function MonthCell({
  day,
  monthDate,
  tasks,
  expanded,
  onToggleExpanded,
  onTaskClick,
  onTaskEnter,
  onTaskLeave,
  hoveredSlotId,
  menuSlotId,
  onSlotEnter,
  onSlotLeave,
  onOpenMenu,
  onAddTask,
  onMore,
}: {
  day: Date;
  monthDate: Date;
  tasks: TaskItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onTaskClick: (task: TaskItem) => void;
  onTaskEnter: (event: MouseEvent<HTMLDivElement>, task: TaskItem) => void;
  onTaskLeave: () => void;
  hoveredSlotId: string | null;
  menuSlotId: string | null;
  onSlotEnter: (slot: SlotInfo) => void;
  onSlotLeave: (slotId: string, immediate?: boolean) => void;
  onOpenMenu: (slot: SlotInfo) => void;
  onAddTask: (slot: SlotInfo) => void;
  onMore: () => void;
}) {
  const key = format(day, "yyyy-MM-dd");
  const slot: SlotInfo = { id: `month-${key}`, view: "month", day };
  const crowded =
    expanded || tasks.length >= 2 || tasks.length > monthVisibleLimit;
  const foldSlotId = `month-fold-${key}`;
  const foldVisible = hoveredSlotId === foldSlotId || menuSlotId === foldSlotId;
  const visible = expanded ? tasks : tasks.slice(0, monthVisibleLimit);
  const { setNodeRef } = useDroppable({
    id: `month-cell-${key}`,
    data: { type: "month-cell", day },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.monthCell} ${
        isSameMonth(day, monthDate) ? "" : styles.monthCellMuted
      }`}
      onPointerEnter={(event) => {
        if ((event.target as HTMLElement).closest("[data-task]")) {
          return;
        }
        onSlotEnter({
          id: foldSlotId,
          view: "month",
          day,
        });
      }}
      onPointerLeave={() => onSlotLeave(foldSlotId)}
    >
      <div className={styles.monthCellHeader}>
        {isToday(day) ? (
          <span className={styles.monthTodayLabel}>Today</span>
        ) : null}
        <span
          className={`${styles.monthDayNumber} ${
            isToday(day) ? styles.monthDayNumberToday : ""
          }`}
        >
          {format(day, "d")}
        </span>
      </div>
      <div className={styles.monthTasks}>
        {visible.map((task) => (
          <MonthTaskPill
            key={task.id}
            task={task}
            slotId={slot.id}
            foldSlotId={foldSlotId}
            onTaskClick={onTaskClick}
            onTaskEnter={onTaskEnter}
            onTaskLeave={onTaskLeave}
            onSlotLeave={onSlotLeave}
          />
        ))}
        {tasks.length > monthVisibleLimit ? (
          <button
            type="button"
            className={styles.monthMore}
            onClick={onToggleExpanded}
          >
            {expanded
              ? "Show less"
              : `+${tasks.length - monthVisibleLimit} more`}
          </button>
        ) : null}
      </div>
      <CornerFoldAdd
        isVisible={foldVisible}
        open={menuSlotId === foldSlotId}
        onOpen={() =>
          onOpenMenu({
            id: foldSlotId,
            view: "month",
            day,
          })
        }
        onAdd={() =>
          onAddTask({
            id: foldSlotId,
            view: "month",
            day,
          })
        }
        onMore={onMore}
      />
    </div>
  );
}

const Scheduler = ({
  users,
  tasks,
  properties,
  onTaskCreate,
  onTaskUpdate,
}: SchedulerProps) => {
  const { currentWorkspace } = useWorkspace();
  const [mode, setMode] = useState<SchedulerMode>("week");
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [selectedDay, setSelectedDay] = useState(
    startOfDay(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 4)),
  );
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [propertyQuery, setPropertyQuery] = useState("");
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);
  const [blockState, setBlockState] = useState<BlockState | null>(null);
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
    userId: string;
    start: Date;
    end: Date;
    title: string;
    location: string;
    propertyId?: number | null;
    reservationId?: string | null;
    taskType?: "cleaning" | "maintenance";
    taskId?: string;
  } | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<SlotInfo | null>(null);
  const [menuSlot, setMenuSlot] = useState<SlotInfo | null>(null);
  const hoverTimeout = useRef<number | null>(null);
  const [activeMonthTask, setActiveMonthTask] = useState<TaskItem | null>(
    null,
  );
  const selectedBlockUser =
    users.find((user) => user.id === blockState?.userId) ?? UNASSIGNED_USER;

  useEffect(() => {
    if (!menuSlot) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("[data-add-menu]") ||
        target.closest("[data-fold]") ||
        target.closest("[data-fold-button]")
      ) {
        return;
      }
      setMenuSlot(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuSlot]);

  useEffect(() => {
    setPropertyQuery(modalState?.title ?? "");
    if (!modalState) {
      setIsPropertyMenuOpen(false);
    }
  }, [modalState?.title, modalState]);

  const filteredProperties = useMemo(() => {
    const query = propertyQuery.trim().toLowerCase();
    if (!query) {
      return properties;
    }
    return properties.filter((property) =>
      property.name.toLowerCase().includes(query),
    );
  }, [properties, propertyQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const days = useMemo(
    () => Array.from({ length: 7 }).map((_, idx) => addDays(weekStart, idx)),
    [weekStart],
  );
  const dayHours = useMemo(
    () =>
      Array.from({ length: visibleHours }, (_, idx) => visibleStartHour + idx),
    [],
  );
  const timelineWidth = visibleHours * dayHourWidth;

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current as
      | { type: "month-task"; taskId: string }
      | undefined;
    if (activeData?.type === "month-task") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      setActiveMonthTask(task ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | { type: "task"; taskId: string }
      | { type: "resize"; taskId: string }
      | { type: "day-task"; taskId: string }
      | { type: "day-resize-start"; taskId: string }
      | { type: "day-resize-end"; taskId: string }
      | { type: "month-task"; taskId: string }
      | undefined;
    const overData = event.over?.data.current as
      | { type: "cell"; userId: string; day: Date }
      | { type: "day-row"; userId: string }
      | { type: "month-cell"; day: Date }
      | undefined;

    if (!activeData) {
      return;
    }

    if (activeData.type === "task" && overData?.type === "cell") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      if (!task) {
        return;
      }
      const deltaMinutes = snapToStep(event.delta.y * minutesPerPixel);
      const duration = differenceInMinutes(task.end, task.start);
      const baseMinutes = minutesFromVisibleStart(task.start);
      const newStartMinutes = clamp(
        baseMinutes + deltaMinutes,
        0,
        visibleMinutes - duration,
      );
      const dayStart = startOfDay(overData.day);
      const newStart = addMinutes(
        dayStart,
        visibleStartHour * 60 + newStartMinutes,
      );
      const newEnd = addMinutes(newStart, duration);

      onTaskUpdate({
        ...task,
        userId: overData.userId,
        start: newStart,
        end: newEnd,
        color: resolveTaskColor(overData.userId, task.color),
      });
    }

    if (activeData.type === "resize") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      if (!task) {
        return;
      }
      const deltaMinutes = snapToStep(event.delta.y * minutesPerPixel);
      const startMinutes = minutesFromVisibleStart(task.start);
      const endMinutes = minutesFromVisibleStart(task.end);
      const nextEndMinutes = clamp(
        endMinutes + deltaMinutes,
        startMinutes + snapMinutes,
        visibleMinutes,
      );
      const dayStart = startOfDay(task.start);
      const newEnd = addMinutes(
        dayStart,
        visibleStartHour * 60 + nextEndMinutes,
      );

      onTaskUpdate({
        ...task,
        end: newEnd,
      });
    }

    if (activeData.type === "day-task" && overData?.type === "day-row") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      if (!task) {
        return;
      }
      const deltaMinutes = snapToStep(event.delta.x * dayMinutesPerPixel);
      const duration = differenceInMinutes(task.end, task.start);
      const baseMinutes = minutesFromVisibleStart(task.start);
      const newStartMinutes = clamp(
        baseMinutes + deltaMinutes,
        0,
        visibleMinutes - duration,
      );
      const dayStart = startOfDay(selectedDay);
      const newStart = addMinutes(
        dayStart,
        visibleStartHour * 60 + newStartMinutes,
      );
      const newEnd = addMinutes(newStart, duration);

      onTaskUpdate({
        ...task,
        userId: overData.userId,
        start: newStart,
        end: newEnd,
        color: resolveTaskColor(overData.userId, task.color),
      });
    }

    if (activeData.type === "day-resize-start") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      if (!task) {
        return;
      }
      const deltaMinutes = snapToStep(event.delta.x * dayMinutesPerPixel);
      const startMinutes = minutesFromVisibleStart(task.start);
      const endMinutes = minutesFromVisibleStart(task.end);
      const nextStartMinutes = clamp(
        startMinutes + deltaMinutes,
        0,
        endMinutes - snapMinutes,
      );
      const dayStart = startOfDay(selectedDay);
      const newStart = addMinutes(
        dayStart,
        visibleStartHour * 60 + nextStartMinutes,
      );

      onTaskUpdate({
        ...task,
        start: newStart,
      });
    }

    if (activeData.type === "day-resize-end") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      if (!task) {
        return;
      }
      const deltaMinutes = snapToStep(event.delta.x * dayMinutesPerPixel);
      const startMinutes = minutesFromVisibleStart(task.start);
      const endMinutes = minutesFromVisibleStart(task.end);
      const nextEndMinutes = clamp(
        endMinutes + deltaMinutes,
        startMinutes + snapMinutes,
        visibleMinutes,
      );
      const dayStart = startOfDay(selectedDay);
      const newEnd = addMinutes(
        dayStart,
        visibleStartHour * 60 + nextEndMinutes,
      );

      onTaskUpdate({
        ...task,
        end: newEnd,
      });
    }

    if (activeData.type === "month-task" && overData?.type === "month-cell") {
      const task = tasks.find((item) => item.id === activeData.taskId);
      if (!task) {
        return;
      }
      const startMinutes = minutesFromDayStart(task.start);
      const endMinutes = minutesFromDayStart(task.end);
      const dayStart = startOfDay(overData.day);
      const newStart = addMinutes(dayStart, startMinutes);
      const newEnd = addMinutes(dayStart, endMinutes);

      onTaskUpdate({
        ...task,
        start: newStart,
        end: newEnd,
      });
    }

    if (activeData?.type === "month-task") {
      setActiveMonthTask(null);
    }
  };

  const openAddModal = (slot: SlotInfo) => {
    if (slot.view === "month") {
      const dayStart = startOfDay(slot.day);
      const start = addMinutes(dayStart, visibleStartHour * 60);
      const end = addMinutes(start, 120);
      setModalState({
        mode: "add",
        userId: UNASSIGNED_USER_ID,
        start,
        end,
        title: "",
        location: "",
        propertyId: null,
        reservationId: null,
        taskType: "cleaning",
      });
      setMenuSlot(null);
      return;
    }
    const dayBase = slot.view === "week" ? slot.day : selectedDay;
    const dayStart = startOfDay(dayBase);
    const start = addMinutes(
      dayStart,
      visibleStartHour * 60 + slot.minutes,
    );
    const end = addMinutes(start, 120);
    setModalState({
      mode: "add",
      userId: UNASSIGNED_USER_ID,
      start,
      end,
      title: "",
      location: "",
      propertyId: null,
      reservationId: null,
      taskType: "cleaning",
    });
    setMenuSlot(null);
  };

  const openBlockModal = (slot?: SlotInfo) => {
    const fallbackUserId = UNASSIGNED_USER_ID;
    const baseDate =
      slot?.view === "month"
        ? slot.day
        : slot?.view === "week"
          ? slot.day
          : selectedDay;
    const dayStart = startOfDay(baseDate);
    const start = addMinutes(dayStart, visibleStartHour * 60);
    const end = addMinutes(start, 120);

    setBlockState({
      userId: fallbackUserId,
      date: dayStart,
      start,
      end,
      type: "cleaning",
      notes: "",
      propertyId: null,
      reservationId: null,
    });
    setMenuSlot(null);
  };

  const openEditModal = (task: TaskItem) => {
    setModalState({
      mode: "edit",
      userId: task.userId,
      start: task.start,
      end: task.end,
      title: task.title,
      location: task.location ?? "",
      propertyId: task.propertyId ?? null,
      reservationId: task.reservationId ?? null,
      taskType: task.taskType ?? "cleaning",
      taskId: task.id,
    });
  };

  const handleBlockSave = async () => {
    if (!blockState || !currentWorkspace?.id) {
      setBlockState(null);
      return;
    }

    const assignee =
      blockState.userId === UNASSIGNED_USER_ID
        ? null
        : Number(blockState.userId);

    const createPayload: Partial<Task> = {
      property: blockState.propertyId ?? undefined,
      reservation: blockState.reservationId ?? undefined,
      planned_start_time: blockState.start.toISOString(),
      planned_end_time: blockState.end.toISOString(),
      start_time: blockState.start.toISOString(),
      end_time: blockState.end.toISOString(),
      assignee: assignee ?? undefined,
      type: blockState.type,
      result: "successful",
      description: blockState.notes || "",
    };

    const response = await tasksService.createTask(
      currentWorkspace.id,
      createPayload as Task,
    );

    if (response.success && response.data) {
      onTaskCreate(createTaskItemFromApi(response.data, properties));
    }

    setBlockState(null);
  };

  const handleModalSave = async () => {
    if (!modalState) {
      return;
    }
    const dayStart = startOfDay(modalState.start);
    const startMinutes = clamp(
      minutesFromVisibleStart(modalState.start),
      0,
      visibleMinutes - snapMinutes,
    );
    const endMinutes = clamp(
      minutesFromVisibleStart(modalState.end),
      startMinutes + snapMinutes,
      visibleMinutes,
    );
    const start = addMinutes(dayStart, visibleStartHour * 60 + startMinutes);
    const end = addMinutes(dayStart, visibleStartHour * 60 + endMinutes);

    if (!currentWorkspace?.id) {
      setModalState(null);
      return;
    }

    const assignee =
      modalState.userId === UNASSIGNED_USER_ID
        ? null
        : Number(modalState.userId);

    if (modalState.mode === "add") {
      const createPayload: Partial<Task> = {
        property: modalState.propertyId ?? undefined,
        reservation: modalState.reservationId ?? undefined,
        planned_start_time: start.toISOString(),
        planned_end_time: end.toISOString(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        assignee: assignee ?? undefined,
        type: modalState.taskType ?? "cleaning",
        result: "successful",
        description: modalState.location || "",
      };
      const response = await tasksService.createTask(
        currentWorkspace.id,
        createPayload as Task,
      );
      if (response.success && response.data) {
        onTaskCreate(createTaskItemFromApi(response.data, properties));
      }
    } else if (modalState.taskId) {
      const existing = tasks.find((item) => item.id === modalState.taskId);
      if (!existing) {
        setModalState(null);
        return;
      }
      const updatePayload: Partial<Task> = {
        property: modalState.propertyId ?? existing.propertyId ?? undefined,
        reservation:
          modalState.reservationId ?? existing.reservationId ?? undefined,
        planned_start_time: start.toISOString(),
        planned_end_time: end.toISOString(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        assignee: assignee ?? undefined,
        type: modalState.taskType ?? existing.taskType ?? "cleaning",
        description: modalState.location || "",
      };
      const response = await tasksService.updateTask(
        currentWorkspace.id,
        Number(modalState.taskId),
        updatePayload,
      );
      if (response.success && response.data) {
        onTaskUpdate(
          createTaskItemFromApi(response.data, properties, existing.color),
        );
      }
    }
    setModalState(null);
  };

  const handleSlotEnter = (slot: SlotInfo) => {
    if (menuSlot && menuSlot.id !== slot.id) {
      return;
    }
    if (hoverTimeout.current) {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setHoveredSlot(slot);
  };

  const handleSlotLeave = (slotId: string, immediate = false) => {
    if (menuSlot?.id === slotId) {
      return;
    }
    if (hoverTimeout.current) {
      window.clearTimeout(hoverTimeout.current);
    }
    if (immediate) {
      setHoveredSlot((prev) => (prev?.id === slotId ? null : prev));
      return;
    }
    hoverTimeout.current = window.setTimeout(() => {
      setHoveredSlot((prev) => (prev?.id === slotId ? null : prev));
    }, 120);
  };

  const handleOpenMenu = (slot: SlotInfo) => {
    if (hoverTimeout.current) {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setMenuSlot(slot);
    setHoveredSlot(slot);
  };

  const handleMore = () => {
    openBlockModal(menuSlot ?? undefined);
  };

  const headerLabel =
    mode === "week"
      ? `${format(weekStart, "MMM d")} - ${format(
          addDays(weekStart, 6),
          "MMM d",
        )}`
      : mode === "day"
        ? format(selectedDay, "EEE, MMM d")
        : format(monthDate, "MMM yyyy");

  const handlePrev = () => {
    if (mode === "week") {
      setWeekStart(addDays(weekStart, -7));
    } else if (mode === "day") {
      setSelectedDay(addDays(selectedDay, -1));
    } else {
      setMonthDate(addMonths(monthDate, -1));
    }
  };

  const handleNext = () => {
    if (mode === "week") {
      setWeekStart(addDays(weekStart, 7));
    } else if (mode === "day") {
      setSelectedDay(addDays(selectedDay, 1));
    } else {
      setMonthDate(addMonths(monthDate, 1));
    }
  };

  const handleShowToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
    setSelectedDay(startOfDay(now));
    setMonthDate(startOfMonth(now));
  };

  return (
    <div className={styles.scheduler}>
      <div className={styles.schedulerHeader}>
        <div className={styles.modeSwitch}>
          {(["day", "week", "month"] as SchedulerMode[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.modeButton} ${
                mode === value ? styles.modeButtonActive : ""
              }`}
              onClick={() => setMode(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        <div className={styles.weekNav}>
          <button
            type="button"
            className={styles.weekNavButton}
            onClick={handlePrev}
          >
            Prev
          </button>
          <div className={styles.weekLabel}>{headerLabel}</div>
          <button
            type="button"
            className={styles.weekNavButton}
            onClick={handleNext}
          >
            Next
          </button>
          <button
            type="button"
            className={styles.weekNavButton}
            onClick={handleShowToday}
          >
            Show today
          </button>
          <button
            type="button"
            className={`${styles.weekNavButton} ${styles.publishButton}`}
          >
            Publish
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {mode === "day" ? (
          <div className={styles.dayView}>
            <div className={styles.dayScroll}>
              <div className={`${styles.dayRow} ${styles.dayHeaderRow}`}>
                <div className={styles.daySidebarHeader}>
                  <div className={styles.daySidebarTitle}>Daily summary</div>
                  <div className={styles.daySidebarMeta}>Daily info</div>
                </div>
                <div
                  className={styles.dayTimelineHeader}
                  style={{ width: timelineWidth }}
                >
                  {dayHours.map((hour) => (
                    <div key={hour} className={styles.dayHourLabel}>
                      {hour}
                    </div>
                  ))}
                </div>
              </div>

              {users.map((user) => {
                const dayTasks = tasks.filter(
                  (task) =>
                    task.userId === user.id &&
                    isSameDay(task.start, selectedDay),
                );

                return (
                  <DayRow
                    key={user.id}
                    user={user}
                    tasks={dayTasks}
                    timelineWidth={timelineWidth}
                    onTaskClick={openEditModal}
                    onAddTask={openAddModal}
                    onAddBlock={openBlockModal}
                  />
                );
              })}
            </div>
          </div>
        ) : mode === "week" ? (
          <div className={styles.weekGrid}>
            <div className={styles.weekHeaderRow}>
              <div className={styles.weekCorner} />
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`${styles.weekDayHeader} ${
                    isSameDay(day, new Date()) ? styles.weekDayHeaderToday : ""
                  }`}
                >
                  <div className={styles.weekDayName}>
                    {format(day, "EEE")}
                  </div>
                  <div className={styles.weekDayDate}>
                    {format(day, "d MMM")}
                  </div>
                </div>
              ))}
            </div>

            {users.map((user) => (
              <div key={user.id} className={styles.weekRow}>
                <div className={styles.userCell}>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.name}</div>
                    {user.role ? (
                      <div className={styles.userRole}>{user.role}</div>
                    ) : null}
                  </div>
                  <div className={styles.addTaskMenuAnchor}>
                    <button
                      type="button"
                      className={styles.addTaskTrigger}
                      onClick={() =>
                        handleOpenMenu({
                          id: `week-add-${user.id}`,
                          view: "week",
                          userId: user.id,
                          day: weekStart,
                          minutes: 0,
                        })
                      }
                    >
                      <LuCirclePlus className={styles.addTaskIcon} />
                    </button>
                    {menuSlot?.id === `week-add-${user.id}` ? (
                      <div
                        className={`${styles.addTaskMenu} ${styles.addTaskMenuAnchorPanel}`}
                        data-add-menu
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openAddModal({
                              id: `week-add-${user.id}`,
                              view: "week",
                              userId: user.id,
                              day: weekStart,
                              minutes: 0,
                            })
                          }
                        >
                          Add Task
                        </button>
                        <button type="button" onClick={handleMore}>
                          Add unavailability
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                {days.map((day) => {
                  const dayTasks = tasks.filter(
                    (task) =>
                      task.userId === user.id && isSameDay(task.start, day),
                  );

                  return (
                    <DayCell
                      key={`${user.id}-${day.toISOString()}`}
                      userId={user.id}
                      day={day}
                      tasks={dayTasks}
                      onTaskClick={openEditModal}
                      menuSlotId={menuSlot?.id ?? null}
                      onOpenMenu={handleOpenMenu}
                      onAddTask={openAddModal}
                      onMore={handleMore}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <MonthView
            monthDate={monthDate}
            tasks={tasks}
            users={users}
            onTaskClick={openEditModal}
            hoveredSlotId={hoveredSlot?.id ?? null}
            menuSlotId={menuSlot?.id ?? null}
            onSlotEnter={handleSlotEnter}
            onSlotLeave={handleSlotLeave}
            onOpenMenu={handleOpenMenu}
            onAddTask={openAddModal}
            onMore={handleMore}
          />
        )}
        <DragOverlay>
          {activeMonthTask ? (
            <div
              className={`${styles.monthTaskPill} ${
                activeMonthTask.color === "outline"
                  ? styles.monthTaskOutline
                  : styles[activeMonthTask.color]
              }`}
            >
              {`${format(activeMonthTask.start, "HH:mm")} - ${format(
                activeMonthTask.end,
                "HH:mm",
              )} ${activeMonthTask.title}`}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalState ? (
        <div className={styles.modalOverlay} onClick={() => setModalState(null)}>
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  {modalState.mode === "add" ? "Add Task" : "Edit Task"}
                </div>
                <div className={styles.modalSubtitle}>
                  Assign a new task to staff
                </div>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setModalState(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Staff member</label>
                <select
                  className={styles.modalSelect}
                  value={modalState.userId}
                  onChange={(event) =>
                    setModalState((prev) =>
                      prev
                        ? {
                            ...prev,
                            userId: event.target.value,
                          }
                        : prev,
                    )
                  }
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Property</label>
                <div className={styles.searchSelect}>
                  <input
                    className={styles.modalInput}
                    placeholder="Select Property..."
                    value={propertyQuery}
                    onFocus={() => setIsPropertyMenuOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsPropertyMenuOpen(false);
                      }, 120);
                    }}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setPropertyQuery(nextValue);
                      setModalState((prev) =>
                        prev
                          ? { ...prev, title: nextValue, propertyId: null }
                          : prev,
                      );
                      setIsPropertyMenuOpen(true);
                    }}
                  />
                  {isPropertyMenuOpen && (
                    <div className={styles.searchSelectMenu} role="listbox">
                      {filteredProperties.length === 0 ? (
                        <div className={styles.searchSelectEmpty}>
                          No results
                        </div>
                      ) : (
                        filteredProperties.map((property) => (
                          <button
                            key={property.id}
                            type="button"
                            className={styles.searchSelectOption}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setPropertyQuery(property.name);
                              setModalState((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      title: property.name,
                                      propertyId: property.id,
                                    }
                                  : prev,
                              );
                              setIsPropertyMenuOpen(false);
                            }}
                          >
                            {property.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Reservation</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Reservation ID"
                  value={modalState.reservationId ?? ""}
                  onChange={(event) =>
                    setModalState((prev) =>
                      prev
                        ? {
                            ...prev,
                            reservationId: event.target.value || null,
                          }
                        : prev,
                    )
                  }
                />
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Date</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={format(modalState.start, "yyyy-MM-dd")}
                    onChange={(event) => {
                      const nextDate = new Date(event.target.value);
                      const startMinutes =
                        minutesFromDayStart(modalState.start) -
                        visibleStartHour * 60;
                      const endMinutes =
                        minutesFromDayStart(modalState.end) -
                        visibleStartHour * 60;
                      setModalState((prev) =>
                        prev
                          ? {
                              ...prev,
                              start: addMinutes(
                                startOfDay(nextDate),
                                visibleStartHour * 60 + startMinutes,
                              ),
                              end: addMinutes(
                                startOfDay(nextDate),
                                visibleStartHour * 60 + endMinutes,
                              ),
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Type</label>
                  <select
                    className={styles.modalSelect}
                    value={modalState.taskType ?? "cleaning"}
                    onChange={(event) =>
                      setModalState((prev) =>
                        prev
                          ? {
                              ...prev,
                              taskType:
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
                  <label className={styles.modalLabel}>Start time</label>
                  <input
                    type="time"
                    className={styles.modalInput}
                    step={snapMinutes * 60}
                    value={format(modalState.start, "HH:mm")}
                    onChange={(event) => {
                      const [hours, minutes] =
                        event.target.value.split(":").map(Number);
                      const day = startOfDay(modalState.start);
                      setModalState((prev) =>
                        prev
                          ? {
                              ...prev,
                              start: addMinutes(day, hours * 60 + minutes),
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>End time</label>
                  <input
                    type="time"
                    className={styles.modalInput}
                    step={snapMinutes * 60}
                    value={format(modalState.end, "HH:mm")}
                    onChange={(event) => {
                      const [hours, minutes] =
                        event.target.value.split(":").map(Number);
                      const day = startOfDay(modalState.end);
                      setModalState((prev) =>
                        prev
                          ? {
                              ...prev,
                              end: addMinutes(day, hours * 60 + minutes),
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalGhost}
                onClick={() => setModalState(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={handleModalSave}
              >
                {modalState.mode === "add" ? "Create Task" : "Update Task"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {blockState ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setBlockState(null)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Block</div>
                <div className={styles.modalSubtitle}>
                  Assign an unavailability or time off
                </div>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setBlockState(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Type</label>
                <select
                  className={styles.modalSelect}
                  value={blockState.type}
                  onChange={(event) =>
                    setBlockState((prev) =>
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
                  value={blockState.userId}
                  onChange={(event) =>
                    setBlockState((prev) =>
                      prev
                        ? {
                            ...prev,
                            userId: event.target.value,
                          }
                        : prev,
                    )
                  }
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Property</label>
                <select
                  className={styles.modalSelect}
                  value={blockState.propertyId ?? ""}
                  onChange={(event) =>
                    setBlockState((prev) =>
                      prev
                        ? {
                            ...prev,
                            propertyId: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : prev,
                    )
                  }
                >
                  <option value="">Unassigned</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Reservation</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Reservation ID"
                  value={blockState.reservationId ?? ""}
                  onChange={(event) =>
                    setBlockState((prev) =>
                      prev
                        ? {
                            ...prev,
                            reservationId: event.target.value || null,
                          }
                        : prev,
                    )
                  }
                />
              </div>

              <div className={styles.modalGrid}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Date</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={format(blockState.date, "yyyy-MM-dd")}
                    onChange={(event) => {
                      const nextDate = new Date(event.target.value);
                      const startMinutes = minutesFromDayStart(
                        blockState.start,
                      );
                      const endMinutes = minutesFromDayStart(blockState.end);
                      const nextDay = startOfDay(nextDate);
                      setBlockState((prev) =>
                        prev
                          ? {
                              ...prev,
                              date: nextDay,
                              start: addMinutes(nextDay, startMinutes),
                              end: addMinutes(nextDay, endMinutes),
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Start time</label>
                  <input
                    type="time"
                    className={styles.modalInput}
                    step={snapMinutes * 60}
                    value={format(blockState.start, "HH:mm")}
                    onChange={(event) => {
                      const [hours, minutes] =
                        event.target.value.split(":").map(Number);
                      const day = startOfDay(blockState.date);
                      setBlockState((prev) =>
                        prev
                          ? {
                              ...prev,
                              start: addMinutes(day, hours * 60 + minutes),
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>End time</label>
                  <input
                    type="time"
                    className={styles.modalInput}
                    step={snapMinutes * 60}
                    value={format(blockState.end, "HH:mm")}
                    onChange={(event) => {
                      const [hours, minutes] =
                        event.target.value.split(":").map(Number);
                      const day = startOfDay(blockState.date);
                      setBlockState((prev) =>
                        prev
                          ? {
                              ...prev,
                              end: addMinutes(day, hours * 60 + minutes),
                            }
                          : prev,
                      );
                    }}
                  />
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Notes</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={3}
                  value={blockState.notes}
                  onChange={(event) =>
                    setBlockState((prev) =>
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
                onClick={() => setBlockState(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={handleBlockSave}
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

export default function OperationsPage() {
  const { currentWorkspace } = useWorkspace();
  const [users, setUsers] = useState<SchedulerUser[]>([UNASSIGNED_USER]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setUsers([UNASSIGNED_USER]);
      setProperties([]);
      setTasks([]);
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
            role: entry.user_type.replace(/_/g, " "),
            avatar:
              user?.profile_picture ||
              "/images/avatar.png",
          };
        });
        setUsers([UNASSIGNED_USER, ...mapped]);
      } else {
        setUsers([UNASSIGNED_USER]);
      }
    };

    const loadProperties = async () => {
      const response = await propertiesService.getAllProperties(
        currentWorkspace.id,
      );
      if (!isActive) return [];
      if (response.success && response.data) {
        setProperties(response.data);
        return response.data;
      }
      setProperties([]);
      return [];
    };

    const loadTasks = async () => {
      const availableProperties = await loadProperties();
      const response = await tasksService.getTasks(currentWorkspace.id);
      if (!isActive) return;
      if (response.success && response.data?.results) {
        const mapped: TaskItem[] = response.data.results.map((task: Task) =>
          createTaskItemFromApi(task, availableProperties),
        );
        setTasks(mapped);
      } else {
        setTasks([]);
      }
    };

    loadUsers();
    loadTasks();

    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id]);

  const handleTaskCreate = (task: TaskItem) => {
    setTasks((prev) => [...prev, task]);
  };

  const handleTaskUpdate = (updated: TaskItem) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updated.id ? updated : task)),
    );
  };

  return (
    <div className={styles.operations}>
      <div className={styles.headerRow}>
        <ZoneSelector />
        <CleaningBreadcrumb />
      </div>
      <div className={styles.schedulerMobileNotice}>
        Scheduling and task actions are available on desktop only. Please use a
        desktop device to add, block, or manage tasks.
      </div>
      <Scheduler
        users={users}
        tasks={tasks}
        properties={properties}
        onTaskCreate={handleTaskCreate}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
}
