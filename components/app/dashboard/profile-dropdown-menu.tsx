"use client";

import React, { useState } from "react";

import { FaUserCircle } from "react-icons/fa";
import { MdAdd } from "react-icons/md";

import ProfileOptionLogout from "./profile-option-logout";
import WSDropdownItem from "./ws-dropdown-item";
import WsCreateDialog from "./ws-create-dialog";
import { useAuth } from "@/context/auth-context";
import { useWorkspace } from "@/context/workspace-context";
import { setCookie } from "@/lib/utils/cookie-storage";
import type { Workspace } from "@/types/api";
import styles from "@/styles/ui/ProfileDropdownMenu.module.scss";
import { useRouter } from "next/navigation";

const ProfileDropdownMenu: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const router = useRouter();
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  console.log("USER: ", user);

  const changeWorkspace = (ws: Workspace) => {
    if (ws.id !== currentWorkspace?.id) {
      setCookie("workspaceId", ws.id.toString());
      setCurrentWorkspace(ws);
      router.refresh();
    }
  };

  return (
    <div className={styles["profile-popup"]}>
      <div className={styles["profile-header"]}>
        {/* <Image
          src={profileImage}
          alt="John Doe"
          className={styles["profile-image-popup"]}
        /> */}
        <FaUserCircle size={40} className={styles["profile-image-popup"]} />
        {user && (
          <div className={styles["profile-info"]}>
            <p className={styles["profile-name"]}>
              {user.name ?? "- - -"}
            </p>
            <p className={styles["profile-workspace"]}>
              {currentWorkspace?.name ?? "Workspace"}
            </p>
            <p className={styles["profile-role"]}>{user.email ?? ""}</p>
          </div>
        )}
      </div>

      <div className={styles["profile-workspaces"]}>
        <p className={styles["profile-section-title"]}>Workspaces</p>
        <ul className={styles["profile-workspace-list"]}>
          {workspaces.map((item) => (
            <WSDropdownItem
              key={item.id}
              label={item.name}
              onClick={() => changeWorkspace(item)}
            />
          ))}
        </ul>
      </div>

      <ul className={styles["profile-options"]}>
        <li>
          <button
            className={styles["profile-option-action"]}
            onClick={() => setShowCreatePopup(true)}
            type="button"
          >
            <MdAdd size={20} className={styles["option-icon"]} />
            <span>Create Workspace</span>
          </button>
        </li>

        <ProfileOptionLogout />
      </ul>

      {showCreatePopup && (
        <WsCreateDialog onClose={() => setShowCreatePopup(false)} />
      )}
    </div>
  );
};

export default ProfileDropdownMenu;
