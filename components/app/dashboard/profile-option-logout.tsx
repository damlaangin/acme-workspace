"use client";

import { useRouter } from "next/navigation";

import { MdLogout } from "react-icons/md";

import styles from "@/styles/ui/ProfileDropdownMenu.module.scss";
import { useAuth } from "@/context/auth-context";

export default function ProfileOptionLogout() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <li className={styles["profile-option-logout"]}>
      <button
        className={styles["view-all-btn"]}
        onClick={async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Failed to sign out", error);
          } finally {
            router.push("/");
          }
        }}
      >
        <MdLogout size={20} className={styles["option-icon"]} />
        <span>Logout</span>
      </button>
    </li>
  );
}
