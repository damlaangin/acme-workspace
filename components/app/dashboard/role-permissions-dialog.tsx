"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/ui/RolePermissionsDialog.module.scss";
import type { GroupIcon } from "@/lib/services/icons.service";

export type RolePermissionsState = Record<string, Record<string, boolean>>;
export type PermissionCategory = {
  key: string;
  name: string;
  permissions: { id?: number; key: string; description: string }[];
};

interface RolePermissionsDialogProps {
  title: string;
  roleName: string;
  onRoleNameChange: (value: string) => void;
  icons?: GroupIcon[];
  selectedIconId?: number | string | null;
  onIconSelect?: (id: number | string) => void;
  iconsLoading?: boolean;
  permissions: RolePermissionsState;
  onTogglePermission: (categoryKey: string, permissionKey: string) => void;
  categories: PermissionCategory[];
  onClose: () => void;
  onSave: () => void;
  primaryLabel?: string;
  errorMessage?: string | null;
  isSaving?: boolean;
}

export default function RolePermissionsDialog({
  title,
  roleName,
  onRoleNameChange,
  icons = [],
  selectedIconId = null,
  onIconSelect,
  iconsLoading = false,
  permissions,
  onTogglePermission,
  categories,
  onClose,
  onSave,
  primaryLabel = "Save Changes",
  errorMessage,
  isSaving = false,
}: RolePermissionsDialogProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0]?.key ?? null
  );

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].key);
    }
  }, [categories, activeCategory]);

  const activePermissions = useMemo(() => {
    if (!activeCategory) return [];
    return (
      categories.find((category) => category.key === activeCategory)
        ?.permissions ?? []
    );
  }, [activeCategory, categories]);

  const { activeIcon, canShowIcons } = useMemo(() => {
    const hasIcons = icons.length > 0;
    if (!hasIcons) {
      return { activeIcon: null, canShowIcons: false };
    }
    const index = Math.max(
      0,
      icons.findIndex((icon) => icon.id === selectedIconId)
    );
    return { activeIcon: icons[index] ?? icons[0], canShowIcons: true };
  }, [icons, selectedIconId]);

  const moveIcon = (direction: "prev" | "next") => {
    if (!icons.length || !onIconSelect) return;
    const currentIndex = Math.max(
      0,
      icons.findIndex((icon) => icon.id === selectedIconId)
    );
    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % icons.length
        : (currentIndex - 1 + icons.length) % icons.length;
    onIconSelect(icons[nextIndex].id);
  };

  return (
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <h4 className={styles.title}>{title}</h4>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
            disabled={isSaving}
          >
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles["fields-row"]}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="role-name">
                Role Name
              </label>
              <input
                id="role-name"
                type="text"
                value={roleName}
                onChange={(event) => onRoleNameChange(event.target.value)}
                className={styles.input}
                placeholder="Role name"
                disabled={isSaving}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Role Icon</label>
              {iconsLoading ? (
                <div className={styles["icons__loading"]}>Loading icons...</div>
              ) : canShowIcons && activeIcon ? (
                <div className={styles["icon-carousel"]}>
                  <button
                    type="button"
                    className={styles["icon-carousel__nav"]}
                    onClick={() => moveIcon("prev")}
                    aria-label="Previous icon"
                    disabled={isSaving}
                  >
                    ←
                  </button>
                  <div className={styles["icon-carousel__current"]}>
                    <img src={activeIcon.icon} alt={activeIcon.name} />
                    <span className={styles["icon-carousel__name"]}>
                      {activeIcon.name.charAt(0).toUpperCase() + activeIcon.name.slice(1)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles["icon-carousel__nav"]}
                    onClick={() => moveIcon("next")}
                    aria-label="Next icon"
                    disabled={isSaving}
                  >
                    →
                  </button>
                </div>
              ) : (
                <div className={styles["icons__empty"]}>No icons available.</div>
              )}
            </div>
          </div>

          <div className={styles.tabs}>
            {categories.map((category) => (
              <button
                key={category.key}
                type="button"
                className={`${styles.tab} ${
                  activeCategory === category.key ? styles["tab--active"] : ""
                }`}
                onClick={() => setActiveCategory(category.key)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className={styles.permissions}>
            <div className={styles["permissions__header"]}>
              <span>Function</span>
              <span>Description</span>
              <span>Allow</span>
            </div>

            <div className={styles["permissions__list"]}>
              {activePermissions.map((perm) => (
                <div
                  key={perm.key}
                  className={styles["permissions__row"]}
                  onClick={() =>
                    activeCategory && onTogglePermission(activeCategory, perm.key)
                  }
                >
                  <span className={styles["permissions__name"]}>{perm.key}</span>
                  <span className={styles["permissions__desc"]}>
                    {perm.description}
                  </span>
                  <span className={styles["permissions__toggle"]}>
                    <input
                      type="checkbox"
                      checked={
                        !!permissions[activeCategory ?? ""]?.[perm.key]
                      }
                      onClick={(event) => event.stopPropagation()}
                      onChange={() =>
                        activeCategory &&
                        onTogglePermission(activeCategory, perm.key)
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={onSave}
            disabled={isSaving}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
