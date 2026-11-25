// NotificationItem.tsx

import React from "react";
import styles from "@/styles/ui/NotificationItem.module.scss";
import Image, { type StaticImageData } from "next/image";

interface NotificationItemProps {
  imageSrc: string | StaticImageData;
  title: string;
  body: string;
  timeAgo: string;
  isUnread: boolean; // New prop to indicate if the notification is unread
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  imageSrc,
  title,
  body,
  timeAgo,
  isUnread,
}) => {
  return (
    <li className={styles["dropdown-notifications-item"]}>
      <div className={styles["dropdown-notification-container"]}>
        <div className={styles["avatar"]}>
          <Image src={imageSrc} alt="" className="rounded-circle" />
        </div>
        <div className={styles["single-notification"]}>
          <p className={styles["notification-title"]}>{title}</p>
          <p className={styles["notification-body"]}>{body}</p>
          <p className={styles["notification-subtitle"]}>{timeAgo}</p>
        </div>
        {isUnread && <span className={styles["unread-badge"]}></span>}{" "}
      </div>
    </li>
  );
};

export default NotificationItem;
