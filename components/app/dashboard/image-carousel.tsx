// image-carousel.tsx
import React, { useState, useRef } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import styles from "@/styles/ui/ImageCarousel.module.scss";
import { MdImageNotSupported } from "react-icons/md";
import type { Property } from "@/types/api";
import Image from "next/image";

const Carousel: React.FC<{ property: Property }> = ({ property }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);

  const images = Array.isArray(property.images)
    ? property.images
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((item) => item.image)
        .filter(Boolean)
    : [];
  const imageCount = images.length;

  const nextImage = () => {
    if (currentIndex < imageCount - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handlePrevClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    prevImage();
  };

  const handleNextClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    nextImage();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndRef.current = e.changedTouches[0].clientX;

    if (
      touchStartRef.current &&
      touchEndRef.current &&
      Math.abs(touchStartRef.current - touchEndRef.current) > 50
    ) {
      if (touchStartRef.current > touchEndRef.current) {
        nextImage();
      } else {
        prevImage();
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return (
      <div
        className={styles["carousel"]}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentIndex > 0 && (
          <button
            className={`${styles["carousel__button"]} ${styles["carousel__button--left"]}`}
            onClick={handlePrevClick}
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <FaArrowLeft />
          </button>
        )}
        <div className={styles["carousel__track"]}>
          {imageCount > 0 ? (
            images.map((src, index) => (
              <div
                key={index}
                className={`${styles["carousel__image-wrapper"]} ${
                  index === currentIndex
                    ? styles["carousel__image-wrapper--active"]
                    : ""
                }`}
                style={{
                  transform: `translateX(${-100 * currentIndex}%)`,
                }}
              >
                <Image
                  src={src}
                  width={500}
                  height={500}
                  alt={`Image ${index + 1}`}
                  className={styles["carousel__image"]}
                />
              </div>
            ))
          ) : (
            <div className={styles["carousel__placeholder-wrapper"]}>
              <MdImageNotSupported className={styles["placeholder__image"]} />
            </div>
          )}
        </div>
        {currentIndex < imageCount - 1 && (
          <button
            className={`${styles["carousel__button"]} ${styles["carousel__button--right"]}`}
            onClick={handleNextClick}
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            <FaArrowRight />
          </button>
        )}
        {/* <div
          className={styles["carousel__indicators"]}
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          {images.map((_, index) => (
            <span
              key={index}
              className={`${styles["carousel__indicator"]} ${
                index === currentIndex
                  ? styles["carousel__indicator--active"]
                  : ""
              }`}
            ></span>
          ))}
        </div> */}
      </div>
  );
};

export default Carousel;
