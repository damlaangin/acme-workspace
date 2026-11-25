// app/dashboard/properties/page.tsx

import styles from "@/styles/app/dashboard/Properties.module.scss";
import PropertiesContent from "@/app/dashboard/properties/PropertiesContent";

export const metadata = {
  title: "Property Info",
  description: "Acme App Dashboard",
};

export default function Home() {
  return (
    <div className={styles["properties_content"]}>
      <PropertiesContent />
    </div>
  );
}
