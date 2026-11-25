"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getColumns } from "@/app/dashboard/users/columns";
import { DataTable } from "@/app/dashboard/users/data-table";
import UserRoles from "./user-roles";
import { useWorkspace } from "@/context/workspace-context";
import { Button } from "@/components/ui/button";
import PageGreeting from "@/components/ui/PageGreeting";

import type { WorkspaceUser } from "@/types/api";
import { groupsService, type WorkspaceGroup } from "@/lib/services/groups.service";
import modalStyles from "@/styles/app/dashboard/Forms.module.scss";
import styles from "@/styles/app/dashboard/Users.module.scss";
import UserCreateDialog from "@/components/app/dashboard/user-create-dialog";
import SetupLinkModal from "./setup-link-modal";
import { workspaceService } from "@/lib/services/workspace.service";
import { AnimatePresence } from "framer-motion";
import { MotionDiv } from "@/components/motion-client";
import { Filter, ShieldPlus, UserPlus } from "lucide-react";
import { format as dateFormat } from "date-fns";
import TableFooter from "@/components/app/dashboard/table-footer";
import columnsStyles from "@/styles/ui/Columns.module.scss";
import {
  MdDeleteOutline,
  MdOutlineEdit,
  MdOutlineLink,
  MdOutlineMailOutline,
} from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";

type ViewMode = "table" | "card";
type SelectedView = "Users" | "Roles";
type SortState = {
  field: string;
  direction: "ASC" | "DESC";
} | null;

const TABLE_BREAKPOINT = 1096;
const DEFAULT_CARD_PAGE_SIZE = 8;
const INVITE_MESSAGE_TIMEOUT = 4000;
const USER_TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "Admin", value: "workspace_admin" },
  { label: "Staff", value: "staff" },
  { label: "Property Owner", value: "property_owner" },
  { label: "App User", value: "app_user" },
];
const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
];
const USER_TYPE_LABELS: Record<WorkspaceUser["user_type"], string> = {
  workspace_admin: "Admin",
  property_owner: "Property Owner",
  staff: "Staff",
  app_user: "App User",
};
const USER_TYPE_VARIANTS: Record<WorkspaceUser["user_type"], string> = {
  workspace_admin: "primary",
  property_owner: "secondary",
  staff: "accent",
  app_user: "secondary-hover",
};
const USER_CARD_SKELETONS = Array.from(
  { length: DEFAULT_CARD_PAGE_SIZE },
  (_, index) => index
);
const USER_CARD_META_SKELETONS = Array.from({ length: 4 }, (_, index) => index);

const getUserFullName = (workspaceUser: WorkspaceUser) =>
  `${workspaceUser.user.first_name ?? ""} ${
    workspaceUser.user.last_name ?? ""
  }`.trim() || workspaceUser.user.username;

const getUserPhone = (workspaceUser: WorkspaceUser) =>
  workspaceUser.user.phone ?? workspaceUser.user.phone_number ?? "";

const formatCreatedDate = (value?: string) =>
  value ? dateFormat(new Date(value), "dd MMM yyyy") : "—";

const mapGroupsToRoleOptions = (groups: WorkspaceGroup[]) =>
  groups.map((group) => ({
    ...group,
    permissions: (group.permissions ?? []).map(String),
  }));

const mapWorkspaceUserToEditUser = (workspaceUser: WorkspaceUser) => ({
  ...workspaceUser,
  username: workspaceUser.user.username,
  first_name: workspaceUser.user.first_name,
  last_name: workspaceUser.user.last_name,
  email: workspaceUser.user.email,
  phone_number: getUserPhone(workspaceUser),
  profile_image_url: workspaceUser.user.profile_picture ?? null,
  role_id: workspaceUser.groups?.[0]?.id ?? null,
  membership_id: workspaceUser.id,
});

const UserCardSkeleton = () => (
  <article className={styles["user-card"]}>
    <div className={styles["user-card__header"]}>
      <div className={styles["user-card__avatar-skeleton"]}></div>
      <div className={styles["user-card__header-copy"]}>
        <div className={styles["user-card__line-skeleton"]}></div>
        <div className={styles["user-card__line-skeleton-short"]}></div>
      </div>
    </div>
    <div className={styles["user-card__meta-grid"]}>
      {USER_CARD_META_SKELETONS.map((metaIndex) => (
        <div key={metaIndex} className={styles["user-card__meta-item"]}>
          <span className={styles["user-card__meta-label"]}>Loading</span>
          <div className={styles["user-card__line-skeleton"]}></div>
        </div>
      ))}
    </div>
  </article>
);

