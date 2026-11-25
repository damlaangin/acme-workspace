// property-info-card.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Bed, Bath, Users } from "lucide-react";
import { MdImageNotSupported } from "react-icons/md";
import { LuPlay } from "react-icons/lu";
import styles from "@/styles/ui/PropertyInfoCard.module.scss";
import type { Property } from "@/types/api";
import Image from "next/image";

const PropertyInfoCard: React.FC<{
  properties: Property[];
  onEdit: (property: Property) => void;
  onResumeBot: (property: Property) => void | Promise<void>;
  resumingPropertyId: number | null;
}> = ({ properties, onEdit, onResumeBot, resumingPropertyId }) => {
  const isPropertyBotPaused = (pauseBotUntil?: string | null) => {
    if (!pauseBotUntil) return false;

    const pauseDate = new Date(pauseBotUntil);
    if (Number.isNaN(pauseDate.getTime())) {
      return false;
    }

    return pauseDate.getTime() > Date.now();
  };

  const formatAddress = (address: Property["address"]) => {
    if (!address) return "";
    if (typeof address === "string") return address;

    const city =
      typeof address.city === "string"
        ? address.city
        : typeof address.city === "object"
          ? address.city?.name ?? ""
          : "";
    const state =
      typeof address.state === "string"
        ? address.state
        : typeof address.state === "object"
          ? address.state?.name ?? ""
          : "";
    const country =
      typeof address.country === "string"
        ? address.country
        : typeof address.country === "object"
          ? address.country?.name ?? ""
          : "";

    return [
      address.address_line_1,
      address.address_line_2,
      city,
      state,
      country,
      address.postal_code,
    ]
      .filter(Boolean)
      .join(", ");
  };

  return (
    <>
      <div className={styles["properties-list"]}>
        {properties.map((property) => (
          <Card
            key={property.id}
            className={styles.card}
            onClick={() => onEdit(property)}
          >
            <CardContent className={styles["card-content"]} style={{ padding: 0 }}>
              {property.images?.length ? (
                <div className={styles["image-section"]}>
                  <Image
                    src={property.images[0]?.image ?? ""}
                    alt={property.name ?? "Property image"}
                    width={500}
                    height={500}
                    className={styles["carousel__image"]}
                  />
                </div>
              ) : (
                <div className={styles["image-section"]}>
                  <MdImageNotSupported
                    className={styles["placeholder__image"]}
                  />
                </div>
              )}

              {/* Property Info */}
              <div className={styles["info-section"]}>
                <div className={styles["property-info"]}>
                  <div className={styles["property-info--text"]}>
                    <span className={styles["property-title"]}>
                      {property.name ?? "Untitled Property"}
                    </span>

                    <div className={styles["property-address"]}>
                      {formatAddress(property.address)}
                    </div>
                  </div>
                </div>
                {property.is_active !== undefined && (
                  <div className={styles["property-tag-container"]}>
                    <span className={styles["property-tag"]}>
                      {property.is_active ? "Active" : "Inactive"}
                    </span>
                    {isPropertyBotPaused(property.pause_bot_until) ? (
                      <button
                        type="button"
                        className={styles["property-resume-btn"]}
                        onClick={(event) => {
                          event.stopPropagation();
                          void onResumeBot(property);
                        }}
                        disabled={resumingPropertyId === property.id}
                      >
                        <LuPlay className={styles["property-resume-icon"]} />
                        {resumingPropertyId === property.id ? "Resuming..." : "Resume Bot"}
                      </button>
                    ) : null}
                  </div>
                )}

                <div className={styles["property-details"]}>
                  <div className={styles["detail-item"]}>
                    <Bed className={styles["detail-icon"]} />
                    <span>{property.room_count ?? 0}</span>
                  </div>
                  <div className={styles["detail-item"]}>
                    <Bath className={styles["detail-icon"]} />
                    <span>{property.bathroom_count ?? 0}</span>
                  </div>
                  <div className={styles["detail-item"]}>
                    <Users className={styles["detail-icon"]} />
                    <span>{property.guest_count ?? 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </>
  );
};

export default PropertyInfoCard;
