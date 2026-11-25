"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaRobot,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";
import { FaCheck } from "react-icons/fa";
import { LuLoaderCircle } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import styles from "@/styles/app/dashboard/AiSetup.module.scss";
import { botsService } from "@/lib/services/bots.service";
import { templates } from "@/public/agent_templates";
import { useWorkspace } from "@/context/workspace-context";
import { BotSetupFormSubmissionCreate } from "@/types/api";
import AiBreadcrumb from "@/components/app/ai/AiBreadcrumb";

interface StepData {
  setupType?: "scratch" | "template";
  selectedTemplate?: string;
  agentName?: string;
  role?: string;
  objective?: string;
  context?: string;
  sop?: string[];
  instructions?: string;
  examples?: { input: string; output: string }[];
  toolsAgents?: string;
  notes?: string[];
  lastVisitedStep?: number;
}

const steps = [
  { id: 1, title: "Getting Started", description: "Choose your approach" },
  { id: 2, title: "Agent Name", description: "Name your agent" },
  { id: 3, title: "Role", description: "Define agent's role" },
  { id: 4, title: "Objective", description: "Set agent's goals" },
  { id: 5, title: "Context", description: "Provide background" },
  { id: 6, title: "SOP", description: "Standard procedures" },
  { id: 7, title: "Instructions", description: "Set behavioral rules" },
  { id: 8, title: "Examples", description: "Provide examples" },
  { id: 9, title: "Notes", description: "Important reminders" },
  { id: 10, title: "Complete", description: "Test your agent" },
];

