"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { propertiesService } from "@/lib/services/properties.service";
import type { Property } from "@/types/api";
import { useWorkspace } from "@/context/workspace-context";
import styles from "@/styles/ui/PropertiesContent.module.scss";
import { countriesService } from "@/lib/services/countries.service";
import { statesService } from "@/lib/services/states.service";
import { citiesService } from "@/lib/services/cities.service";
import type { Country, State, City } from "@/types/location";

import PropertiesInfoGrid from "@/components/app/dashboard/property-info-grid";
import PropertyInfoCard from "@/components/app/dashboard/property-info-card";
import PropertySkeleton from "@/components/app/dashboard/PropertySkeleton";
import PropertyCreateDialog from "@/components/app/dashboard/property-create-dialog";
import TableFooter from "@/components/app/dashboard/table-footer";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";

import { MdAddHome } from "react-icons/md";
import { FiFilter } from "react-icons/fi";

const PropertiesContent: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const searchParams = useSearchParams();

  const defaultViewType = "grid";
  const defaultSelectedGroups = ["Luxury"];
  const [isLoading, setIsLoading] = useState(false);
  const [propertiesData, setPropertiesData] = useState<Property[]>([]);
  const [totalProperties, setTotalProperties] = useState(0);
  const [viewType, setViewType] = useState(defaultViewType);
  const [searchValue, setSearchValue] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [rowLimit, setRowLimit] = useState(8);
  const [curPage, setCurPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editingProperty, setEditingProperty] =
    useState<Property | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [resumingPropertyId, setResumingPropertyId] = useState<number | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    defaultSelectedGroups
  );
  const [draftViewType, setDraftViewType] = useState(defaultViewType);
  const [draftSelectedGroups, setDraftSelectedGroups] = useState<string[]>(
    defaultSelectedGroups
  );
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);


  const defaultFilters = {
    bathroom_count: "",
    bed_count: "",
    guest_count: "",
    room_count: "",
    bot_status: "",
    country: "",
    state: "",
    city: "",
    owner: "",
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const handleRowLimitChange = (limit: number) => {
    setRowLimit(limit);
    setCurPage(1);
  };

  const nextPage = () => setCurPage((prev) => prev + 1);
  const prevPage = () => setCurPage((prev) => Math.max(prev - 1, 1));

  const isPropertyBotPaused = (pauseBotUntil?: string | null) => {
    if (!pauseBotUntil) return false;

    const pauseDate = new Date(pauseBotUntil);
    if (Number.isNaN(pauseDate.getTime())) {
      return false;
    }

    return pauseDate.getTime() > Date.now();
  };

  const fetchProperties = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      const parseNumber = (value: string) => {
        if (!value) return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      const bathroomCount = parseNumber(filters.bathroom_count);
      const bedCount = parseNumber(filters.bed_count);
      const guestCount = parseNumber(filters.guest_count);
      const roomCount = parseNumber(filters.room_count);
      const ownerId = parseNumber(filters.owner);
      const countryId = parseNumber(filters.country);
      const stateId = parseNumber(filters.state);
      const cityId = parseNumber(filters.city);
      const shouldFilterBotStatus =
        filters.bot_status === "paused" || filters.bot_status === "active";
      const requestPage = shouldFilterBotStatus ? 1 : curPage;
      const requestPageSize = shouldFilterBotStatus ? 500 : rowLimit;

      const response = await propertiesService.getProperties(
        currentWorkspace.id,
        {
          page: requestPage,
          page_size: requestPageSize,
          name: searchValue || undefined,
          bathroom_count_gte: bathroomCount,
          bathroom_count_lte: bathroomCount,
          bed_count_gte: bedCount,
          bed_count_lte: bedCount,
          guest_count_gte: guestCount,
          guest_count_lte: guestCount,
          room_count_gte: roomCount,
          room_count_lte: roomCount,
          owner_id: ownerId,
          country: countryId,
          state: stateId,
          city: cityId,
        }
      );

      if (response.success && response.data) {
        const results = response.data.results ?? [];
        const botFilteredResults = shouldFilterBotStatus
          ? results.filter((property) =>
              filters.bot_status === "paused"
                ? isPropertyBotPaused(property.pause_bot_until)
                : !isPropertyBotPaused(property.pause_bot_until)
            )
          : results;

        const paginatedResults = shouldFilterBotStatus
          ? botFilteredResults.slice(
              (curPage - 1) * rowLimit,
              (curPage - 1) * rowLimit + rowLimit
            )
          : botFilteredResults;

        setPropertiesData(paginatedResults);
        setTotalProperties(
          shouldFilterBotStatus
            ? botFilteredResults.length
            : (response.data.count ?? 0)
        );
      } else {
        setPropertiesData([]);
        setTotalProperties(0);
        console.error(
          "Failed to fetch properties:",
          response.error?.message ?? "Unknown error"
        );
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, searchValue, curPage, rowLimit, filters]);

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isFilterOpen]);

  // Handle search parameter from URL (e.g., from conversations page)
  useEffect(() => {
    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      setSearchValue(searchQuery);
      setSearchInputValue(searchQuery);
      setCurPage(1);
    }
  }, [searchParams]);

  const handleSearchInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setSearchInputValue(value);

    if (value === "") {
      setSearchValue("");
      setCurPage(1);
    }
  };

  const handleSearchInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key !== "Enter") return;
    setSearchValue(searchInputValue.trim());
    setCurPage(1);
  };

  useEffect(() => {
    const loadCountries = async () => {
      const response = await countriesService.getAllCountries();
      if (response.success && response.data) {
        setCountries(response.data);
      }
    };
    loadCountries();
  }, []);

  useEffect(() => {
    const countryId = Number(draftFilters.country);
    if (!countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    const loadStates = async () => {
      const response = await statesService.getStatesByCountry(countryId);
      if (response.success && response.data) {
        setStates(response.data);
      }
    };
    loadStates();
  }, [draftFilters.country]);

  useEffect(() => {
    const stateId = Number(draftFilters.state);
    if (!stateId) {
      setCities([]);
      return;
    }
    const loadCities = async () => {
      const response = await citiesService.getCitiesByState(stateId);
      if (response.success && response.data) {
        setCities(response.data);
      }
    };
    loadCities();
  }, [draftFilters.state]);

  const toggleGroup = (group: string) => {
    setDraftSelectedGroups((prev) =>
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group]
    );
  };

  const ownerOptions = useMemo(() => {
    const map = new Map<number, string>();
    propertiesData.forEach((property) => {
      const owner = property.owner;
      if (!owner?.id) return;
      const name = [owner.user?.first_name, owner.user?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      map.set(owner.id, name || `Owner ${owner.id}`);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [propertiesData]);

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setViewType(draftViewType);
    setSelectedGroups(draftSelectedGroups);
    setCurPage(1);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setDraftFilters(defaultFilters);
    setDraftViewType(defaultViewType);
    setDraftSelectedGroups(defaultSelectedGroups);
    setStates([]);
    setCities([]);
  };

  const handleResumePropertyBot = async (property: Property) => {
    if (!currentWorkspace || resumingPropertyId === property.id) return;

    setResumingPropertyId(property.id);
    try {
      const response = await propertiesService.resumeChatBot(
        currentWorkspace.id,
        property.id
      );

      if (response.success) {
        setPropertiesData((prev) =>
          prev.map((item) =>
            item.id === property.id
              ? {
                  ...item,
                  ...(response.data ?? {}),
                  pause_bot_until: null,
                }
              : item
          )
        );
      } else {
        console.error(
          "Failed to resume property bot:",
          response.error?.message ?? response.error
        );
      }
    } catch (error) {
      console.error("Failed to resume property bot:", error);
    } finally {
      setResumingPropertyId(null);
    }
  };

  return (
    <>
      <section className={styles.properties__greeting}>
        <div className={styles["properties__header-top"]}>
          <PageGreeting
            className={styles["properties__header-text"]}
            title="Property Management"
          />
          <div className={styles["filters-header-right"]}>
            <div className={styles["search-bar-wrapper"]}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search properties..."
                value={searchInputValue}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchInputKeyDown}
                className={styles["filter-bar__input"]}
              />
            </div>
            <button
              className={`${styles["filter-button"]} ${
                isFilterOpen ? styles["is-open"] : ""
              }`}
              type="button"
              onClick={() => {
                setDraftFilters(filters);
                setDraftViewType(viewType);
                setDraftSelectedGroups(selectedGroups);
                setIsFilterOpen(true);
              }}
            >
              <FiFilter />
              Filter
            </button>
            <button
              className={styles["add-property-button"]}
              onClick={() => {
                setEditingProperty(null);
                setShowCreateDialog(true);
              }}
              type="button"
            >
              <MdAddHome className={styles["add-property-icon"]} />
              Add New
            </button>
          </div>
        </div>
      </section>

      <div className={styles["properties-content"]}>
        {isLoading ? (
          <PropertySkeleton />
        ) : (
          <>
            {propertiesData.length === 0 ? (
              <EmptyLook label="properties" />
            ) : viewType === "grid" ? (
              <PropertiesInfoGrid
                properties={propertiesData}
                onEdit={(property) => setEditingProperty(property)}
                onResumeBot={handleResumePropertyBot}
                resumingPropertyId={resumingPropertyId}
              />
            ) : (
              <PropertyInfoCard
                properties={propertiesData}
                onEdit={(property) => setEditingProperty(property)}
                onResumeBot={handleResumePropertyBot}
                resumingPropertyId={resumingPropertyId}
              />
            )}
          </>
        )}

        <TableFooter
          currentPageSize={rowLimit}
          totalRows={totalProperties}
          changeRowLimit={handleRowLimitChange}
          nextPage={nextPage}
          prevPage={prevPage}
          page={curPage}
          onPageSelect={(page) => setCurPage(page)}
        />
      </div>

      {isFilterOpen && (
        <div
          className={styles["filter-modal-overlay"]}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsFilterOpen(false);
            }
          }}
        >
          <div className={styles["filter-modal"]}>
            <div className={styles["filter-dropdown__header"]}>
              <h4>Filter Properties</h4>
              <button
                className={styles["filter-dropdown__close"]}
                type="button"
                onClick={() => setIsFilterOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles["filter-dropdown__body"]}>
              <div className={styles["filter-dropdown__group"]}>
                <div className={styles["filter-dropdown__view-switcher"]}>
                  <div className={styles["view-switcher"]}>
                    <button
                      className={`${styles["switch-button"]} ${
                        draftViewType === "grid"
                          ? styles["switch-button--active"]
                          : ""
                      }`}
                      onClick={() => setDraftViewType("grid")}
                      type="button"
                    >
                      Card View
                    </button>
                    <button
                      className={`${styles["switch-button"]} ${
                        draftViewType === "list"
                          ? styles["switch-button--active"]
                          : ""
                      }`}
                      onClick={() => setDraftViewType("list")}
                      type="button"
                    >
                      Table View
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles["filter-dropdown__group"]}>
                <div className={styles["filter-dropdown__section-head"]}>
                  <span>Bot Status</span>
                </div>
                <div className={styles["filter-dropdown__chips"]}>
                  {[
                    { label: "All Properties", value: "" },
                    { label: "Bot Paused", value: "paused" },
                    { label: "Bot Active", value: "active" },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className={
                        draftFilters.bot_status === option.value
                          ? styles["is-active"]
                          : ""
                      }
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          bot_status: option.value,
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles["filter-dropdown__group"]}>
                <div className={styles["filter-dropdown__chips"]}>
                  {["Luxury", "Urban", "Beach", "Rural"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={
                        draftSelectedGroups.includes(chip)
                          ? styles["is-active"]
                          : ""
                      }
                      onClick={() => toggleGroup(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles["filter-dropdown__group"]}>
                <div className={styles["filter-dropdown__grid"]}>
                  <label className={styles["filter-dropdown__field"]}>
                    Bathrooms
                    <input
                      type="number"
                      min="0"
                      value={draftFilters.bathroom_count}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          bathroom_count: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles["filter-dropdown__field"]}>
                    Beds
                    <input
                      type="number"
                      min="0"
                      value={draftFilters.bed_count}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          bed_count: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles["filter-dropdown__field"]}>
                    Guests
                    <input
                      type="number"
                      min="0"
                      value={draftFilters.guest_count}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          guest_count: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles["filter-dropdown__field"]}>
                    Rooms
                    <input
                      type="number"
                      min="0"
                      value={draftFilters.room_count}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          room_count: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className={styles["filter-dropdown__group"]}>
                <div className={styles["filter-dropdown__stack"]}>
                  <label className={styles["filter-dropdown__field"]}>
                    Country
                    <select
                      value={draftFilters.country}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          country: event.target.value,
                          state: "",
                          city: "",
                        }))
                      }
                    >
                      <option value="">All Countries</option>
                      {countries.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles["filter-dropdown__field"]}>
                    State
                    <select
                      value={draftFilters.state}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          state: event.target.value,
                          city: "",
                        }))
                      }
                    >
                      <option value="">All States</option>
                      {states.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles["filter-dropdown__field"]}>
                    City
                    <select
                      value={draftFilters.city}
                      onChange={(event) =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          city: event.target.value,
                        }))
                      }
                    >
                      <option value="">All Cities</option>
                      {cities.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className={styles["filter-dropdown__group"]}>
                <label className={styles["filter-dropdown__field"]}>
                  Owner
                  <select
                    value={draftFilters.owner}
                    onChange={(event) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        owner: event.target.value,
                      }))
                    }
                  >
                    <option value="">All Owners</option>
                    {ownerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={styles["filter-dropdown__footer"]}>
              <button type="button" onClick={handleResetFilters}>
                Clear All
              </button>
              <button
                type="button"
                className={styles["is-primary"]}
                onClick={handleApplyFilters}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Creation Modal */}
      {showCreateDialog && (
        <PropertyCreateDialog
          onClose={(success) => {
            setShowCreateDialog(false);
            if (success) fetchProperties();
          }}
        />
      )}

      {editingProperty && (
        <PropertyCreateDialog
          property={editingProperty}
          onClose={(success) => {
            setEditingProperty(null);
            if (success) fetchProperties();
          }}
        />
      )}
    </>
  );
};

export default PropertiesContent;
