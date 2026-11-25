"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import styles from "@/styles/app/dashboard/Forms.module.scss";
import { retrieveUserWorkspaceState } from "@/lib/server/workspace";
import { formsService } from "@/lib/services/forms.service";
import type { Form, Question as ApiQuestion, QuestionCreate } from "@/types/api";
import AddNewFormModal, {
  FormModalInitialValues,
  FormModalSubmitPayload,
  Question,
} from "@/components/app/dashboard/add-new-form";
import EmptyLook from "@/components/ui/EmptyLook";
import PageGreeting from "@/components/ui/PageGreeting";

const mapApiQuestionsToUi = (items?: ApiQuestion[]): Partial<Question>[] => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const normalizeChoice = <T extends string>(value?: T | ""): T | undefined =>
    value && value.length > 0 ? value : undefined;

  const idToIndex = new Map<number, number>();
  items.forEach((item, index) => {
    if (typeof item.id === "number") {
      idToIndex.set(item.id, index);
    }
  });

  return items.map((item, index) => {
    const answerType = item.answer_type ?? "";
    const baseOptions = Array.isArray(item.options) ? item.options : undefined;
    const conditionalTargetIndex =
      typeof item.conditional_target === "number"
        ? idToIndex.get(item.conditional_target)
        : undefined;
    const conditionalTo =
      typeof conditionalTargetIndex === "number" && conditionalTargetIndex < index
        ? String(conditionalTargetIndex + 1)
        : "";

    return {
      id: typeof item.id === "number" ? item.id : index + 1,
      question: item.question ?? "",
      answerType,
      required: item.required ?? false,
      dropdownOptions: answerType === "dropdown" ? baseOptions ?? [] : undefined,
      checkboxOptions: answerType === "checkbox" ? baseOptions ?? [] : undefined,
      randomlyRequired: item.randomly_required ?? false,
      imageSource: normalizeChoice(item.image_source),
      videoSource: normalizeChoice(item.video_source),
      dateMode: normalizeChoice(item.date_mode),
      lowerLimit: item.lower_limit ?? "",
      upperLimit: item.upper_limit ?? "",
      isConditional: item.is_conditional ?? false,
      conditionalTo,
      conditionalOperator: normalizeChoice(item.conditional_operator),
      conditionalValue: item.conditional_value ?? "",
      imageAttachments: Array.isArray(item.image_attachments)
        ? item.image_attachments
        : undefined,
    };
  });
};

