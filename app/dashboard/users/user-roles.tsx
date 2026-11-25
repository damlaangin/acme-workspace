"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { format as dateFormat } from "date-fns";
import { groupsService, WorkspaceGroup } from "@/lib/services/groups.service";
import { workspaceService } from "@/lib/services/workspace.service";
import type { WorkspaceUser } from "@/types/api";
import { groupIconsService, GroupIcon } from "@/lib/services/icons.service";

import { useWorkspace } from "@/context/workspace-context";
import RoleCreateDialog from "@/components/app/dashboard/role-create-dialog";
import RoleEditDialog from "@/components/app/dashboard/role-edit-dialog";
import styles from "@/styles/ui/UserRoles.module.scss";
import { AnimatePresence } from "framer-motion";
import { MdDeleteOutline, MdOutlineEdit, MdOutlineAddModerator } from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TableFooter from "@/components/app/dashboard/table-footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import tableStyles from "@/styles/ui/DataTable.module.scss";

const rolesCache = new Map<number, WorkspaceGroup[]>();
const membersCache = new Map<number, { [groupId: number]: WorkspaceUser[] }>();
let iconsCache: Record<number, GroupIcon> | null = null;

type UserRolesProps = {
  showNewRoleButton?: boolean;
  createRoleOpen?: boolean;
  onCreateRoleOpenChange?: (open: boolean) => void;
  viewMode?: "table" | "card";
};

