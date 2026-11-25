import styles from "@/styles/ui/PropertyInfoGrid.module.scss";

import type { Property } from "@/types/api";
import ImageCarousel from "@/components/app/dashboard/image-carousel";
import { Users } from "lucide-react";
import { LuBedDouble, LuBath, LuPlay } from "react-icons/lu";

const PropertiesInfoGrid = ({
  properties,
  onEdit,
  onResumeBot,
  resumingPropertyId,
}: {
  properties: Property[];
  onEdit: (property: Property) => void;
  onResumeBot: (property: Property) => void | Promise<void>;
  resumingPropertyId: number | null;
}) => {
  const isPropertyBotPaused = (pauseBotUntil?: string | null) => {
    if (!pauseBotUntil) return false;

    const pauseDate = new Date(pauseBotUntil);
    if (Number.isNaN(pauseDate.getTime())) {
      return false;
    }

    return pauseDate.getTime() > Date.now();
  };

  const handleActivate = (property: Property) => () => onEdit(property);

  const handleKeyDown =
    (property: Property) => (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onEdit(property);
      }
    };

  return (
    <div className={styles.grid}>
      {properties.map((property) => (
        <div
          key={property.id}
          className={styles.card}
          role="button"
          tabIndex={0}
          onClick={handleActivate(property)}
          onKeyDown={handleKeyDown(property)}
        >
          <div className={styles["image-section"]}>
            {isPropertyBotPaused(property.pause_bot_until) ? (
              <button
                type="button"
                className={styles["image-resume-button"]}
                onClick={(event) => {
                  event.stopPropagation();
                  void onResumeBot(property);
                }}
                disabled={resumingPropertyId === property.id}
              >
                <LuPlay className={styles["image-resume-icon"]} />
                {resumingPropertyId === property.id ? "Resuming..." : "Resume Bot"}
              </button>
            ) : null}
            <div className={styles["guest-badge"]} aria-label="Guest count">
              <Users className={styles["guest-icon"]} />
              <span>{property.guest_count ?? 0}</span>
            </div>
            <ImageCarousel property={property} />
          </div>
          <div className={styles["info-section"]}>
            <span className={styles.title}>
              {property.name ?? "Untitled Property"}
            </span>
            <div className={styles["meta-row"]}>
              <span className={styles["meta-item"]}>
                <LuBedDouble className={styles["meta-icon"]} />
                {property.room_count ?? 0} Bedrooms
              </span>
              <span className={styles["meta-item"]}>
                <LuBath className={styles["meta-icon"]} />
                {property.bathroom_count ?? 0} Bathrooms
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PropertiesInfoGrid;
