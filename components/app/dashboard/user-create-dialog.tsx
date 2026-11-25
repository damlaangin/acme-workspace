// user-create-dialog.tsx
"use client";

import {
  ChangeEventHandler,
  FormEventHandler,
  MouseEventHandler,
  useEffect,
  useRef,
  useState,
} from "react";
import PhoneInput from "react-phone-input-2";
import { FaUpload, FaImage } from "react-icons/fa6";
import { LuEye, LuEyeClosed } from "react-icons/lu";

import { MotionDiv } from "@/components/motion-client";
import { workspaceService } from "@/lib/services/workspace.service";
import { propertiesService } from "@/lib/services/properties.service";

import modalStyles from "@/styles/app/dashboard/Forms.module.scss";
import type { Property, WorkspaceUserCreate, WorkspaceUserPatch } from "@/types/api";
import Spinner from "@/components/ui/spinner";
import { useWorkspace } from "@/context/workspace-context";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const PROPERTIES_PAGE_SIZE = 1000;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Failed to read the selected image"));
    reader.readAsDataURL(file);
  });

type PhoneFormInputProps = {
  name?: string;
  country?: string | number;
  value?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

const allowedUserTypes = [
  "app_user",
  "property_owner",
  "staff",
  "workspace_admin",
] as const;
type AllowedUserType = (typeof allowedUserTypes)[number];

const normalizeUserType = (value?: string | null): AllowedUserType =>
  allowedUserTypes.includes(value as AllowedUserType)
    ? (value as AllowedUserType)
    : "app_user";

const PhoneFormInput: React.FC<PhoneFormInputProps> = ({
  name,
  country,
  value,
  required,
  onChange,
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const handlePhoneChange = (newValue: string) => {
    onChange?.(newValue.startsWith("+") ? newValue : `+${newValue}`);
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = newValue.startsWith("+")
        ? newValue
        : `+${newValue}`;
    }
  };

  useEffect(() => {
    if (value && hiddenInputRef.current) {
      hiddenInputRef.current.value = value.startsWith("+")
        ? value
        : `+${value}`;
    }
  }, [value]);

  return (
    <>
      <PhoneInput
        country={country}
        value={value}
        inputStyle={{
          width: "100%",
          height: "40px",
          paddingLeft: "3rem",
          border: "1px solid var(--slate-300)",
          borderRadius: "0.5rem",
          fontSize: "0.95rem",
        }}
        buttonStyle={{
          backgroundColor: "transparent",
          border: "none",
        }}
        containerStyle={{ width: "100%" }}
        dropdownStyle={{ marginTop: "-4px" }}
        onChange={handlePhoneChange}
        enableSearch={false}
        specialLabel=""
        inputProps={{ id: name, placeholder: "" }}
      />
      <input
        type="hidden"
        name={name}
        ref={hiddenInputRef}
        required={required}
      />
    </>
  );
};

interface UserEditData {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  user_type?: string | null;
  is_active?: boolean;
  profile_image_url?: string | null;
  role_id?: number | null;
  membership_id?: number;
}

interface RoleOption {
  id: number;
  name: string;
  permissions: string[] | number[];
}

interface UserCreateDialogProps {
  user?: UserEditData;
  onClose?: (success: boolean) => void;
  allRoles?: RoleOption[];
}

const FormActionButtons = ({
  onCancel,
  isPending,
  saveDisabled = false,
}: {
  onCancel?: () => void;
  isPending: boolean;
  saveDisabled?: boolean;
}) => {
  return isPending ? (
    <div className={modalStyles["form-modal__section-loading"]}>
      <Spinner size="2rem" color="var(--primary-hover-color)" />
    </div>
  ) : (
    <div className={modalStyles["form-modal__actions"]}>
      <button
        className={modalStyles["form-modal__cancel"]}
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        className={modalStyles["form-modal__save"]}
        type="submit"
        disabled={saveDisabled}
      >
        Save
      </button>
    </div>
  );
};

export default function UserCreateDialog({
  user,
  onClose,
  allRoles,
}: UserCreateDialogProps) {
  const [preview, setPreview] = useState<string | null>(
    user?.profile_image_url || null
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const mountedRef = useRef(false);

  const initialRoleId = user?.role_id ?? null;

  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    role_id: number | null;
    user_type: AllowedUserType;
    is_active: boolean;
    image: File | null;
  }>({
    username: user?.username || "",
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone_number: user?.phone_number || "",
    role_id: initialRoleId,
    user_type: normalizeUserType(user?.user_type),
    is_active: user?.is_active ?? true,
    image: null,
  });

  const { currentWorkspace } = useWorkspace();

  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [currentlyOwnedProperties, setCurrentlyOwnedProperties] = useState<
    Property[]
  >([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [propertiesTruncated, setPropertiesTruncated] = useState(false);
  const [isPropertyMenuOpen, setIsPropertyMenuOpen] = useState(false);
  const [showOwnedProperties, setShowOwnedProperties] = useState(false);
  const propertyMenuRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    onClose?.(false);
  };

  const handleDialogClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!isPending && event.target === dialogRef.current) {
      handleClose();
    }
  };

  const handleImageChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.item(0);
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        setErrorMessage("Image must be under 5MB");
        return;
      }
      setErrorMessage(null);
      const previewUrl = URL.createObjectURL(file);

      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      setFormData((prev) => ({ ...prev, image: file }));
      setIsDirty(true);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (isPending) return;
    if (!currentWorkspace) {
      console.error("No workspace selected. Unable to submit user form.");
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    const userFields = {
      username: formData.username,
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone: formData.phone_number,
      ...(formData.image
        ? { profile_picture: await fileToBase64(formData.image) }
        : {}),
    };

    const payload: WorkspaceUserCreate | WorkspaceUserPatch = {
      user_type: formData.user_type,
      is_active: formData.is_active,
      groups: formData.role_id ? [formData.role_id] : [],
      user: userFields,
      ...(formData.user_type === "property_owner" &&
      selectedPropertyIds.length > 0
        ? { assigned_property_ids: selectedPropertyIds }
        : {}),
    };

    try {
      const response = user
        ? await workspaceService.patchWorkspaceUser(
            currentWorkspace.id,
            user.id,
            payload
          )
        : await workspaceService.createWorkspaceUser(
            currentWorkspace.id,
            payload as WorkspaceUserCreate
          );

      if (response.success) {
        onClose?.(true);
      } else {
        setErrorMessage(
          response.error?.message || "Failed to create workspace user"
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Request failed"
      );
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { mountedRef.current = true; }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setRoles(allRoles || []);
  }, [allRoles]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        propertyMenuRef.current &&
        !propertyMenuRef.current.contains(event.target as Node)
      ) {
        setIsPropertyMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (formData.user_type !== "property_owner" || !currentWorkspace?.id) {
      setAvailableProperties([]);
      setCurrentlyOwnedProperties([]);
      return;
    }

    let cancelled = false;
    setPropertiesLoading(true);
    setPropertiesError(null);
    setPropertiesTruncated(false);

    propertiesService
      .getProperties(currentWorkspace.id, { page_size: PROPERTIES_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.results) {
          const sorted = [...res.data.results].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          const currentUserId = user?.id;
          const owned = currentUserId
            ? sorted.filter((p) => p.owner?.id === currentUserId)
            : [];
          const ownedIds = new Set(owned.map((p) => p.id));
          const available = sorted.filter((p) => !ownedIds.has(p.id));
          setCurrentlyOwnedProperties(owned);
          setAvailableProperties(available);
          setPropertiesTruncated(res.data.count > PROPERTIES_PAGE_SIZE);
        } else {
          setPropertiesError(
            res.error?.message || "Failed to load properties."
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setPropertiesError(
          error instanceof Error ? error.message : "Failed to load properties."
        );
      })
      .finally(() => {
        if (!cancelled) setPropertiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formData.user_type, currentWorkspace?.id, user?.id]);

  useEffect(() => {
    if (formData.user_type !== "property_owner") {
      setSelectedPropertyIds([]);
      setPropertySearch("");
      setIsPropertyMenuOpen(false);
      setShowOwnedProperties(false);
    }
  }, [formData.user_type]);

  const getPropertyOwnerLabel = (property: Property) => {
    const ownerUser = property.owner?.user;
    if (!ownerUser) return "";
    const fullName = `${ownerUser.first_name ?? ""} ${
      ownerUser.last_name ?? ""
    }`.trim();
    return fullName || ownerUser.username || ownerUser.email || "";
  };

  const getPropertyOptionLabel = (property: Property) => {
    const ownerLabel = getPropertyOwnerLabel(property);
    return ownerLabel ? `${property.name} (${ownerLabel})` : property.name;
  };

  const filteredAvailableProperties = availableProperties.filter((property) => {
    if (!propertySearch.trim()) return true;
    const searchTerm = propertySearch.trim().toLowerCase();
    return getPropertyOptionLabel(property).toLowerCase().includes(searchTerm);
  });

  const togglePropertySelected = (propertyId: number) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
    setIsDirty(true);
  };

  return (
    <div
      ref={dialogRef}
      className={modalStyles["form-modal__overlay"]}
      onClick={handleDialogClick}
    >
      <MotionDiv
        variants={{
          hidden: { opacity: 0, y: 30 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className={`${modalStyles["form-modal"]} ${modalStyles["form-modal--user"]}`}
        onClick={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={handleSubmit}
          onChange={() => { if (mountedRef.current) setIsDirty(true); }}
          className={modalStyles["form-modal__user-form"]}
        >
          <div className={modalStyles["form-modal__header"]}>
            <h4>{user ? "Edit User" : "Create New User"}</h4>
            <button
              type="button"
              className={modalStyles["form-modal__close"]}
              onClick={handleClose}
              aria-label="Close"
              disabled={isPending}
            >
              ✕
            </button>
          </div>

          <div className={modalStyles["form-modal__user-content"]}>
            <div className={modalStyles["form-modal__user-intro"]}>
              <div className={modalStyles["form-modal__workspace-media"]}>
                <div className={modalStyles["form-modal__workspace-preview"]}>
                  {preview ? (
                    <img
                      src={preview}
                      alt="User preview"
                      className={modalStyles["form-modal__workspace-image"]}
                    />
                  ) : (
                    <FaImage className={modalStyles["form-modal__workspace-icon"]} />
                  )}
                </div>

                <button
                  type="button"
                  className={modalStyles["form-modal__workspace-upload"]}
                  onClick={() => inputRef.current?.click()}
                  disabled={isPending}
                >
                  <FaUpload /> Upload Picture
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  name="image"
                  onChange={handleImageChange}
                  className={modalStyles["form-modal__workspace-file-input"]}
                  disabled={isPending}
                />
              </div>

              <div className={modalStyles["form-modal__user-intro-fields"]}>
                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="username"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        username: event.target.value,
                      }))
                    }
                    required
                    className={modalStyles["form-modal__input"]}
                  />
                </div>

                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    required
                    className={modalStyles["form-modal__input"]}
                  />
                </div>
              </div>
            </div>

            <div className={modalStyles["form-modal__section"]}>
              <div className={modalStyles["form-modal__user-grid"]}>
                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="first_name"
                  >
                    First Name
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    name="first_name"
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_name: event.target.value,
                      }))
                    }
                    required
                    className={modalStyles["form-modal__input"]}
                  />
                </div>

                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="last_name"
                  >
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_name: event.target.value,
                      }))
                    }
                    required
                    className={modalStyles["form-modal__input"]}
                  />
                </div>
              </div>

              <div className={modalStyles["form-modal__user-grid"]}>
                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="phone_number"
                  >
                    Phone Number
                  </label>
                  <PhoneFormInput
                    name="phone_number"
                    country="tr"
                    value={formData.phone_number}
                    onChange={(phone) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone_number: phone,
                      }))
                    }
                    required
                  />
                </div>

                {user && (
                  <div className={modalStyles["form-modal__field"]}>
                    <label
                      className={modalStyles["form-modal__label"]}
                      htmlFor="is_active"
                    >
                      Status
                    </label>
                    <select
                      id="is_active"
                      name="is_active"
                      value={String(formData.is_active)}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          is_active: event.target.value === "true",
                        }))
                      }
                      className={modalStyles["form-modal__select"]}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={modalStyles["form-modal__user-grid"]}>
                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="role_id"
                  >
                    Role
                  </label>
                  <select
                    id="role_id"
                    name="role_id"
                    value={formData.role_id ?? ""}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        role_id: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                    className={modalStyles["form-modal__select"]}
                  >
                    <option value="">No Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={modalStyles["form-modal__field"]}>
                  <label
                    className={modalStyles["form-modal__label"]}
                    htmlFor="user_type"
                  >
                    User Type
                  </label>
                  <select
                    id="user_type"
                    name="user_type"
                    value={formData.user_type}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        user_type: event.target.value as typeof formData.user_type,
                      }))
                    }
                    required
                    className={modalStyles["form-modal__select"]}
                  >
                    <option value="app_user">App User</option>
                    <option value="property_owner">Property Owner</option>
                    <option value="staff">Staff</option>
                    <option value="workspace_admin">Admin</option>
                  </select>
                </div>
              </div>

              {formData.user_type === "property_owner" && (
                <div
                  className={`${modalStyles["form-modal__field"]} ${modalStyles["form-modal__property-owner-fields"]}`}
                >
                  {propertiesLoading ? (
                    <div className={modalStyles["form-modal__property-loading"]}>
                      <Spinner size="1.25rem" color="var(--primary-hover-color)" />
                      <span style={{ marginLeft: "0.5rem" }}>
                        Loading properties...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className={modalStyles["form-modal__property-block"]}>
                        <label
                          className={modalStyles["form-modal__label"]}
                          htmlFor="property_search"
                        >
                          Assign Properties
                        </label>
                        <div
                          className={modalStyles["propertySelect"]}
                          ref={propertyMenuRef}
                        >
                          <div className={modalStyles["propertyPills"]}>
                            {selectedPropertyIds.length > 0 ? (
                              selectedPropertyIds.map((id) => {
                                const property = availableProperties.find(
                                  (item) => item.id === id
                                );
                                return (
                                  <span
                                    key={id}
                                    className={modalStyles["propertyPill"]}
                                  >
                                    {property?.name ?? "Unknown"}
                                    <button
                                      type="button"
                                      className={
                                        modalStyles["propertyPillRemove"]
                                      }
                                      onClick={() => togglePropertySelected(id)}
                                      aria-label="Remove property"
                                      disabled={isPending}
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })
                            ) : (
                              <span
                                className={modalStyles["propertyPlaceholder"]}
                              >
                                Search property...
                              </span>
                            )}
                          </div>
                          <input
                            id="property_search"
                            type="text"
                            placeholder=""
                            value={propertySearch}
                            onChange={(event) =>
                              setPropertySearch(event.target.value)
                            }
                            onFocus={() => setIsPropertyMenuOpen(true)}
                            className={modalStyles["propertyInput"]}
                            disabled={isPending}
                            aria-label="Search property"
                          />
                          {isPropertyMenuOpen && (
                            <div className={modalStyles["propertyMenu"]}>
                              {filteredAvailableProperties.length === 0 ? (
                                <div className={modalStyles["propertyEmpty"]}>
                                  No properties found.
                                </div>
                              ) : (
                                filteredAvailableProperties.map((property) => {
                                  const isSelected =
                                    selectedPropertyIds.includes(property.id);
                                  const ownerLabel =
                                    getPropertyOwnerLabel(property);
                                  return (
                                    <button
                                      key={property.id}
                                      type="button"
                                      className={`${
                                        modalStyles["propertyOption"]
                                      } ${
                                        isSelected
                                          ? modalStyles[
                                              "propertyOptionSelected"
                                            ]
                                          : ""
                                      }`}
                                      onClick={() =>
                                        togglePropertySelected(property.id)
                                      }
                                      disabled={isPending}
                                    >
                                      <span>
                                        {property.name}
                                        {ownerLabel && (
                                          <span
                                            className={
                                              modalStyles[
                                                "propertyOptionOwner"
                                              ]
                                            }
                                          >
                                            {" "}
                                            ({ownerLabel})
                                          </span>
                                        )}
                                      </span>
                                      {isSelected ? <span>✓</span> : null}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                        {propertiesTruncated && (
                          <p
                            className={
                              modalStyles["form-modal__property-truncation-hint"]
                            }
                          >
                            Showing first 1000 properties — refine your search to
                            find more.
                          </p>
                        )}
                        {propertiesError ? (
                          <p className={modalStyles["form-modal__error"]}>
                            {propertiesError}
                          </p>
                        ) : null}
                      </div>

                      {currentlyOwnedProperties.length > 0 && (
                        <div className={modalStyles["form-modal__property-block"]}>
                          <div
                            className={
                              modalStyles["form-modal__property-block-header"]
                            }
                          >
                            <label className={modalStyles["form-modal__label"]}>
                              Currently owns {currentlyOwnedProperties.length}{" "}
                              {currentlyOwnedProperties.length === 1
                                ? "property"
                                : "properties"}
                            </label>
                            <button
                              type="button"
                              className={
                                modalStyles["form-modal__property-toggle"]
                              }
                              onClick={() =>
                                setShowOwnedProperties((prev) => !prev)
                              }
                              disabled={isPending}
                            >
                              {showOwnedProperties ? (
                                <>
                                  <LuEyeClosed /> Hide
                                </>
                              ) : (
                                <>
                                  <LuEye /> Show
                                </>
                              )}
                            </button>
                          </div>
                          {showOwnedProperties && (
                            <ul
                              className={
                                modalStyles["form-modal__property-owned-list"]
                              }
                            >
                              {currentlyOwnedProperties.map((property) => (
                                <li key={property.id}>{property.name}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {errorMessage && (
              <p className={modalStyles["form-modal__error"]}>{errorMessage}</p>
            )}
          </div>

          <FormActionButtons
            onCancel={handleClose}
            isPending={isPending}
            saveDisabled={
              formData.user_type === "property_owner" && !!propertiesError
            }
          />
        </form>
      </MotionDiv>
    </div>
  );
}
