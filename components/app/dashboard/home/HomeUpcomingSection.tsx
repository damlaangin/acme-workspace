"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
// TODO: import { FaExclamationCircle } from "react-icons/fa";
import { LuCalendar, LuMessageCircle } from "react-icons/lu";
import EmptyLook from "@/components/ui/EmptyLook";
import styles from "@/styles/app/dashboard/HomeUpcomingSection.module.scss";

export type HomeUpcomingItem = {
  id: number;
  name: string;
  property: string;
  checkinDate: string;
  checkoutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
};

type UpcomingFilter = "all" | "in" | "out" | "upcoming";

type HomeUpcomingSectionProps = {
  upcomingFilter: UpcomingFilter;
  items: HomeUpcomingItem[];
  noteModal: string | null;
  onFilterChange: (next: UpcomingFilter) => void;
  onNoteOpen: (note: string) => void;
  onNoteClose: () => void;
};

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateMarkers = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    today: formatIsoDate(today),
    tomorrow: formatIsoDate(tomorrow),
  };
};

const formatDisplayDate = (dateValue: string) => {
  if (!dateValue) return "-";
  const [, month, day] = dateValue.split("-");
  return `${day}.${month}.${dateValue.slice(0, 4)}`;
};

const formatTime = (timeValue?: string) => {
  if (!timeValue) return "-";
  return timeValue.slice(0, 5);
};

const getFilteredItems = (
  items: HomeUpcomingItem[],
  filter: UpcomingFilter,
  today: string,
  tomorrow: string
) => {
  if (filter === "all") return items;

  return items.filter((item) => {
    if (filter === "in") return item.checkinDate === today;
    if (filter === "out") return item.checkoutDate === today;
    return item.checkinDate >= tomorrow;
  });
};

const getFilterOptions = (
  items: HomeUpcomingItem[],
  today: string,
  tomorrow: string
) => {
  const counts = items.reduce(
    (acc, item) => {
      if (item.checkinDate === today) acc.in += 1;
      if (item.checkoutDate === today) acc.out += 1;
      if (item.checkinDate >= tomorrow) acc.upcoming += 1;
      return acc;
    },
    { all: items.length, in: 0, out: 0, upcoming: 0 }
  );

  return [
    { label: "All", value: "all", count: counts.all },
    { label: "In", value: "in", count: counts.in },
    { label: "Out", value: "out", count: counts.out },
    { label: "Upcoming", value: "upcoming", count: counts.upcoming },
  ] satisfies Array<{ label: string; value: UpcomingFilter; count: number }>;
};

const getDisplayTime = (
  item: HomeUpcomingItem,
  filter: UpcomingFilter,
  today: string
) => {
  if (filter === "in") return formatTime(item.checkInTime);
  if (filter === "out") return formatTime(item.checkOutTime);
  if (item.checkoutDate === today) {
    return `Check-out ${formatDisplayDate(item.checkoutDate)}`;
  }
  return `Check-in ${formatDisplayDate(item.checkinDate)}`;
};

const HomeUpcomingSection = ({
  upcomingFilter,
  items,
  noteModal,
  onFilterChange,
  onNoteOpen,
  onNoteClose,
}: HomeUpcomingSectionProps) => {
  const router = useRouter();
  const { today, tomorrow } = getDateMarkers();
  const filterOptions = useMemo(
    () => getFilterOptions(items, today, tomorrow),
    [items, today, tomorrow]
  );
  const filteredItems = useMemo(
    () => getFilteredItems(items, upcomingFilter, today, tomorrow),
    [items, upcomingFilter, today, tomorrow]
  );

  return (
    <section className={styles["home__upcoming-section"]}>
      <div className={styles["home__upcoming-header"]}>
        <div className={styles["home__upcoming-title"]}>
          <h2>Daily Operations</h2>
          <p>Check-ins &amp; Check-outs</p>
        </div>
        <div className={`${styles["home__icon"]} ${styles["home__upcoming-icon"]}`}>
          <LuCalendar />
        </div>
      </div>

      <div className={styles["home__upcoming-filters"]}>
        {filterOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`${styles["home__upcoming-filter"]} ${
              upcomingFilter === item.value
                ? styles["home__upcoming-filter--active"]
                : ""
            }`}
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
            <span className={styles["home__upcoming-count"]}>{item.count}</span>
          </button>
        ))}
      </div>

      <div className={styles["home__upcoming-list"]}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div key={item.id} className={styles["home__upcoming-card"]}>
              <div className={styles["home__upcoming-guest"]}>
                <div className={styles["home__upcoming-details"]}>
                  <p className={styles["home__upcoming-name"]}>{item.name}</p>
                  <span className={styles["home__upcoming-property"]}>
                    {item.property}
                  </span>
                </div>
              </div>

              <div className={styles["home__upcoming-meta"]}>
                {/* TODO: Undo comment after reservation data has note parameter 
                {item.note ? (
                  <button
                    type="button"
                    className={styles["home__upcoming-note"]}
                    title={item.note}
                    aria-label={`Special request: ${item.note}`}
                    onClick={() => onNoteOpen(item.note as string)}
                  >
                    <FaExclamationCircle />
                    Note
                  </button>
                ) : null} */}
                <span className={styles["home__upcoming-time"]}>
                  {getDisplayTime(item, upcomingFilter, today)}
                </span>
                <button
                  type="button"
                  className={styles["home__upcoming-message"]}
                  aria-label="Message guest"
                  onClick={() =>
                    router.push(`/dashboard/conversations?id=${item.id}`)
                  }
                >
                  <LuMessageCircle />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyLook label="upcoming check-ins" />
        )}
      </div>

      {noteModal ? (
        <div
          className={styles["home__note-overlay"]}
          role="dialog"
          aria-modal="true"
          aria-label="Special request"
          onClick={onNoteClose}
        >
          <div
            className={styles["home__note-modal"]}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles["home__note-header"]}>
              <h3>Special request</h3>
              <button
                type="button"
                className={styles["home__note-close"]}
                onClick={onNoteClose}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className={styles["home__note-body"]}>{noteModal}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HomeUpcomingSection;
