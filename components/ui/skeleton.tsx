import React from "react";
import { cn } from "@/lib/utils";
import styles from "@/styles/ui/Skeleton.module.scss";

interface PanelSkeletonProps {
  lines?: number;
  lineHeight?: string;
  className?: string;
}

const PanelSkeleton: React.FC<PanelSkeletonProps> = ({
  lines = 3,
  lineHeight = "1rem",
  className,
}) => {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(styles.skeleton, className)}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={styles["skeleton-line"]}
          style={{ height: lineHeight }}
        />
      ))}
    </div>
  );
};

export default PanelSkeleton;
