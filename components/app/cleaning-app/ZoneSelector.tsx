"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuChevronDown, LuMapPin, LuX } from "react-icons/lu";
import styles from "@/styles/app/cleaning-app/ZoneSelector.module.scss";
import { countriesService, Country } from "@/lib/services/countries.service";
import { statesService, State } from "@/lib/services/states.service";
import { citiesService, City } from "@/lib/services/cities.service";

export interface ZoneFilter {
  countryId?: number;
  stateId?: number;
  cityId?: number;
}

interface ZoneSelectorProps {
  className?: string;
  // Optional so consumers that only want the legacy label-only behavior
  // (e.g. operations page) keep working without changes.
  onApply?: (filter: ZoneFilter) => void;
}

type SearchSelectOption = {
  id: number;
  label: string;
};

type SearchSelectFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  options: SearchSelectOption[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (value: number | null) => void;
  disabled?: boolean;
};

function SearchSelectField({
  id,
  label,
  placeholder,
  options,
  query,
  onQueryChange,
  onSelect,
  disabled = false,
}: SearchSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(trimmed),
    );
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.filterGroup} ref={wrapperRef}>
      <label className={styles.filterLabel} htmlFor={id}>
        {label}
      </label>
      <div className={styles.searchSelect}>
        <input
          id={id}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            onQueryChange(nextValue);
            if (!nextValue.trim()) {
              onSelect(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className={styles.filterInput}
          disabled={disabled}
        />
        {isOpen && !disabled ? (
          <div className={styles.searchSelectMenu} role="listbox">
            {filteredOptions.length === 0 ? (
              <div className={styles.searchSelectEmpty}>No results</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.searchSelectOption}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(option.id);
                    onQueryChange(option.label);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        ) : null}
        <LuChevronDown className={styles.fieldChevron} aria-hidden="true" />
      </div>
    </div>
  );
}

const DEFAULT_LABEL = "All Zones";

export default function ZoneSelector({
  className = "",
  onApply,
}: ZoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<number | "">("");
  const [selectedStateId, setSelectedStateId] = useState<number | "">("");
  const [selectedCityId, setSelectedCityId] = useState<number | "">("");
  const [countryQuery, setCountryQuery] = useState("");
  const [stateQuery, setStateQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [label, setLabel] = useState(DEFAULT_LABEL);
  // Tracks the last-applied selection so a no-op Filter click skips the
  // onApply call — would otherwise hand the parent a fresh object reference
  // and re-trigger every dashboard fetch.
  const appliedRef = useRef<ZoneFilter>({});

  useEffect(() => {
    if (!isOpen || countries.length) return;
    let isMounted = true;

    const loadCountries = async () => {
      const response = await countriesService.getAllCountries();
      if (!isMounted) return;
      if (response.success && response.data) {
        setCountries(response.data);
      } else {
        setCountries([]);
      }
    };

    loadCountries();

    return () => {
      isMounted = false;
    };
  }, [isOpen, countries.length]);

  useEffect(() => {
    if (!selectedCountryId) {
      setStates([]);
      setSelectedStateId("");
      setCities([]);
      setSelectedCityId("");
      setStateQuery("");
      setCityQuery("");
      return;
    }
    let isMounted = true;

    const loadStates = async () => {
      const response = await statesService.getStatesByCountry(
        Number(selectedCountryId),
      );
      if (!isMounted) return;
      if (response.success && response.data) {
        setStates(response.data);
      } else {
        setStates([]);
      }
      setSelectedStateId("");
      setCities([]);
      setSelectedCityId("");
      setStateQuery("");
      setCityQuery("");
    };

    loadStates();

    return () => {
      isMounted = false;
    };
  }, [selectedCountryId]);

  useEffect(() => {
    if (!selectedStateId) {
      setCities([]);
      setSelectedCityId("");
      setCityQuery("");
      return;
    }
    let isMounted = true;

    const loadCities = async () => {
      const response = await citiesService.getCitiesByState(
        Number(selectedStateId),
      );
      if (!isMounted) return;
      if (response.success && response.data) {
        setCities(response.data);
      } else {
        setCities([]);
      }
      setSelectedCityId("");
      setCityQuery("");
    };

    loadCities();

    return () => {
      isMounted = false;
    };
  }, [selectedStateId]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === selectedCountryId) || null,
    [countries, selectedCountryId],
  );
  const selectedState = useMemo(
    () => states.find((state) => state.id === selectedStateId) || null,
    [states, selectedStateId],
  );
  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) || null,
    [cities, selectedCityId],
  );

  const handleApply = () => {
    if (selectedCity?.name) {
      setLabel(selectedCity.name);
    } else if (selectedState?.name) {
      setLabel(selectedState.name);
    } else if (selectedCountry?.name) {
      setLabel(selectedCountry.name);
    } else {
      setLabel(DEFAULT_LABEL);
    }
    const next: ZoneFilter = {
      countryId: selectedCountryId || undefined,
      stateId: selectedStateId || undefined,
      cityId: selectedCityId || undefined,
    };
    const prev = appliedRef.current;
    const unchanged =
      prev.countryId === next.countryId &&
      prev.stateId === next.stateId &&
      prev.cityId === next.cityId;
    if (!unchanged) {
      appliedRef.current = next;
      onApply?.(next);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedCountryId("");
    setSelectedStateId("");
    setSelectedCityId("");
    setCountryQuery("");
    setStateQuery("");
    setCityQuery("");
    setLabel(DEFAULT_LABEL);
    const prev = appliedRef.current;
    const alreadyEmpty =
      !prev.countryId && !prev.stateId && !prev.cityId;
    if (!alreadyEmpty) {
      appliedRef.current = {};
      onApply?.({});
    }
    setIsOpen(false);
  };

  const countryOptions = useMemo(
    () => countries.map((country) => ({ id: country.id, label: country.name })),
    [countries],
  );
  const stateOptions = useMemo(
    () => states.map((state) => ({ id: state.id, label: state.name })),
    [states],
  );
  const cityOptions = useMemo(
    () => cities.map((city) => ({ id: city.id, label: city.name })),
    [cities],
  );

  return (
    <>
      <button
        type="button"
        className={`${styles.selector} ${className}`}
        onClick={() => setIsOpen(true)}
        aria-label="Zone selector"
      >
        <LuMapPin className={styles.icon} aria-hidden="true" />
        <span className={styles.label}>{label}</span>
      </button>

      {isOpen ? (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsOpen(false)}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Zone filter"
          >
            <div className={styles.modalHeader}>
              <div>
                <h3>Filter Zones</h3>
                <p>Select country, state, and city</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <LuX aria-hidden="true" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <SearchSelectField
                id="zone-country"
                label="Country"
                placeholder="Select a country"
                options={countryOptions}
                query={countryQuery}
                onQueryChange={setCountryQuery}
                onSelect={(value) => {
                  setSelectedCountryId(value ?? "");
                  const match = countryOptions.find((option) => option.id === value);
                  setCountryQuery(match?.label ?? "");
                }}
              />

              <SearchSelectField
                id="zone-state"
                label="State"
                placeholder="Select a state"
                options={stateOptions}
                query={stateQuery}
                onQueryChange={setStateQuery}
                onSelect={(value) => {
                  setSelectedStateId(value ?? "");
                  const match = stateOptions.find((option) => option.id === value);
                  setStateQuery(match?.label ?? "");
                }}
                disabled={!selectedCountryId}
              />

              <SearchSelectField
                id="zone-city"
                label="City"
                placeholder="Select a city"
                options={cityOptions}
                query={cityQuery}
                onQueryChange={setCityQuery}
                onSelect={(value) => {
                  setSelectedCityId(value ?? "");
                  const match = cityOptions.find((option) => option.id === value);
                  setCityQuery(match?.label ?? "");
                }}
                disabled={!selectedStateId}
              />
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="button"
                className={styles.applyButton}
                onClick={handleApply}
              >
                Filter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
