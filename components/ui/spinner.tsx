import React from "react";
import { LuLoaderCircle } from "react-icons/lu";
import styles from "@/styles/ui/Spinner.module.scss";

interface SpinnerProps {
  size?: string;
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = "2rem",
  color = "var(--primary-hover-color)",
}) => {
  return (
    <div
      role="status"
      className={styles["spinner-container"]}
      style={{ width: size, height: size }}
    >
      <LuLoaderCircle
        aria-hidden="true"
        className={styles["spinner-icon"]}
        style={{
          width: size,
          height: size,
          color,
        }}
      />
    </div>
  );
};

export default Spinner;
