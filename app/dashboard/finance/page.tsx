"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { LuScanLine } from "react-icons/lu";
import styles from "@/styles/app/dashboard/Finance.module.scss";
import PageGreeting from "@/components/ui/PageGreeting";
import TableFooter from "@/components/app/dashboard/table-footer";
import { useWorkspace } from "@/context/workspace-context";
import { propertiesService } from "@/lib/services/properties.service";
import { currenciesService } from "@/lib/services/currencies.service";
import { expensesService } from "@/lib/services/expenses.service";
import { reservationsService } from "@/lib/services/reservations.service";
import type { Currency } from "@/types/location";
import type { Expense, ExpenseCreateUpdate, Property, Reservation } from "@/types/api";

const PAYMENT_STATUS_LABELS: Record<
  NonNullable<Expense["payment_status"]>,
  { label: string; variant: "success" | "warning" | "info" }
> = {
  paid: { label: "Paid", variant: "success" },
  unpaid: { label: "Unpaid", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "info" },
};

const FinanceDashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<
    "transactions" | "recurring" | "vendors"
  >("transactions");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const syncTimeoutsRef = useRef<number[]>([]);
  const [uploadName, setUploadName] = useState<string>("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [propertyQuery, setPropertyQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);
  const propertyMenuRef = useRef<HTMLDivElement>(null);
  const submissionTokenRef = useRef(0);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState("maintenance");
  const nowLocal = new Date();
  const defaultDate = new Date(
    nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
  const [expenseDate, setExpenseDate] = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    NonNullable<Expense["payment_status"]>
  >("paid");
  const [reservationId, setReservationId] = useState<number | null>(null);
  const [reservationsForProperty, setReservationsForProperty] = useState<Reservation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expenseTotals, setExpenseTotals] = useState<
    { currency: string; total: number }[]
  >([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionPageSize, setTransactionPageSize] = useState(8);
  const formatMoney = (value: number) => {
    const hasDecimals = Math.round(value) !== value;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  };
  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const categoryVariant = (type?: string) => {
    const key = (type || "").toLowerCase();
    const supported = new Set([
      "cleaning",
      "rent",
      "maintenance",
      "fixture",
      "market",
      "crediting",
      "dues",
      "invoice",
      "tax",
    ]);
    return supported.has(key) ? key : "neutral";
  };

  const refreshExpenses = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setExpensesLoading(true);
    const result = await expensesService.getExpenses(currentWorkspace.id, {
      page_size: 500,
    });

    if (!result.success || !result.data) {
      setExpenseTotals([]);
      setExpensesData([]);
      setExpensesLoading(false);
      return;
    }

    setExpensesData(result.data.results ?? []);

    const totals = new Map<string, number>();
    result.data.results.forEach((expense) => {
      const code = expense.currency?.code || "USD";
      const expenseAmount = Number(expense.amount) || 0;
      totals.set(code, (totals.get(code) || 0) + expenseAmount);
    });

    const order = ["TRY", "USD"];
    const sorted = Array.from(totals.entries())
      .sort(([a], [b]) => {
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map(([currency, total]) => ({ currency, total }));

    setExpenseTotals(sorted);
    setExpensesLoading(false);
  }, [currentWorkspace?.id]);

  useEffect(() => {
    refreshExpenses();
  }, [refreshExpenses]);

  const totalExpensesValue = useMemo(() => {
    if (expensesLoading) {
      return <span className={styles.metricsValue}>—</span>;
    }

    if (expenseTotals.length === 0) {
      return <span className={styles.metricsValue}>—</span>;
    }

    if (expenseTotals.length === 1) {
      const item = expenseTotals[0];
      return (
        <span className={styles.metricsValue}>
          {item.currency} {formatMoney(Math.round(item.total))}
        </span>
      );
    }

    return (
      <div className={styles.metricsCurrencyList}>
        {expenseTotals.map((item) => (
          <div key={item.currency} className={styles.metricsCurrencyRow}>
            <span className={styles.metricsCurrencyCode}>{item.currency}</span>
            <span className={styles.metricsCurrencyAmount}>
              {formatMoney(Math.round(item.total))}
            </span>
          </div>
        ))}
      </div>
    );
  }, [expenseTotals, expensesLoading]);
  const metrics = [
    {
      label: "Total Expenses",
      value: totalExpensesValue,
      badge: "Down",
      caption: "This Month",
      variant: "danger",
    },
    {
      label: "Pending Payments",
      value: "$3,450",
      badge: "5 Invoices",
      caption: "Due within 7 days",
      variant: "warning",
    },
    {
      label: "Billable to Owners",
      value: "$12,800",
      badge: "Recoverable",
      caption: "Maintenance & Repairs",
      variant: "info",
    },
    {
      label: "Net Margin",
      value: "22%",
      badge: "Up",
      caption: "After OpEx",
      variant: "success",
    },
  ];
  const transactions = expensesData;
  const paginatedTransactions = useMemo(() => {
    const start = (transactionPage - 1) * transactionPageSize;
    return transactions.slice(start, start + transactionPageSize);
  }, [transactions, transactionPage, transactionPageSize]);
  const recurringRules = [
    {
      name: "Internet - All Units",
      frequency: "Monthly",
      amount: "$45.00",
      vendor: "Comcast",
      nextRun: "Nov 1, 2025",
      status: "Active",
    },
    {
      name: "Pool Cleaning - Seaside",
      frequency: "Weekly",
      amount: "$80.00",
      vendor: "BluePools",
      nextRun: "Oct 28, 2025",
      status: "Active",
    },
    {
      name: "SaaS Subscription",
      frequency: "Yearly",
      amount: "$1,200.00",
      vendor: "Acme",
      nextRun: "Jan 1, 2026",
      status: "Active",
    },
  ];
  const vendors = [
    {
      name: "ABC Plumbing",
      category: "Maintenance",
      balance: "$0.00",
      rating: 4.8,
      status: "Verified",
      statusVariant: "success",
    },
    {
      name: "City Power",
      category: "Utilities",
      balance: "$320.50",
      rating: 5,
      status: "Verified",
      statusVariant: "success",
    },
    {
      name: "BuildIt Fast",
      category: "Construction",
      balance: "$2,400.00",
      rating: 3.5,
      status: "Review",
      statusVariant: "warning",
    },
  ];

  const closeExpenseModal = () => {
    submissionTokenRef.current++;
    setIsExpenseModalOpen(false);
    setSelectedPropertyId(null);
    setPropertyQuery("");
    setIsPropertyMenuOpen(false);
    setAmount("");
    setExpenseType("maintenance");
    setExpenseDate(defaultDate);
    setDescription("");
    setPaymentStatus("paid");
    setReservationId(null);
    setReservationsForProperty([]);
    setUploadName("");
    setSubmitError(null);
    setIsSubmitting(false);
  };
  const closeScanModal = () => {
    setIsScanModalOpen(false);
    setUploadName("");
  };
  const closeSyncModal = () => {
    setIsSyncModalOpen(false);
    setSyncStep(0);
  };

  const startSync = () => {
    setIsSyncModalOpen(true);
  };

  const transactionsTable = (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Property / Item</th>
            <th>Category</th>
            <th>Created By</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Status</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {paginatedTransactions.map((row) => (
            <tr key={row.id}>
              <td data-label="Date"> 
                {/* It is not by date but created_by.created_at because "date" shows when they're added, not receipts date. Do not change it. */}
                {formatDateTime(row.created_by?.created_at ?? row.created_at)}
              </td>
              <td
                title={row.property?.name ?? "—"}
                data-label="Property / Item"
              >
                {row.property?.name ?? "—"}
              </td>
              <td data-label="Category">
                <span
                  className={styles.tableBadge}
                  data-variant={categoryVariant(row.type)}
                >
                  {row.type || "—"}
                </span>
              </td>
              <td data-label="Created By">
                <span>
                  {row.created_by?.user?.first_name
                    ? `${row.created_by.user.first_name} ${row.created_by.user.last_name ?? ""}`.trim()
                    : row.created_by?.user?.email ?? "—"}
                </span>
              </td>
              <td data-label="Amount">
                {row.currency?.symbol ?? row.currency?.code ?? "—"}{" "}
                {formatMoney(Number(row.amount) || 0)}
              </td>
              <td
                className={styles.tableEllipsis}
                title={row.description || "—"}
                data-label="Description"
              >
                {row.description || "—"}
              </td>
              <td data-label="Status">
                {row.payment_status ? (
                  <span
                    className={styles.statusPill}
                    data-variant={PAYMENT_STATUS_LABELS[row.payment_status].variant}
                  >
                    {PAYMENT_STATUS_LABELS[row.payment_status].label}
                  </span>
                ) : (
                  <span>—</span>
                )}
              </td>
              <td data-label="Receipt">
                {row.attachment ? (
                  <a
                    className={styles.receiptBadge}
                    href={row.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DOC
                  </a>
                ) : (
                  <span className={`${styles.receiptBadge} ${styles["is-muted"]}`}>
                    None
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const recurringTable = (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rule Name</th>
            <th>Frequency</th>
            <th>Amount</th>
            <th>Vendor</th>
            <th>Next Run</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {recurringRules.map((row) => (
            <tr key={row.name}>
              <td data-label="Rule Name">
                {row.name}
              </td>
              <td data-label="Frequency">
                <span className={styles.tableBadge} data-variant="neutral">
                  {row.frequency}
                </span>
              </td>
              <td data-label="Amount">
                {row.amount}
              </td>
              <td data-label="Vendor">{row.vendor}</td>
              <td data-label="Next Run">{row.nextRun}</td>
              <td data-label="Status">
                <span className={styles.statusPill} data-variant="success">
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const vendorsTable = (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Vendor Name</th>
            <th>Category</th>
            <th>Outstanding Balance</th>
            <th>Rating</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((row) => (
            <tr key={row.name}>
              <td data-label="Vendor Name">
                {row.name}
              </td>
              <td data-label="Category">
                <span className={styles.tableBadge} data-variant="neutral">
                  {row.category}
                </span>
              </td>
              <td data-label="Outstanding Balance">
                {row.balance}
              </td>
              <td className={styles.ratingCell} data-label="Rating">
                <FaStar />
                {row.rating}
              </td>
              <td data-label="Status">
                <span className={styles.statusPill} data-variant={row.statusVariant}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tableContent =
    activeTab === "transactions"
      ? transactionsTable
      : activeTab === "recurring"
        ? recurringTable
        : vendorsTable;

  const tableFooter =
    activeTab === "transactions" ? (
      <TableFooter
        currentPageSize={transactionPageSize}
        totalRows={transactions.length}
        changeRowLimit={(limit) => setTransactionPageSize(limit)}
        nextPage={() =>
          setTransactionPage((prev) =>
            Math.min(prev + 1, Math.ceil(transactions.length / transactionPageSize))
          )
        }
        prevPage={() => setTransactionPage((prev) => Math.max(prev - 1, 1))}
        page={transactionPage}
        onPageSelect={(pageNumber) => setTransactionPage(pageNumber)}
      />
    ) : null;

  useEffect(() => {
    setTransactionPage(1);
  }, [transactionPageSize, transactions.length]);

  useEffect(() => {
    if (!isSyncModalOpen) {
      syncTimeoutsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId)
      );
      syncTimeoutsRef.current = [];
      return;
    }

    setSyncStep(0);

    const sequence = [
      { step: 0, delay: 0 },
      { step: 1, delay: 900 },
      { step: 2, delay: 1800 },
      { step: 3, delay: 2700 },
    ];

    syncTimeoutsRef.current = sequence.map((item) =>
      window.setTimeout(() => {
        setSyncStep(item.step);
        if (item.step === 3) {
          const closeTimeout = window.setTimeout(() => {
            closeSyncModal();
            window.location.reload();
          }, 900);
          syncTimeoutsRef.current.push(closeTimeout);
        }
      }, item.delay)
    );

    return () => {
      syncTimeoutsRef.current.forEach((timeoutId) =>
        window.clearTimeout(timeoutId)
      );
      syncTimeoutsRef.current = [];
    };
  }, [isSyncModalOpen]);

  useEffect(() => {
    const loadProperties = async () => {
      if (!currentWorkspace) return;
      const result = await propertiesService.getAllProperties(currentWorkspace.id);
      if (result.success && result.data) {
        setProperties(result.data);
      }
    };

    loadProperties();
  }, [currentWorkspace]);

  useEffect(() => {
    let isActive = true;
    const loadCurrencies = async () => {
      const result = await currenciesService.getAllCurrencies();
      if (!isActive) return;
      if (result.success && result.data) {
        const preferred = ["USD", "TRY", "EUR"];
        const filtered = result.data.filter((currency) =>
          preferred.includes(currency.code)
        );
        setCurrencies(filtered);
      }
    };
    loadCurrencies();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!currentWorkspace?.id || selectedPropertyId === null) {
      setReservationsForProperty([]);
      return;
    }
    let isActive = true;
    const loadReservations = async () => {
      const result = await reservationsService.getReservations(currentWorkspace.id, {
        property_id: selectedPropertyId,
        ordering: "-checkin_date",
        page_size: 500,
      });
      if (!isActive) return;
      if (result.success && result.data) {
        const visible = (result.data.results ?? []).filter(
          (r) => r.reservation_status !== "cancelled" && r.reservation_status !== "blocked"
        );
        setReservationsForProperty(visible);
      } else {
        setReservationsForProperty([]);
      }
    };
    loadReservations();
    return () => {
      isActive = false;
    };
  }, [currentWorkspace?.id, selectedPropertyId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        propertyMenuRef.current &&
        !propertyMenuRef.current.contains(event.target as Node)
      ) {
        setIsPropertyMenuOpen(false);
      }
    };
    if (isPropertyMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPropertyMenuOpen]);

  const filteredProperties = properties.filter((property) => {
    const query = propertyQuery.trim().toLowerCase();
    if (!query) return true;
    return property.name.toLowerCase().includes(query);
  });

  const handleSelectProperty = (propertyId: number) => {
    setSelectedPropertyId(propertyId);
    setReservationId(null);
    const property = properties.find((item) => item.id === propertyId);
    setPropertyQuery(property?.name ?? "");
    setIsPropertyMenuOpen(false);
  };

  const handleSaveExpense = async () => {
    setSubmitError(null);
    if (!currentWorkspace?.id) {
      setSubmitError("No workspace selected.");
      return;
    }
    if (selectedPropertyId === null) {
      setSubmitError("Please select a property.");
      return;
    }
    if (!expenseType) {
      setSubmitError("Please select a category.");
      return;
    }
    if (!expenseDate) {
      setSubmitError("Please select a date.");
      return;
    }
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      setSubmitError("Please enter an amount.");
      return;
    }
    const numericAmount = parseFloat(trimmedAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setSubmitError("Please enter a valid amount greater than 0.");
      return;
    }
    const currencyEntity = currencies.find((c) => c.code === selectedCurrency);
    if (!currencyEntity) {
      setSubmitError("Selected currency is not available. Please reload.");
      return;
    }

    const payload: ExpenseCreateUpdate = {
      property: selectedPropertyId,
      type: expenseType,
      amount: trimmedAmount,
      currency: currencyEntity.id,
      description,
      expense_date: expenseDate,
      payment_status: paymentStatus,
    };
    if (reservationId !== null) {
      payload.reservation = reservationId;
    }

    const token = ++submissionTokenRef.current;
    try {
      setIsSubmitting(true);
      const result = await expensesService.createExpense(currentWorkspace.id, payload);
      if (token !== submissionTokenRef.current) return;
      if (result.success) {
        closeExpenseModal();
        refreshExpenses();
      } else {
        setSubmitError(result.error?.message ?? "Failed to create expense.");
      }
    } finally {
      if (token === submissionTokenRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setUploadName(file ? file.name : "");
  };

  const handleUploadDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setUploadName(file.name);
    }
  };

  return (
    <div className={styles.finance}>
      <section className={styles.finance__greeting}>
        <div className={styles["finance__header-top"]}>
          <PageGreeting
            className={styles["finance__header-text"]}
            title="Expense Management"
          />
          <div className={styles.finance__headerActions}>
            <button
              className={`${styles.finance__actionButton} ${styles["is-ghost"]}`}
              type="button"
              onClick={startSync}
            >
              <FiRefreshCw />
              Sync Accounts
            </button>
            <button
              className={`${styles.finance__actionButton} ${styles["is-ghost"]}`}
              type="button"
              onClick={() => setIsScanModalOpen(true)}
            >
              <LuScanLine />
              Scan Invoice
            </button>
            <button
              className={`${styles.finance__actionButton} ${styles["is-solid"]}`}
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
            >
              <FiPlus />
              Expense
            </button>
          </div>
        </div>
      </section>

      <section className={styles.finance__metrics}>
        <div className={styles.metricsGrid}>
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className={styles.metricsCard}
              data-variant={metric.variant}
            >
              <p className={styles.metricsLabel}>{metric.label}</p>
              <div className={styles.metricsValueRow}>
                {typeof metric.value === "string" ? (
                  <span className={styles.metricsValue}>{metric.value}</span>
                ) : (
                  metric.value
                )}
                {/* <span className={styles.metricsBadge}>{metric.badge}</span> */}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finance__table}>
        <div className={styles.tableCard}>
          <div className={styles.tableTabs}>
            <button
              className={`${styles.tableTab} ${
                activeTab === "transactions" ? styles["is-active"] : ""
              }`}
              type="button"
              onClick={() => setActiveTab("transactions")}
            >
              Transactions
            </button>
            <button
              className={`${styles.tableTab} ${
                activeTab === "recurring" ? styles["is-active"] : ""
              }`}
              type="button"
              onClick={() => setActiveTab("recurring")}
            >
              Recurring Rules
            </button>
            <button
              className={`${styles.tableTab} ${
                activeTab === "vendors" ? styles["is-active"] : ""
              }`}
              type="button"
              onClick={() => setActiveTab("vendors")}
            >
              Vendor Management
            </button>
          </div>

          {tableContent}
        </div>
        {tableFooter}
      </section>

      {isExpenseModalOpen && (
        <div className={styles.modalOverlay} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="expense-modal-title">Record New Expense</h2>
                <p>Create a transaction or log a bill</p>
              </div>
              <button
                className={styles.modalClose}
                type="button"
                onClick={closeExpenseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBodyScroll}>
              <div className={styles.modalBody}>
                <div className={styles.modalField}>
                  <label>Property</label>
                  <div className={styles.propertySelect} ref={propertyMenuRef}>
                    <input
                      type="text"
                      value={propertyQuery}
                      onChange={(event) => {
                        setPropertyQuery(event.target.value);
                        setSelectedPropertyId(null);
                        setReservationId(null);
                        setIsPropertyMenuOpen(true);
                      }}
                      onFocus={() => setIsPropertyMenuOpen(true)}
                      className={styles.propertyInput}
                      placeholder="Search and select a property..."
                      aria-label="Search property"
                    />
                    {isPropertyMenuOpen && (
                      <div className={styles.propertyMenu}>
                        {filteredProperties.length > 0 ? (
                          filteredProperties.map((property) => {
                            const isSelected = selectedPropertyId === property.id;
                            return (
                              <button
                                key={property.id}
                                type="button"
                                className={`${styles.propertyOption} ${
                                  isSelected ? styles.propertyOptionSelected : ""
                                }`}
                                onClick={() => handleSelectProperty(property.id)}
                              >
                                <span>{property.name}</span>
                                {isSelected ? <span>✓</span> : null}
                              </button>
                            );
                          })
                        ) : (
                          <div className={styles.propertyEmpty}>
                            No properties found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.modalGrid}>
                  <div className={styles.modalField}>
                    <label>Category</label>
                    <select
                      value={expenseType}
                      onChange={(event) => setExpenseType(event.target.value)}
                    >
                      <option value="cleaning">Cleaning</option>
                      <option value="rent">Rent</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="fixture">Fixture</option>
                      <option value="market">Market</option>
                      <option value="crediting">Crediting</option>
                      <option value="dues">Dues</option>
                      <option value="invoice">Invoice</option>
                      <option value="tax">Tax</option>
                    </select>
                  </div>
                  <div className={styles.modalField}>
                    <label>Currency</label>
                    <select
                      value={selectedCurrency}
                      onChange={(event) => setSelectedCurrency(event.target.value)}
                    >
                      {currencies.length > 0 ? (
                        currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="USD">USD</option>
                          <option value="TRY">TRY</option>
                          <option value="EUR">EUR</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className={styles.modalField}>
                    <label>Amount</label>
                    <input
                      type="text"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>
                  <div className={styles.modalField}>
                    <label>Date</label>
                    <div className={styles.inputWithIcon}>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(event) => setExpenseDate(event.target.value)}
                        lang="en"
                      />
                    </div>
                  </div>
                  <div className={styles.modalField}>
                    <label>Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(event) =>
                        setPaymentStatus(
                          event.target.value as NonNullable<Expense["payment_status"]>
                        )
                      }
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                  <div className={styles.modalField}>
                    <label>Reservation</label>
                    <select
                      value={reservationId === null ? "" : String(reservationId)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setReservationId(value === "" ? null : Number(value));
                      }}
                      disabled={selectedPropertyId === null}
                    >
                      <option value="">Optional — link a reservation</option>
                      {reservationsForProperty.map((reservation) => (
                        <option key={reservation.id} value={reservation.id}>
                          {reservation.checkin_date} — {reservation.guest_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.modalField}>
                  <label>Description</label>
                  <textarea
                    placeholder="Details about the expense..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <label
                  className={styles.uploadCard}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleUploadDrop}
                >
                  <input
                    type="file"
                    className={styles.uploadInput}
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleUploadChange}
                  />
                  <div>
                    <strong>Upload Receipt / Invoice</strong>
                    <p>PDF, JPG, PNG (Max 5MB)</p>
                    {uploadName && (
                      <span className={styles.uploadName}>{uploadName}</span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {submitError && (
              <div className={styles.modalError} role="alert">
                {submitError}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={closeExpenseModal}
                className={styles.modalSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={handleSaveExpense}
                disabled={isSubmitting || currencies.length === 0}
                title={currencies.length === 0 ? "Loading currencies..." : undefined}
              >
                {isSubmitting ? "Saving..." : "Save Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isScanModalOpen && (
        <div className={styles.modalOverlay} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-invoice-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="scan-invoice-modal-title">Scan Invoice</h2>
                <p>Upload an invoice to extract expense details automatically</p>
              </div>
              <button
                className={styles.modalClose}
                type="button"
                onClick={closeScanModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBodyScroll}>
              <div className={styles.modalBody}>
                <div className={styles.modalEmpty}>
                  <LuScanLine />
                  <h3>OCR Scanner</h3>
                  <p>
                    Upload an invoice to auto-detect vendor, amount, date, and
                    line items.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={closeScanModal}
                className={styles.modalSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isSyncModalOpen && (
        <div className={styles.syncOverlay} role="presentation">
          <div
            className={styles.syncModal}
            role="dialog"
            aria-modal="true"
            aria-live="polite"
          >
            <div
              className={
                syncStep < 3 ? styles.syncIconSpinner : styles.syncIconSuccess
              }
            >
              {syncStep < 3 ? <FiRefreshCw /> : "✓"}
            </div>
            <h3>
              {syncStep === 0 && "Connecting to Bank..."}
              {syncStep === 1 && "Fetching Transactions..."}
              {syncStep === 2 && "Categorizing with AI.."}
              {syncStep === 3 && "Synced Successfully!"}
            </h3>
            <p>Secure connection via Plaid</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceDashboard;
