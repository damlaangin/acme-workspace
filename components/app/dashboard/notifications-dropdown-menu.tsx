import React, { useState, useEffect, useRef } from "react";
import styles from "@/styles/ui/NotificationsDropdownMenu.module.scss";
import NotificationItem from "./notification-item";
import { GoRead } from "react-icons/go";
import profileImage from "@/public/images/avatar.png";

const allNotifications = [
  {
    imageSrc: profileImage,
    title: "Welcome",
    body: "Welcome to your workspace!!",
    timeAgo: "Now",
    isUnread: true,
  },
];

// Initial items per page
const ITEMS_PER_PAGE = 5;

const NotificationsDropdownMenu: React.FC = () => {
  const [notifications, setNotifications] = useState(
    allNotifications.slice(0, ITEMS_PER_PAGE)
  ); // Initial load
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false); // For loading next batch
  const scrollRef = useRef<HTMLDivElement>(null); // To track scroll

  // Handle scroll to load more
  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      if (
        container.scrollTop + container.clientHeight >=
          container.scrollHeight - 10 &&
        !loadingMore
      ) {
        loadMoreNotifications();
      }
    }
  };

  const loadMoreNotifications = () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const start = nextPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    // Simulate loading more notifications
    setTimeout(() => {
      setNotifications((prevNotifications) => [
        ...prevNotifications,
        ...allNotifications.slice(start, end),
      ]);
      setPage(nextPage);
      setLoadingMore(false);
    }, 500); // Simulate delay
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
    };
  }, [loadingMore]);

  return (
    <div className={styles["notifications-popup"]}>
      <ul className={styles["dropdown-menu"]}>
        <li className={styles["dropdown-menu-header"]}>
          <div className={styles["dropdown-notifications-header"]}>
            <p className={styles["dropdown-notifications-title"]}>
              Notifications
            </p>
            <div className={styles["dropdown-notification-heading"]}>
              <span className={styles["dropdown-notifications-badge"]}>
                {
                  allNotifications.filter(
                    (notification) => notification.isUnread
                  ).length
                }{" "}
                New
              </span>
              <button className={styles["notifications-btn"]}>
                <GoRead size={20} />
              </button>
            </div>
          </div>
        </li>

        <div className={styles["scrollable-container"]} ref={scrollRef}>
          <ul className={styles["list-group"]}>
            {notifications.map((notification, index) => (
              <NotificationItem
                key={index}
                imageSrc={notification.imageSrc}
                title={notification.title}
                body={notification.body}
                timeAgo={notification.timeAgo}
                isUnread={notification.isUnread}
              />
            ))}
          </ul>
          {loadingMore && (
            <p className={styles["loading-text"]}>Loading more...</p>
          )}
        </div>

        <li className="border-top">
          <div className={styles["view-all-btn-container"]}>
            <button className={styles["view-all-btn"]}>View all</button>
          </div>
        </li>
      </ul>
    </div>
  );
};

export default NotificationsDropdownMenu;
