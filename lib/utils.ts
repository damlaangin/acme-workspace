import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MonthlyData, Plan } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function discounter(originalPrice: number, discountPercentage: number) {
  const yearlyPrice = originalPrice * 12;
  const discountAmount = (yearlyPrice * discountPercentage) / 100;
  const discountedPrice = yearlyPrice - discountAmount;
  // Round off to the nearest integer
  return Math.round(discountedPrice);
}

export function discounterMonthly(
  originalPrice: number,
  discountPercentage: number
) {
  const discountAmount = (originalPrice * discountPercentage) / 100;
  const discountedPrice = originalPrice - discountAmount;
  // Round off to the nearest integer
  return Math.round(discountedPrice);
}

export function saver(originalPrice: number, discountPercentage: number) {
  const yearlyPrice = originalPrice * 12;
  const yearlyDiscountedPrice = discounter(originalPrice, discountPercentage);
  return Math.round(yearlyPrice - yearlyDiscountedPrice);
}

// Function to validate email address
export const isValidEmail = (email: string) => {
  return /\S+@\S+\.\S+/.test(email);
};

export const validatePassword = (password: string) => {
  const minLength = 8;
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const digitRegex = /\d/;

  if (password.length < minLength) {
    return "Password must be at least 8 characters long";
  }

  if (!uppercaseRegex.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!lowercaseRegex.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!digitRegex.test(password)) {
    return "Password must contain at least one digit";
  }

  return "";
};

export function extractPlanName(fullName: string) {
  const index = fullName.indexOf(" Plan");
  if (index !== -1) {
    return fullName.substring(0, index);
  }
  // If " Plan" is not found, return the full name
  return fullName;
}

export function returnDate(timestamp: number) {
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString("en-US", { timeZone: "UTC" });
  return formattedDate;
}

export // Function to fill missing months with zero counts
function fillMissingMonths(data: MonthlyData[]): MonthlyData[] {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Create a map from month names to their counts
  const monthMap = new Map<string, number>();
  data.forEach(({ name, count }) => monthMap.set(name, count));

  // Fill in missing months with zero counts
  const filledData: MonthlyData[] = [];
  months.forEach((month) => {
    filledData.push({ name: month, count: monthMap.get(month) || 0 });
  });

  return filledData;
}

export function returnInterval(interval: string) {
  if (interval == "MONTHLY") {
    return "Monthly";
  } else {
    return "Yearly";
  }
}

export function selectedPlans(planName: string): Plan {
  let planSelection: Plan = { basic: false, pro: false, premium: false };

  switch (planName) {
    case "Basic":
      planSelection.basic = true;
      break;
    case "Pro":
      planSelection.basic = true;
      planSelection.pro = true;
      break;
    case "ProPlus":
      planSelection.basic = true;
      planSelection.pro = true;
      break;
    case "Premium":
      planSelection.basic = true;
      planSelection.pro = true;
      planSelection.premium = true;
      break;
    default:
      throw new Error("Invalid planName: " + planName);
  }

  return planSelection;
}

export function returnHouseCount(planName: string): number {
  let houseCount = 0;

  switch (planName) {
    case "Basic":
      houseCount = 4;
      break;
    case "Pro":
      houseCount = 10;
      break;
    case "ProPlus":
      houseCount = 20;
      break;
    case "Premium":
      houseCount = 21;
      break;
    default:
      throw new Error("Invalid planName: " + planName);
  }

  return houseCount;
}

export function getFeatureCodes(
  features: any[],
  selectedPlans: Plan,
  selectedCategories: string[]
): { [category: string]: string[] } {
  const codes: { [category: string]: string[] } = {};

  features.forEach((category) => {
    if (selectedCategories.includes(category.key)) {
      codes[category.key] = [];
      category.labels.forEach((label: any) => {
        if (
          (selectedPlans.basic && label.basic) ||
          (selectedPlans.pro && label.pro) ||
          (selectedPlans.premium && label.premium)
        ) {
          if (label.code) {
            codes[category.key].push(label.code);
          }
        }
      });
    }
  });

  return codes;
}

const contentUrl = "https://content.example.com";

export const generatePropertyImageUrl = (
  propertyId: number,
  workspaceId: number,
  imageName: string
) => {
  return `${contentUrl}/${workspaceId}/protected/property/${propertyId}/${imageName}`;
};
