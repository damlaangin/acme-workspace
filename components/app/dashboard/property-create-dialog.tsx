"use client";

import {
  ChangeEvent,
  FormEvent,
  MouseEventHandler,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { MotionDiv } from "@/components/motion-client";
import { currenciesService } from "@/lib/services/currencies.service";
import { formsService } from "@/lib/services/forms.service";
import { countriesService } from "@/lib/services/countries.service";
import { statesService } from "@/lib/services/states.service";
import { citiesService } from "@/lib/services/cities.service";
import { workspaceService } from "@/lib/services/workspace.service";
import { propertiesService } from "@/lib/services/properties.service";
import { paymentSplitRulesService } from "@/lib/services/payment-split-rules.service";
import type { Currency, Country, State, City } from "@/types/location";
import type { Form, Property, PropertyImage, WorkspaceUser } from "@/types/api";
import Spinner from "@/components/ui/spinner";
import { useWorkspace } from "@/context/workspace-context";
import modalStyles from "@/styles/app/dashboard/Forms.module.scss";
import { FaUpload, FaTrash } from "react-icons/fa6";
import DeleteDialog from "@/components/ui/delete-dialog";
const MapPreview = dynamic(() => import("./property-map-preview"), { ssr: false });

interface PropertyCreateDialogProps {
  property?: Property;
  onClose?: (success: boolean) => void;
}

type UploadableImage = PropertyImage & {
  file: File;
  url: string;
  name: string;
};

type PropertyInstruction = {
  id: number;
  name: string;
  allowed_for_inquiry: boolean;
  content: string;
  created_at: string;
  updated_at: string;
};


export default function PropertyCreateDialog({
  property,
  onClose,
}: PropertyCreateDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedImagesRef = useRef<UploadableImage[]>([]);

  const [isFormPending, setIsFormPending] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadableImage[]>([]);
  const [existingImagesState, setExistingImagesState] = useState<PropertyImage[]>(
    property?.images ?? []
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "property" | "instructions" | "forms" | "images" | "address"
  >("property");

  const existingImages = useMemo(
    () => existingImagesState.map((image) => image.image),
    [existingImagesState]
  );

  const { currentWorkspace } = useWorkspace();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Property Owners
  const [propertyOwners, setPropertyOwners] = useState<WorkspaceUser[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);

  // Forms
  const [formsLoading, setFormsLoading] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [surveyForms, setSurveyForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(
    typeof property?.form === "number"
      ? property.form
      : property?.form?.id ?? null
  );
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(
    typeof property?.owner === "object"
      ? property.owner.id
      : typeof property?.owner === "number"
        ? property.owner
        : null
  );

  const [instructions, setInstructions] = useState<PropertyInstruction[]>([]);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionsError, setInstructionsError] = useState<string | null>(null);
  const [showNewInstruction, setShowNewInstruction] = useState(false);
  const [newInstructionForm, setNewInstructionForm] = useState({
    name: "",
    allowed_for_inquiry: false,
    content: "",
  });
  const [instructionSaving, setInstructionSaving] = useState(false);
  const [instructionDeleting, setInstructionDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "error" | "success";
    message: string;
    details?: string[];
  } | null>(null);

  const formatErrorDetails = (details: unknown): string[] => {
    if (!details || typeof details !== "object") return [];

    const lines: string[] = [];
    const walk = (value: any, path: string[] = []) => {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string") {
            const label = path.length ? path.join(".") : "error";
            lines.push(`${label}: ${item}`);
          } else {
            walk(item, path);
          }
        });
        return;
      }
      if (typeof value === "object") {
        Object.entries(value).forEach(([key, next]) => {
          walk(next, [...path, key]);
        });
        return;
      }
      const label = path.length ? path.join(".") : "error";
      lines.push(`${label}: ${String(value)}`);
    };

    walk(details);
    return lines;
  };

  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  const [mapStatus, setMapStatus] = useState<{ loading: boolean; error?: string }>({
    loading: false,
  });
  const mapKey = useMemo(
    () => `map-${property?.id ?? "new"}-${activeTab}`,
    [property?.id, activeTab]
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [splitRules, setSplitRules] = useState<import("@/types/api").PaymentSplitRule[]>([]);

  type PropertyFormData = {
    name: string;
    room_count: number;
    bathroom_count: number;
    bed_count: number;
    guest_count: number;
    cleaning_fee: number;
    cleaning_fee_currency_id: number | null;
    airbnb_url: string;
    ical_link: string;
    is_active: boolean;
    cleaning_complete_duration: string;
    check_in_time: string;
    check_out_time: string;
    latitude: string;
    longitude: string;
    address_line_1: string;
    address_line_2: string;
    postal_code: string;
    country_id: number | null;
    state_id: number | null;
    city_id: number | null;
    form_id: number | null;
    payment_split_rule: number | null;
    commission_mode: 'default' | 'custom' | 'existing';
    custom_commission_rate: string;
  };

  // Form data
  const [formData, setFormData] = useState<PropertyFormData>({
    name: property?.name ?? "",
    room_count: property?.room_count ?? 1,
    bathroom_count: property?.bathroom_count ?? 1,
    bed_count: property?.bed_count ?? 1,
    guest_count: property?.guest_count ?? 1,
    cleaning_fee: property?.cleaning_payment_fee
      ? Number(property.cleaning_payment_fee.amount)
      : 0,
    cleaning_fee_currency_id: property?.cleaning_payment_fee?.currency?.id ?? null,
    airbnb_url: property?.airbnb_url ?? "",
    ical_link: property?.ical_link ?? "",
    is_active: property?.is_active ?? true,
    cleaning_complete_duration: property?.cleaning_complete_duration ?? "",
    check_in_time: (property as { check_in_time?: string } | undefined)?.check_in_time ?? "",
    check_out_time: (property as { check_out_time?: string } | undefined)?.check_out_time ?? "",
    latitude: String((property as { latitude?: number | string } | undefined)?.latitude ?? ""),
    longitude: String((property as { longitude?: number | string } | undefined)?.longitude ?? ""),
    address_line_1: property?.address?.address_line_1 ?? "",
    address_line_2: property?.address?.address_line_2 ?? "",
    postal_code: property?.address?.postal_code ?? "",
    country_id:
      typeof property?.address?.country === "object"
        ? property.address.country.id
      : (property?.address?.country as number) ?? null,

    state_id:
      typeof property?.address?.state === "object"
        ? property.address.state.id
      : (property?.address?.state as number) ?? null,

    city_id:
      typeof property?.address?.city === "object"
        ? property.address.city.id
      : (property?.address?.city as number) ?? null,

    form_id:
      typeof property?.form === "number"
        ? property.form
      : property?.form?.id ?? null,
    payment_split_rule: property?.payment_split_rule?.id ?? null,
    commission_mode: property?.payment_split_rule
      ? property.payment_split_rule.name.includes("— Custom")
        ? 'custom'
        : 'existing'
      : 'default',
    custom_commission_rate: property?.commission_rate
      ? String(parseFloat(property.commission_rate))
      : '',
  });

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    let active = true;
    paymentSplitRulesService.getAll(currentWorkspace.id).then((res) => {
      if (active && res.success && res.data) {
        setSplitRules(res.data.results);
      }
    });
    return () => { active = false; };
  }, [currentWorkspace?.id]);

  useEffect(() => {
    let active = true;
    const loadCurrencies = async () => {
      const result = await currenciesService.getAllCurrencies();
      if (active && result.success && result.data) {
        setCurrencies(result.data);
        // Set default currency if not already set
        if (!formData.cleaning_fee_currency_id && result.data.length > 0) {
          const defaultCurrency = result.data.find(c => c.code === "TRY") || result.data[0];
          setFormData(prev => ({ ...prev, cleaning_fee_currency_id: defaultCurrency.id }));
        }
      }
    };
    loadCurrencies();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingCountries(true);
    countriesService
      .getAllCountries()
      .then((res) => {
        if (active && res.success && res.data)
          setCountries(res.data);
      })
      .finally(() => setLoadingCountries(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!formData.country_id) {
      setStates([]);
      setCities([]);
      return;
    }
    setLoadingStates(true);
    statesService
      .getStatesByCountry(formData.country_id)
      .then((res) => {
        if (res.success && res.data) setStates(res.data);
      })
      .finally(() => setLoadingStates(false));
  }, [formData.country_id]);

  useEffect(() => {
    if (!formData.state_id) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    citiesService
      .getCitiesByState(formData.state_id)
      .then((res) => {
        if (res.success && res.data) setCities(res.data);
      })
      .finally(() => setLoadingCities(false));
  }, [formData.state_id]);

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setFormsError("No workspace selected.");
      setSurveyForms([]);
      return;
    }
    setFormsLoading(true);
    formsService
      .getForms(currentWorkspace.id)
      .then((res) => {
        if (res.success && res.data?.results) setSurveyForms(res.data.results);
        else setFormsError("Failed to load forms.");
      })
      .catch(() => setFormsError("Failed to load forms."))
      .finally(() => setFormsLoading(false));
  }, [currentWorkspace?.id]);

  // Fetch property owners (users with user_type='property_owner')
  useEffect(() => {
    if (!currentWorkspace?.id) {
      setOwnersError("No workspace selected.");
      setPropertyOwners([]);
      return;
    }
    setLoadingOwners(true);
    setOwnersError(null);
    workspaceService
      .getWorkspaceUsers(currentWorkspace.id, { user_type: "property_owner", is_active: true })
      .then((res) => {
        if (res.success && res.data?.results) {
          setPropertyOwners(res.data.results);
        } else {
          setOwnersError("Failed to load property owners.");
        }
      })
      .catch(() => setOwnersError("Failed to load property owners."))
      .finally(() => setLoadingOwners(false));
  }, [currentWorkspace?.id]);

  useEffect(() => {
    uploadedImagesRef.current = uploadedImages;
  }, [uploadedImages]);
  useEffect(() => {
    setExistingImagesState(property?.images ?? []);
  }, [property?.images]);
  useEffect(() => {
    return () => {
      uploadedImagesRef.current.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, []);

  useEffect(() => {
    setIsMapReady(true);
  }, []);


  const addressQuery = useMemo(() => {
    const countryName =
      countries.find((c) => c.id === formData.country_id)?.name ?? "";
    const stateName = states.find((s) => s.id === formData.state_id)?.name ?? "";
    const cityName = cities.find((c) => c.id === formData.city_id)?.name ?? "";
    const parts = [
      formData.address_line_1,
      formData.address_line_2,
      cityName,
      stateName,
      countryName,
      formData.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  }, [
    formData.address_line_1,
    formData.address_line_2,
    formData.postal_code,
    formData.country_id,
    formData.state_id,
    formData.city_id,
    countries,
    states,
    cities,
  ]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
      });
      const data = (await response.json()) as {
        address?: {
          house_number?: string;
          road?: string;
          postcode?: string;
        };
      };

      const addressLine = [data.address?.house_number, data.address?.road]
        .filter(Boolean)
        .join(" ");

      setFormData((prev) => ({
        ...prev,
        address_line_1: addressLine || prev.address_line_1,
        postal_code: data.address?.postcode || prev.postal_code,
      }));
    } catch (error) {
      console.error("Reverse geocode error:", error);
    }
  };

  const formatInstructionError = (message: string) => {
    if (message.toLowerCase().includes("<!doctype html")) {
      return "Something went wrong on the server while loading instructions.";
    }
    return message;
  };

  useEffect(() => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      setMapPosition([lat, lng]);
    }
  }, [formData.latitude, formData.longitude]);

  useEffect(() => {
    if (!addressQuery || addressQuery.length < 3) return;
    if (!formData.country_id && !formData.state_id && !formData.city_id && !formData.address_line_1) {
      return;
    }

    const controller = new AbortController();
    setMapStatus({ loading: true });
    const timeout = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          addressQuery
        )}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "Accept-Language": "en",
          },
        });
        const data = (await response.json()) as Array<{ lat: string; lon: string }>;
        if (data && data.length > 0) {
          const nextLat = parseFloat(data[0].lat);
          const nextLng = parseFloat(data[0].lon);
          if (!Number.isNaN(nextLat) && !Number.isNaN(nextLng)) {
            setMapPosition([nextLat, nextLng]);
            setFormData((prev) => ({
              ...prev,
              latitude: String(nextLat),
              longitude: String(nextLng),
            }));
          }
        }
        setMapStatus({ loading: false });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setMapStatus({ loading: false, error: "Unable to locate this address." });
        }
      }
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    addressQuery,
    formData.address_line_1,
    formData.country_id,
    formData.state_id,
    formData.city_id,
  ]);

  const resetNewInstructionForm = () => {
    setNewInstructionForm({
      name: "",
      allowed_for_inquiry: false,
      content: "",
    });
    setShowNewInstruction(false);
  };

  const loadPropertyInstructions = async () => {
    if (!currentWorkspace?.id || !property?.id) return;
    setInstructionsLoading(true);
    setInstructionsError(null);
    try {
      const result = await propertiesService.getPropertyInstructions(
        currentWorkspace.id,
        property.id
      );
      if (result.success && result.data) {
        const list = Array.isArray(result.data)
          ? result.data
          : result.data.results ?? [];
        const sorted = [...list].sort((a, b) =>
          String(a.name ?? "").localeCompare(String(b.name ?? ""))
        );
        setInstructions(sorted);
      } else {
        setInstructionsError(result.error?.message || "Failed to load instructions");
      }
    } catch (error) {
      console.error("Instruction load error:", error);
      setInstructionsError("Failed to load instructions");
    } finally {
      setInstructionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "instructions") return;
    if (!property?.id) {
      setInstructions([]);
      return;
    }
    loadPropertyInstructions();
  }, [activeTab, property?.id, currentWorkspace?.id]);

  // Handlers
  const handleDialogClick: MouseEventHandler<HTMLDivElement> = (e) => {
    if (onClose && e.target === dialogRef.current && !isFormPending) {
      onClose(false);
    }
  };

  const handleImageInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (property?.id && currentWorkspace?.id) {
      const baseOrder = existingImagesState.length;
      files.forEach(async (file, index) => {
        const payload = new FormData();
        payload.append("image", file, file.name);
        payload.append("order", String(baseOrder + index));
        const result = await propertiesService.addPropertyImage(
          currentWorkspace.id,
          property.id,
          payload
        );
        if (result.success && result.data) {
          const data = result.data as Partial<PropertyImage> & { image?: string };
          const fallbackUrl = URL.createObjectURL(file);
          setExistingImagesState((prev) => [
            ...prev,
            {
              id: Number(data.id ?? Date.now()),
              image: data.image ?? fallbackUrl,
              order: Number(data.order ?? prev.length),
            },
          ]);
        }
      });
    } else {
      const mapped = files.map((file, index) => ({
        id: Date.now() + index,
        image: "",
        order: index,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
      }));
      setUploadedImages((prev) => [...prev, ...mapped]);
    }
    event.target.value = "";
  };

  const handleImageRemove = (index: number) => {
    setUploadedImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  };

  const handleExistingImageDelete = async (imageId: number) => {
    if (!property?.id || !currentWorkspace?.id) return;
    const result = await propertiesService.deletePropertyImage(
      currentWorkspace.id,
      property.id,
      imageId
    );
    if (result.success) {
      setExistingImagesState((prev) => prev.filter((image) => image.id !== imageId));
    } else {
      setToastMessage({
        type: "error",
        message: result.error?.message || "Failed to delete image",
      });
    }
  };

  const handleInstructionChange = (
    id: number,
    field: "name" | "allowed_for_inquiry" | "content",
    value: string | boolean
  ) => {
    setInstructions((prev) =>
      prev.map((instruction) =>
        instruction.id === id ? { ...instruction, [field]: value } : instruction
      )
    );
  };

  const handleInstructionSave = async (instruction: PropertyInstruction) => {
    if (instructionSaving || !currentWorkspace?.id || !property?.id) return;
    const trimmedName = String(instruction.name ?? "").trim();
    if (!trimmedName) {
      setInstructionsError("Instruction name is required.");
      return;
    }

    setInstructionSaving(true);
    setInstructionsError(null);
    try {
      const payload = {
        name: trimmedName,
        allowed_for_inquiry: Boolean(instruction.allowed_for_inquiry),
        content: instruction.content ?? "",
      };

      const result = await propertiesService.updatePropertyInstruction(
        currentWorkspace.id,
        property.id,
        String(instruction.id),
        payload
      );

      if (result.success) {
        await loadPropertyInstructions();
      } else {
        setInstructionsError(result.error?.message || "Failed to save instruction");
      }
    } catch (error) {
      console.error("Instruction save error:", error);
      setInstructionsError("Failed to save instruction");
    } finally {
      setInstructionSaving(false);
    }
  };

  const handleInstructionDelete = async (instructionId: number) => {
    if (instructionDeleting || !currentWorkspace?.id || !property?.id) return;

    setInstructionDeleting(true);
    setInstructionsError(null);
    try {
      const result = await propertiesService.deletePropertyInstruction(
        currentWorkspace.id,
        property.id,
        String(instructionId)
      );
      if (result.success) {
        await loadPropertyInstructions();
      } else {
        setInstructionsError(result.error?.message || "Failed to delete instruction");
      }
    } catch (error) {
      console.error("Instruction delete error:", error);
      setInstructionsError("Failed to delete instruction");
    } finally {
      setInstructionDeleting(false);
    }
  };

  const handleNewInstructionSave = async () => {
    if (instructionSaving || !currentWorkspace?.id || !property?.id) return;
    const trimmedName = newInstructionForm.name.trim();
    if (!trimmedName) {
      setInstructionsError("Instruction name is required.");
      return;
    }
    setInstructionSaving(true);
    setInstructionsError(null);
    try {
      const payload = {
        name: trimmedName,
        allowed_for_inquiry: newInstructionForm.allowed_for_inquiry,
        content: newInstructionForm.content,
      };
      const result = await propertiesService.createPropertyInstruction(
        currentWorkspace.id,
        property.id,
        payload
      );
      if (result.success) {
        resetNewInstructionForm();
        await loadPropertyInstructions();
      } else {
        setInstructionsError(result.error?.message || "Failed to create instruction");
      }
    } catch (error) {
      console.error("Instruction create error:", error);
      setInstructionsError("Failed to create instruction");
    } finally {
      setInstructionSaving(false);
    }
  };

  // Submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!["property", "forms", "images", "address"].includes(activeTab)) return;
    if (isFormPending || !currentWorkspace?.id) return;
    setIsFormPending(true);
    setToastMessage(null);

    const address = {
      address_line_1: formData.address_line_1,
      address_line_2: formData.address_line_2,
      postal_code: formData.postal_code,
      country: formData.country_id,
      state: formData.state_id,
      city: formData.city_id,
    };

    const cleaningPaymentFee = {
      amount: String(formData.cleaning_fee),
      currency: formData.cleaning_fee_currency_id,
    };

    const payload: Record<string, unknown> = {
      name: formData.name,
      room_count: formData.room_count,
      bathroom_count: formData.bathroom_count,
      bed_count: formData.bed_count,
      guest_count: formData.guest_count,
      cleaning_payment_fee: cleaningPaymentFee,
      airbnb_url: formData.airbnb_url,
      ical_link: formData.ical_link,
      is_active: formData.is_active,
      cleaning_complete_duration: formData.cleaning_complete_duration,
      check_in_time: formData.check_in_time,
      check_out_time: formData.check_out_time,
      address,
    };

    if (selectedFormId) payload.form = selectedFormId;
    if (selectedOwnerId) payload.owner = selectedOwnerId;

    if (formData.commission_mode === 'custom') {
      const rate = parseFloat(formData.custom_commission_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        setToastMessage({
          type: "error",
          message: "Commission rate must be a number between 0 and 100.",
        });
        setIsFormPending(false);
        return;
      }
      payload.custom_commission_rate = (rate / 100).toFixed(4);
    } else if (formData.commission_mode === 'existing') {
      if (!formData.payment_split_rule) {
        setToastMessage({
          type: "error",
          message: "Please select a payment split rule.",
        });
        setIsFormPending(false);
        return;
      }
      payload.payment_split_rule = formData.payment_split_rule;
    } else {
      payload.payment_split_rule = null;
    }

    const latitudeValue = formData.latitude?.trim();
    const longitudeValue = formData.longitude?.trim();
    payload.latitude = latitudeValue ? Number(latitudeValue) : 0;
    payload.longitude = longitudeValue ? Number(longitudeValue) : 0;

    try {
      let result;
      if (property) {
        result = await propertiesService.updateProperty(
          currentWorkspace.id,
          property.id,
          payload
        );
      } else {
        result = await propertiesService.createProperty(currentWorkspace.id, payload);
      }
      
      if (result.success) {
        if (!property && uploadedImages.length > 0 && result.data) {
          const created = result.data as Property;
          const baseOrder = created.images?.length ?? 0;
          for (let index = 0; index < uploadedImages.length; index += 1) {
            const image = uploadedImages[index];
            const imagePayload = new FormData();
            imagePayload.append("image", image.file, image.name);
            imagePayload.append("order", String(baseOrder + index));
            await propertiesService.addPropertyImage(
              currentWorkspace.id,
              created.id,
              imagePayload
            );
          }
        }
        onClose?.(true);
      } else {
        // Show error message to user
        const details = formatErrorDetails(result.error?.details);
        const errorMessage = result.error?.message ?? "Failed to save property";
        setToastMessage({ type: "error", message: errorMessage, details });
        console.error("Property save failed:", result.error ?? result);
      }
    } catch (error) {
      console.error("Property save error:", error);
      setToastMessage({
        type: "error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsFormPending(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      className={modalStyles["form-modal__overlay"]}
      onClick={handleDialogClick}
    >
      <MotionDiv
        variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className={`${modalStyles["form-modal"]} ${modalStyles["form-modal--property"]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className={modalStyles["form-modal__property-form"]}>
          <div className={modalStyles["form-modal__header"]}>
            <h4>{property ? "Edit Property" : "Create New Property"}</h4>
            <button
              type="button"
              className={modalStyles["form-modal__close"]}
              onClick={() => onClose?.(false)}
            >
              ✕
            </button>
          </div>
          {toastMessage?.message ? (
            <div className={modalStyles["form-modal__error"]} role="alert">
              <p>{toastMessage.message}</p>
              {toastMessage.details && toastMessage.details.length > 0 ? (
                <ul className={modalStyles["form-modal__error-list"]}>
                  {toastMessage.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className={modalStyles["form-modal__tabs"]}>
            <button
              type="button"
              className={`${modalStyles["form-modal__tab"]} ${
                activeTab === "property" ? modalStyles["is-active"] : ""
              }`}
              onClick={() => setActiveTab("property")}
            >
              Detail
            </button>
            <button
              type="button"
              className={`${modalStyles["form-modal__tab"]} ${
                activeTab === "address" ? modalStyles["is-active"] : ""
              }`}
              onClick={() => setActiveTab("address")}
            >
              Address
            </button>
            <button
              type="button"
              className={`${modalStyles["form-modal__tab"]} ${
                activeTab === "forms" ? modalStyles["is-active"] : ""
              }`}
              onClick={() => setActiveTab("forms")}
            >
              Forms
            </button>
            <button
              type="button"
              className={`${modalStyles["form-modal__tab"]} ${
                activeTab === "images" ? modalStyles["is-active"] : ""
              }`}
              onClick={() => setActiveTab("images")}
            >
              Images
            </button>
            <button
              type="button"
              className={`${modalStyles["form-modal__tab"]} ${
                activeTab === "instructions" ? modalStyles["is-active"] : ""
              }`}
              onClick={() => setActiveTab("instructions")}
            >
              Instructions
            </button>
          </div>

          <div className={modalStyles["form-modal__content"]}>
          {activeTab === "property" ? (
            <>
              {/* Basic Information */}
              <section className={modalStyles["form-modal__section"]}>
                <div
                  className={`${modalStyles["form-modal__field-grid"]} ${modalStyles["form-modal__field-grid--details"]}`}
                >
                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Property Name <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={modalStyles["form-modal__input"]}
                      placeholder="e.g. Seaside Villa"
                      required
                    />
                  </div>

                  {/* Property Owner */}
                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Property Owner <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    {loadingOwners ? (
                      <Spinner size="1.5rem" color="var(--primary-color)" />
                    ) : ownersError ? (
                      <p className={modalStyles["form-modal__error"]}>{ownersError}</p>
                    ) : propertyOwners.length === 0 ? (
                      <p className={modalStyles["form-modal__help"]}>
                        No property owners available. Create a property owner first.
                      </p>
                    ) : (
                      <select
                        value={selectedOwnerId ?? ""}
                        onChange={(e) => {
                          const nextValue = Number(e.target.value);
                          setSelectedOwnerId(Number.isNaN(nextValue) ? null : nextValue);
                        }}
                        className={modalStyles["form-modal__select"]}
                        required
                      >
                        <option value="">Select Property Owner</option>
                        {propertyOwners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.user.first_name} {owner.user.last_name} ({owner.user.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </section>

              {/* Airbnb Integration */}
              <section className={modalStyles["form-modal__section"]}>
                <div className={modalStyles["form-modal__field-grid"]}>
                  <div className={modalStyles["form-modal__field"]}>
                    <label>Airbnb Listing URL</label>
                    <input
                      type="url"
                      value={formData.airbnb_url}
                      onChange={(e) =>
                        setFormData({ ...formData, airbnb_url: e.target.value })
                      }
                      className={modalStyles["form-modal__input"]}
                      placeholder="https://www.airbnb.com/rooms/..."
                    />
                    <p style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--text-secondary, #6c757d)", 
                      lineHeight: 1.4
                    }}>
                      The Listing ID will be automatically extracted from this URL
                    </p>
                  </div>

                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      iCal Calendar Link <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="url"
                      value={formData.ical_link}
                      onChange={(e) =>
                        setFormData({ ...formData, ical_link: e.target.value })
                      }
                      className={modalStyles["form-modal__input"]}
                      placeholder="https://www.airbnb.com/calendar/ical/..."
                      required
                      pattern="https?://.+"
                      title="Please enter a valid URL starting with http:// or https://"
                    />
                    <p style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--text-secondary, #6c757d)",
                      lineHeight: 1.4
                    }}>
                      Find this in Airbnb → Your Listing → Availability → Export Calendar
                    </p>
                  </div>
                </div>
              </section>

              {/* Property Details */}
              <section className={modalStyles["form-modal__section"]}>
                <div className={modalStyles["form-modal__field-grid"]}>
                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Rooms <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.room_count}
                      onChange={(e) =>
                        setFormData({ ...formData, room_count: Number(e.target.value) })
                      }
                      className={modalStyles["form-modal__input"]}
                      required
                    />
                  </div>

                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Bathrooms <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={formData.bathroom_count}
                      onChange={(e) =>
                        setFormData({ ...formData, bathroom_count: Number(e.target.value) })
                      }
                      className={modalStyles["form-modal__input"]}
                      required
                    />
                  </div>
                  
                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Beds <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.bed_count}
                      onChange={(e) =>
                        setFormData({ ...formData, bed_count: Number(e.target.value) })
                      }
                      className={modalStyles["form-modal__input"]}
                      required
                    />
                  </div>

                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Guest Capacity <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.guest_count}
                      onChange={(e) =>
                        setFormData({ ...formData, guest_count: Number(e.target.value) })
                      }
                      className={modalStyles["form-modal__input"]}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Timeslots */}
              <section className={modalStyles["form-modal__section"]}>
                <div className={modalStyles["form-modal__field-grid"]}>
                  <div
                    className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__field--span-2"]}`}
                  >
                    <label>
                      Check-in Time (HH:MM:SS) <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.check_in_time}
                      onChange={(e) =>
                        setFormData({ ...formData, check_in_time: e.target.value })
                      }
                      placeholder="17:00:00"
                      className={modalStyles["form-modal__input"]}
                      pattern="[0-9]{1,2}:[0-9]{2}:[0-9]{2}"
                      title="Format: HH:MM:SS"
                      required
                    />
                  </div>

                  <div
                    className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__field--span-2"]}`}
                  >
                    <label>
                      Check-out Time (HH:MM:SS) <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.check_out_time}
                      onChange={(e) =>
                        setFormData({ ...formData, check_out_time: e.target.value })
                      }
                      placeholder="11:00:00"
                      className={modalStyles["form-modal__input"]}
                      pattern="[0-9]{1,2}:[0-9]{2}:[0-9]{2}"
                      title="Format: HH:MM:SS"
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Cleaning Configuration */}
              <section className={modalStyles["form-modal__section"]}>
                <div
                  className={`${modalStyles["form-modal__field-grid"]} ${modalStyles["form-modal__field-grid--triple"]}`}
                >
                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Cleaning Duration (HH:MM:SS) <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cleaning_complete_duration}
                      onChange={(e) =>
                        setFormData({ ...formData, cleaning_complete_duration: e.target.value })
                      }
                      placeholder="02:00:00"
                      className={modalStyles["form-modal__input"]}
                      pattern="[0-9]{1,2}:[0-9]{2}:[0-9]{2}"
                      title="Format: HH:MM:SS"
                      required
                    />
                  </div>

                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Cleaning Fee <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.cleaning_fee}
                      onChange={(e) =>
                        setFormData({ ...formData, cleaning_fee: Number(e.target.value) })
                      }
                      className={modalStyles["form-modal__input"]}
                      required
                    />
                  </div>

                  <div className={modalStyles["form-modal__field"]}>
                    <label>
                      Currency <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                    </label>
                    <select
                      value={formData.cleaning_fee_currency_id ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cleaning_fee_currency_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className={modalStyles["form-modal__select"]}
                      required
                    >
                      <option value="">Select Currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Commission Split */}
              <section className={modalStyles["form-modal__section"]}>
                <div className={modalStyles["form-modal__field"]}>
                  <label>Commission Split</label>
                  <div className={modalStyles["form-modal__commission-row"]}>
                    <select
                      value={formData.commission_mode}
                      onChange={(e) => {
                        const nextMode = e.target.value as typeof formData.commission_mode;
                        if (nextMode === "default") {
                          setFormData({
                            ...formData,
                            commission_mode: "default",
                            payment_split_rule: null,
                          });
                          return;
                        }
                        if (nextMode === "custom") {
                          setFormData({
                            ...formData,
                            commission_mode: "custom",
                            payment_split_rule: null,
                          });
                          return;
                        }
                        setFormData({ ...formData, commission_mode: "existing" });
                      }}
                      className={modalStyles["form-modal__select"]}
                    >
                      <option value="default">Workspace Default</option>
                      <option value="custom">Custom Commission</option>
                      <option value="existing">Existing Rule</option>
                    </select>

                    {formData.commission_mode === "custom" && (
                      <div className={modalStyles["form-modal__commission-inline"]}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={formData.custom_commission_rate}
                          onChange={(e) =>
                            setFormData({ ...formData, custom_commission_rate: e.target.value })
                          }
                          placeholder="e.g. 18"
                          className={modalStyles["form-modal__small-input"]}
                        />
                        <span className={modalStyles["form-modal__commission-hint"]}>%</span>
                      </div>
                    )}

                    {formData.commission_mode === "existing" && (() => {
                      const defaultRuleId = splitRules.find((rule) => rule.is_default)?.id ?? null;
                      const selectedRuleId = formData.payment_split_rule ?? defaultRuleId ?? "";
                      return (
                        <select
                          value={selectedRuleId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              payment_split_rule: Number(e.target.value),
                            })
                          }
                          className={modalStyles["form-modal__select"]}
                        >
                          {splitRules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.name}
                              {rule.is_default ? " (default)" : ""}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  {formData.commission_mode === "default" && (() => {
                    const defaultRule = splitRules.find((r) => r.is_default);
                    if (!defaultRule) return null;
                    const cohostLine = defaultRule.rules.find(
                      (l) => l.rule_type === "percent" && l.party === "cohost"
                    );
                    const pct = cohostLine?.percent
                      ? `${parseFloat(cohostLine.percent)}%`
                      : null;
                    return (
                      <span className={modalStyles["form-modal__commission-hint"]}>
                        {defaultRule.name}{pct ? ` \u2014 ${pct} commission` : ""}
                      </span>
                    );
                  })()}
                </div>
              </section>

            </>
          ) : activeTab === "address" ? (
            <section className={modalStyles["form-modal__section"]}>
              <div className={modalStyles["form-modal__map"]}>
                <div className={modalStyles["form-modal__map-header"]}>
                  <div>
                    <h4>Map Preview</h4>
                    <p>Click on the map to set coordinates.</p>
                  </div>
                  {mapStatus.loading ? (
                    <span className={modalStyles["form-modal__map-status"]}>
                      Locating address...
                    </span>
                  ) : mapStatus.error ? (
                    <span className={modalStyles["form-modal__map-error"]}>
                      {mapStatus.error}
                    </span>
                  ) : null}
                </div>
                <div className={modalStyles["form-modal__map-canvas"]}>
                  {isMapReady && (
                    <MapPreview
                      mapKey={mapKey}
                      center={mapPosition ?? [37.7749, -122.4194]}
                      zoom={mapPosition ? 14 : 4}
                      markerPosition={mapPosition ?? undefined}
                      onSelect={(lat, lng) => {
                        setFormData((prev) => ({
                          ...prev,
                          latitude: String(lat),
                          longitude: String(lng),
                        }));
                        reverseGeocode(lat, lng);
                      }}
                      className={modalStyles["form-modal__map-container"]}
                    />
                  )}
                </div>
              </div>
              <div className={modalStyles["form-modal__field-grid"]}>
                <div
                  className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__field--span-2"]}`}
                >
                  <label>Address Line 1</label>
                  <input
                    type="text"
                    value={formData.address_line_1}
                    onChange={(e) =>
                      setFormData({ ...formData, address_line_1: e.target.value })
                    }
                    className={modalStyles["form-modal__input"]}
                    required
                  />
                </div>
                <div
                  className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__field--span-2"]}`}
                >
                  <label>Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address_line_2}
                    onChange={(e) =>
                      setFormData({ ...formData, address_line_2: e.target.value })
                    }
                    className={modalStyles["form-modal__input"]}
                  />
                </div>
                <div className={modalStyles["form-modal__field"]}>
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                    className={modalStyles["form-modal__input"]}
                  />
                </div>
                <div className={modalStyles["form-modal__field"]}>
                  <label>Country</label>
                  {loadingCountries ? (
                    <Spinner size="1.5rem" color="var(--primary-color)" />
                  ) : (
                    <select
                      value={formData.country_id ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          country_id: e.target.value
                            ? Number(e.target.value)
                            : null,
                          state_id: null,
                          city_id: null,
                        })
                      }
                      className={modalStyles["form-modal__select"]}
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={modalStyles["form-modal__field"]}>
                  <label>State</label>
                  {loadingStates ? (
                    <Spinner size="1.5rem" color="var(--primary-color)" />
                  ) : (
                    <select
                      value={formData.state_id ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          state_id: e.target.value ? Number(e.target.value) : null,
                          city_id: null,
                        })
                      }
                      className={modalStyles["form-modal__select"]}
                      disabled={!formData.country_id}
                      required
                    >
                      <option value="">Select State</option>
                      {states.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={modalStyles["form-modal__field"]}>
                  <label>City</label>
                  {loadingCities ? (
                    <Spinner size="1.5rem" color="var(--primary-color)" />
                  ) : (
                    <select
                      value={formData.city_id ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          city_id: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={modalStyles["form-modal__select"]}
                      disabled={!formData.state_id}
                      required
                    >
                      <option value="">Select City</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__field--span-2"]}`}>
                  <label>Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    className={modalStyles["form-modal__input"]}
                    placeholder="e.g. 37.7749"
                  />
                </div>
                <div className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__field--span-2"]}`}>
                  <label>Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    className={modalStyles["form-modal__input"]}
                    placeholder="e.g. -122.4194"
                  />
                </div>
              </div>
            </section>
          ) : activeTab === "forms" ? (
            <section className={modalStyles["form-modal__section"]}>
              {formsLoading ? (
                <div className={modalStyles["form-modal__section-loading"]}>
                  <Spinner size="2rem" color="var(--primary-hover-color)" />
                </div>
              ) : formsError ? (
                <p className={modalStyles["form-modal__error"]}>{formsError}</p>
              ) : surveyForms.length === 0 ? (
                <p className={modalStyles["form-modal__help"]}>
                  No forms available for this workspace yet.
                </p>
              ) : (
                <div className={modalStyles["form-modal__survey-select-wrapper"]}>
                  <select
                    className={modalStyles["form-modal__survey-select"]}
                    value={selectedFormId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSelectedFormId(value ? Number(value) : null);
                    }}
                  >
                    <option value="">Choose a Form</option>
                    {surveyForms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.title ?? form.name ?? "Untitled form"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className={modalStyles["form-modal__help"]}>
                Staff will be prompted with this form when interacting with the property.
              </p>
            </section>
          ) : activeTab === "images" ? (
            <section className={modalStyles["form-modal__section"]}>

              <div className={modalStyles["form-modal__image-uploader"]}>
                {property && existingImagesState.length > 0 && (
                  <div className={modalStyles["form-modal__image-grid"]}>
                    {existingImagesState.map((image) => (
                      <div
                        key={image.id}
                        className={modalStyles["form-modal__image-item"]}
                      >
                        <img src={image.image} alt="Property image" />
                        <button
                          type="button"
                          className={modalStyles["form-modal__image-remove"]}
                          onClick={() => handleExistingImageDelete(image.id)}
                          aria-label="Remove existing image"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div className={modalStyles["form-modal__image-grid"]}>
                    {uploadedImages.map((image, index) => (
                      <div
                        key={`${image.name}-${index}`}
                        className={modalStyles["form-modal__image-item"]}
                      >
                        <img src={image.url} alt={image.name} />
                        <button
                          type="button"
                          className={modalStyles["form-modal__image-remove"]}
                          onClick={() => handleImageRemove(index)}
                          aria-label={`Remove ${image.name}`}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className={modalStyles["form-modal__image-actions"]}>
                  <button
                    type="button"
                    className={modalStyles["form-modal__image-add"]}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FaUpload /> {property ? "Add more images" : "Upload images"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageInput}
                    className={modalStyles["form-modal__image-input"]}
                  />
                </div>

                <p className={modalStyles["form-modal__help"]}>
                  {property
                    ? existingImagesState.length > 0
                      ? "Existing gallery is shown above. Add new photos if you need to update the listing."
                      : "No images yet. Upload photos to showcase the property."
                    : "Upload property photos (JPEG, PNG)."}
                </p>
              </div>
            </section>
          ) : (
            <section className={modalStyles["form-modal__section"]}>
              {!property?.id ? (
                <p className={modalStyles["form-modal__help"]}>
                  Save the property first to manage instructions.
                </p>
              ) : (
                <div className={modalStyles["form-modal__instructions"]}>
                  <div className={modalStyles["form-modal__instruction-list"]}>
                    <div className={modalStyles["form-modal__instruction-header"]}>
                      <div className={modalStyles["form-modal__section-title"]}>
                        Instructions
                      </div>
                    </div>

                    {instructionsLoading ? (
                      <div className={modalStyles["form-modal__section-loading"]}>
                        <Spinner size="1.5rem" color="var(--primary-hover-color)" />
                      </div>
                    ) : instructionsError ? (
                      <p className={modalStyles["form-modal__error"]}>
                        {formatInstructionError(instructionsError)}
                      </p>
                    ) : instructions.length === 0 ? (
                      <p className={modalStyles["form-modal__warning"]}>
                        No instructions yet. There is nothing to see here.
                      </p>
                    ) : (
                      <div className={modalStyles["form-modal__instruction-items"]}>
                        {instructions.map((instruction) => (
                          <div
                            key={instruction.id}
                            className={modalStyles["form-modal__instruction-item"]}
                          >
                            <div className={modalStyles["form-modal__instruction-fields"]}>
                              <div className={modalStyles["form-modal__field"]}>
                                <label>Instruction Name</label>
                                <input
                                  type="text"
                                  className={modalStyles["form-modal__input"]}
                                  value={instruction.name}
                                  onChange={(e) =>
                                    handleInstructionChange(
                                      instruction.id,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>

                              <label className={modalStyles["form-modal__toggle"]}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(instruction.allowed_for_inquiry)}
                                  onChange={(e) =>
                                    handleInstructionChange(
                                      instruction.id,
                                      "allowed_for_inquiry",
                                      e.target.checked
                                    )
                                  }
                                />
                                <span className={modalStyles["form-modal__toggle-track"]} />
                                <span className={modalStyles["form-modal__toggle-label"]}>
                                  Allowed for inquiry
                                </span>
                              </label>

                              <div className={modalStyles["form-modal__field"]}>
                                <label>Content</label>
                                <textarea
                                  className={modalStyles["form-modal__textarea"]}
                                  rows={4}
                                  value={instruction.content}
                                  onChange={(e) =>
                                    handleInstructionChange(
                                      instruction.id,
                                      "content",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <div className={modalStyles["form-modal__instruction-actions"]}>
                              <button
                                type="button"
                                className={modalStyles["form-modal__save-button"]}
                                onClick={() => handleInstructionSave(instruction)}
                                disabled={instructionSaving}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className={modalStyles["form-modal__delete"]}
                                onClick={() => handleInstructionDelete(instruction.id)}
                                disabled={instructionDeleting}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={modalStyles["form-modal__instruction-add"]}>
                      {showNewInstruction ? (
                        <div className={modalStyles["form-modal__instruction-new"]}>
                          <div className={modalStyles["form-modal__field"]}>
                            <label>
                              Instruction Name{" "}
                              <span style={{ color: "var(--error-color, #dc3545)" }}>*</span>
                            </label>
                            <input
                              type="text"
                              className={modalStyles["form-modal__input"]}
                              value={newInstructionForm.name}
                              onChange={(e) =>
                                setNewInstructionForm((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <label className={modalStyles["form-modal__toggle"]}>
                            <input
                              type="checkbox"
                              checked={newInstructionForm.allowed_for_inquiry}
                              onChange={(e) =>
                                setNewInstructionForm((prev) => ({
                                  ...prev,
                                  allowed_for_inquiry: e.target.checked,
                                }))
                              }
                            />
                            <span className={modalStyles["form-modal__toggle-track"]} />
                            <span className={modalStyles["form-modal__toggle-label"]}>
                              Allowed for inquiry
                            </span>
                          </label>

                          <div className={modalStyles["form-modal__field"]}>
                            <label>Content</label>
                            <textarea
                              className={modalStyles["form-modal__textarea"]}
                              rows={6}
                              value={newInstructionForm.content}
                              onChange={(e) =>
                                setNewInstructionForm((prev) => ({
                                  ...prev,
                                  content: e.target.value,
                                }))
                              }
                            />
                          </div>

                          <div className={modalStyles["form-modal__instruction-actions"]}>
                            <button
                              type="button"
                              className={modalStyles["form-modal__cancel"]}
                              onClick={resetNewInstructionForm}
                              disabled={instructionSaving}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className={modalStyles["form-modal__save"]}
                              onClick={handleNewInstructionSave}
                              disabled={instructionSaving}
                            >
                              {instructionSaving ? "Saving..." : "Create Instruction"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={modalStyles["form-modal__add-button"]}
                          onClick={() => setShowNewInstruction(true)}
                        >
                          Add New Instruction
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          </div>

          {/* ACTIONS */}
          <div className={modalStyles["form-modal__actions"]}>
            <button
              type="button"
              className={modalStyles["form-modal__cancel"]}
              onClick={() => onClose?.(false)}
              disabled={isFormPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className={modalStyles["form-modal__delete"]}
              onClick={() => setShowDeleteDialog(true)}
              disabled={!property?.id || isFormPending || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              type="submit"
              className={modalStyles["form-modal__save"]}
              disabled={isFormPending}
            >
              {isFormPending
                ? "Saving..."
                : property
                ? "Save Changes"
                : "Create Property"}
            </button>
          </div>
        </form>
      </MotionDiv>
      {showDeleteDialog && property?.id && (
        <DeleteDialog
          message={`Are you sure you want to delete ${property.name ?? "this property"}?`}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            if (!currentWorkspace?.id) {
              setToastMessage({ type: "error", message: "Workspace not selected" });
              setShowDeleteDialog(false);
              return;
            }
            setIsDeleting(true);
            setToastMessage(null);
            const result = await propertiesService.deleteProperty(
              currentWorkspace.id,
              property.id,
            );
            const success = result.success;
            setIsDeleting(false);
            setShowDeleteDialog(false);
            if (success) {
              onClose?.(true);
            } else {
              setToastMessage({ type: "error", message: result.error?.message || "Failed to delete property" });
            }
          }}
        />
      )}
    </div>
  );
}
