"use client";

import { useEffect, useMemo, useState } from "react";
import { groupsService } from "@/lib/services/groups.service";
import { useWorkspace } from "@/context/workspace-context";
import RolePermissionsDialog, {
  RolePermissionsState,
  PermissionCategory,
} from "@/components/app/dashboard/role-permissions-dialog";
import { permissionsService } from "@/lib/services/permissions.service";
import { groupIconsService, GroupIcon } from "@/lib/services/icons.service";

interface RoleCreateDialogProps {
  onClose?: (success: boolean) => void;
  onEditPermissions?: (newRole: any) => void;
}

export default function RoleCreateDialog({
  onClose,
  onEditPermissions,
}: RoleCreateDialogProps) {
  const [roleName, setRoleName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [categoryPermissions, setCategoryPermissions] =
    useState<RolePermissionsState>({});
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [icons, setIcons] = useState<GroupIcon[]>([]);
  const [isLoadingIcons, setIsLoadingIcons] = useState(true);
  const [selectedIconId, setSelectedIconId] = useState<number | string | null>(null);
  const { currentWorkspace } = useWorkspace();

  const buildPermissionsState = (items: PermissionCategory[]) =>
    items.reduce((acc, category) => {
      acc[category.key] = category.permissions.reduce((permAcc, perm) => {
        permAcc[perm.key] = false;
        return permAcc;
      }, {} as Record<string, boolean>);
      return acc;
    }, {} as RolePermissionsState);

  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoadingPermissions(true);
      const response = await permissionsService.getAllowedPermissions();
      if (response.success && response.data) {
        const mappedCategories = response.data.results.map((entry) => ({
          key: entry.user_type,
          name: entry.user_type,
          permissions: entry.permissions.map((perm) => ({
            id: perm.id,
            key: perm.codename,
            description: perm.name,
          })),
        }));
        setCategories(mappedCategories);
        setCategoryPermissions(buildPermissionsState(mappedCategories));
      } else {
        setFormError(response.error?.message ?? "Failed to load permissions.");
      }
      setIsLoadingPermissions(false);
    };

    fetchPermissions();
  }, []);

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
        setFormError(response.error?.message ?? "Failed to load icons.");
      }
      setIsLoadingIcons(false);
    };

    fetchIcons();
  }, []);

  const togglePermission = (categoryKey: string, permission: string) => {
    setCategoryPermissions((prev) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [permission]: !prev[categoryKey]?.[permission],
      },
    }));
  };

  const flattenPermissions = useMemo(
    () =>
      Object.values(categoryPermissions)
        .flatMap((perms) =>
          Object.entries(perms)
            .filter(([, allowed]) => allowed)
            .map(([perm]) => perm)
        )
        .filter(Boolean),
    [categoryPermissions]
  );

  const permissionIdByKey = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((category) => {
      category.permissions.forEach((perm) => {
        if (typeof perm.id === "number") {
          map.set(perm.key, perm.id);
        }
      });
    });
    return map;
  }, [categories]);

  const handleSave = async () => {
    if (!currentWorkspace) {
      console.error("No workspace selected. Unable to create role.");
      return;
    }

    if (!roleName.trim()) {
      setFormError("Role name is required.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: roleName.trim(),
        permissions: flattenPermissions
          .map((permKey) => permissionIdByKey.get(permKey))
          .filter((value): value is number => typeof value === "number"),
        icon: selectedIconId ?? undefined,
      };

      const response = await groupsService.createGroup(currentWorkspace.id, payload);

      if (response.success && response.data) {
        if (onEditPermissions) onEditPermissions(response.data);
        if (onClose) onClose(true);
      } else {
        setFormError(response.error?.message || "Failed to create role.");
      }
    } catch (error) {
      console.error("Failed to create role:", error);
      setFormError("Unexpected error occurred while creating role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RolePermissionsDialog
      title="New Role"
      roleName={roleName}
      onRoleNameChange={setRoleName}
      icons={icons}
      selectedIconId={selectedIconId}
      onIconSelect={setSelectedIconId}
      iconsLoading={isLoadingIcons}
      permissions={categoryPermissions}
      onTogglePermission={togglePermission}
      categories={categories}
      onClose={() => onClose?.(false)}
      onSave={handleSave}
      primaryLabel={isSubmitting ? "Saving..." : "Save Changes"}
      isSaving={isSubmitting || isLoadingPermissions || isLoadingIcons}
      errorMessage={formError}
    />
  );
}
