import Sidebar from "@/components/app/dashboard/dash-sidebar";
import DashNavBar from "@/components/app/dashboard/dash-nav-bar";
import styles from "@/styles/Dashboard.module.scss";
import { WorkspaceProvider } from "@/context/workspace-context";
import RouteGuard from "@/context/route-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <RouteGuard>
        <div className={styles.dashboard}>
          <div className={styles["dashboard-wrapper"]}>
            <Sidebar />
            <div className={styles["dashboard__content"]}>
              <DashNavBar />
              {children}
            </div>
          </div>
        </div>
      </RouteGuard>
    </WorkspaceProvider>
  );
}
