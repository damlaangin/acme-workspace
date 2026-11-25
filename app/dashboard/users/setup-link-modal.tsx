"use client";

import { useEffect, useState } from "react";
import { MdContentCopy, MdCheck } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import styles from "./setup-link-modal.module.scss";

interface SetupLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  url: string;
}

export default function SetupLinkModal({
  open,
  onOpenChange,
  userName,
  url,
}: SetupLinkModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop — clipboard permission denied
    }
  };

  const whatsappMessage = `Hi ${userName}, you can create your password for the AcmeClean app using the link below:\n\n${url}\n\nThe link must be used within 24 hours.`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Setup link created</DialogTitle>
          <DialogDescription>
            Share this link with <strong>{userName}</strong>. The link must be
            used within 24 hours. They can set their password when they open it.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.content}>
          <code className={styles["url-block"]}>{url}</code>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.action} ${styles["action-copy"]}`}
              data-copied={copied ? "true" : "false"}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <MdCheck size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <MdContentCopy size={18} />
                  Copy
                </>
              )}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.action} ${styles["action-whatsapp"]}`}
            >
              <FaWhatsapp size={18} />
              Share on WhatsApp
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