const AiSetupContent = (): React.JSX.Element => {
  const { currentWorkspace } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<StepData>(() => ({} as StepData));
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">(
    "forward"
  );
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const nextStep = () => {
    if (currentStep < steps.length) {
      setSlideDirection("forward");
      const next = currentStep === 2 && stepData.setupType === "template" ? 10 : currentStep + 1;
      setCurrentStep(next);
      setStepData((prev) => ({ ...prev, lastVisitedStep: Math.max(prev.lastVisitedStep || 1, next) }));
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setSlideDirection("backward");
      if (currentStep === 10 && stepData.setupType === "template") {
        setCurrentStep(2);
      }
      else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const updateStepData = (data: Partial<StepData>) => {
    setStepData((prev) => ({ ...prev, ...data }));

  };

  const handleTestAI = async () => {
    if (!stepData.agentName) {
      setSubmitError("Agent name is required");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const botSetupData: BotSetupFormSubmissionCreate = {
        name: stepData.agentName,
        temperature: 0.27,
        delay_before_responding: 10,
      };

      if (stepData.setupType === "template") {
        botSetupData.template =
          stepData.selectedTemplate === "default"
            ? templates.default
            : templates.default;
      } else {
        botSetupData.config = {
          role: stepData.role || "",
          objective: stepData.objective || "",
          context: stepData.context || "",
          sop: stepData.sop?.join("\n") || "",
          instructions: stepData.instructions || "",
          examples:
            stepData.examples
              ?.map((ex) => `Input: ${ex.input}\nOutput: ${ex.output}`)
              .join("\n\n") || "",
          notes: stepData.notes?.join("\n") || "",
        };
      }

      if (!currentWorkspace) {
        setSubmitError("Workspace is required to create a bot");
        return;
      }

      const result = await botsService.setupBot(
        currentWorkspace.id,
        botSetupData
      );

      if (result.success && result.data) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.error?.message || "Failed to create bot");
      }
    } catch (error) {
      console.error("Error creating bot:", error);
      setSubmitError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleNavigateToChat = () => {
  //   router.push(`/dashboard/ai/chat-history?botId=${botId ?? 0}`);
  // };

  const renderProgressBar = () => (
    <div className={styles["progress-container"]}>
      <div className={styles["progress-bar"]}>
        <div
          className={styles["progress-fill"]}
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>
      <div className={styles["progress-steps"]}>
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div
              key={step.id}
              className={`${styles["progress-step"]} ${
                isCompleted ? styles["progress-step--active"] : ""
              } ${isActive ? styles["progress-step--current"] : ""}`}
              onClick={() => {
                if (step.id <= Math.max(currentStep, stepData.lastVisitedStep || currentStep)) {
                  setStepData((prev) => ({ ...prev, lastVisitedStep: Math.max(prev.lastVisitedStep || 1, step.id) }));
                  setSlideDirection(step.id > currentStep ? "forward" : "backward");
                  setCurrentStep(step.id);
                }
              }}
              style={{ cursor: step.id <= currentStep ? "pointer" : "default" }}
            >
              <div className={styles["step-circle"]}>
                {isCompleted ? (
                  <FaCheck className={styles["check-icon"]} />
                ) : (
                  step.id
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles["step-content"]}>
            <div className={styles["welcome-section"]}>
              <div className={styles["welcome-section-left"]}>
                <h1>Welcome to AI Agent Setup</h1>
                <p>
                  Let's create your personalized AI agent with optimized prompting techniques for maximum performance.
                </p>
              </div>
            </div>
            <div className={styles["setup-options"]}>
              <Card
                className={`${styles["option-card"]} ${
                  stepData.setupType === "scratch" ? styles["selected"] : ""
                }`}
                onClick={() => updateStepData({ setupType: "scratch" })}
              >
                <CardHeader style={{ padding: "0rem" }}>
                  <CardTitle>Start from Scratch</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: "0rem" }}>
                  <p>
                    Build your AI agent from the ground up with complete customization
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`${styles["option-card"]} ${
                  stepData.setupType === "template" ? styles["selected"] : ""
                }`}
                onClick={() => updateStepData({ setupType: "template" })}
              >
                <CardHeader style={{ padding: "0rem" }}>
                  <CardTitle>Use a Template</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: "0rem" }}>
                  <p>
                    Start with pre-configured templates for common use cases
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles["step-content"]}>
            {stepData.setupType === "template" ? (
              <>
                <h2>Choose a Template & Name Your Agent</h2>
                <p>
                  Select a pre-configured template and give your agent a name.
                </p>

                <div className={styles["template-options"]}>
                  <Card
                    className={`${styles["option-card"]} ${
                      stepData.selectedTemplate === "default" ? styles["selected"] : ""
                    }`}
                    onClick={() => updateStepData({ selectedTemplate: "default" })}
                  >
                    <CardHeader style={{ padding: "1rem" }}>
                      <CardTitle>Acme Properties Guest Assistant</CardTitle>
                    </CardHeader>
                    <CardContent style={{ padding: "0 1rem 1rem" }}>
                      <p>
                        Expert customer service agent for Airbnb guest communications, 
                        handling check-in/out, policies, and guest inquiries with professional efficiency.
                      </p>
                      <div className={styles["template-features"]}>
                        <span>✓ Check-in/out procedures</span>
                        <span>✓ Policy enforcement</span>
                        <span>✓ Guest support</span>
                        <span>✓ 5-star experience focus</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className={styles["input-group"]} style={{ marginTop: "2rem" }}>
                  <label htmlFor="agent-name">Agent Name</label>
                  <input
                    id="agent-name"
                    type="text"
                    placeholder="e.g., Alex, PropertyBot, AcmeAssistant"
                    value={stepData.agentName || ""}
                    onChange={(e) => updateStepData({ agentName: e.target.value })}
                    className={styles["text-input"]}
                  />
                </div>
              </>
            ) : (
              <>
                <h2>What would you like to name your AI agent?</h2>
                <p>
                  Choose a name that reflects your agent's purpose and personality.
                </p>

                <div className={styles["input-group"]}>
                  <label htmlFor="agent-name">Agent Name</label>
                  <input
                    id="agent-name"
                    type="text"
                    placeholder="e.g., Alex, PropertyBot, AcmeAssistant"
                    value={stepData.agentName || ""}
                    onChange={(e) => updateStepData({ agentName: e.target.value })}
                    className={`${styles["text-input"]}`}
                  />
                </div>
              </>
            )}
          </div>
        );

      case 3:
        return (
          <div className={styles["step-content"]}>
            <h2>Define your agent's role</h2>
            <p>What type of expert is your agent? This will be optimized with "world-class" or "expert" qualifications.</p>

            <div className={styles["input-group"]}>
              <label htmlFor="role">Role Description</label>
              <textarea
                id="role"
                placeholder="e.g., Customer service representative, Property manager, Sales consultant..."
                value={stepData.role || ""}
                onChange={(e) => updateStepData({ role: e.target.value })}
                className={styles["text-area"]}
                rows={4}
              />
              <small className={styles["helper-text"]}>
                This will be enhanced with expert qualifications and specific qualities derived from your agent's tasks.
              </small>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles["step-content"]}>
            <h2>Set your agent's objective</h2>
            <p>What is the main goal your agent should achieve? This will be optimized for chain-of-thought reasoning.</p>

            <div className={styles["input-group"]}>
              <label htmlFor="objective">Objective</label>
              <textarea
                id="objective"
                placeholder="e.g., Provide exceptional customer support for property guests, Generate qualified leads for real estate sales..."
                value={stepData.objective || ""}
                onChange={(e) => updateStepData({ objective: e.target.value })}
                className={styles["text-area"]}
                rows={4}
              />
              <small className={styles["helper-text"]}>
                This will be expanded to start with "Your goal is" and include "think step by step" for optimal performance.
              </small>
            </div>
          </div>
        );

      case 5:
        return (
          <div className={styles["step-content"]}>
            <h2>Provide context for your agent</h2>
            <p>Why is your agent doing this task? What background information should it know?</p>

            <div className={styles["input-group"]}>
              <label htmlFor="context">Context</label>
              <textarea
                id="context"
                placeholder="e.g., This agent works for a luxury vacation rental company that manages 50+ properties across the city..."
                value={stepData.context || ""}
                onChange={(e) => updateStepData({ context: e.target.value })}
                className={styles["text-area"]}
                rows={4}
              />
              <small className={styles["helper-text"]}>
                Provide background information that helps the agent understand its environment and purpose.
              </small>
            </div>
          </div>
        );

      case 6:
        return (
          <div className={styles["step-content"]}>
            <h2>Define your agent's standard operating procedures (SOP)</h2>
            <p>What step-by-step processes should your agent follow? Each step will be numbered and optimized for chain-of-thought reasoning.</p>

            <div className={styles["input-group"]}>
              <label htmlFor="sop">Standard Operating Procedures</label>
              <textarea
                id="sop"
                placeholder="e.g., 
                  1. Greet the guest warmly and ask how I can help
                  2. Listen carefully to their request or concern
                  3. Provide relevant information or solutions
                  4. Ask if they need anything else
                  5. Thank them for choosing our property"
                value={stepData.sop?.join("\n") || ""}
                onChange={(e) =>
                  updateStepData({
                    sop: e.target.value.split("\n").filter((s) => s.trim()),
                  })
                }
                className={styles["text-area"]}
                rows={8}
              />
              <small className={styles["helper-text"]}>
                Enter each step on a new line. These will be organized into numbered steps with "think step by step" optimization.
              </small>
            </div>
          </div>
        );

      case 7:
        return (
          <div className={styles["step-content"]}>
            <h2>Set behavioral instructions</h2>
            <p>What rules and guidelines should your agent follow? These will be enhanced with emotional manipulation techniques for better compliance.</p>

            <div className={styles["input-group"]}>
              <label htmlFor="instructions">Instructions & Rules</label>
              <textarea
                id="instructions"
                placeholder="e.g., Always be polite and professional, Never share guest personal information, Escalate complex issues to human staff, Respond within 5 minutes during business hours..."
                value={stepData.instructions || ""}
                onChange={(e) => updateStepData({ instructions: e.target.value })}
                className={styles["text-area"]}
                rows={6}
              />
              <small className={styles["helper-text"]}>
                These rules will be enhanced with phrases like "it is vital to my career that" for improved compliance.
              </small>
            </div>
          </div>
        );

      case 8:
        return (
          <div className={styles["step-content"]}>
            <h2>Provide examples</h2>
            <p>Give 2 input/output examples showing how your agent should respond to typical queries.</p>

            <div className={styles["examples-section"]}>
              {(stepData.examples || [{ input: "", output: "" }, { input: "", output: "" }]).map((example, index) => (
                <div key={index} className={styles["example-item"]}>
                  <h3>Example {index + 1}</h3>
                  <div className={styles["input-group"]}>
                    <label>User Input</label>
                    <textarea
                      placeholder="e.g., What time is check-in?"
                      value={example.input}
                      onChange={(e) => {
                        const newExamples = [...(stepData.examples || [{ input: "", output: "" }, { input: "", output: "" }])];
                        newExamples[index] = { ...example, input: e.target.value };
                        updateStepData({ examples: newExamples });
                      }}
                      className={styles["text-area"]}
                      rows={2}
                    />
                  </div>
                  <div className={styles["input-group"]}>
                    <label>Agent Output</label>
                    <textarea
                      placeholder="e.g., Check-in is at 3:00 PM. I can arrange an earlier check-in if needed for an additional fee. Would you like me to coordinate this with our front desk?"
                      value={example.output}
                      onChange={(e) => {
                        const newExamples = [...(stepData.examples || [{ input: "", output: "" }, { input: "", output: "" }])];
                        newExamples[index] = { ...example, output: e.target.value };
                        updateStepData({ examples: newExamples });
                      }}
                      className={styles["text-area"]}
                      rows={4}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className={styles["step-content"]}>
            <h2>Important notes</h2>
            <p>Key reminders and critical rules that will be emphasized for your agent.</p>

            <div className={styles["input-group"]}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                placeholder="e.g., 
                  - Always verify guest identity before sharing booking details
                  - Never promise anything that requires management approval
                  - Remember to upsell amenities when appropriate"
                value={stepData.notes?.join("\n") || ""}
                onChange={(e) =>
                  updateStepData({
                    notes: e.target.value.split("\n").filter((n) => n.trim()),
                  })
                }
                className={styles["text-area"]}
                rows={6}
              />
            </div>
          </div>
        );

      case 10:
        return (
          <div className={styles["step-content"]}>
            <div className={styles["completion-section"]}>
              {!submitSuccess ? (
                <>
                  <FaCheck className={styles["success-icon"]} />
                  <h2>Your AI Agent is Ready!</h2>
                  <p>
                    Congratulations! You've successfully configured your AI agent with optimized prompting techniques.
                  </p>

                  {submitError && (
                    <div className={styles["error-message"]}>
                      <p>Error: {submitError}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleTestAI}
                    className={styles["test-button"]}
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <LuLoaderCircle className="animate-spin" />
                        Creating Agent...
                      </>
                    ) : (
                      <>
                        <FaRobot />
                        Create AI Agent
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <FaCheck className={styles["success-icon"]} />
                  <h2>AI Agent Created Successfully!</h2>
                  <p>
                    Your AI agent "{stepData.agentName}" has been created and is ready to use.
                  </p>

                  <div className={styles["success-details"]}>
                    <p>Your agent is now active and can handle conversations based on the configuration you provided.</p>
                  </div>

                  <div className={styles["action-buttons"]}>                    
                    <Button
                      onClick={() => {
                        setCurrentStep(1);
                        setStepData({} as StepData);
                        setSubmitSuccess(false);
                        setSubmitError(null);
                      }}
                      variant="outline"
                      className={styles["create-another-button"]}
                      size="lg"
                    >
                      Create Another Agent
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles["ai-setup-container"]}>
      <AiBreadcrumb />
      {renderProgressBar()}

      <div className={styles["content-area"]}>
        <div className={styles["train-container"]}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={styles["train-car"]}
            >
              {renderStepContent()}
            </motion.div>
            <div className={styles["side-arrows"]}>
              {currentStep > 1 && (
                <button
                  className={`${styles["arrow-button"]} ${styles["arrow-left"]}`}
                  onClick={prevStep}
                  aria-label="Previous Step"
                >
                  <FaArrowLeft />
                </button>
              )}
              {currentStep < steps.length && (
                <button
                  className={`${styles["arrow-button"]} ${styles["arrow-right"]}`}
                  onClick={nextStep}
                  aria-label="Next Step"
                  disabled={
                    (currentStep === 1 && !stepData.setupType) ||
                    (currentStep === 2 && stepData.setupType === "template" && (!stepData.selectedTemplate || !stepData.agentName)) ||
                    (currentStep === 2 && stepData.setupType === "scratch" && (!stepData.agentName)) ||
                    (currentStep === 3 && stepData.setupType === "scratch" && !stepData.role) ||
                    (currentStep === 4 && stepData.setupType === "scratch" && !stepData.objective) ||
                    (currentStep === 5 && stepData.setupType === "scratch" && !stepData.context) ||
                    (currentStep === 6 && stepData.setupType === "scratch" && (!stepData.sop || stepData.sop.length === 0)) ||
                    (currentStep === 7 && stepData.setupType === "scratch" && !stepData.instructions) ||
                    (currentStep === 8 && stepData.setupType === "scratch" && (!stepData.examples || stepData.examples.length === 0 || !stepData.examples.every(ex => ex.input && ex.output))) ||
                    (currentStep === 9 && stepData.setupType === "scratch" && (!stepData.notes || stepData.notes.length === 0))
                  }
                >
                  <FaArrowRight />
                </button>
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AiSetupContent;
