import React from "react";
import { Button } from "@/components/ui/button";
import styles from "@/styles/ui/TableFooter.module.scss";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

interface TableFooterProps {
  currentPageSize: number;
  totalRows: number;
  changeRowLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  page?: number;
  onPageSelect?: (page: number) => void;
  showPageSizeSelector?: boolean;
}

const TableFooter: React.FC<TableFooterProps> = ({
  currentPageSize,
  totalRows,
  changeRowLimit,
  nextPage,
  prevPage,
  page,
  onPageSelect,
  showPageSizeSelector = true,
}) => {
  // Calculate total pages (always at least 1)
  const totalPages = Math.max(1, Math.ceil(totalRows / currentPageSize));
  const isControlled = typeof page === "number";
  const [internalPage, setInternalPage] = React.useState(
    isControlled ? page : 1
  );
  const currentPage = isControlled ? (page as number) : internalPage;

  React.useEffect(() => {
    if (isControlled) {
      setInternalPage(page!);
    }
  }, [isControlled, page]);

  React.useEffect(() => {
    if (!isControlled) {
      setInternalPage((prev) => Math.min(prev, totalPages));
    }
  }, [isControlled, totalPages]);

  const handlePageSelect = (pageNumber: number) => {
    if (pageNumber === currentPage) return;
    if (onPageSelect) {
      onPageSelect(pageNumber);
    }
    if (!isControlled) {
      setInternalPage(pageNumber);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      nextPage();
      if (!isControlled) {
        setInternalPage((prev) => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      prevPage();
      if (!isControlled) {
        setInternalPage((prev) => prev - 1);
      }
    }
  };

  const paginationItems = React.useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, "ellipsis", totalPages] as const;
    }

    if (currentPage >= totalPages - 2) {
      return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as const;
    }

    return [1, "ellipsis", currentPage, "ellipsis", totalPages] as const;
  }, [currentPage, totalPages]);

  return (
    <div className={styles["table-footer"]}>
      {/* Left side — row info + selector */}
      <div className={styles["rows-info"]}>
        <span className={styles["row-count"]}>
          Showing <b>{(currentPage - 1) * currentPageSize + 1}</b> to{" "}
          <b>{Math.min(currentPage * currentPageSize, totalRows)}</b> of{" "}
          <b>{totalRows}</b> results
        </span>

        {showPageSizeSelector ? (
          <div className={styles["row-limit"]}>
            Show
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={styles["columns-toggle"]}>
                  {currentPageSize}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={styles["dropdown-menu-content"]}>
                {[8, 12, 24, 48].map((size) => (
                  <DropdownMenuCheckboxItem
                    key={size}
                    className={styles["dropdown-menu-item"]}
                    onCheckedChange={() => changeRowLimit(size)}
                    checked={currentPageSize === size}
                  >
                    {size}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            rows per page
          </div>
        ) : null}
      </div>

      {/* Right side — pagination */}
      <div className={styles["pagination"]}>
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`${styles["page-arrow"]} ${
            currentPage === 1 ? styles["disabled"] : ""
          }`}
        >
          <MdKeyboardArrowLeft size={16} />
        </button>

        <div className={styles["page-list"]}>
          {paginationItems.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className={styles["page-ellipsis"]}
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={item}
                onClick={() => handlePageSelect(item)}
                className={`${styles["page-number"]} ${
                  currentPage === item ? styles["active"] : ""
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`${styles["page-arrow"]} ${
            currentPage === totalPages ? styles["disabled"] : ""
          }`}
        >
          <MdKeyboardArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default TableFooter;