const buildQuestionPayload = (
  question: Question,
  index: number,
  idByIndex: Map<number, number>
): QuestionCreate => {
  const options =
    question.answerType === "dropdown"
      ? question.dropdownOptions
      : question.answerType === "checkbox"
      ? question.checkboxOptions
      : undefined;
  const conditionalTargetIndex =
    question.isConditional && question.conditionalTo
      ? Number(question.conditionalTo) - 1
      : Number.NaN;
  const conditionalTargetId = Number.isFinite(conditionalTargetIndex)
    ? idByIndex.get(conditionalTargetIndex)
    : undefined;

  return {
    question: question.question,
    answer_type: question.answerType as ApiQuestion["answer_type"],
    required: question.required ?? false,
    randomly_required: question.randomlyRequired ?? false,
    order: index,
    is_conditional: Boolean(question.isConditional && conditionalTargetId),
    conditional_target: conditionalTargetId,
    conditional_operator: question.conditionalOperator,
    conditional_value: question.conditionalValue,
    options: options && options.length > 0 ? options : undefined,
    image_source: question.imageSource,
    video_source: question.videoSource,
    date_mode: question.dateMode,
    lower_limit: question.lowerLimit,
    upper_limit: question.upperLimit,
  };
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const buildQuestionPayloadWithAttachments = async (
  question: Question,
  index: number,
  idByIndex: Map<number, number>
): Promise<QuestionCreate> => {
  const basePayload = buildQuestionPayload(question, index, idByIndex);
  const hasAttachmentField = Array.isArray(question.imageAttachments);
  const existingAttachments =
    question.imageAttachments
      ?.filter((item): item is string => typeof item === "string")
      .filter((value) => value.length > 0) ?? [];
  const files =
    question.imageAttachments?.filter(
      (item): item is File => item instanceof File
    ) ?? [];
  const fileAttachments =
    files.length > 0 ? await Promise.all(files.map(readFileAsDataUrl)) : [];
  const dataUrlAttachments = [...existingAttachments, ...fileAttachments].filter(
    (value) => value.startsWith("data:")
  );

  return {
    ...basePayload,
    image_attachments: hasAttachmentField ? dataUrlAttachments : undefined,
  };
};

const FormsPage = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitialValues, setModalInitialValues] =
    useState<FormModalInitialValues | undefined>(undefined);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [activeFormId, setActiveFormId] = useState<number | null>(null);
  const [existingQuestionIds, setExistingQuestionIds] = useState<number[]>([]);
  const [questionErrors, setQuestionErrors] = useState<Record<number, string>>(
    {}
  );

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const { currentWorkspace } = await retrieveUserWorkspaceState();
      setWorkspaceId(currentWorkspace.id);
      const response = await formsService.getForms(currentWorkspace.id);

      if (response.success && response.data) {
        setForms(response.data.results ?? []);
        setError(null);
      } else {
        setForms([]);
        setError(response.error?.message ?? "Failed to load forms.");
      }
    } catch (err) {
      console.error(err);
      setForms([]);
      setError("Failed to load forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const resolveWorkspaceId = useCallback(async (): Promise<number | null> => {
    if (workspaceId) return workspaceId;
    try {
      const { currentWorkspace } = await retrieveUserWorkspaceState();
      setWorkspaceId(currentWorkspace.id);
      return currentWorkspace.id;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [workspaceId]);

  const handleCreateButtonClick = () => {
    setModalMode("create");
    setModalInitialValues(undefined);
    setModalError(null);
    setModalLoading(false);
    setModalSaving(false);
    setActiveFormId(null);
    setExistingQuestionIds([]);
    setQuestionErrors({});
    setShowModal(true);
  };

  const handleCardClick = async (form: Form) => {
    setModalMode("edit");
    setActiveFormId(form.id);
    setModalError(null);
    setExistingQuestionIds([]);
    setQuestionErrors({});

    const fallbackValues: FormModalInitialValues = {
      title: form.title ?? form.name ?? "",
      description: form.description ?? "",
    };

    setModalInitialValues(fallbackValues);
    setShowModal(true);
    setModalLoading(true);

    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        throw new Error("Workspace not available.");
      }

      const [formResponse, questionsResponse] = await Promise.all([
        formsService.getForm(wsId, form.id),
        formsService.getFormQuestions(wsId, form.id),
      ]);

      if (formResponse.success && formResponse.data) {
        const data = formResponse.data;
        const questions =
          questionsResponse.success && questionsResponse.data
            ? mapApiQuestionsToUi(questionsResponse.data.results)
            : fallbackValues.questions;
        const ids =
          questionsResponse.success && questionsResponse.data
            ? questionsResponse.data.results
                .map((q) => q.id)
                .filter((id): id is number => typeof id === "number")
            : [];

        setExistingQuestionIds(ids);
        setModalInitialValues({
          title: data.title ?? data.name ?? "",
          description: data.description ?? "",
          questions,
        });
      } else {
        setModalError(
          formResponse.error?.message ?? "Failed to load form details."
        );
      }
    } catch (err) {
      console.error(err);
      setModalError(
        err instanceof Error ? err.message : "Failed to load form details."
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalSave = async ({
    mode,
    title,
    description,
    questions,
  }: FormModalSubmitPayload) => {
    setModalSaving(true);
    setModalError(null);
    setQuestionErrors({});

    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        throw new Error("Workspace not available.");
      }

      let response;
      let formId = activeFormId ?? null;
      if (mode === "create") {
        const idByIndex = new Map<number, number>();
        questions.forEach((question, index) => {
          if (typeof question.id === "number") {
            idByIndex.set(index, question.id);
          }
        });

        const questionPayloads = await Promise.all(
          questions.map(async (question, index) => {
            const basePayload = await buildQuestionPayloadWithAttachments(
              question,
              index,
              idByIndex
            );
            return {
              ...basePayload,
              is_conditional: false,
              conditional_target: undefined,
              conditional_operator: undefined,
              conditional_value: undefined,
            };
          })
        );

        const payload = {
          title,
          description,
          questions: questionPayloads,
        };

        response = await formsService.createForm(wsId, payload);
        formId = response.success ? response.data?.id ?? null : null;
      } else {
        if (!activeFormId) {
          throw new Error("No form selected for update.");
        }
        const payload = {
          name: title,
          description,
        };

        response = await formsService.updateForm(wsId, activeFormId, payload);
      }

      if (!response.success) {
        throw new Error(
          response.error?.message ??
            (mode === "create"
              ? "Failed to create form."
              : "Failed to update form.")
        );
      }

      if (!formId) {
        throw new Error("Form ID not available.");
      }

      if (mode === "create") {
        const questionsWithConditionals = questions
          .map((question, index) => ({
            question,
            index,
            conditionalTo: question.isConditional ? question.conditionalTo : "",
          }))
          .filter(({ conditionalTo }) => Boolean(conditionalTo));

        if (questionsWithConditionals.length > 0) {
          const responseQuestions = response.success
            ? (response.data as Form & { questions?: ApiQuestion[] }).questions
            : undefined;

          let createdQuestions = responseQuestions;
          if (!Array.isArray(createdQuestions)) {
            const listResponse = await formsService.getFormQuestions(
              wsId,
              formId
            );
            createdQuestions = listResponse.success
              ? listResponse.data?.results
              : undefined;
          }

          if (Array.isArray(createdQuestions)) {
            const orderToId = new Map<number, number>();
            createdQuestions.forEach((q, idx) => {
              if (typeof q.id === "number") {
                const order = typeof q.order === "number" ? q.order : idx;
                orderToId.set(order, q.id);
              }
            });
            const idByIndex = new Map<number, number>();
            orderToId.forEach((id, order) => {
              idByIndex.set(order, id);
            });

            if (questionsWithConditionals.length > 0) {
              for (let i = 0; i < questionsWithConditionals.length; i += 1) {
                const { question, index, conditionalTo } = questionsWithConditionals[i];
                const targetIndex =
                  conditionalTo && !Number.isNaN(Number(conditionalTo))
                    ? Number(conditionalTo) - 1
                    : Number.NaN;
                const questionId = orderToId.get(index);
                const targetId = Number.isFinite(targetIndex)
                  ? orderToId.get(targetIndex)
                  : undefined;
                if (!questionId || !targetId) continue;

                const updateResponse = await formsService.updateFormQuestion(
                  wsId,
                  formId,
                  questionId,
                  {
                    is_conditional: true,
                    conditional_target: targetId,
                    conditional_operator: question.conditionalOperator,
                    conditional_value: question.conditionalValue,
                  }
                );

                if (!updateResponse.success) {
                  throw new Error(
                    updateResponse.error?.message ??
                      "Failed to save conditional question."
                  );
                }
              }
            }

            // Conditional updates only. Attachments are already included in create payload.
          }
        }
      }

      if (mode === "edit") {
        const idByIndex = new Map<number, number>();
        const updatedIds = new Set<number>();
        const existingIds = new Set(existingQuestionIds);

        questions.forEach((question, index) => {
          if (typeof question.id === "number") {
            idByIndex.set(index, question.id);
          }
        });

        for (let index = 0; index < questions.length; index += 1) {
          const question = questions[index];
          const requestBody = await buildQuestionPayloadWithAttachments(
            question,
            index,
            idByIndex
          );
          const questionId =
            typeof question.id === "number" ? question.id : undefined;

          if (questionId && existingIds.has(questionId)) {
            const updateResponse = await formsService.updateFormQuestion(
              wsId,
              formId,
              questionId,
              requestBody
            );
            if (!updateResponse.success) {
              const details = updateResponse.error?.details;
              const message =
                typeof details?.options === "string"
                  ? details.options
                  : Array.isArray(details?.options)
                  ? details.options.join(" ")
                  : updateResponse.error?.message ??
                    "Failed to update form question.";
              setQuestionErrors({ [index]: message });
              throw new Error(message);
            }
            updatedIds.add(questionId);
            idByIndex.set(index, questionId);
          } else {
            const createResponse = await formsService.createFormQuestion(
              wsId,
              formId,
              requestBody
            );
            if (!createResponse.success) {
              const details = createResponse.error?.details;
              const message =
                typeof details?.options === "string"
                  ? details.options
                  : Array.isArray(details?.options)
                  ? details.options.join(" ")
                  : createResponse.error?.message ??
                    "Failed to create form question.";
              setQuestionErrors({ [index]: message });
              throw new Error(message);
            }
            if (typeof createResponse.data?.id === "number") {
              updatedIds.add(createResponse.data.id);
              idByIndex.set(index, createResponse.data.id);
            }
          }
        }

        if (existingIds.size > 0) {
          const deletions: number[] = [];
          existingIds.forEach((id) => {
            if (!updatedIds.has(id)) {
              deletions.push(id);
            }
          });

          for (let index = 0; index < deletions.length; index += 1) {
            const questionId = deletions[index];
            const deleteResponse = await formsService.deleteFormQuestion(
              wsId,
              formId,
              questionId
            );
            if (!deleteResponse.success) {
              throw new Error(
                deleteResponse.error?.message ??
                  "Failed to delete form question."
              );
            }
          }
        }
      }

      await fetchForms();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save form.";
      setModalError(message);
      throw new Error(message);
    } finally {
      setModalSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalMode("create");
    setModalInitialValues(undefined);
    setModalError(null);
    setModalLoading(false);
    setModalSaving(false);
    setActiveFormId(null);
    setExistingQuestionIds([]);
    setQuestionErrors({});
  };

  return (
    <div className={styles["forms-page"]}>
      <div className={styles["forms-page__header"]}>
        <PageGreeting
          className={styles["forms-page__header-text"]}
          title="Forms Management"
        />
        <button
          className={styles["forms-page__create-button"]}
          onClick={handleCreateButtonClick}
        >
          Create New Form
        </button>
      </div>

      {loading ? (
        <LuLoaderCircle
          className={`${styles["forms-page__spinner"]} animate-spin`}
        />
      ) : error ? (
        <p className={styles["forms-page__empty"]}>{error}</p>
      ) : forms.length === 0 ? (
        <EmptyLook label="forms" className={styles["forms-page__empty"]} />
      ) : (
        <div className={styles["forms-page__cards-grid"]}>
          {forms.map((form) => (
            <button
              key={form.id}
              type="button"
              className={styles["forms-page__card"]}
              onClick={() => handleCardClick(form)}
            >
              <h4 className={styles["forms-page__card-title"]}>
                {form.title ?? form.name ?? "Untitled Form"}
              </h4>
              <div className={styles["forms-page__divider"]}></div>
              <p className={styles["forms-page__card-description"]}>
                {form.description ??
                  "No description available for this form."}
              </p>
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <AddNewFormModal
          key={activeFormId ?? modalMode}
          mode={modalMode}
          initialValues={modalInitialValues}
          isLoading={modalLoading}
          isSaving={modalSaving}
          errorMessage={modalError}
          questionErrors={questionErrors}
          onSave={handleModalSave}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default FormsPage;
