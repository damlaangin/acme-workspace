import { LuLoaderCircle } from "react-icons/lu";
import styles from "@/styles/app/dashboard/DashboardLoading.module.scss";

const DashboardLoading = () => {
  return (
    <div className={styles["dashboard-loading"]}>
      <LuLoaderCircle className={`${styles["spinner"]} animate-spin`} />
      <p>Loading...</p>
    </div>
  );
};

export default DashboardLoading;
