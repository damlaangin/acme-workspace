"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, isValid, parse, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter, Plus } from "lucide-react";
import { LuCopy, LuEye, LuEyeClosed } from "react-icons/lu";
import { MdDeleteOutline, MdOutlineEdit } from "react-icons/md";
import { countriesService } from "@/lib/services/countries.service";
import {
  reservationsService,
  type ReservationCreateUpdatePayload,
  type ReservationPartialUpdatePayload,
} from "@/lib/services/reservations.service";
import { workspaceService } from "@/lib/services/workspace.service";
import { propertiesService } from "@/lib/services/properties.service";
import type { Reservation } from "@/types/api";
import type { Property, WorkspaceUser } from "@/types/api";
import type { Country } from "@/types/location";
import { useWorkspace } from "@/context/workspace-context";
import { useAuth } from "@/context/auth-context";
import TableFooter from "@/components/app/dashboard/table-footer";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import styles from "@/styles/app/dashboard/Bookings.module.scss";
import tableStyles from "@/styles/ui/Table.module.scss";

const PAGE_SIZE_OPTIONS = [8, 12, 24, 48] as const;
const DEFAULT_ROW_LIMIT: number = PAGE_SIZE_OPTIONS[0];
const DATE_INPUT_FORMAT = "dd.MM.yyyy";
const API_DATE_FORMAT = "yyyy-MM-dd";
type SortField = "checkin" | "checkout" | "createdDate";
type SortDirection = "asc" | "desc";

const ORDERING_BY_FIELD: Record<SortField, string> = {
  checkin: "checkin_date",
  checkout: "checkout_date",
  createdDate: "payment__created_at",
};
type StatusView = "completed" | "cancelled" | "all";
type ColumnKey =
  | "country"
  | "created_date"
  | "nightly_fee"
  | "total_room_fee"
  | "night_rate_adjustment"
  | "cleaning_fee"
  | "guest_service_fee"
  | "host_service_fee"
  | "host_earning"
  | "workspace_earning"
  | "net_payout";

const PAYMENT_COLUMN_ORDER: ColumnKey[] = [
  "nightly_fee",
  "total_room_fee",
  "night_rate_adjustment",
  "cleaning_fee",
  "guest_service_fee",
  "host_service_fee",
  "host_earning",
  "workspace_earning",
  "net_payout",
];

const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: "country", label: "Country" },
  { key: "created_date", label: "Created Date" },
  { key: "nightly_fee", label: "Nightly fee" },
  { key: "total_room_fee", label: "Total room fee" },
  { key: "night_rate_adjustment", label: "Night rate adjustment" },
  { key: "cleaning_fee", label: "Cleaning fee" },
  { key: "guest_service_fee", label: "Guest service fee" },
  { key: "host_service_fee", label: "Airbnb service fee" },
  { key: "host_earning", label: "Host earning" },
  { key: "workspace_earning", label: "Workspace earning" },
  { key: "net_payout", label: "Net payout" },
];

const STATUS_VIEW_OPTIONS: { label: string; value: StatusView }[] = [
  { label: "Confirmed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
];

const DEFAULT_HIDDEN_COLUMNS = new Set<ColumnKey>([
  "host_service_fee",
  "guest_service_fee",
  "night_rate_adjustment",
  "country",
]);

type BookingFilters = {
  country: string;
  reservationCode: string;
  checkinDate: string;
  checkoutDate: string;
  ownerId: number | null;
  propertyId: number | null;
  paymentCreatedAtFrom: string;
  paymentCreatedAtTo: string;
};

type ReservationModalMode = "edit" | "add";

type ReservationFormDraft = {
  reservation_code: string;
  guest_name: string;
  countryId: number | null;
  propertyId: number | null;
  checkin_date: string;
  checkout_date: string;
  night_count: number;
  adult_guest_count: number;
  child_guest_count: number;
  baby_guest_count: number;
  pet_count: number;
  total_room_fee: string;
  total_room_fee_currency?: Reservation["payment"]["currency"];
  special_requests: string;
};

const formatDisplayDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
};

const formatDisplayDateTime = (
  value: string | number | Date | null | undefined
) => {
  if (!value) return "—";

  const parsedDate =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : parseISO(value);

  if (!isValid(parsedDate)) return "—";
  return format(parsedDate, "dd-MM-yyyy");
};

const formatMoney = (
  amount: string | number | null | undefined,
  currency: { code?: string; symbol?: string } | undefined
) => {
  if (amount === undefined || amount === null) return "—";
  const code = currency?.code;
  const symbol = currency?.symbol;
  const asNumber = typeof amount === "number" ? amount : Number(amount);

  if (Number.isFinite(asNumber)) {
    const formattedNumber = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(asNumber);

    if (symbol) {
      return `${symbol}${formattedNumber}`;
    }

    if (code) {
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: code,
        }).format(asNumber);
      } catch (error) {
        console.warn("Failed to format currency value.", { error, code, amount });
      }
    }
  }

  const textAmount = String(amount);
  if (symbol) return `${symbol}${textAmount}`;
  if (code) return `${textAmount} ${code}`;
  return textAmount;
};

type DatePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function DatePickerField({
  id,
  label,
  value,
  onChange,
}: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isInteractingWithCalendar = useRef(false);

  const selectedDate = value ? parseISO(value) : undefined;
  const formattedValue =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, DATE_INPUT_FORMAT)
      : "";

  useEffect(() => {
    setInputValue(formattedValue);
  }, [formattedValue]);

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

  const commitInputValue = () => {
    if (isInteractingWithCalendar.current) return;

    const trimmed = inputValue.trim();
    if (!trimmed) {
      onChange("");
      return;
    }

    const parsed = parse(trimmed, DATE_INPUT_FORMAT, new Date());
    if (isValid(parsed) && format(parsed, DATE_INPUT_FORMAT) === trimmed) {
      onChange(format(parsed, API_DATE_FORMAT));
      return;
    }

    setInputValue(formattedValue);
  };

  return (
    <div className={styles.filterGroup} ref={wrapperRef}>
      <label className={styles.filterLabel} htmlFor={id}>
        {label}
      </label>
      <div className={styles.datePicker}>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="dd.mm.yyyy"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={commitInputValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitInputValue();
              setIsOpen(false);
            }
            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className={styles.filterInput}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        />
        {isOpen && (
          <div
            className={styles.datePickerPopover}
            role="dialog"
            aria-label={`${label} calendar`}
            onMouseDown={() => {
              isInteractingWithCalendar.current = true;
            }}
            onMouseUp={() => {
              isInteractingWithCalendar.current = false;
            }}
          >
            <div className={styles.datePickerActions}>
              <button
                type="button"
                className={styles.datePickerClear}
                onClick={() => {
                  onChange("");
                  setInputValue("");
                  setIsOpen(false);
                }}
              >
                Clear
              </button>
            </div>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) return;
                onChange(format(date, API_DATE_FORMAT));
                setIsOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type SearchSelectOption = {
  id: number | string;
  label: string;
};

type SearchSelectFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  options: SearchSelectOption[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (value: number | string | null) => void;
};

function SearchSelectField({
  id,
  label,
  placeholder,
  options,
  query,
  onQueryChange,
  onSelect,
}: SearchSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(trimmed)
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
        <Input
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
        />
        {isOpen && (
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
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [totalReservations, setTotalReservations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [owners, setOwners] = useState<WorkspaceUser[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [countryQuery, setCountryQuery] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [propertyQuery, setPropertyQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("checkin");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [curPage, setCurPage] = useState(1);
  const [rowLimit, setRowLimit] = useState<number>(DEFAULT_ROW_LIMIT);
  const [searchValue, setSearchValue] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationModalMode, setReservationModalMode] =
    useState<ReservationModalMode>("edit");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservationDraft, setReservationDraft] = useState<ReservationFormDraft | null>(null);
  const [isSavingReservation, setIsSavingReservation] = useState(false);
  const [reservationSaveError, setReservationSaveError] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
  const [filters, setFilters] = useState<BookingFilters>({
    country: "",
    reservationCode: "",
    checkinDate: "",
    checkoutDate: "",
    ownerId: null,
    propertyId: null,
    paymentCreatedAtFrom: "",
    paymentCreatedAtTo: "",
  });
  const [draftFilters, setDraftFilters] = useState<BookingFilters>(filters);
  const [statusView, setStatusView] = useState<StatusView>("completed");
  const [draftStatusView, setDraftStatusView] = useState<StatusView>(statusView);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(
    new Set(DEFAULT_HIDDEN_COLUMNS)
  );

  const ownerHiddenColumns = useMemo(() => {
    if (user?.userType !== "property_owner") return new Set<ColumnKey>();
    const hiddenKeys = currentWorkspace?.owner_hidden_fields?.payment ?? [];
    const columnKeySet = new Set(COLUMN_OPTIONS.map((option) => option.key));
    return new Set(
      hiddenKeys.filter((key): key is ColumnKey => columnKeySet.has(key as ColumnKey))
    );
  }, [currentWorkspace?.owner_hidden_fields, user?.userType]);

  const isColumnHidden = (key: ColumnKey) =>
    hiddenColumns.has(key) || ownerHiddenColumns.has(key);
  const visiblePaymentColumnCount = PAYMENT_COLUMN_ORDER.filter(
    (key) => !isColumnHidden(key)
  ).length;
  const tableColumnCount =
    7 +
    (isColumnHidden("country") ? 0 : 1) +
    (isColumnHidden("created_date") ? 0 : 1) +
    visiblePaymentColumnCount;
  const visibleReservations = useMemo(
    () =>
      reservations.filter(
        (reservation) => reservation.reservation_status !== "blocked"
      ),
    [reservations]
  );

  const getOwnerLabel = (owner: WorkspaceUser) => {
    const { user } = owner;
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    if (fullName && user.email) return `${fullName} (${user.email})`;
    if (fullName) return fullName;
    return user.email || user.username || String(owner.id);
  };

  const getOwnerLabelById = (ownerId: number | null) => {
    if (!ownerId) return "";
    const owner = owners.find((item) => item.id === ownerId);
    return owner ? getOwnerLabel(owner) : "";
  };

  const getPropertyLabelById = (propertyId: number | null) => {
    if (!propertyId) return "";
    const property = properties.find((item) => item.id === propertyId);
    return property ? property.name : "";
  };

  const getCountryLabelByValue = (countryValue: string) => {
    if (!countryValue) return "";
    const country =
      countries.find((item) => item.iso3 === countryValue) ||
      countries.find((item) => item.name === countryValue);
    return country ? country.name : "";
  };

  const ownerOptions = useMemo(
    () =>
      owners.map((owner) => ({
        id: owner.id,
        label: getOwnerLabel(owner),
      })),
    [owners]
  );

  const propertyOptions = useMemo(
    () =>
      properties.map((property) => ({
        id: property.id,
        label: property.name,
      })),
    [properties]
  );

  const countryOptions = useMemo(
    () =>
      countries.map((country) => ({
        id: country.iso3,
        label: country.name,
      })),
    [countries]
  );

  const getCountryIdByReservationCountry = (countryValue: string) => {
    if (!countryValue) return null;
    const normalizedValue = countryValue.trim().toLowerCase();
    const country = countries.find((item) => {
      return (
        item.name.toLowerCase() === normalizedValue ||
        item.iso3.toLowerCase() === normalizedValue ||
        item.iso2.toLowerCase() === normalizedValue
      );
    });

    return country?.id ?? null;
  };

  const createEmptyReservationDraft = (): ReservationFormDraft => ({
    reservation_code: "",
    guest_name: "",
    countryId: null,
    propertyId: null,
    checkin_date: "",
    checkout_date: "",
    night_count: 0,
    adult_guest_count: 1,
    child_guest_count: 0,
    baby_guest_count: 0,
    pet_count: 0,
    total_room_fee: "",
    total_room_fee_currency: undefined,
    special_requests: "",
  });

  const createReservationDraft = (
    reservation: Reservation
  ): ReservationFormDraft => ({
    reservation_code: reservation.reservation_code ?? "",
    guest_name: reservation.guest_name ?? "",
    countryId: getCountryIdByReservationCountry(reservation.country_name),
    propertyId: reservation.property?.id ?? null,
    checkin_date: reservation.checkin_date ?? "",
    checkout_date: reservation.checkout_date ?? "",
    night_count: reservation.night_count ?? 0,
    adult_guest_count: reservation.adult_guest_count ?? 0,
    child_guest_count: reservation.child_guest_count ?? 0,
    baby_guest_count: reservation.baby_guest_count ?? 0,
    pet_count: reservation.pet_count ?? 0,
    total_room_fee: String(reservation.payment?.total_room_fee ?? ""),
    total_room_fee_currency: reservation.payment?.currency,
    special_requests: "",
  });

  const buildReservationPayload = (
    draft: ReservationFormDraft
  ): ReservationCreateUpdatePayload | null => {
    const guestName = draft.guest_name.trim();

    if (
      !guestName ||
      !draft.propertyId ||
      !draft.checkin_date ||
      !draft.checkout_date
    ) {
      return null;
    }

    const specialRequests = draft.special_requests
      .split("\n")
      .map((request) => request.trim())
      .filter(Boolean);

    return {
      reservation_code: draft.reservation_code.trim() || null,
      guest_name: guestName,
      country: draft.countryId,
      property: draft.propertyId,
      checkin_date: draft.checkin_date,
      checkout_date: draft.checkout_date,
      night_count: Math.max(0, draft.night_count),
      adult_guest_count: Math.max(0, draft.adult_guest_count),
      child_guest_count: Math.max(0, draft.child_guest_count),
      baby_guest_count: Math.max(0, draft.baby_guest_count),
      pet_count: Math.max(0, draft.pet_count),
      ...(specialRequests.length > 0 ? { special_requests: specialRequests } : {}),
    };
  };

  const activeFilters = useMemo(
    () => ({
      country_name: filters.country || undefined,
      reservation_code: filters.reservationCode || undefined,
      checkin_date: filters.checkinDate || undefined,
      checkout_date: filters.checkoutDate || undefined,
      owner_id: filters.ownerId || undefined,
      property_id: filters.propertyId || undefined,
      payment_created_at_gte: filters.paymentCreatedAtFrom || undefined,
      payment_created_at_lte: filters.paymentCreatedAtTo || undefined,
      reservation_status: statusView === "all" ? undefined : statusView,
      ordering: `${sortDirection === "desc" ? "-" : ""}${ORDERING_BY_FIELD[sortField]}`,
    }),
    [filters, sortField, sortDirection, statusView]
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((value) => {
      if (value === null) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true;
    }).length;
  }, [filters]);

  const fetchReservations = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await reservationsService.getReservations(
        currentWorkspace.id,
        {
          page: curPage,
          page_size: rowLimit,
          guest_name: searchValue || undefined,
          ...activeFilters,
        }
      );

      if (response.success && response.data) {
        setReservations(response.data.results ?? []);
        setTotalReservations(response.data.count ?? 0);
      } else {
        setReservations([]);
        setTotalReservations(0);
        setError(response.error?.message ?? "Failed to load reservations.");
      }
    } catch (fetchError) {
      console.error(fetchError);
      setReservations([]);
      setTotalReservations(0);
      setError("Failed to load reservations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, curPage, rowLimit, searchValue, activeFilters]);

  useEffect(() => {
    const loadCountries = async () => {
      const response = await countriesService.getAllCountries();
      if (response.success && response.data) {
        setCountries(response.data);
      } else {
        console.error(
          response.error?.message ?? "Failed to load countries."
        );
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    if (!currentWorkspace) return;

    const loadOwnersAndProperties = async () => {
      const [ownersResponse, propertiesResponse] = await Promise.all([
        workspaceService.getWorkspaceUsers(currentWorkspace.id, {
          user_type: "property_owner",
          page_size: 200,
        }),
        propertiesService.getProperties(currentWorkspace.id, { page_size: 200 }),
      ]);

      if (ownersResponse.success && ownersResponse.data) {
        setOwners(ownersResponse.data.results ?? []);
      } else {
        setOwners([]);
        console.error(
          ownersResponse.error?.message ?? "Failed to load property owners."
        );
      }

      if (propertiesResponse.success && propertiesResponse.data) {
        setProperties(propertiesResponse.data.results ?? []);
      } else {
        setProperties([]);
        console.error(
          propertiesResponse.error?.message ?? "Failed to load properties."
        );
      }
    };

    loadOwnersAndProperties();
  }, [currentWorkspace]);

  useEffect(() => {
    if (!isFiltersOpen) return;
    if (draftFilters.country && !countryQuery) {
      setCountryQuery(getCountryLabelByValue(draftFilters.country));
    }
    if (draftFilters.ownerId && !ownerQuery) {
      setOwnerQuery(getOwnerLabelById(draftFilters.ownerId));
    }
    if (draftFilters.propertyId && !propertyQuery) {
      setPropertyQuery(getPropertyLabelById(draftFilters.propertyId));
    }
  }, [
    draftFilters.country,
    draftFilters.ownerId,
    draftFilters.propertyId,
    isFiltersOpen,
    countryQuery,
    ownerQuery,
    propertyQuery,
    countries,
    owners,
    properties,
  ]);

  useEffect(() => {
    if (!PAGE_SIZE_OPTIONS.includes(rowLimit as (typeof PAGE_SIZE_OPTIONS)[number])) {
      setRowLimit(DEFAULT_ROW_LIMIT);
    }
  }, [rowLimit]);

  const nextPage = () => setCurPage((prev) => prev + 1);
  const prevPage = () => setCurPage((prev) => Math.max(prev - 1, 1));

  const handleDraftFilterChange = (
    key: keyof BookingFilters,
    value: BookingFilters[keyof BookingFilters]
  ) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setDraftFilters({
      country: "",
      reservationCode: "",
      checkinDate: "",
      checkoutDate: "",
      ownerId: null,
      propertyId: null,
      paymentCreatedAtFrom: "",
      paymentCreatedAtTo: "",
    });
    setDraftStatusView("completed");
    setCountryQuery("");
    setOwnerQuery("");
    setPropertyQuery("");
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setStatusView(draftStatusView);
    setCurPage(1);
    setIsFiltersOpen(false);
  };

  const handleRowLimitChange = (limit: number) => {
    setRowLimit(limit);
    setCurPage(1);
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchInput(value);
    if (value === "") {
      setSearchValue("");
      setCurPage(1);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      setSearchValue(searchInput.trim());
      setCurPage(1);
    }
  };

  const handleSortToggle = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      setCurPage(1);
      return;
    }

    setSortField(field);
    setSortDirection("asc");
    setCurPage(1);
  };

  const getChangedReservationPayload = (
    original: Reservation,
    payload: ReservationCreateUpdatePayload
  ) => {
    const originalCountryId = getCountryIdByReservationCountry(original.country_name);
    const changes: ReservationPartialUpdatePayload = {};

    if ((original.reservation_code || null) !== payload.reservation_code) {
      changes.reservation_code = payload.reservation_code;
    }
    if (original.guest_name !== payload.guest_name) {
      changes.guest_name = payload.guest_name;
    }
    if (originalCountryId !== payload.country) {
      changes.country = payload.country;
    }
    if (original.property?.id !== payload.property) {
      changes.property = payload.property;
    }
    if (original.checkin_date !== payload.checkin_date) {
      changes.checkin_date = payload.checkin_date;
    }
    if (original.checkout_date !== payload.checkout_date) {
      changes.checkout_date = payload.checkout_date;
    }
    if (original.night_count !== payload.night_count) {
      changes.night_count = payload.night_count;
    }
    if (original.adult_guest_count !== payload.adult_guest_count) {
      changes.adult_guest_count = payload.adult_guest_count;
    }
    if (original.child_guest_count !== payload.child_guest_count) {
      changes.child_guest_count = payload.child_guest_count;
    }
    if (original.baby_guest_count !== payload.baby_guest_count) {
      changes.baby_guest_count = payload.baby_guest_count;
    }
    if (original.pet_count !== payload.pet_count) {
      changes.pet_count = payload.pet_count;
    }

    return changes;
  };

  const openReservationDetails = (reservation: Reservation) => {
    setReservationModalMode("edit");
    setSelectedReservation(reservation);
    setReservationDraft(createReservationDraft(reservation));
    setReservationSaveError(null);
    setIsSavingReservation(false);
    setIsReservationModalOpen(true);
  };

  const openAddReservation = () => {
    setReservationModalMode("add");
    setSelectedReservation(null);
    setReservationDraft(createEmptyReservationDraft());
    setReservationSaveError(null);
    setIsSavingReservation(false);
    setIsReservationModalOpen(true);
  };

  const handleSaveReservation = async () => {
    if (!currentWorkspace || !reservationDraft) return;

    const payload = buildReservationPayload(reservationDraft);
    if (!payload) {
      setReservationSaveError("Guest, property, check-in and check-out are required.");
      return;
    }

    setIsSavingReservation(true);
    setReservationSaveError(null);

    try {
      const response = await (
        reservationModalMode === "add" || !selectedReservation
          ? reservationsService.createReservation(currentWorkspace.id, payload)
          : (async () => {
              const patchPayload = getChangedReservationPayload(
                selectedReservation,
                payload
              );
              const changedKeys = Object.keys(patchPayload);

              if (changedKeys.length === 0) {
                return { success: true, data: selectedReservation };
              }

              const hasRequiredFieldChange = changedKeys.some((key) =>
                ["guest_name", "property", "checkin_date", "checkout_date", "night_count"].includes(key)
              );
              const canPreserveCountryOnFullUpdate =
                !selectedReservation.country_name || payload.country !== null;
              const requiresFullUpdate =
                hasRequiredFieldChange && canPreserveCountryOnFullUpdate;

              return requiresFullUpdate
                ? await reservationsService.updateReservationFull(
                    currentWorkspace.id,
                    selectedReservation.id,
                    payload
                  )
                : await reservationsService.updateReservation(
                    currentWorkspace.id,
                    selectedReservation.id,
                    patchPayload
                  );
            })()
      );

      if (!response.success) {
        setReservationSaveError(
          response.error?.message ?? "Failed to save reservation."
        );
        return;
      }

      setIsReservationModalOpen(false);
      setSelectedReservation(null);
      setReservationDraft(null);
      await fetchReservations();
    } catch (saveError) {
      console.error(saveError);
      setReservationSaveError("Failed to save reservation.");
    } finally {
      setIsSavingReservation(false);
    }
  };

  const openCancelReservation = (reservation: Reservation) => {
    setReservationToCancel(reservation);
    setIsCancelModalOpen(true);
  };

  const handleCopyReservationCode = async (code: string) => {
    if (!code) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        return;
      }
    } catch (error) {
      console.warn("Failed to copy with clipboard API.", error);
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    } catch (error) {
      console.warn("Fallback copy failed.", error);
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    if (ownerHiddenColumns.has(key)) return;
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <PageGreeting
          className={styles.headerText}
          title="Bookings"
        />
        <div className={styles.search}>
          <div className={styles.searchBar}>
            <Input
              placeholder="Search guests..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              className={styles.searchInput}
            />
          </div>
          <Dialog
            open={isFiltersOpen}
            onOpenChange={(open) => {
              setIsFiltersOpen(open);
              if (open) {
                setDraftFilters(filters);
                setDraftStatusView(statusView);
                setCountryQuery(getCountryLabelByValue(filters.country));
                setOwnerQuery(getOwnerLabelById(filters.ownerId));
                setPropertyQuery(getPropertyLabelById(filters.propertyId));
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className={`${styles.filterButton} ${styles.filterButtonInverted}`}
              >
                <Filter size={16} aria-hidden="true" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span
                    className={styles.filterCount}
                    aria-label={`${activeFilterCount} filters applied`}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className={styles.filtersModal}>
              <DialogHeader className={styles.filtersHeader}>
                <div className={styles.filtersHeaderRow}>
                  <DialogTitle className={styles.filtersTitle}>
                    Filters
                  </DialogTitle>
                </div>
                <DialogDescription className={styles.filtersDescription}>
                  Narrow your list with date, country, or reservation code.
                </DialogDescription>
              </DialogHeader>
              <div className={styles.filtersGrid}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel} htmlFor="booking-status">
                    Status
                  </label>
                  <select
                    id="booking-status"
                    className={styles.filterInput}
                    value={draftStatusView}
                    onChange={(event) =>
                      setDraftStatusView(event.target.value as StatusView)
                    }
                  >
                    {STATUS_VIEW_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel} htmlFor="booking-code">
                    Reservation code
                  </label>
                  <Input
                    id="booking-code"
                    placeholder="Code"
                    value={draftFilters.reservationCode}
                    onChange={(event) =>
                      handleDraftFilterChange(
                        "reservationCode",
                        event.target.value
                      )
                    }
                    className={styles.filterInput}
                  />
                </div>
                <DatePickerField
                  id="checkin-date"
                  label="Check-in"
                  value={draftFilters.checkinDate}
                  onChange={(value) => handleDraftFilterChange("checkinDate", value)}
                />
                <DatePickerField
                  id="checkout-date"
                  label="Check-out"
                  value={draftFilters.checkoutDate}
                  onChange={(value) =>
                    handleDraftFilterChange("checkoutDate", value)
                  }
                />
                <DatePickerField
                  id="payment-created-from"
                  label="Created Date — From"
                  value={draftFilters.paymentCreatedAtFrom}
                  onChange={(value) =>
                    handleDraftFilterChange("paymentCreatedAtFrom", value)
                  }
                />
                <DatePickerField
                  id="payment-created-to"
                  label="Created Date — To"
                  value={draftFilters.paymentCreatedAtTo}
                  onChange={(value) =>
                    handleDraftFilterChange("paymentCreatedAtTo", value)
                  }
                />
                <SearchSelectField
                  id="booking-country"
                  label="Country"
                  placeholder="Search country"
                  options={countryOptions}
                  query={countryQuery}
                  onQueryChange={setCountryQuery}
                  onSelect={(value) =>
                    handleDraftFilterChange(
                      "country",
                      typeof value === "string" ? value : ""
                    )
                  }
                />
                <SearchSelectField
                  id="booking-owner"
                  label="Owner"
                  placeholder="Search owner"
                  options={ownerOptions}
                  query={ownerQuery}
                  onQueryChange={setOwnerQuery}
                  onSelect={(value) =>
                    handleDraftFilterChange(
                      "ownerId",
                      typeof value === "number" ? value : null
                    )
                  }
                />
                <div className={styles.filterGroupWide}>
                  <SearchSelectField
                    id="booking-property"
                    label="Property"
                    placeholder="Search property"
                    options={propertyOptions}
                    query={propertyQuery}
                    onQueryChange={setPropertyQuery}
                    onSelect={(value) =>
                      handleDraftFilterChange(
                        "propertyId",
                        typeof value === "number" ? value : null
                      )
                    }
                  />
                </div>
              </div>
              <DialogFooter className={styles.filtersFooter}>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="button" onClick={handleApplyFilters}>
                  Apply filters
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="default"
            size="sm"
            className={styles.filterButton}
            onClick={openAddReservation}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Add</span>
          </Button>
          <Dialog open={isColumnsOpen} onOpenChange={setIsColumnsOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className={styles.filterButton}
              >
                {isColumnsOpen ? <LuEye aria-hidden="true" /> : <LuEyeClosed aria-hidden="true" />}
                <span>Columns</span>
              </Button>
            </DialogTrigger>
            <DialogContent className={styles.columnsModal}>
              <DialogHeader className={styles.filtersHeader}>
                <div className={styles.filtersHeaderRow}>
                  <DialogTitle className={styles.filtersTitle}>
                    Columns
                  </DialogTitle>
                </div>
                <DialogDescription className={styles.filtersDescription}>
                  Choose which columns to show in the table.
                </DialogDescription>
              </DialogHeader>
              <div className={styles.columnsGrid}>
                {COLUMN_OPTIONS.map((option) => (
                  <label key={option.key} className={styles.columnOption}>
                    <Checkbox
                      id={`column-${option.key}`}
                      checked={!isColumnHidden(option.key)}
                      disabled={ownerHiddenColumns.has(option.key)}
                      onCheckedChange={() => toggleColumn(option.key)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <DialogFooter className={styles.filtersFooter}>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Done
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrapper}>
          <div className={tableStyles.table__container}>
            <table className={tableStyles.table}>
            <thead className={tableStyles.table__header}>
              <tr className={tableStyles.table__row}>
                <th className={tableStyles.table__head}>Reservation</th>
                <th className={tableStyles.table__head}>Guest</th>
                {!isColumnHidden("country") && (
                  <th className={tableStyles.table__head}>Country</th>
                )}
                <th className={tableStyles.table__head}>
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => handleSortToggle("checkin")}
                  >
                    <span>Check-in</span>
                    <span className={styles.sortIcon}>
                      {sortField === "checkin" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp aria-hidden="true" />
                        ) : (
                          <ArrowDown aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </th>
                <th className={tableStyles.table__head}>
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => handleSortToggle("checkout")}
                  >
                    <span>Check-out</span>
                    <span className={styles.sortIcon}>
                      {sortField === "checkout" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp aria-hidden="true" />
                        ) : (
                          <ArrowDown aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </th>
                {!isColumnHidden("created_date") && (
                  <th className={tableStyles.table__head}>
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => handleSortToggle("createdDate")}
                    >
                      <span>Created Date</span>
                      <span className={styles.sortIcon}>
                        {sortField === "createdDate" ? (
                          sortDirection === "asc" ? (
                            <ArrowUp aria-hidden="true" />
                          ) : (
                            <ArrowDown aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  </th>
                )}
                <th className={tableStyles.table__head}>Nights</th>
                <th className={tableStyles.table__head}>Guests</th>
                {!isColumnHidden("nightly_fee") && (
                  <th className={tableStyles.table__head}>Nightly fee</th>
                )}
                {!isColumnHidden("total_room_fee") && (
                  <th className={tableStyles.table__head}>Total room fee</th>
                )}
                {!isColumnHidden("night_rate_adjustment") && (
                  <th className={tableStyles.table__head}>Night rate adjustment</th>
                )}
                {!isColumnHidden("cleaning_fee") && (
                  <th className={tableStyles.table__head}>Cleaning fee</th>
                )}
                {!isColumnHidden("guest_service_fee") && (
                  <th className={tableStyles.table__head}>Guest service fee</th>
                )}
                {!isColumnHidden("host_service_fee") && (
                  <th className={tableStyles.table__head}>Airbnb service fee</th>
                )}
                {!isColumnHidden("host_earning") && (
                  <th className={tableStyles.table__head}>Host earning</th>
                )}
                {!isColumnHidden("workspace_earning") && (
                  <th className={tableStyles.table__head}>Workspace earning</th>
                )}
                {!isColumnHidden("net_payout") && (
                  <th className={tableStyles.table__head}>Net payout</th>
                )}
                <th className={tableStyles.table__head}>Actions</th>
              </tr>
            </thead>
            <tbody className={tableStyles.table__body}>
              {isLoading && (
                <tr className={tableStyles.table__row}>
                  <td
                    className={tableStyles.table__cell}
                    colSpan={tableColumnCount}
                  >
                    <span className={styles.statusMessage}>
                      Loading reservations...
                    </span>
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr className={tableStyles.table__row}>
                  <td
                    className={tableStyles.table__cell}
                    colSpan={tableColumnCount}
                  >
                    <span className={styles.statusMessage}>{error}</span>
                  </td>
                </tr>
              )}
              {!isLoading && !error && visibleReservations.length === 0 && (
                <tr className={tableStyles.table__row}>
                  <td
                    className={tableStyles.table__cell}
                    colSpan={tableColumnCount}
                  >
                    <EmptyLook label="bookings" className={styles.statusMessage} />
                  </td>
                </tr>
              )}
              {!isLoading &&
                !error &&
                visibleReservations.map((reservation) => {
                  const totalGuests =
                    reservation.adult_guest_count +
                    reservation.child_guest_count +
                    reservation.baby_guest_count;

                  const isCancelled = reservation.reservation_status === "cancelled";

                  return (
                    <tr
                      className={`${tableStyles.table__row} ${isCancelled ? styles["row--cancelled"] : ""}`}
                      key={reservation.id}
                    >
                      <td className={tableStyles.table__cell}>
                        <div className={styles.codeCellContent}>
                          <div className={styles.codeCell}>
                            {reservation.reservation_code && (
                              <button
                                type="button"
                                className={styles.copyButton}
                                onClick={() =>
                                  handleCopyReservationCode(
                                    reservation.reservation_code
                                  )
                                }
                                aria-label={`Copy reservation code ${reservation.reservation_code}`}
                                title="Copy reservation code"
                              >
                                <LuCopy aria-hidden="true" />
                              </button>
                            )}
                            {reservation.reservation_code}
                          </div>
                          {reservation.reservation_status && (
                            <span className={`${styles.statusBadge} ${styles[`statusBadge--${reservation.reservation_status}`]}`}>
                              {reservation.reservation_status === "completed" ? "Confirmed" : reservation.reservation_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={tableStyles.table__cell}>
                        {reservation.guest_name}
                      </td>
                      {!isColumnHidden("country") && (
                        <td className={tableStyles.table__cell}>
                          {reservation.country_name}
                        </td>
                      )}
                      <td className={tableStyles.table__cell}>
                        {formatDisplayDate(reservation.checkin_date)}
                      </td>
                      <td className={tableStyles.table__cell}>
                        {formatDisplayDate(reservation.checkout_date)}
                      </td>
                      {!isColumnHidden("created_date") && (
                        <td className={tableStyles.table__cell}>
                          {formatDisplayDateTime(reservation.payment?.created_at)}
                        </td>
                      )}
                      <td className={tableStyles.table__cell}>
                        {reservation.night_count}
                      </td>
                      <td className={tableStyles.table__cell}>
                        {totalGuests}
                        {reservation.pet_count > 0
                          ? ` +${reservation.pet_count} pet`
                          : ""}
                      </td>
                      {!isColumnHidden("nightly_fee") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.nightly_fee,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("total_room_fee") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.total_room_fee,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("night_rate_adjustment") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.night_rate_adjustment,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("cleaning_fee") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.cleaning_fee,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("guest_service_fee") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.guest_service_fee,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("host_service_fee") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.host_service_fee,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("host_earning") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.host_earning,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("workspace_earning") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.workspace_earning,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      {!isColumnHidden("net_payout") && (
                        <td className={tableStyles.table__cell}>
                          {formatMoney(
                            reservation.payment?.net_payout,
                            reservation.payment?.currency
                          )}
                        </td>
                      )}
                      <td className={tableStyles.table__cell}>
                        <div className={styles.actions}>
                          {!isCancelled && (
                            <>
                              <button
                                className={`${styles["action-button"]} ${styles["action-button--neutral"]}`}
                                type="button"
                                onClick={() => openReservationDetails(reservation)}
                                title="Edit"
                                aria-label="Edit reservation"
                              >
                                <MdOutlineEdit />
                              </button>
                              <button
                                className={`${styles["action-button"]} ${styles["action-button--danger"]}`}
                                type="button"
                                onClick={() => openCancelReservation(reservation)}
                                title="Delete"
                                aria-label="Delete reservation"
                              >
                                <MdDeleteOutline />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            </table>
          </div>
        </div>

        <div className={styles.mobileCards}>
          {isLoading && (
            <div className={styles.mobileCardStatus}>
              Loading reservations...
            </div>
          )}
          {!isLoading && error && (
            <div className={styles.mobileCardStatus}>{error}</div>
          )}
          {!isLoading && !error && visibleReservations.length === 0 && (
            <EmptyLook label="bookings" className={styles.mobileCardStatus} />
          )}
          {!isLoading &&
            !error &&
            visibleReservations.map((reservation) => {
              const totalGuests =
                reservation.adult_guest_count +
                reservation.child_guest_count +
                reservation.baby_guest_count;

              const isCancelled = reservation.reservation_status === "cancelled";

              return (
                <article
                  className={`${styles.mobileCard} ${isCancelled ? styles["row--cancelled"] : ""}`}
                  key={`mobile-${reservation.id}`}
                >
                  <div className={styles.mobileCardHeader}>
                    <div className={styles.codeCellContent}>
                      <div className={styles.codeCell}>
                        {reservation.reservation_code && (
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() =>
                              handleCopyReservationCode(
                                reservation.reservation_code
                              )
                            }
                            aria-label={`Copy reservation code ${reservation.reservation_code}`}
                            title="Copy reservation code"
                          >
                            <LuCopy aria-hidden="true" />
                          </button>
                        )}
                        <span>{reservation.reservation_code}</span>
                      </div>
                      {reservation.reservation_status && (
                        <span className={`${styles.statusBadge} ${styles[`statusBadge--${reservation.reservation_status}`]}`}>
                          {reservation.reservation_status === "completed" ? "Confirmed" : reservation.reservation_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.mobileCardGrid}>
                    <div className={styles.mobileCardItem}>
                      <span className={styles.mobileCardLabel}>Guest</span>
                      <span className={styles.mobileCardValue}>{reservation.guest_name}</span>
                    </div>
                    {!isColumnHidden("country") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Country</span>
                        <span className={styles.mobileCardValue}>{reservation.country_name}</span>
                      </div>
                    )}
                    <div className={styles.mobileCardItem}>
                      <span className={styles.mobileCardLabel}>Check-in</span>
                      <span className={styles.mobileCardValue}>{formatDisplayDate(reservation.checkin_date)}</span>
                    </div>
                    <div className={styles.mobileCardItem}>
                      <span className={styles.mobileCardLabel}>Check-out</span>
                      <span className={styles.mobileCardValue}>{formatDisplayDate(reservation.checkout_date)}</span>
                    </div>
                    {!isColumnHidden("created_date") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Created Date</span>
                        <span className={styles.mobileCardValue}>
                          {formatDisplayDateTime(reservation.payment?.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={styles.mobileCardItem}>
                      <span className={styles.mobileCardLabel}>Nights</span>
                      <span className={styles.mobileCardValue}>{reservation.night_count}</span>
                    </div>
                    <div className={styles.mobileCardItem}>
                      <span className={styles.mobileCardLabel}>Guests</span>
                      <span className={styles.mobileCardValue}>
                        {totalGuests}
                        {reservation.pet_count > 0 ? ` +${reservation.pet_count} pet` : ""}
                      </span>
                    </div>
                    {!isColumnHidden("nightly_fee") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Nightly fee</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.nightly_fee,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("total_room_fee") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Total room fee</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.total_room_fee,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("night_rate_adjustment") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Night rate adjustment</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.night_rate_adjustment,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("cleaning_fee") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Cleaning fee</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.cleaning_fee,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("guest_service_fee") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Guest service fee</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.guest_service_fee,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("host_service_fee") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Airbnb service fee</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.host_service_fee,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("host_earning") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Host earning</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.host_earning,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("workspace_earning") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Workspace earning</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.workspace_earning,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                    {!isColumnHidden("net_payout") && (
                      <div className={styles.mobileCardItem}>
                        <span className={styles.mobileCardLabel}>Net payout</span>
                        <span className={styles.mobileCardValue}>
                          {formatMoney(
                            reservation.payment?.net_payout,
                            reservation.payment?.currency
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.actions}>
                    {!isCancelled && (
                      <>
                        <button
                          className={`${styles["action-button"]} ${styles["action-button--neutral"]}`}
                          type="button"
                          onClick={() => openReservationDetails(reservation)}
                          title="Edit"
                          aria-label="Edit reservation"
                        >
                          <MdOutlineEdit />
                        </button>
                        <button
                          className={`${styles["action-button"]} ${styles["action-button--danger"]}`}
                          type="button"
                          onClick={() => openCancelReservation(reservation)}
                          title="Delete"
                          aria-label="Delete reservation"
                        >
                          <MdDeleteOutline />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
        </div>

        <TableFooter
          currentPageSize={rowLimit}
          totalRows={totalReservations}
          changeRowLimit={handleRowLimitChange}
          nextPage={nextPage}
          prevPage={prevPage}
          page={curPage}
          onPageSelect={(page) => setCurPage(page)}
        />
      </div>

      <Dialog
        open={isReservationModalOpen}
        onOpenChange={(open) => {
          setIsReservationModalOpen(open);
          if (!open) {
            setSelectedReservation(null);
            setReservationDraft(null);
            setReservationSaveError(null);
            setIsSavingReservation(false);
          }
        }}
      >
        <DialogContent className={styles.reservationModal}>
          <DialogHeader>
            <DialogTitle>
              {reservationModalMode === "add"
                ? "Add Reservation"
                : "Reservation Details"}
            </DialogTitle>
            <DialogDescription>
              {reservationModalMode === "add"
                ? "Create a reservation manually."
                : "Review and update reservation information."}
            </DialogDescription>
          </DialogHeader>
          {reservationDraft ? (
            <div className={styles.reservationDetails}>
              <div className={styles.reservationField}>
                <label>Reservation Code</label>
                <Input
                  value={reservationDraft.reservation_code}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev ? { ...prev, reservation_code: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Guest Name</label>
                <Input
                  value={reservationDraft.guest_name}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev ? { ...prev, guest_name: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Country</label>
                <select
                  value={reservationDraft.countryId ?? ""}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            countryId: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : prev
                    )
                  }
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.reservationField}>
                <label>Property</label>
                <select
                  value={reservationDraft.propertyId ?? ""}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            propertyId: event.target.value
                              ? Number(event.target.value)
                              : null,
                          }
                        : prev
                    )
                  }
                >
                  <option value="">Select property</option>
                  {selectedReservation?.property &&
                    !properties.some(
                      (property) => property.id === selectedReservation.property?.id
                    ) && (
                      <option value={selectedReservation.property.id}>
                        {selectedReservation.property.name}
                      </option>
                    )}
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.reservationField}>
                <label>Check-in</label>
                <Input
                  type="date"
                  value={reservationDraft.checkin_date}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev ? { ...prev, checkin_date: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Check-out</label>
                <Input
                  type="date"
                  value={reservationDraft.checkout_date}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev ? { ...prev, checkout_date: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Nights</label>
                <Input
                  type="number"
                  value={reservationDraft.night_count}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? { ...prev, night_count: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Adults</label>
                <Input
                  type="number"
                  value={reservationDraft.adult_guest_count}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? { ...prev, adult_guest_count: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Children</label>
                <Input
                  type="number"
                  value={reservationDraft.child_guest_count}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? { ...prev, child_guest_count: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Babies</label>
                <Input
                  type="number"
                  value={reservationDraft.baby_guest_count}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? { ...prev, baby_guest_count: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Pets</label>
                <Input
                  type="number"
                  value={reservationDraft.pet_count}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? { ...prev, pet_count: Number(event.target.value) }
                        : prev
                    )
                  }
                />
              </div>
              <div className={styles.reservationField}>
                <label>Total</label>
                <Input
                  value={
                    reservationDraft.total_room_fee
                      ? formatMoney(
                          reservationDraft.total_room_fee,
                          reservationDraft.total_room_fee_currency
                        )
                      : ""
                  }
                  disabled
                />
              </div>
              <div className={styles.reservationFieldFull}>
                <label>Special Request</label>
                <textarea
                  placeholder="Add any special request details..."
                  value={reservationDraft.special_requests}
                  onChange={(event) =>
                    setReservationDraft((prev) =>
                      prev
                        ? { ...prev, special_requests: event.target.value }
                        : prev
                    )
                  }
                />
              </div>
            </div>
          ) : null}
          {reservationSaveError && (
            <p className={styles.reservationError}>{reservationSaveError}</p>
          )}
          <DialogFooter className={styles.reservationFooter}>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSavingReservation}>
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSaveReservation}
              disabled={isSavingReservation}
            >
              {isSavingReservation
                ? "Saving..."
                : reservationModalMode === "add"
                  ? "Add Reservation"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCancelModalOpen}
        onOpenChange={(open) => {
          setIsCancelModalOpen(open);
          if (!open) setReservationToCancel(null);
        }}
      >
        <DialogContent className={styles.reservationModal}>
          <DialogHeader>
            <DialogTitle>Cancel Reservation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this reservation?
            </DialogDescription>
          </DialogHeader>
          {reservationToCancel ? (
            <div className={styles.reservationConfirm}>
              <p>
                Reservation <strong>{reservationToCancel.reservation_code}</strong> for{" "}
                <strong>{reservationToCancel.guest_name}</strong> will be canceled.
              </p>
            </div>
          ) : null}
          <DialogFooter className={styles.reservationFooter}>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Keep Reservation
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsCancelModalOpen(false)}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
