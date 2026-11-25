// WSDropdownItem.tsx

import styles from "@/styles/ui/WSDropdownItem.module.scss";

interface WSDropdownItemProps {
  label: string;
  badge?: string;
  onClick?: () => void; // Optional onClick handler for items like Logout
}

const WSDropdownItem: React.FC<WSDropdownItemProps> = ({
  label,
  badge,
  onClick,
}) => {
  return (
    <li className={styles["option"]} onClick={onClick}>
      <div className={styles["option-text"]}>{label}</div>
      {badge && <span className={styles["badge-danger"]}>{badge}</span>}
    </li>
  );
};

export default WSDropdownItem;
