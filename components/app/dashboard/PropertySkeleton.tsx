// PropertySkeleton.tsx
import React from "react";
import styles from "@/styles/ui/PropertyInfoCard.module.scss";

const PropertySkeleton: React.FC = () => {
  return (
    <>
      {Array(3)
        .fill(null)
        .map((_, index) => (
          <div key={index}>
            <div className={styles.card}>
              <div className={styles["card-content"]}>
                {/* Skeleton for image */}
                <div className={styles["loading-skeleton-image"]}>
                  <div
                    className={`${styles["image-section"]} ${styles["skeleton"]}`}
                  />
                </div>
                {/* Skeleton for property details */}
                <div className={`${styles["info-section-skeleton"]}`}>
                  <div
                    className={`${styles["skeleton"]} ${styles["skeleton-title"]}`}
                  />
                  <div
                    className={`${styles["skeleton"]} ${styles["skeleton-address"]}`}
                  />
                  <div className={styles["property-details"]}>
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={index}
                        className={`${styles["skeleton"]} ${styles["skeleton-detail"]}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default PropertySkeleton;
