"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import styles from "@/styles/app/dashboard/Forms.module.scss";
import {
  FiCheckSquare,
  FiUpload,
  FiMic,
  FiVideo,
  FiCheck,
  FiCalendar,
  FiFile,
  FiEdit3,
} from "react-icons/fi";
import { BsHash } from "react-icons/bs";
import { AiOutlineStar } from "react-icons/ai";
import { PiSignatureBold } from "react-icons/pi";
import { MdQuestionAnswer } from "react-icons/md";
import { FaRegTrashAlt } from "react-icons/fa";

export interface Question {
  id: number;
  question: string;
  answerType: string;
  dropdownOptions?: string[];
  checkboxOptions?: string[];
  imageSource?: "camera" | "gallery" | "both";
  videoSource?: "camera" | "gallery" | "both";
  dateMode?: "date" | "datetime" | "time";
  lowerLimit?: string;
  upperLimit?: string;
  isConditional?: boolean;
  conditionalTo?: string;
  conditionalOperator?:
    | "one_of"
    | "equal_to"
    | "all_of"
    | "lower_than"
    | "higher_than";
  conditionalValue?: string;
  required?: boolean;
  randomlyRequired?: boolean;
  imageAttachments?: Array<File | string>;
  attachmentsTouched?: boolean;
}

export interface FormModalInitialValues {
  title?: string;
  description?: string;
  questions?: Partial<Question>[];
}

export interface FormModalSubmitPayload {
  mode: "create" | "edit";
  title: string;
  description: string;
  questions: Question[];
}

interface AddNewFormModalProps {
  onClose: () => void;
  mode?: "create" | "edit";
  initialValues?: FormModalInitialValues;
  onSave?: (payload: FormModalSubmitPayload) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  questionErrors?: Record<number, string>;
}

const createDefaultQuestion = (id: number): Question => ({
  id,
  question: "",
  answerType: "",
  dropdownOptions: undefined,
  checkboxOptions: undefined,
  imageSource: undefined,
  videoSource: undefined,
  dateMode: undefined,
  lowerLimit: "",
  upperLimit: "",
  isConditional: false,
  conditionalTo: "",
  conditionalOperator: undefined,
  conditionalValue: "",
  required: true,
  randomlyRequired: false,
  imageAttachments: undefined,
  attachmentsTouched: false,
});

const ensureOptions = (options?: string[]) =>
  options && options.length > 0 ? options : [""];

const initializeQuestions = (
  source: Partial<Question>[] | undefined,
  getTempId: () => number
): Question[] => {
  if (!Array.isArray(source) || source.length === 0) {
    return [createDefaultQuestion(getTempId())];
  }

  return source.map((item, index) => {
    const base = createDefaultQuestion(getTempId());
    const itemData = item ?? {};
    const normalizedId =
      typeof itemData.id === "number" ? itemData.id : getTempId();
    const answerType = itemData.answerType ?? base.answerType;

    const normalizedConditionalTo =
      String(itemData.conditionalTo ?? "") === String(index + 1)
        ? ""
        : itemData.conditionalTo ?? "";

    const randomlyRequired =
      typeof itemData.randomlyRequired === "boolean"
        ? itemData.randomlyRequired
        : base.randomlyRequired;
    const normalizedRandomlyRequired = randomlyRequired;
    const required = normalizedRandomlyRequired ? false : true;

    return {
      ...base,
      ...(itemData as Partial<Question>),
      id: normalizedId,
      answerType,
      conditionalTo: normalizedConditionalTo,
      required,
      randomlyRequired: normalizedRandomlyRequired,
      dropdownOptions:
        answerType === "dropdown"
          ? ensureOptions(
              itemData.dropdownOptions ??
                // @ts-expect-error allow legacy option shape
                itemData.options
            )
          : itemData.dropdownOptions,
      checkboxOptions:
        answerType === "checkbox"
          ? ensureOptions(
              itemData.checkboxOptions ??
                // @ts-expect-error allow legacy option shape
                itemData.options
            )
          : itemData.checkboxOptions,
      attachmentsTouched: false,
    };
  });
};

