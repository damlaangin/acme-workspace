"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { IoIosSearch, IoMdNotificationsOutline } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { FiMenu } from "react-icons/fi";
import { MdAdd, MdLogout } from "react-icons/md";
import { LuFileQuestion, LuSettings } from "react-icons/lu";

import ProfileDropdownMenu from "./profile-dropdown-menu";
import NotificationsDropdownMenu from "./notifications-dropdown-menu";
import WSDropdownItem from "./ws-dropdown-item";
import WsCreateDialog from "./ws-create-dialog";

import { useAuth } from "@/context/auth-context";
import { useWorkspace } from "@/context/workspace-context";
import type { Workspace } from "@/types/api";
import styles from "@/styles/ui/DashNavBar.module.scss";
import acmeLogo from "@/public/images/logo-mark.png";
import { setCookie } from "@/lib/utils/cookie-storage";
import {
  mainMenuItems,
  profileMenuItems,
} from "./menu-items";

const DashNavBar: React.FC = () => {
  const { logout } = useAuth();
  const { currentWorkspace, workspaces, setCurrentWorkspace } = useWorkspace();
  const router = useRouter();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const logoSrc = useMemo(
    () => acmeLogo,
    []
  );

  const searchInputRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchActive(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "/") {
        event.preventDefault();
        setIsSearchActive(true);
      } else if (event.key === "Escape") {
        setIsMobileSearchActive(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isSearchActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchActive]);

  const toggleSearchMode = () => setIsSearchActive((prev) => !prev);
  const toggleNotifications = () => setIsNotificationsOpen((prev) => !prev);
  const toggleProfileMenu = () => setIsProfileMenuOpen((prev) => !prev);
  const toggleMobileSearch = () => {
    setIsMobileSearchActive((prev) => !prev);
    setIsMobileMenuOpen(false);
    if (!isMobileSearchActive && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const changeWorkspace = (ws: Workspace) => {
    if (ws.id !== currentWorkspace?.id) {
      setCookie("workspaceId", ws.id.toString());
      setCurrentWorkspace(ws);
      router.refresh();
    }
    setIsMobileMenuOpen(false);
  };
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    setIsMobileSearchActive(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      setIsMobileMenuOpen(false);
      router.push("/");
    }
  };

  return (
    <div className={styles["card-wrapper"]}>
      <div
        className={`${styles["card-header"]} ${
          isMobileSearchActive ? styles["mobile-search-active"] : ""
        }`}
      >
        <div className={styles["card-header-right"]}>
          <button
            className={styles["mobile-menu-btn"]}
            onClick={toggleMobileMenu}
            ref={mobileMenuButtonRef}
            aria-label="Open navigation menu"
          >
            <FiMenu />
          </button>

          {/* Mobile search */}
          <button
            className={styles["mobile-search-btn"]}
            onClick={toggleMobileSearch}
          >
            <IoIosSearch />
          </button>

          <div className={styles["menu-wrapper"]} ref={notificationsRef}>
            <button
              className={styles["notifications-btn"]}
              onClick={toggleNotifications}
            >
              <IoMdNotificationsOutline />
            </button>
            {isNotificationsOpen && <NotificationsDropdownMenu />}
          </div>

          <div className={styles["nav-link-group"]}>
            <Link
              href="/dashboard/options/settings"
              className={styles["nav-link"]}
              aria-label="Settings"
              title="Settings"
            >
              <LuSettings />
            </Link>
            <Link
              href="/dashboard/options/faq"
              className={styles["nav-link"]}
              aria-label="FAQ"
              title="FAQ"
            >
              <LuFileQuestion />
            </Link>
          </div>

          <div className={styles["menu-wrapper"]} ref={profileMenuRef}>
            <button
              className={styles["profile-icon"]}
              onClick={toggleProfileMenu}
            >
              <FaUserCircle size={40} className={styles["profile-image"]} />
            </button>
            {isProfileMenuOpen && <ProfileDropdownMenu />}
          </div>

          {isMobileMenuOpen && (
            <div
              className={styles["mobile-menu-panel"]}
              ref={mobileMenuRef}
            >
              <div className={styles["mobile-menu-header"]}>
                <p>Menu</p>
                <button
                  className={styles["mobile-menu-close"]}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                >
                  <IoClose />
                </button>
              </div>
              <div className={styles["mobile-menu-section"]}>
                <p className={styles["mobile-menu-heading"]}>Navigation</p>
                <div className={styles["mobile-menu-list"]}>
                  {mainMenuItems.flatMap((item) => {
                    const Icon = item.icon;
                    const entry = (
                      <Link
                        href={item.link}
                        key={item.label}
                        className={styles["mobile-menu-link"]}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {Icon ? <Icon /> : null}
                        <span>{item.label}</span>
                      </Link>
                    );

                    if (item.children && item.children.length > 0) {
                      const childItems = item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            href={child.link}
                            key={child.label}
                            className={styles["mobile-menu-link"]}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {ChildIcon ? <ChildIcon /> : null}
                            <span>{child.label}</span>
                          </Link>
                        );
                      });
                      return [entry, ...childItems];
                    }

                    return [entry];
                  })}
                </div>
              </div>
              <div className={styles["mobile-menu-section"]}>
                <p className={styles["mobile-menu-heading"]}>Workspaces</p>
                <ul className={styles["mobile-workspace-list"]}>
                  {workspaces.map((item) => (
                    <WSDropdownItem
                      key={item.id}
                      label={item.name}
                      onClick={() => changeWorkspace(item)}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  className={styles["mobile-workspace-action"]}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowCreatePopup(true);
                  }}
                >
                  <MdAdd />
                  <span>Create Workspace</span>
                </button>
              </div>
              <div className={styles["mobile-menu-section"]}>
                <p className={styles["mobile-menu-heading"]}>Account</p>
                <div className={styles["mobile-menu-list"]}>
                  {profileMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        href={item.link}
                        key={item.label}
                        className={styles["mobile-menu-link"]}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {Icon ? <Icon /> : null}
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    className={`${styles["mobile-menu-link"]} ${styles["mobile-menu-link--logout"]}`}
                    onClick={handleLogout}
                  >
                    <MdLogout />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles["mobile-panel-title"]}
          onClick={() => router.push("/dashboard")}
          aria-label="Go to dashboard"
        >
          <Image
            className={styles["mobile-panel-logo"]}
            src={logoSrc}
            alt={currentWorkspace?.name ? `${currentWorkspace.name} logo` : "Acme logo"}
            width={120}
            height={32}
            unoptimized={typeof logoSrc === "string"}
          />
        </button>

        {showCreatePopup && (
          <WsCreateDialog onClose={() => setShowCreatePopup(false)} />
        )}

        {/* Mobile Search Overlay */}
        {isMobileSearchActive && (
          <div
            className={styles["mobile-search-bar"]}
            ref={mobileSearchRef}
          >
            <input
              type="text"
              className={styles["mobile-search-input"]}
              ref={inputRef}
            />
            <div className={styles["close-btn"]}>
              <button
                className={styles["mobile-close-search-btn"]}
                onClick={() => setIsMobileSearchActive(false)}
              >
                <IoClose />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashNavBar;
