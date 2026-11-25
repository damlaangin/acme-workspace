import { ColumnDef } from "@tanstack/react-table";
import { format as dateFormat } from "date-fns";
import { FaUserCircle } from "react-icons/fa";
import {
  MdDeleteOutline,
  MdOutlineEdit,
  MdOutlineLink,
  MdOutlineMailOutline,
} from "react-icons/md";
import styles from "@/styles/ui/Columns.module.scss";
import type { WorkspaceUser } from "@/types/api";

export const getColumns = (
  onEdit: (user: WorkspaceUser) => void,
  onDelete: (user: WorkspaceUser) => void,
  onResendInvitation?: (user: WorkspaceUser) => void,
  onGenerateSetupLink?: (user: WorkspaceUser) => void
): ColumnDef<WorkspaceUser>[] => [
  {
    id: "pfp",
    header: "Icon",
    meta: {
      cellClassName: styles["icon-cell"],
      headerClassName: styles["icon-cell"],
    } as any,
    cell: ({ row }) => {
      const imageUrl = row.original.user.profile_picture ?? null;

      return (
        <div className={styles["profile-image-container"]}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              className={styles["profile-image"]}
            />
          ) : (
            <FaUserCircle size={32} color="var(--dash-content-hover)" />
          )}
        </div>
      );
    },
  },
  {
    id: "name",
    header: "Name",
    enableSorting: false,
    cell: ({ row }) => {
      const firstName = row.original.user.first_name ?? "";
      const lastName = row.original.user.last_name ?? "";
      const text =
        `${firstName} ${lastName}`.trim() ||
        row.original.user.username ||
        "";
      return (
        <span className={styles["cell-readable"]} title={text}>
          {text}
        </span>
      );
    },
  },
  {
    accessorKey: "user.email",
    header: "Email",
    enableSorting: false,
    cell: ({ getValue }) => {
      const email = String(getValue() ?? "");
      return (
        <span className={styles["cell-readable"]} title={email}>
          {email}
        </span>
      );
    },
  },
  {
    accessorKey: "user.phone",
    header: "Phone Number",
    enableSorting: false,
    cell: ({ getValue }) => {
      const text = String(getValue() ?? "");
      return (
        <span className={styles["cell-readable"]} title={text}>
          {text}
        </span>
      );
    },
  },
  {
    accessorKey: "user_type",
    header: "User Type",
    enableSorting: false,
    meta: { cellClassName: styles["no-ellipsis"] },
    cell: ({ row }) => {
      const userType = row.original.user_type;
      const displayNameMap: Record<WorkspaceUser["user_type"], string> = {
        workspace_admin: "Admin",
        property_owner: "Property Owner",
        staff: "Staff",
        app_user: "App User",
      };
      const variantMap: Record<WorkspaceUser["user_type"], string> = {
        workspace_admin: "primary",
        property_owner: "secondary",
        staff: "accent",
        app_user: "secondary-hover",
      };
      const label = displayNameMap[userType];
      return (
        <span
          className={styles["user-type-pill"]}
          data-variant={variantMap[userType]}
          title={label}
        >
          {label}
        </span>
      );
    },
  },
  {
    id: "role",
    header: "Role",
    enableSorting: false,
    cell: ({ row }) => {
      const roleName = row.original.groups?.[0]?.name ?? "No Role";
      return (
        <span className={styles["cell-readable"]} title={roleName}>
          {roleName}
        </span>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className={styles["status-pill"]}
        data-variant={row.original.is_active ? "success" : "danger"}
        title={row.original.is_active ? "Active" : "Inactive"}
      >
        {row.original.is_active ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Date Created",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      const formatted = dateFormat(date, "dd MMMM yyyy - HH:mm");
      return (
        <span className={styles["cell-readable"]} title={formatted}>
          {formatted}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    meta: { cellClassName: styles["action-cell"] },
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className={styles["action-buttons"]}>
          {onResendInvitation && user.user.email && (
            <button
              className={`${styles["action-button"]} ${styles["invite-button"]}`}
              onClick={() => onResendInvitation(user)}
              title="Resend Invitation"
            >
              <MdOutlineMailOutline />
            </button>
          )}
          {onGenerateSetupLink && user.user_type === "app_user" && (
            <button
              className={`${styles["action-button"]} ${styles["invite-button"]}`}
              onClick={() => onGenerateSetupLink(user)}
              title="Generate setup link"
            >
              <MdOutlineLink />
            </button>
          )}
          <button
            className={`${styles["action-button"]} ${styles["edit-button"]}`}
            onClick={() => onEdit(user)}
          >
            <MdOutlineEdit />
          </button>
          <button
            className={`${styles["action-button"]} ${styles["delete-button"]}`}
            onClick={() => onDelete(user)}
          >
            <MdDeleteOutline />
          </button>
        </div>
      );
    },
  },
];