const elementTypes = [
  { id: "dropdown", label: "Dropdown", icon: <FiEdit3 color="#0070f3" /> },
  { id: "checkbox", label: "Checkbox", icon: <FiCheckSquare color="#0FA958" /> },
  { id: "image", label: "Image Upload", icon: <FiUpload color="#00A89D" /> },
  { id: "rating", label: "Rating", icon: <AiOutlineStar color="#FFA500" /> },
  { id: "number", label: "Number", icon: <BsHash color="#8A2BE2" /> },
  { id: "audio", label: "Audio Recording", icon: <FiMic color="#E03131" /> },
  { id: "video", label: "Video Upload", icon: <FiVideo color="#FF7A00" /> },
  { id: "yesno", label: "Yes/No", icon: <FiCheck color="#007B55" /> },
  { id: "open", label: "Open Ended", icon: <MdQuestionAnswer color="#FFB200" /> },
  { id: "date", label: "Date", icon: <FiCalendar color="#2BB0ED" /> },
  { id: "file", label: "File Upload", icon: <FiFile color="#685CFD" /> },
  { id: "signature", label: "Signature", icon: <PiSignatureBold color="#DA2FF0" /> },
];

interface QuestionItemProps {
  q: Question;
  index: number;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  handleChange: <K extends keyof Question>(
    idx: number,
    key: K,
    value: Question[K]
  ) => void;
  handleAddOption: (idx: number, type: "dropdown" | "checkbox") => void;
  handleOptionChange: (
    idx: number,
    optIndex: number,
    value: string,
    type: "dropdown" | "checkbox"
  ) => void;
  handleRemoveOption: (
    idx: number,
    optIndex: number,
    type: "dropdown" | "checkbox"
  ) => void;
  handleRequirementChange: (
    idx: number,
    mode: "required" | "randomlyRequired"
  ) => void;
  errorMessage?: string;
}

