"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Ban } from "lucide-react";
import { LuLoaderCircle } from "react-icons/lu";
import styles from "@/styles/validate/FormVerificationPage.module.scss";
import { MotionDiv } from "@/components/motion-client";
import { verifySurveyResult } from "@/lib/server/workspace";
import { CleaningAppSurveyResultVerificationData } from "@/lib/types";

type VerifyLoaderParams = {
  state: boolean | null;
  message: string;
};

const VerifyLoader: React.FC<VerifyLoaderParams> = ({ state, message }) => {
  return (
    <MotionDiv
      initial={{ x: -500, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={styles["verify-loader"]}
    >
      <MotionDiv
        initial={{ scale: 1, rotate: 0 }}
        animate={state === null ? { scale: 1.2, rotate: 360 } : { scale: 1 }}
        transition={{ duration: 0.5 }}
        className={styles["loader-wrapper"]}
      >
        {state === null ? (
          <LuLoaderCircle className={`${styles.spinner} animate-spin`} />
        ) : state === true ? (
          <MotionDiv
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle size={32} color="green" />
          </MotionDiv>
        ) : (
          <MotionDiv
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Ban size={32} color="red" />
          </MotionDiv>
        )}
      </MotionDiv>
      <div className={styles["status-text"]}>{message}</div>
    </MotionDiv>
  );
};

type VerificationState = {
  spinnerIndex: number;
  spinnerState: (boolean | null)[];
};

type SurveyValidationParams = {
  surveyResultId: number;
  onFinish?: (
    verifyData: CleaningAppSurveyResultVerificationData | null
  ) => void | null;
};

const SurveyValidation: React.FC<SurveyValidationParams> = ({
  surveyResultId,
  onFinish,
}) => {
  const [verificationState, setVerificationState] = useState<VerificationState>(
    {
      spinnerIndex: 0,
      spinnerState: [null, null, null],
    }
  );

  const statusMessages = [
    "Checking the validity of the survey...",
    "Verifying the responses...",
    "Ensuring data integrity...",
  ];

  useEffect(() => {
    const validate = async () => {
      const verifyData = await verifySurveyResult(surveyResultId);

      if (verifyData) {
        // Survey result verified, continue with next steps
        setVerificationState({
          spinnerIndex: 1,
          spinnerState: [true, null, null],
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));

        setVerificationState({
          spinnerIndex: 2,
          spinnerState: [true, true, null],
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));

        setVerificationState({
          spinnerIndex: 2,
          spinnerState: [true, true, true],
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        onFinish?.(verifyData);
      } else {
        setVerificationState({
          spinnerIndex: 0,
          spinnerState: [false, null, null],
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        onFinish?.(null);
      }
    };

    validate();
  }, []);

  return (
    <MotionDiv
      exit={{ y: -500, position: "fixed", opacity: 0 }}
      transition={{ duration: 0.5 }}
      className={styles["loader-container"]}
    >
      <ul className={styles["loader-list"]}>
        {[...Array(verificationState.spinnerIndex + 1)].map((message, i) => (
          <li key={i}>
            <VerifyLoader
              state={verificationState.spinnerState[i]}
              message={statusMessages[i]}
            />
          </li>
        ))}
      </ul>
    </MotionDiv>
  );
};

const FailedValidation = () => {
  return (
    <div>
      <p>
        We were unable to verify this survey result. This could be due to one of
        the following reasons:
      </p>
      <ul>
        <li>The survey QR code is incorrect or has been altered.</li>
        <li>The survey has expired or is no longer valid.</li>
        <li>The survey data has not been properly registered in our system.</li>
      </ul>
      <p>
        If you believe this is an error, please check the QR code and try
        scanning again. If the issue persists, please contact our support team
        with the survey details for further assistance.
      </p>
    </div>
  );
};

const SuccessfulValidation = ({
  verificationData,
}: {
  verificationData: CleaningAppSurveyResultVerificationData;
}) => {
  return (
    <div className="survey-result-card">
      <h2>This survey is verified by Acme</h2>
      <h3 className="property-title">{verificationData.house.title}</h3>
      <p className="property-address">{verificationData.house.address}</p>

      <div className="user-info">
        <p>
          <strong>User:</strong> {verificationData.user.first_name} {verificationData.user.last_name}
        </p>
        <p>
          <strong>Cleaning Date:</strong> {new Date(verificationData.cleaning_date).toDateString()}
        </p>
      </div>
    </div>
  );
};

type VerificationStatus = {
  isFinished: boolean;
  data: CleaningAppSurveyResultVerificationData | null;
};

type PageParams = {
  params: { surveyResultId: string };
};

export default function SurveyVerificationPage({ params }: PageParams) {
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>({
      isFinished: false,
      data: null,
    });

  const surveyResultId = Number(params.surveyResultId);

  const onValidate = (
    verifyData: CleaningAppSurveyResultVerificationData | null
  ) => {
    setVerificationStatus({
      isFinished: true,
      data: verifyData,
    });
  };

  return (
    <section className={styles.section}>
      <AnimatePresence>
        {!verificationStatus.isFinished && (
          <SurveyValidation
            surveyResultId={surveyResultId}
            onFinish={onValidate}
          />
        )}
      </AnimatePresence>

      {verificationStatus.isFinished &&
        (verificationStatus.data ? (
          <SuccessfulValidation verificationData={verificationStatus.data} />
        ) : (
          <FailedValidation />
        ))}
    </section>
  );
}