type UserCardProps = {
  workspaceUser: WorkspaceUser;
  onResendInvitation: (user: WorkspaceUser) => void;
  onGenerateSetupLink: (user: WorkspaceUser) => void;
  onEditUser: (user: WorkspaceUser) => void;
  onDeleteUser: (user: WorkspaceUser) => void;
};

const UserCard = ({
  workspaceUser,
  onResendInvitation,
  onGenerateSetupLink,
  onEditUser,
  onDeleteUser,
}: UserCardProps) => {
  const user = workspaceUser.user;
  const fullName = getUserFullName(workspaceUser);
  const roleName = workspaceUser.groups?.[0]?.name ?? "No Role";

  return (
    <article className={styles["user-card"]}>
      <div className={styles["user-card__header"]}>
        <div className={styles["user-card__avatar"]}>
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={fullName}
              className={columnsStyles["profile-image"]}
            />
          ) : (
            <FaUserCircle size={40} color="var(--dash-content-hover)" />
          )}
        </div>
        <div className={styles["user-card__header-copy"]}>
          <h3 className={styles["user-card__title"]}>{fullName}</h3>
          <p className={styles["user-card__subtitle"]}>
            {user.email || "No email"}
          </p>
        </div>
      </div>

      <div className={styles["user-card__pill-row"]}>
        <span
          className={columnsStyles["user-type-pill"]}
          data-variant={USER_TYPE_VARIANTS[workspaceUser.user_type]}
        >
          {USER_TYPE_LABELS[workspaceUser.user_type]}
        </span>
        <span
          className={columnsStyles["status-pill"]}
          data-variant={workspaceUser.is_active ? "success" : "danger"}
        >
          {workspaceUser.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className={styles["user-card__meta-grid"]}>
        <div className={styles["user-card__meta-item"]}>
          <span className={styles["user-card__meta-label"]}>Phone</span>
          <span className={styles["user-card__meta-value"]}>
            {getUserPhone(workspaceUser) || "—"}
          </span>
        </div>
        <div className={styles["user-card__meta-item"]}>
          <span className={styles["user-card__meta-label"]}>Role</span>
          <span className={styles["user-card__meta-value"]}>{roleName}</span>
        </div>
        <div className={styles["user-card__meta-item"]}>
          <span className={styles["user-card__meta-label"]}>Username</span>
          <span className={styles["user-card__meta-value"]}>
            {user.username || "—"}
          </span>
        </div>
        <div className={styles["user-card__meta-item"]}>
          <span className={styles["user-card__meta-label"]}>Created</span>
          <span className={styles["user-card__meta-value"]}>
            {formatCreatedDate(workspaceUser.created_at)}
          </span>
        </div>
      </div>

      <div className={styles["user-card__actions"]}>
        <button
          type="button"
          className={`${styles["user-card__action-button"]} ${styles["user-card__action-button--neutral"]}`}
          onClick={() => onResendInvitation(workspaceUser)}
          title="Resend Invitation"
        >
          <MdOutlineMailOutline />
        </button>
        {workspaceUser.user_type === "app_user" ? (
          <button
            type="button"
            className={`${styles["user-card__action-button"]} ${styles["user-card__action-button--neutral"]}`}
            onClick={() => onGenerateSetupLink(workspaceUser)}
            title="Generate setup link"
          >
            <MdOutlineLink />
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles["user-card__action-button"]} ${styles["user-card__action-button--neutral"]}`}
          onClick={() => onEditUser(workspaceUser)}
          title="Edit user"
        >
          <MdOutlineEdit />
        </button>
        <button
          type="button"
          className={`${styles["user-card__action-button"]} ${styles["user-card__action-button--danger"]}`}
          onClick={() => onDeleteUser(workspaceUser)}
          title="Delete user"
        >
          <MdDeleteOutline />
        </button>
      </div>
    </article>
  );
};

export default function WorkspaceUsersPage() {
  const [data, setData] = useState<WorkspaceUser[]>([]);
  const [rowLimit, setRowLimit] = useState(DEFAULT_CARD_PAGE_SIZE);
  const [curPage, setCurPage] = useState(1);
  const [maxUsersCount, setMaxUsersCount] = useState(0);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<SelectedView>("Users");
  const [sorting, setSorting] = useState<SortState>(null);
  const [showCreateUserPopup, setShowCreateUserPopup] = useState(false);
  const [showCreateRolePopup, setShowCreateRolePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingUser, setEditingUser] = useState<WorkspaceUser | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [setupLinkModal, setSetupLinkModal] = useState<{
    open: boolean;
    url: string;
    userName: string;
  }>({ open: false, url: "", userName: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterUserType, setFilterUserType] = useState("");
  const [filterIsActive, setFilterIsActive] = useState("");
  const [usersViewMode, setUsersViewMode] = useState<ViewMode>("card");
  const [rolesViewMode, setRolesViewMode] = useState<ViewMode>("card");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [draftFilterUserType, setDraftFilterUserType] = useState("");
  const [draftFilterIsActive, setDraftFilterIsActive] = useState("");
  const [draftUsersViewMode, setDraftUsersViewMode] = useState<ViewMode>("card");
  const [draftRolesViewMode, setDraftRolesViewMode] = useState<ViewMode>("card");
  const [isCompactCardsOnly, setIsCompactCardsOnly] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const roleOptions = useMemo(() => mapGroupsToRoleOptions(groups), [groups]);
  const effectiveUsersViewMode: ViewMode = isCompactCardsOnly ? "card" : usersViewMode;
  const effectiveRolesViewMode: ViewMode = isCompactCardsOnly ? "card" : rolesViewMode;
  const userPageSize =
    effectiveUsersViewMode === "card" ? DEFAULT_CARD_PAGE_SIZE : rowLimit;
  const draftActiveViewMode =
    selectedView === "Users" ? draftUsersViewMode : draftRolesViewMode;

  const fetchDataAndSetState = useCallback(async () => {
    if (!workspaceId) {
      setData([]);
      setMaxUsersCount(0);
      return;
    }
    setIsUsersLoading(true);
    try {
      const trimmedSearch = debouncedSearch.trim();
      const response = await workspaceService.getWorkspaceUsers(
        workspaceId,
        {
          ordering: sorting
            ? sorting.direction === "DESC"
              ? `-${sorting.field}`
              : sorting.field
            : undefined,
          page: curPage,
          page_size: rowLimit,
          search: trimmedSearch || undefined,
          name: trimmedSearch && !trimmedSearch.includes("@")
            ? trimmedSearch
            : undefined,
          email: trimmedSearch.includes("@") ? trimmedSearch : undefined,
          user_type: (filterUserType as any) || undefined,
          is_active: filterIsActive ? filterIsActive === "true" : undefined,
        }
      );
      if (response.success && response.data) {
        setData(response.data.results || []);
        setMaxUsersCount(response.data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching workspace users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  }, [
    curPage,
    debouncedSearch,
    filterIsActive,
    filterUserType,
    rowLimit,
    sorting,
    workspaceId,
  ]);

  const fetchGroups = useCallback(async () => {
    if (!workspaceId) {
      setGroups([]);
      return;
    }
    try {
      const response = await groupsService.getGroups(workspaceId);
      if (response.success && response.data) {
        setGroups(response.data.results || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }, [workspaceId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurPage(1);
    }, 300);
    return () => {
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    setCurPage(1);
  }, [rowLimit]);

  useEffect(() => {
    if (usersViewMode === "card" && rowLimit !== DEFAULT_CARD_PAGE_SIZE) {
      setRowLimit(DEFAULT_CARD_PAGE_SIZE);
    }
  }, [rowLimit, usersViewMode]);

  useEffect(() => {
    fetchDataAndSetState();
  }, [fetchDataAndSetState]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsCompactCardsOnly(window.innerWidth < TABLE_BREAKPOINT);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (!isFilterModalOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isFilterModalOpen]);

  useEffect(() => {
    if (!isCompactCardsOnly) return;

    if (usersViewMode !== "card") setUsersViewMode("card");
    if (rolesViewMode !== "card") setRolesViewMode("card");
    if (draftUsersViewMode !== "card") setDraftUsersViewMode("card");
    if (draftRolesViewMode !== "card") setDraftRolesViewMode("card");
  }, [
    draftRolesViewMode,
    draftUsersViewMode,
    isCompactCardsOnly,
    rolesViewMode,
    usersViewMode,
  ]);

  const showTemporaryInviteMessage = useCallback((message: string) => {
    setInviteMessage(message);
    window.setTimeout(() => setInviteMessage(null), INVITE_MESSAGE_TIMEOUT);
  }, []);

  const handleEditUser = useCallback((user: WorkspaceUser) => {
    setEditingUser(user);
    setShowEditPopup(true);
  }, []);

  const handleDeleteUser = useCallback((user: WorkspaceUser) => {
    setDeleteError(null);
    setConfirmMessage(`Are you sure you want to delete ${getUserFullName(user)}?`);
    setUserToDelete(user.id);
    setShowConfirmDialog(true);
  }, []);

  const deleteUser = useCallback(async (userId: number) => {
    if (!workspaceId) return;
    try {
      const response = await workspaceService.deleteWorkspaceUser(
        workspaceId,
        userId
      );
      if (response.success) {
        setShowConfirmDialog(false);
        await fetchDataAndSetState();
      } else {
        setDeleteError(response.error?.message || "Failed to delete user");
      }
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete user");
    }
  }, [fetchDataAndSetState, workspaceId]);

  const handleResendInvitation = useCallback(async (user: WorkspaceUser) => {
    if (!workspaceId) return;
    setInviteMessage(null);
    try {
      const response = await workspaceService.resendInvitation(
        workspaceId,
        user.id
      );
      if (response.success) {
        showTemporaryInviteMessage(`Invitation sent to ${user.user.email}`);
      } else {
        showTemporaryInviteMessage(
          response.error?.message || "Failed to resend invitation"
        );
      }
    } catch (error) {
      showTemporaryInviteMessage(
        error instanceof Error ? error.message : "Failed to resend invitation"
      );
    }
  }, [showTemporaryInviteMessage, workspaceId]);

  const handleGenerateSetupLink = useCallback(async (user: WorkspaceUser) => {
    if (!workspaceId) return;
    setInviteMessage(null);
    try {
      const response = await workspaceService.generateSetupLink(
        workspaceId,
        user.id
      );
      if (response.success && response.data) {
        setSetupLinkModal({
          open: true,
          url: response.data.setup_url,
          userName: getUserFullName(user),
        });
      } else {
        showTemporaryInviteMessage(
          response.error?.message || "Could not create setup link"
        );
      }
    } catch (error) {
      showTemporaryInviteMessage(
        error instanceof Error ? error.message : "Could not create setup link"
      );
    }
  }, [showTemporaryInviteMessage, workspaceId]);

  const handleSortChange = useCallback((newSort: { field: string; direction: "ASC" | "DESC" }) => {
    setSorting((prev) => {
      if (prev && prev.field === newSort.field) {
        return {
          field: newSort.field,
          direction: newSort.direction === "ASC" ? "DESC" : "ASC",
        };
      }
      return newSort;
    });
  }, []);

  const userColumns = useMemo(
    () =>
      getColumns(
        handleEditUser,
        handleDeleteUser,
        handleResendInvitation,
        handleGenerateSetupLink
      ),
    [
      handleDeleteUser,
      handleEditUser,
      handleGenerateSetupLink,
      handleResendInvitation,
    ]
  );

  const nextPage = useCallback(() => {
    setCurPage((prev) =>
      prev * rowLimit < maxUsersCount ? prev + 1 : prev
    );
  }, [maxUsersCount, rowLimit]);
  const prevPage = useCallback(() => {
    setCurPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const toggleFilterDropdown = () => {
    if (!isFilterModalOpen) {
      setDraftFilterUserType(filterUserType);
      setDraftFilterIsActive(filterIsActive);
      setDraftUsersViewMode(usersViewMode);
      setDraftRolesViewMode(rolesViewMode);
      setIsFilterModalOpen(true);
      return;
    }
    setIsFilterModalOpen(false);
  };

  const handleApplyFilters = () => {
    if (selectedView === "Users") {
      setFilterUserType(draftFilterUserType);
      setFilterIsActive(draftFilterIsActive);
      setUsersViewMode(draftUsersViewMode);
    } else {
      setRolesViewMode(draftRolesViewMode);
    }
    setCurPage(1);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    if (selectedView === "Users") {
      setDraftFilterUserType("");
      setDraftFilterIsActive("");
      setDraftUsersViewMode("card");
      return;
    }
    setDraftRolesViewMode("card");
  };

  return (
    <div className={styles.container}>
      <section className={styles.users__greeting}>
        <div className={styles["users__header-top"]}>
          <PageGreeting
            className={styles["users__header-text"]}
            title="User Management"
          />
          <div className={styles["header-controls"]}>
            {selectedView === "Users" && (
              <>
                <div className={styles["filter-bar--header"]}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles["filter-bar__input"]}
                  />
                </div>
                {isCompactCardsOnly ? (
                  <div className={styles["mobile-filter-selects"]}>
                    <select
                      value={filterUserType}
                      onChange={(event) => {
                        setFilterUserType(event.target.value);
                        setCurPage(1);
                      }}
                      className={styles["mobile-filter-select"]}
                    >
                      {USER_TYPE_OPTIONS.map((option) => (
                        <option key={option.value || "all-types"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterIsActive}
                      onChange={(event) => {
                        setFilterIsActive(event.target.value);
                        setCurPage(1);
                      }}
                      className={styles["mobile-filter-select"]}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value || "all-status"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </>
            )}
            <div className={styles.actions}>
              {selectedView === "Users" && !isCompactCardsOnly ? (
                <div
                  ref={filterDropdownRef}
                  className={styles["filter-dropdown"]}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className={`${styles["filter-button"]} ${
                      isFilterModalOpen ? styles["filter-button--open"] : ""
                    }`}
                    onClick={toggleFilterDropdown}
                  >
                    <Filter size={18} />
                    Filter
                  </button>

                  {isFilterModalOpen ? (
                    <div
                      className={styles["filter-dropdown__menu"]}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <div className={styles["filter-dropdown__body"]}>
                        {!isCompactCardsOnly ? (
                          <div className={styles["filter-dropdown__group"]}>
                            <div className={styles["filter-dropdown__view-switcher"]}>
                              <div
                                className={styles["view-switcher"]}
                                role="tablist"
                                aria-label={`${selectedView} view switcher`}
                              >
                                <button
                                  type="button"
                                  className={`${styles["view-switcher__button"]} ${
                                    draftActiveViewMode === "card"
                                      ? styles["view-switcher__button--active"]
                                      : ""
                                  }`}
                                  onClick={() => setDraftUsersViewMode("card")}
                                >
                                  Cards
                                </button>
                                <button
                                  type="button"
                                  className={`${styles["view-switcher__button"]} ${
                                    draftActiveViewMode === "table"
                                      ? styles["view-switcher__button--active"]
                                      : ""
                                  }`}
                                  onClick={() => setDraftUsersViewMode("table")}
                                >
                                  Table
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className={styles["filter-dropdown__group"]}>
                          <div className={styles["filter-dropdown__section-head"]}>
                            <span>Types</span>
                          </div>
                          <div className={styles["filter-dropdown__chips"]}>
                            {USER_TYPE_OPTIONS.map((option) => (
                              <button
                                key={option.value || "all-types"}
                                type="button"
                                className={
                                  draftFilterUserType === option.value
                                    ? styles["selected-opiton"]
                                    : ""
                                }
                                onClick={() => setDraftFilterUserType(option.value)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className={styles["filter-dropdown__group"]}>
                          <div className={styles["filter-dropdown__section-head"]}>
                            <span>Status</span>
                          </div>
                          <div className={styles["filter-dropdown__chips"]}>
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value || "all-status"}
                                type="button"
                                className={
                                  draftFilterIsActive === option.value
                                    ? styles["selected-opiton"]
                                    : ""
                                }
                                onClick={() => setDraftFilterIsActive(option.value)}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className={styles["filter-dropdown__footer"]}>
                        <button type="button" onClick={handleClearFilters}>
                          Clear
                        </button>
                        <button
                          type="button"
                          className={styles["is-primary"]}
                          onClick={handleApplyFilters}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : selectedView === "Roles" ? (
                !isCompactCardsOnly ? (
                  <div
                    className={styles["roles-view-toggle"]}
                    role="tablist"
                    aria-label="Roles view switcher"
                  >
                    <button
                      type="button"
                      className={`${styles["roles-view-toggle__button"]} ${
                        effectiveRolesViewMode === "card"
                          ? styles["roles-view-toggle__button--active"]
                          : ""
                      }`}
                      onClick={() => setRolesViewMode("card")}
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      className={`${styles["roles-view-toggle__button"]} ${
                        effectiveRolesViewMode === "table"
                          ? styles["roles-view-toggle__button--active"]
                          : ""
                      }`}
                      onClick={() => setRolesViewMode("table")}
                    >
                      Table
                    </button>
                  </div>
                ) : null
              ) : null}
              {selectedView === "Users" ? (
                <Button
                  className={styles["action-btn"]}
                  onClick={() => setShowCreateUserPopup(true)}
                  type="button"
                >
                  <UserPlus size={18} />
                  New User
                </Button>
              ) : (
                <Button
                  className={styles["action-btn"]}
                  onClick={() => setShowCreateRolePopup(true)}
                  type="button"
                >
                  <ShieldPlus size={18} />
                  New Role
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className={styles.tableCard}>
        <div className={styles.tableTabs}>
          <div className={styles.tableTabGroup}>
            <button
              onClick={() => setSelectedView("Users")}
              className={`${styles.tableTab} ${selectedView === "Users" ? styles["tableTab--active"] : ""}`}
              type="button"
            >
              Users
            </button>
            <button
              onClick={() => setSelectedView("Roles")}
              className={`${styles.tableTab} ${selectedView === "Roles" ? styles["tableTab--active"] : ""}`}
              type="button"
            >
              Roles
            </button>
          </div>
        </div>

        <div className={styles.tableBody}>
          {selectedView === "Users" ? (
            <>
              <AnimatePresence>
                {showCreateUserPopup && (
                  <UserCreateDialog
                    onClose={(success) => {
                      setShowCreateUserPopup(false);
                      if (success) fetchDataAndSetState();
                    }}
                    allRoles={roleOptions}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showEditPopup && editingUser && (
                  <UserCreateDialog
                    user={mapWorkspaceUserToEditUser(editingUser)}
                    onClose={(success) => {
                      if (success) fetchDataAndSetState();
                      setShowEditPopup(false);
                    }}
                    allRoles={roleOptions}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showConfirmDialog && (
                  <div
                    className={modalStyles["form-modal__overlay"]}
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    <MotionDiv
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className={styles["confirm-dialog"]}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p>{confirmMessage}</p>
                      {deleteError && (
                        <p className={styles["confirm-dialog__error"]}>{deleteError}</p>
                      )}
                      <div>
                        <button
                          onClick={() => {
                            if (userToDelete) deleteUser(userToDelete);
                          }}
                          className={styles["confirm-dialog__yes-btn"]}
                          type="button"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setShowConfirmDialog(false)}
                          className={styles["confirm-dialog__no-btn"]}
                          type="button"
                        >
                          No
                        </button>
                      </div>
                    </MotionDiv>
                  </div>
                )}
              </AnimatePresence>

              {inviteMessage && (
                <p className={styles["invite-message"]}>{inviteMessage}</p>
              )}

              {effectiveUsersViewMode === "table" ? (
                <DataTable
                  columns={userColumns}
                  data={data}
                  onSortChange={handleSortChange}
                  changeRowLimit={setRowLimit}
                  currentPageSize={rowLimit}
                  totalRows={maxUsersCount}
                  nextPage={nextPage}
                  prevPage={prevPage}
                  page={curPage}
                  onPageSelect={setCurPage}
                  isLoading={isUsersLoading}
                  readableLayout
                />
              ) : (
                <>
                  <div className={styles["users-card-grid"]}>
                    {isUsersLoading ? (
                      USER_CARD_SKELETONS.map((index) => (
                        <UserCardSkeleton
                          key={`user-card-skeleton-${index}`}
                        />
                      ))
                    ) : data.length ? (
                      data.map((workspaceUser) => (
                        <UserCard
                          key={workspaceUser.id}
                          workspaceUser={workspaceUser}
                          onResendInvitation={handleResendInvitation}
                          onGenerateSetupLink={handleGenerateSetupLink}
                          onEditUser={handleEditUser}
                          onDeleteUser={handleDeleteUser}
                        />
                      ))
                    ) : (
                      <div className={styles["users-card-empty"]}>No users found.</div>
                    )}
                  </div>

                  {maxUsersCount > 0 ? (
                    <TableFooter
                      currentPageSize={userPageSize}
                      totalRows={maxUsersCount}
                      changeRowLimit={setRowLimit}
                      nextPage={nextPage}
                      prevPage={prevPage}
                      page={curPage}
                      onPageSelect={setCurPage}
                      showPageSizeSelector={false}
                    />
                  ) : null}
                </>
              )}
            </>
          ) : (
            <UserRoles
              showNewRoleButton={false}
              createRoleOpen={showCreateRolePopup}
              onCreateRoleOpenChange={setShowCreateRolePopup}
              viewMode={effectiveRolesViewMode}
            />
          )}
        </div>
      </div>

      <SetupLinkModal
        open={setupLinkModal.open}
        onOpenChange={(open) =>
          setSetupLinkModal((prev) => ({ ...prev, open }))
        }
        userName={setupLinkModal.userName}
        url={setupLinkModal.url}
      />
    </div>
  );
}