const QuestionItem: React.FC<QuestionItemProps> = ({
  q,
  index,
  questions,
  setQuestions,
  handleChange,
  handleAddOption,
  handleOptionChange,
  handleRemoveOption,
  handleRequirementChange,
  errorMessage,
}) => {
  const previewUrls = useMemo(
    () =>
      q.imageAttachments?.map((f) => ({
        file: f,
        url: typeof f === "string" ? f : URL.createObjectURL(f),
      })) || [],
    [q.imageAttachments]
  );

  const conditionalTargetIndex =
    q.conditionalTo && !Number.isNaN(Number(q.conditionalTo))
      ? Number(q.conditionalTo) - 1
      : -1;
  const conditionalTarget =
    conditionalTargetIndex >= 0 ? questions[conditionalTargetIndex] : undefined;
  const showConditionalOperator =
    conditionalTarget &&
    ["date", "yesno", "dropdown", "checkbox", "number", "rating"].includes(
      conditionalTarget.answerType
    );

  return (
    <div
      className={`${styles["form-modal__question"]} ${
        errorMessage ? styles["form-modal__question--error"] : ""
      }`}
    >
      <h3>{index + 1}. Question / Task</h3>
      <input
        type="text"
        className={styles["form-modal__input"]}
        placeholder="Type your question here"
        value={q.question}
        onChange={(e) => handleChange(index, "question", e.target.value)}
      />

      {/* Image upload area */}
      <div className={styles["add-form__image-upload"]}>
        <span className={styles["add-form__image-label"]}>
          Attach images (optional)
        </span>

        <label
          htmlFor={`image-upload-${index}`}
          className={styles["add-form__upload-button"]}
        >
          <FiUpload /> Choose Files
        </label>

        <input
          type="file"
          id={`image-upload-${index}`}
          accept="image/*"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const updated = [...questions];
            updated[index].imageAttachments = [
              ...(updated[index].imageAttachments || []),
              ...files,
            ];
            updated[index].attachmentsTouched = true;
            setQuestions(updated);
            e.target.value = "";
          }}
          className={styles["add-form__image-input-hidden"]}
        />

        {previewUrls.length > 0 && (
          <div className={styles["add-form__image-preview-grid"]}>
            {previewUrls.map(({ file, url }, imgIndex) => (
              <div
                key={imgIndex}
                className={styles["add-form__image-preview"]}
              >
                <img
                  src={url}
                  alt={`Preview ${imgIndex + 1}`}
                  className={styles["add-form__image-thumb"]}
                />
                <button
                  type="button"
                  className={styles["add-form__remove-image"]}
                  onClick={() => {
                    if (typeof file !== "string") {
                      URL.revokeObjectURL(url);
                    }
                    const updated = [...questions];
                    const imgs = [...(updated[index].imageAttachments || [])];
                    imgs.splice(imgIndex, 1);
                    updated[index].imageAttachments = imgs;
                    updated[index].attachmentsTouched = true;
                    setQuestions(updated);
                  }}
                >
                  <FaRegTrashAlt />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer type grid */}
      <div className={styles["form-modal__elements-grid"]}>
        {elementTypes.map((el) => (
          <div
            key={el.id}
            className={`${styles["form-modal__element"]} ${
              q.answerType === el.id ? styles["selected"] : ""
            }`}
            onClick={() => handleChange(index, "answerType", el.id)}
          >
            {el.icon}
            <span>{el.label}</span>
          </div>
        ))}
      </div>

      {q.answerType === "image" && (
        <div className={styles["form-modal__radio-group"]}>
          <label>
            <input
              type="radio"
              checked={q.imageSource === "camera"}
              onChange={() => handleChange(index, "imageSource", "camera")}
            />
            Camera
          </label>
          <label>
            <input
              type="radio"
              checked={q.imageSource === "gallery"}
              onChange={() => handleChange(index, "imageSource", "gallery")}
            />
            Gallery
          </label>
          <label>
            <input
              type="radio"
              checked={q.imageSource === "both"}
              onChange={() => handleChange(index, "imageSource", "both")}
            />
            Both
          </label>
        </div>
      )}

      {q.answerType === "video" && (
        <div className={styles["form-modal__radio-group"]}>
          <label>
            <input
              type="radio"
              checked={q.videoSource === "camera"}
              onChange={() => handleChange(index, "videoSource", "camera")}
            />
            Camera
          </label>
          <label>
            <input
              type="radio"
              checked={q.videoSource === "gallery"}
              onChange={() => handleChange(index, "videoSource", "gallery")}
            />
            Gallery
          </label>
          <label>
            <input
              type="radio"
              checked={q.videoSource === "both"}
              onChange={() => handleChange(index, "videoSource", "both")}
            />
            Both
          </label>
        </div>
      )}

      {q.answerType === "date" && (
        <div className={styles["form-modal__radio-group"]}>
          <label>
            <input
              type="radio"
              checked={q.dateMode === "date"}
              onChange={() => handleChange(index, "dateMode", "date")}
            />
            Date
          </label>
          <label>
            <input
              type="radio"
              checked={q.dateMode === "datetime"}
              onChange={() => handleChange(index, "dateMode", "datetime")}
            />
            Datetime
          </label>
          <label>
            <input
              type="radio"
              checked={q.dateMode === "time"}
              onChange={() => handleChange(index, "dateMode", "time")}
            />
            Time
          </label>
        </div>
      )}

      {(q.answerType === "number" || q.answerType === "rating") && (
        <div className={styles["form-modal__limit-row"]}>
          <label>Lower limit</label>
          <input
            type="text"
            value={q.lowerLimit ?? ""}
            onChange={(e) => handleChange(index, "lowerLimit", e.target.value)}
            className={styles["form-modal__small-input"]}
            placeholder="Enter lower limit"
          />
          <label>Upper limit</label>
          <input
            type="text"
            value={q.upperLimit ?? ""}
            onChange={(e) => handleChange(index, "upperLimit", e.target.value)}
            className={styles["form-modal__small-input"]}
            placeholder="Enter upper limit"
          />
        </div>
      )}

      {q.answerType === "dropdown" && (
        <div className={styles["add-form__options"]}>
          {(q.dropdownOptions ?? []).map((opt, optIndex) => (
            <div key={optIndex} className={styles["add-form__option-row"]}>
              <input
                type="text"
                placeholder={`Option ${optIndex + 1}`}
                value={opt}
                onChange={(e) =>
                  handleOptionChange(
                    index,
                    optIndex,
                    e.target.value,
                    "dropdown"
                  )
                }
                className={styles["add-form__option-input"]}
              />
              {(q.dropdownOptions?.length ?? 0) > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveOption(index, optIndex, "dropdown")
                  }
                  className={styles["add-form__option-remove"]}
                  title="Remove option"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddOption(index, "dropdown")}
            className={styles["add-form__add-option"]}
          >
            + Add Option
          </button>
        </div>
      )}

      {q.answerType === "checkbox" && (
        <div className={styles["add-form__options"]}>
          {(q.checkboxOptions ?? []).map((opt, optIndex) => (
            <div key={optIndex} className={styles["add-form__option-row"]}>
              <input
                type="text"
                placeholder={`Choice ${optIndex + 1}`}
                value={opt}
                onChange={(e) =>
                  handleOptionChange(
                    index,
                    optIndex,
                    e.target.value,
                    "checkbox"
                  )
                }
                className={styles["add-form__option-input"]}
              />
              {(q.checkboxOptions?.length ?? 0) > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveOption(index, optIndex, "checkbox")
                  }
                  className={styles["add-form__option-remove"]}
                  title="Remove option"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => handleAddOption(index, "checkbox")}
            className={styles["add-form__add-option"]}
          >
            + Add Choice
          </button>
        </div>
      )}

      {/* Requirement options */}
      <div className={styles["form-modal__checkbox-group"]}>
        <label>
          <input
            type="radio"
            name={`requirement-${index}`}
            checked={q.required || !q.randomlyRequired}
            onChange={() => handleRequirementChange(index, "required")}
          />
          Required
        </label>
        <label>
          <input
            type="radio"
            name={`requirement-${index}`}
            checked={Boolean(q.randomlyRequired)}
            onChange={() => handleRequirementChange(index, "randomlyRequired")}
          />
          Randomly Required
        </label>
      </div>

      {/* Conditional section */}
      <div className={styles["form-modal__conditional-section"]}>
        <label className={styles["form-modal__toggle"]}>
          <input
            type="checkbox"
            checked={q.isConditional}
            onChange={(e) =>
              handleChange(index, "isConditional", e.target.checked)
            }
          />
          <span className={styles["form-modal__toggle-track"]}></span>
          <span className={styles["form-modal__toggle-label"]}>
            Conditional question
          </span>
        </label>

        {q.isConditional && (
          <div className={styles["form-modal__conditional-input"]}>
            <label>Conditional to Question</label>
            <select
              value={q.conditionalTo}
              onChange={(e) =>
                handleChange(index, "conditionalTo", e.target.value)
              }
              className={styles["form-modal__small-input"]}
            >
              <option value="">Select question...</option>
              {questions
                .filter((_, idx) => idx < index)
                .map((prevQ, idx) => (
                  <option key={idx} value={String(idx + 1)}>
                    {idx + 1}. {prevQ.question || "Untitled Question"}
                  </option>
                ))}
            </select>

            {showConditionalOperator && (
              <>
                <label>Condition</label>
                <select
                  value={q.conditionalOperator ?? ""}
                  onChange={(e) =>
                    handleChange(
                      index,
                      "conditionalOperator",
                      (e.target.value || undefined) as Question["conditionalOperator"]
                    )
                  }
                  className={styles["form-modal__small-input"]}
                >
                  <option value="">Select condition...</option>
                  <option value="one_of">One of</option>
                  <option value="equal_to">Equal to</option>
                  <option value="all_of">All of</option>
                  <option value="lower_than">Lower than</option>
                  <option value="higher_than">Higher than</option>
                </select>

                <label>Value (optional)</label>
                <input
                  type="text"
                  value={q.conditionalValue ?? ""}
                  onChange={(e) =>
                    handleChange(index, "conditionalValue", e.target.value)
                  }
                  className={styles["form-modal__small-input"]}
                  placeholder="Enter value"
                />
              </>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className={styles["form-modal__question-error"]}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

const AddNewFormModal = ({
  onClose,
  mode = "create",
  initialValues,
  onSave,
  isLoading = false,
  isSaving = false,
  errorMessage,
  questionErrors,
}: AddNewFormModalProps) => {
  const tempIdRef = useRef(-1);
  const getTempId = useCallback(() => {
    const id = tempIdRef.current;
    tempIdRef.current -= 1;
    return id;
  }, []);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [desc, setDesc] = useState(initialValues?.description ?? "");
  const [questions, setQuestions] = useState<Question[]>(() =>
    initializeQuestions(initialValues?.questions, getTempId)
  );

  useEffect(() => {
    setTitle(initialValues?.title ?? "");
    setDesc(initialValues?.description ?? "");
    setQuestions(initializeQuestions(initialValues?.questions, getTempId));
  }, [initialValues, mode, getTempId]);

  const isBusy = isLoading || isSaving;
  const headingText = mode === "edit" ? "Update Form" : "New Form";
  const actionLabel = mode === "edit" ? "Update Form" : "Save Form";
  const isLocked = isLoading;

  const handleAddQuestion = () => {
    if (isLocked) return;
    const last = questions[questions.length - 1];
    if (!last.question || !last.answerType) return;
    setQuestions([...questions, createDefaultQuestion(getTempId())]);
  };

  const handleChange = <K extends keyof Question>(
    index: number,
    key: K,
    value: Question[K]
  ) => {
    if (isLocked) return;
    const updated = [...questions];
    const current = { ...updated[index] };

    if (key === "answerType") {
      current.answerType = value as string;

      if (current.answerType !== "image") {
        current.imageSource = undefined;
      }

      if (current.answerType !== "video") {
        current.videoSource = undefined;
      }

      if (current.answerType !== "date") {
        current.dateMode = undefined;
      }

      if (current.answerType !== "number" && current.answerType !== "rating") {
        current.lowerLimit = "";
        current.upperLimit = "";
      }

      if (!current.randomlyRequired) {
        current.required = true;
      }

      if (current.answerType === "dropdown") {
        current.dropdownOptions =
          current.dropdownOptions && current.dropdownOptions.length > 0
            ? current.dropdownOptions
            : [""];
      } else {
        current.dropdownOptions = undefined;
      }

      if (current.answerType === "checkbox") {
        current.checkboxOptions =
          current.checkboxOptions && current.checkboxOptions.length > 0
            ? current.checkboxOptions
            : [""];
      } else {
        current.checkboxOptions = undefined;
      }
    }

    if (key === "isConditional" && value === false) {
      current.conditionalTo = "";
      current.conditionalOperator = undefined;
      current.conditionalValue = "";
    }

    if (key === "conditionalTo") {
      if (value === String(index + 1)) {
        current.conditionalTo = "";
        current.conditionalOperator = undefined;
        current.conditionalValue = "";
        updated[index] = {
          ...current,
          conditionalTo: "",
        };
        setQuestions(updated);
        return;
      }
      const nextIndex =
        typeof value === "string" && value
          ? Number(value) - 1
          : Number.NaN;
      const nextTarget =
        Number.isFinite(nextIndex) && nextIndex >= 0
          ? questions[nextIndex]
          : undefined;
      const supportsOperator =
        nextTarget &&
        ["date", "yesno", "dropdown", "checkbox", "number", "rating"].includes(
          nextTarget.answerType
        );
      if (!supportsOperator) {
        current.conditionalOperator = undefined;
        current.conditionalValue = "";
      }
    }

    updated[index] = {
      ...current,
      [key]: value,
    };
    setQuestions(updated);
  };

  const handleRequirementChange = (
    index: number,
    mode: "required" | "randomlyRequired"
  ) => {
    if (isLocked) return;
    const updated = [...questions];
    const current = { ...updated[index] };

    if (mode === "required") {
      current.required = true;
      current.randomlyRequired = false;
    } else {
      current.required = false;
      current.randomlyRequired = true;
    }

    updated[index] = current;
    setQuestions(updated);
  };

  const handleAddOption = (index: number, type: "dropdown" | "checkbox") => {
    if (isLocked) return;
    const updated = [...questions];
    const optionKey =
      type === "dropdown" ? "dropdownOptions" : "checkboxOptions";
    const options = updated[index][optionKey] ?? [];

    if (options.length > 0 && !options[options.length - 1].trim()) return;
    updated[index][optionKey] = [...options, ""];
    setQuestions(updated);
  };

  const handleOptionChange = (
    index: number,
    optIndex: number,
    value: string,
    type: "dropdown" | "checkbox"
  ) => {
    if (isLocked) return;
    const updated = [...questions];
    const optionKey =
      type === "dropdown" ? "dropdownOptions" : "checkboxOptions";
    const options = [...(updated[index][optionKey] ?? [])];
    options[optIndex] = value;
    updated[index][optionKey] = options;
    setQuestions(updated);
  };

  const handleRemoveOption = (
    index: number,
    optIndex: number,
    type: "dropdown" | "checkbox"
  ) => {
    if (isLocked) return;
    const updated = [...questions];
    const optionKey =
      type === "dropdown" ? "dropdownOptions" : "checkboxOptions";
    const options = updated[index][optionKey] ?? [];
    if (options.length <= 1) return; // minimum 1 option

    updated[index][optionKey] = options.filter((_, i) => i !== optIndex);
    setQuestions(updated);
  };

  const formIsValid = questions.every((q) => q.question && q.answerType);

  const handleSubmit = async () => {
    if (!formIsValid || questions.length < 1 || isBusy) return;

    try {
      const sanitizeOptions = (options?: string[]) => {
        const cleaned =
          options
            ?.map((opt) => opt?.trim?.() ?? "")
            .filter((opt) => opt.length > 0) ?? [];
        return cleaned.length > 0 ? cleaned : undefined;
      };

      const cleanedQuestions = questions.map((q) => {
        const cleaned = {
          ...q,
          dropdownOptions: sanitizeOptions(q.dropdownOptions),
          checkboxOptions: sanitizeOptions(q.checkboxOptions),
          conditionalTo: q.conditionalTo?.trim() ? q.conditionalTo : undefined,
          conditionalOperator: q.conditionalOperator ?? undefined,
          conditionalValue: q.conditionalValue?.trim()
            ? q.conditionalValue
            : undefined,
          imageSource: q.imageSource ?? undefined,
          videoSource: q.videoSource ?? undefined,
          dateMode: q.dateMode ?? undefined,
          lowerLimit: q.lowerLimit?.trim() ? q.lowerLimit : undefined,
          upperLimit: q.upperLimit?.trim() ? q.upperLimit : undefined,
          imageAttachments: q.attachmentsTouched
            ? q.imageAttachments ?? []
            : q.imageAttachments && q.imageAttachments.length > 0
            ? q.imageAttachments
            : undefined,
          attachmentsTouched: q.attachmentsTouched ? true : undefined,
        };

        const filtered = (Object.keys(cleaned) as (keyof Question)[]).reduce(
          (acc, key) => {
            const value = cleaned[key];
            if (value !== undefined) {
              (acc as Record<keyof Question, Question[keyof Question]>)[key] =
                value;
            }
            return acc;
          },
          {} as Partial<Question>
        );

        return filtered as Question;
      });

      console.log("Form submit payload", {
        mode,
        title,
        description: desc,
        questions: cleanedQuestions,
      });
      if (onSave) {
        await onSave({
          mode,
          title,
          description: desc,
          questions: cleanedQuestions,
        });
      } else {
        console.log({ mode, title, desc, questions: cleanedQuestions });
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles["form-modal__overlay"]}>
      <div className={styles["form-modal"]}>
        <div className={styles["form-modal__header"]}>
          <h4>{headingText}</h4>
          <button onClick={onClose} className={styles["form-modal__close"]}>
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className={styles["form-modal__body"]}>
            <div className={styles["form-modal__loading"]}>
              <LuLoaderCircle
                className={`${styles["forms-page__spinner"]} animate-spin`}
              />
              <span>Loading form…</span>
            </div>
          </div>
        ) : (
          <>
            <div className={styles["form-modal__body"]}>
            <div className={styles["form-modal__section"]}>
              <label className={styles["form-modal__label"]}>Form’s Name</label>
              <input
                type="text"
                className={styles["form-modal__input"]}
                placeholder="Enter form name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className={styles["form-modal__section"]}>
              <label className={styles["form-modal__label"]}>Description</label>
              <textarea
                className={styles["form-modal__textarea"]}
                placeholder="Enter form description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {questions.map((q, i) => (
              <QuestionItem
                key={q.id ?? `new-${i}`}
                q={q}
                index={i}
                questions={questions}
                setQuestions={setQuestions}
                handleChange={handleChange}
                handleAddOption={handleAddOption}
                handleOptionChange={handleOptionChange}
                handleRemoveOption={handleRemoveOption}
                handleRequirementChange={handleRequirementChange}
                errorMessage={questionErrors?.[i]}
              />
            ))}
            </div>

            <div className={styles["form-modal__footer"]}>
              {errorMessage && (
                <div className={styles["form-modal__error"]}>{errorMessage}</div>
              )}
              <button
                className={styles["form-modal__add-button"]}
                onClick={handleAddQuestion}
                type="button"
              >
                Add Question
              </button>

              <button
                className={styles["form-modal__save-button"]}
                disabled={isBusy || !formIsValid}
                onClick={handleSubmit}
              >
                {isSaving ? "Saving..." : actionLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddNewFormModal;
