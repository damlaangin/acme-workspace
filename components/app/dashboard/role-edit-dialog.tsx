"use client";

import React, { useEffect, useState } from "react";
import RolePermissionsDialog, {
  PermissionCategory,
  RolePermissionsState,
} from "@/components/app/dashboard/role-permissions-dialog";
import { permissionsService } from "@/lib/services/permissions.service";
import { groupIconsService, GroupIcon } from "@/lib/services/icons.service";
import { groupsService } from "@/lib/services/groups.service";
import dialogStyles from "@/styles/ui/RolePermissionsDialog.module.scss";

interface RoleEditDialogProps {
  role_name: string;
  roleId: number;
  workspaceId: number;
  iconId?: number | string | null;
  onClose: () => void;
  onSubmit: (
    updatedPermissions: Record<string, Record<string, boolean>>
  ) => void;
}

const RoleEditDialog: React.FC<RoleEditDialogProps> = ({
  role_name,
  onClose,
  onSubmit,
  roleId,
  workspaceId,
  iconId,
}) => {
  const [roleName, setRoleName] = useState(role_name);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [icons, setIcons] = useState<GroupIcon[]>([]);
  const [isLoadingIcons, setIsLoadingIcons] = useState(true);
  const [selectedIconId, setSelectedIconId] = useState<number | string | null>(
    iconId ?? null
  );
  const [categoryPermissions, setCategoryPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({});

  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoadingPermissions(true);
      const [categoriesResponse, groupResponse] = await Promise.all([
        permissionsService.getAllowedPermissions(),
        groupsService.getGroup(workspaceId, roleId),
      ]);
      if (categoriesResponse.success && categoriesResponse.data) {
        const mappedCategories = categoriesResponse.data.results.map((entry) => ({
          key: entry.user_type,
          name: entry.user_type,
          permissions: entry.permissions.map((perm) => ({
            id: perm.id,
            key: perm.codename,
            description: perm.name,
          })),
        }));

        // Bail out if we couldn't load the role's current permissions
        if (!groupResponse.success) {
          setErrorMessage("Failed to load current role permissions.");
          setIsLoadingPermissions(false);
          return;
        }

        // Build a set of current permission IDs from the group detail
        const currentPermIds = new Set<number>();
        if (groupResponse.data) {
          for (const p of groupResponse.data.permissions as any[]) {
            if (typeof p === "number") {
              currentPermIds.add(p);
            } else if (p && typeof p === "object" && typeof p.id === "number") {
              currentPermIds.add(p.id);
            }
          }
        }

        // Build permissions state with current permissions pre-checked
        const basePermissions = mappedCategories.reduce((acc, category) => {
          acc[category.key] = category.permissions.reduce((permAcc, perm) => {
            permAcc[perm.key] = currentPermIds.has(perm.id);
            return permAcc;
          }, {} as Record<string, boolean>);
          return acc;
        }, {} as RolePermissionsState);

        setCategories(mappedCategories);
        setCategoryPermissions(basePermissions);
      } else {
        setErrorMessage(categoriesResponse.error?.message ?? "Failed to load permissions.");
      }
      setIsLoadingPermissions(false);
    };

    fetchPermissions();
  }, [workspaceId, roleId]);

  useEffect(() => {
    const fetchIcons = async () => {
      setIsLoadingIcons(true);
      const response = await groupIconsService.getGroupIcons();
      if (response.success && response.data) {
        const fetchedIcons = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        setIcons(fetchedIcons);
        setSelectedIconId((prev) => prev ?? fetchedIcons[0]?.id ?? null);
      } else {
        setErrorMessage(response.error?.message ?? "Failed to load icons.");
      }
      setIsLoadingIcons(false);
    };

    fetchIcons();
  }, []);

  useEffect(() => {
    setRoleName(role_name);
  }, [role_name]);

  useEffect(() => {
    if (iconId !== undefined && iconId !== null) {
      setSelectedIconId(iconId);
    }
  }, [iconId]);

  const togglePermission = (categoryKey: string, permission: string) => {
    setCategoryPermissions((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [permission]: !prev[categoryKey]?.[permission],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const permissionIdByKey = new Map<string, number>();
      categories.forEach((category) => {
        category.permissions.forEach((perm) => {
          if (typeof perm.id === "number") {
            permissionIdByKey.set(perm.key, perm.id);
          }
        });
      });

      const permissionIds = Object.values(categoryPermissions)
        .flatMap((perms) =>
          Object.entries(perms)
            .filter(([, allowed]) => allowed)
            .map(([permKey]) => permissionIdByKey.get(permKey))
        )
        .filter((value): value is number => typeof value === "number");

      const payload = {
        name: roleName.trim(),
        permissions: Array.from(new Set(permissionIds)),
        icon: selectedIconId ?? undefined,
      };

      const response = await groupsService.updateGroup(workspaceId, roleId, payload);
      if (response.success) {
        onSubmit(categoryPermissions);
      } else {
        setErrorMessage(response.error?.message ?? "Failed to update role.");
      }
    } catch (error) {
      console.error("Error updating role:", error);
      setErrorMessage("Failed to update role.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPermissions || categories.length === 0) {
    return (
      <div className={dialogStyles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={dialogStyles.dialog} style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "2rem", minHeight: "200px" }}>
          {isLoadingPermissions ? "Loading permissions..." : null}
        </div>
      </div>
    );
  }

  return (
    <RolePermissionsDialog
      title={`Edit Role: ${role_name}`}
      roleName={roleName}
      onRoleNameChange={setRoleName}
      icons={icons}
      selectedIconId={selectedIconId}
      onIconSelect={setSelectedIconId}
      iconsLoading={isLoadingIcons}
      permissions={categoryPermissions}
      onTogglePermission={togglePermission}
      categories={categories}
      onClose={onClose}
      onSave={handleSave}
      primaryLabel="Save Changes"
      isSaving={isSaving || isLoadingPermissions || isLoadingIcons}
      errorMessage={errorMessage}
    />
  );
};

export default RoleEditDialog;