const UserRoles: React.FC<UserRolesProps> = ({
  showNewRoleButton = true,
  createRoleOpen,
  onCreateRoleOpenChange,
  viewMode = "table",
}) => {
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [members, setMembers] = useState<{ [groupId: number]: WorkspaceUser[] }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkspaceGroup | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [iconsById, setIconsById] = useState<Record<number, GroupIcon>>({});
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [membersDialogGroup, setMembersDialogGroup] = useState<WorkspaceGroup | null>(null);
  const [membersPage, setMembersPage] = useState(1);
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(8);
  const isFetching = useRef(false);

  const { currentWorkspace } = useWorkspace();

  const fetchGroups = async () => {
    if (!currentWorkspace || isFetching.current) return;
    const cachedGroups = rolesCache.get(currentWorkspace.id);
    if (cachedGroups && cachedGroups.length > 0) {
      setGroups(cachedGroups);
      const cachedMembers = membersCache.get(currentWorkspace.id);
      if (cachedMembers) {
        setMembers(cachedMembers);
      } else {
        await fetchMembersInBackground(cachedGroups);
      }
      return;
    }
    isFetching.current = true;
    setIsLoading(true);

    try {
      const response = await groupsService.getGroups(currentWorkspace.id);
      if (response.success && response.data) {
        const fetchedGroups = response.data.results || [];
        setGroups(fetchedGroups);
        rolesCache.set(currentWorkspace.id, fetchedGroups);
        await fetchMembersInBackground(fetchedGroups);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  };

  const fetchMembersInBackground = async (fetchedGroups: WorkspaceGroup[]) => {
    if (!currentWorkspace) return;
    const cachedMembers = membersCache.get(currentWorkspace.id);
    if (cachedMembers) {
      setMembers(cachedMembers);
      return;
    }
    const membersMap: { [groupId: number]: WorkspaceUser[] } = {};

    try {
      const memberPromises = fetchedGroups.map(async (group) => {
        const response = await workspaceService.getWorkspaceUsers(currentWorkspace.id, {
          group: group.id,
          page_size: 100,
        });
        if (response.success && response.data) {
          membersMap[group.id] = response.data.results || [];
          setMembers((prev) => ({ ...prev, [group.id]: membersMap[group.id] }));
        }
      });
      await Promise.all(memberPromises);
      membersCache.set(currentWorkspace.id, membersMap);
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [currentWorkspace]);

  useEffect(() => {
    setRolePage(1);
  }, [rolePageSize]);

  useEffect(() => {
    if (viewMode === "card" && rolePageSize !== 8) {
      setRolePageSize(8);
    }
  }, [rolePageSize, viewMode]);

  useEffect(() => {
    const fetchIcons = async () => {
      if (iconsCache) {
        setIconsById(iconsCache);
        return;
      }
      const response = await groupIconsService.getGroupIcons();
      if (response.success && response.data) {
        const map: Record<number, GroupIcon> = {};
        const fetchedIcons = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        fetchedIcons.forEach((icon) => {
          map[icon.id] = icon;
        });
        iconsCache = map;
        setIconsById(map);
      }
    };

    fetchIcons();
  }, []);

  const resolveGroupIconId = (icon: WorkspaceGroup["icon"]) => {
    if (typeof icon === "number") return icon;
    if (typeof icon === "string") {
      const numeric = Number(icon);
      if (Number.isFinite(numeric)) return numeric;
      const matched = Object.values(iconsById).find((item) => item.icon === icon);
      return matched?.id ?? null;
    }
    if (icon && typeof icon === "object") {
      const iconUrl = (icon as { icon?: string }).icon;
      if (iconUrl) {
        const matched = Object.values(iconsById).find((item) => item.icon === iconUrl);
        if (matched?.id) return matched.id;
      }
      const iconId = (icon as { id?: number }).id;
      return typeof iconId === "number" ? iconId : null;
    }
    return null;
  };

  const resolveGroupIconUrl = (group: WorkspaceGroup) => {
    const { icon } = group;
    if (typeof icon === "string") {
      if (icon.startsWith("http") || icon.startsWith("/")) return icon;
      const numeric = Number(icon);
      if (Number.isFinite(numeric)) {
        return iconsById[numeric]?.icon ?? null;
      }
      return null;
    }
    if (typeof icon === "number") {
      return iconsById[icon]?.icon ?? null;
    }
    if (icon && typeof icon === "object") {
      const iconUrl = (icon as { icon?: string }).icon;
      if (iconUrl) return iconUrl;
      const iconId = (icon as { id?: number }).id;
      if (typeof iconId === "number") return iconsById[iconId]?.icon ?? null;
    }
    return null;
  };

  const handleEditGroup = (group: WorkspaceGroup) => {
    setEditingGroup(group);
    setShowEditPopup(true);
  };

  const handleDeleteGroup = (group: WorkspaceGroup) => {
    if (members[group.id]?.length > 0) {
      setConfirmMessage("This group has members. Please remove them first.");
      setGroupToDelete(null);
      setShowConfirmDialog(true);
    } else {
      setConfirmMessage("Are you sure you want to delete this group?");
      setGroupToDelete(group.id);
      setShowConfirmDialog(true);
    }
  };

  const openMembersDialog = (group: WorkspaceGroup) => {
    setMembersDialogGroup(group);
    setMembersPage(1);
    setMembersDialogOpen(true);
  };

  const membersPerPage = 10;
  const dialogMembers = useMemo(() => {
    if (!membersDialogGroup) return [];
    return members[membersDialogGroup.id] ?? [];
  }, [members, membersDialogGroup]);

  const membersTotalPages = Math.max(1, Math.ceil(dialogMembers.length / membersPerPage));
  const membersPageSafe = Math.min(membersPage, membersTotalPages);
  const pagedMembers = useMemo(() => {
    const startIndex = (membersPageSafe - 1) * membersPerPage;
    return dialogMembers.slice(startIndex, startIndex + membersPerPage);
  }, [dialogMembers, membersPageSafe]);

  useEffect(() => {
    if (!membersDialogOpen) {
      setMembersDialogGroup(null);
      setMembersPage(1);
    }
  }, [membersDialogOpen]);

  const deleteGroup = async (groupId: number) => {
    if (!currentWorkspace) return;
    try {
      const response = await groupsService.deleteGroup(currentWorkspace.id, groupId);
      if (response && !response.success) {
        setConfirmMessage(response.error?.message || "Failed to delete group.");
        setGroupToDelete(null);
        setShowConfirmDialog(true);
        return;
      }
      await fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      setConfirmMessage("Failed to delete group. Please try again.");
      setGroupToDelete(null);
      setShowConfirmDialog(true);
    }
  };

  const effectiveRolePageSize = viewMode === "card" ? 8 : rolePageSize;
  const totalRoleRows = groups.length;
  const totalRolePages = Math.max(1, Math.ceil(totalRoleRows / effectiveRolePageSize));
  const safeRolePage = Math.min(rolePage, totalRolePages);
  const pagedGroups = useMemo(() => {
    const startIndex = (safeRolePage - 1) * effectiveRolePageSize;
    return groups.slice(startIndex, startIndex + effectiveRolePageSize);
  }, [effectiveRolePageSize, groups, safeRolePage]);

  const nextRolePage = () => {
    setRolePage((prev) => Math.min(prev + 1, totalRolePages));
  };

  const prevRolePage = () => {
    setRolePage((prev) => Math.max(prev - 1, 1));
  };

  return (
    <>
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className={styles["members-dialog"]}>
          <DialogHeader>
            <DialogTitle>
              {membersDialogGroup ? `${membersDialogGroup.name} Members` : "Members"}
            </DialogTitle>
          </DialogHeader>
          {dialogMembers.length === 0 ? (
            <p className={styles["members-empty"]}>No members found.</p>
          ) : (
            <>
              <div className={styles["members-list"]}>
                <div className={styles["members-row-header"]}>
                  <span>Name</span>
                  <span>User Type</span>
                </div>
                {pagedMembers.map((member) => {
                  const firstName = member.user?.first_name ?? "";
                  const lastName = member.user?.last_name ?? "";
                  const fullName = `${firstName} ${lastName}`.trim() || member.user?.username || "—";
                  return (
                    <div key={member.id} className={styles["members-row"]}>
                      <span>{fullName}</span>
                      <span className={styles["members-type"]}>{member.user_type ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
              {dialogMembers.length > membersPerPage && (
                <div className={styles["members-pagination"]}>
                  <button
                    type="button"
                    onClick={() => setMembersPage((prev) => Math.max(prev - 1, 1))}
                    disabled={membersPageSafe === 1}
                    className={styles["members-page-btn"]}
                  >
                    Prev
                  </button>
                  <span className={styles["members-page-info"]}>
                    Page {membersPageSafe} of {membersTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMembersPage((prev) => Math.min(prev + 1, membersTotalPages))
                    }
                    disabled={membersPageSafe === membersTotalPages}
                    className={styles["members-page-btn"]}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {showConfirmDialog && (
        <div className={styles["confirm-dialog"]}>
          <p>{confirmMessage}</p>
          {groupToDelete ? (
            <>
              <button
                onClick={async () => {
                  if (groupToDelete) await deleteGroup(groupToDelete);
                  setShowConfirmDialog(false);
                }}
                className={styles["confirm-dialog__yes-btn"]}
              >
                Yes
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className={styles["confirm-dialog__no-btn"]}
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConfirmDialog(false)}
              className={styles["confirm-dialog__no-btn"]}
            >
              OK
            </button>
          )}
        </div>
      )}

      <div className={showConfirmDialog ? styles.blurred : ""}>
        <div className={styles.container}>
          {showNewRoleButton && (
            <div className={styles["new-role"]}>
              <div
                className={styles["new-role-section"]}
                onClick={() => {
                  if (onCreateRoleOpenChange) onCreateRoleOpenChange(true);
                  else setShowCreatePopup(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (onCreateRoleOpenChange) onCreateRoleOpenChange(true);
                    else setShowCreatePopup(true);
                  }
                }}
              >
                <p className={styles["new-text"]}>New Role</p>
                <button className={styles["new-role-btn"]} type="button">
                  <MdOutlineAddModerator />
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {(createRoleOpen ?? showCreatePopup) && (
              <RoleCreateDialog
                onClose={() => {
                  if (onCreateRoleOpenChange) onCreateRoleOpenChange(false);
                  else setShowCreatePopup(false);
                }}
                onEditPermissions={() => {}}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showEditPopup && editingGroup && currentWorkspace && (
              <RoleEditDialog
                role_name={editingGroup.name}
                roleId={editingGroup.id}
                workspaceId={currentWorkspace.id}
                iconId={resolveGroupIconId(editingGroup.icon)}
                onClose={() => setShowEditPopup(false)}
                onSubmit={fetchGroups}
              />
            )}
          </AnimatePresence>

          {viewMode === "table" ? (
            <div className={styles["roles-table-wrapper"]}>
              <div className={tableStyles["table-container"]}>
                <Table className={tableStyles["table-grid"]}>
                <TableHeader
                  className={`${tableStyles["table-header"]} ${tableStyles["table-grid-header"]}`}
                >
                  <TableRow className={tableStyles["table-grid-row"]}>
                    <TableHead
                      className={`${tableStyles["table-grid-head"]} ${styles["role-table-header"]}`}
                    >
                      Icon
                    </TableHead>
                    <TableHead
                      className={`${tableStyles["table-grid-head"]} ${styles["role-table-header"]}`}
                    >
                      Group Name
                    </TableHead>
                    <TableHead
                      className={`${tableStyles["table-grid-head"]} ${styles["role-table-header"]}`}
                    >
                      Permissions
                    </TableHead>
                    <TableHead
                      className={`${tableStyles["table-grid-head"]} ${styles["role-table-header"]}`}
                    >
                      Members
                    </TableHead>
                    <TableHead
                      className={`${tableStyles["table-grid-head"]} ${styles["role-table-header"]}`}
                    >
                      Last Updated
                    </TableHead>
                    <TableHead
                      className={`${tableStyles["table-grid-head"]} ${styles["role-table-header"]}`}
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                {isLoading ? (
                  <TableBody className={tableStyles["table-grid-body"]}>
                    {[...Array(3)].map((_, index) => (
                      <TableRow key={index} className={tableStyles["table-grid-row"]}>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["skeleton-icon"]}></div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["skeleton-box"]} style={{ width: "80%" }}></div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["skeleton-box"]} style={{ width: "100%" }}></div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["user-roles__members-stack"]}>
                            <div className={styles["skeleton-icon"]}></div>
                            <div className={styles["skeleton-icon"]}></div>
                            <div className={styles["skeleton-icon"]}></div>
                          </div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["skeleton-box"]} style={{ width: "70%" }}></div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <button className={`${styles["action-button"]} ${styles["edit-button"]}`}>
                            <MdOutlineEdit />
                          </button>
                          <button className={`${styles["action-button"]} ${styles["delete-button"]}`}>
                            <MdDeleteOutline />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                ) : groups.length === 0 ? (
                  <TableBody className={tableStyles["table-grid-body"]}>
                    <TableRow className={tableStyles["table-grid-row"]}>
                      <TableCell
                        colSpan={6}
                        className={`${tableStyles["table-cell-center"]} ${tableStyles["table-grid-cell"]} ${styles["roles-empty"]}`}
                      >
                        No roles found
                      </TableCell>
                    </TableRow>
                  </TableBody>
                ) : (
                  <TableBody className={tableStyles["table-grid-body"]}>
                    {pagedGroups.map((group) => (
                      <TableRow key={group.id} className={tableStyles["table-grid-row"]}>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["user-roles__cell-icon"]}>
                            <img
                              src={resolveGroupIconUrl(group) ?? "/images/UsersPage/icon3.png"}
                              alt={`${group.name} icon`}
                              className={styles["user-roles__icon"]}
                            />
                          </div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div
                            className={`${styles["user-roles__cell-rolename"]} ${styles["user-roles__cell-ellipsis"]}`}
                            title={group.name}
                          >
                            {group.name}
                          </div>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          {group.permissions?.length ? group.permissions.length + " permissions" : "No permissions assigned"}
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <button
                            type="button"
                            className={styles["user-roles__members-trigger"]}
                            onClick={() => openMembersDialog(group)}
                            disabled={!members[group.id]?.length}
                            aria-label={`View members for ${group.name}`}
                          >
                            <div className={styles["user-roles__members-stack"]}>
                              {members[group.id] ? (
                                members[group.id].slice(0, 3).map((member) => {
                                  const imageUrl =
                                    member.user?.profile_picture || null;
                                  const altText =
                                    member.user?.first_name ||
                                    member.user?.username ||
                                    "Member";

                                  return (
                                    <React.Fragment key={member.id}>
                                      {imageUrl ? (
                                        <img
                                          src={imageUrl}
                                          alt={altText}
                                          className={styles["user-roles__member-pfp"]}
                                        />
                                      ) : (
                                        <FaUserCircle className={styles["user-roles__member-pfp"]} />
                                      )}
                                    </React.Fragment>
                                  );
                                })
                              ) : (
                                <div className={styles["user-roles__members-stack"]}>
                                  <div className={styles["skeleton-icon"]}></div>
                                  <div className={styles["skeleton-icon"]}></div>
                                  <div className={styles["skeleton-icon"]}></div>
                                </div>
                              )}

                              {members[group.id]?.length > 3 && (
                                <div className={styles["user-roles__member-more"]}>
                                  +{members[group.id].length - 3}
                                </div>
                              )}
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          {group.updated_at
                            ? dateFormat(new Date(group.updated_at), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className={tableStyles["table-grid-cell"]}>
                          <div className={styles["role-actions"]}>
                            <button
                              className={`${styles["action-button"]} ${styles["edit-button"]}`}
                              onClick={() => handleEditGroup(group)}
                            >
                              <MdOutlineEdit />
                            </button>
                            <button
                              className={`${styles["action-button"]} ${styles["delete-button"]}`}
                              onClick={() => handleDeleteGroup(group)}
                            >
                              <MdDeleteOutline />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
                </Table>
              </div>
            </div>
          ) : (
            <div className={styles["roles-card-grid-layout"]}>
              {isLoading ? (
                [...Array(8)].map((_, index) => (
                  <article key={`role-skeleton-${index}`} className={styles["roles-card"]}>
                    <div className={styles["roles-card-header"]}>
                      <div className={styles["skeleton-icon"]}></div>
                      <div className={styles["skeleton-box"]} style={{ width: "50%" }}></div>
                    </div>
                    <div className={styles["roles-card-grid"]}>
                      {[...Array(3)].map((__, itemIndex) => (
                        <div key={itemIndex} className={styles["roles-card-item"]}>
                          <span className={styles["roles-card-label"]}>Loading</span>
                          <div className={styles["skeleton-box"]}></div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              ) : groups.length === 0 ? (
                <div className={styles["roles-card-status"]}>No roles found</div>
              ) : (
                pagedGroups.map((group) => (
                  <article key={`card-${group.id}`} className={styles["roles-card"]}>
                    <div className={styles["roles-card-header"]}>
                      <div className={styles["roles-card-icon"]}>
                        <img
                          src={resolveGroupIconUrl(group) ?? "/images/UsersPage/icon3.png"}
                          alt={`${group.name} icon`}
                          className={styles["user-roles__icon"]}
                        />
                      </div>
                      <span className={styles["roles-card-title"]}>{group.name}</span>
                    </div>
                    <div className={styles["roles-card-grid"]}>
                      <div className={styles["roles-card-item"]}>
                        <span className={styles["roles-card-label"]}>Permissions</span>
                        <span className={styles["roles-card-value"]}>
                          {group.permissions?.length
                            ? `${group.permissions.length} permissions`
                            : "No permissions assigned"}
                        </span>
                      </div>
                      <div className={styles["roles-card-item"]}>
                        <span className={styles["roles-card-label"]}>Members</span>
                        <button
                          type="button"
                          className={styles["roles-card-members"]}
                          onClick={() => openMembersDialog(group)}
                          disabled={!members[group.id]?.length}
                        >
                          {members[group.id]?.length ?? 0} member(s)
                        </button>
                      </div>
                      <div className={styles["roles-card-item"]}>
                        <span className={styles["roles-card-label"]}>Last Updated</span>
                        <span className={styles["roles-card-value"]}>
                          {group.updated_at
                            ? dateFormat(new Date(group.updated_at), "dd MMM yyyy")
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className={styles["roles-card-actions"]}>
                      <button
                        className={`${styles["action-button"]} ${styles["edit-button"]}`}
                        onClick={() => handleEditGroup(group)}
                      >
                        <MdOutlineEdit />
                      </button>
                      <button
                        className={`${styles["action-button"]} ${styles["delete-button"]}`}
                        onClick={() => handleDeleteGroup(group)}
                      >
                        <MdDeleteOutline />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {totalRoleRows > 0 && (
              <TableFooter
              currentPageSize={effectiveRolePageSize}
              totalRows={totalRoleRows}
              changeRowLimit={setRolePageSize}
              nextPage={nextRolePage}
              prevPage={prevRolePage}
              page={safeRolePage}
              onPageSelect={setRolePage}
              showPageSizeSelector={viewMode !== "card"}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default UserRoles;
