import { IconType } from "react-icons";
import {
  FaComments,
  FaTools,
  FaUser,
  FaQuestionCircle,
} from "react-icons/fa";
import {
  LuCalendarCog,
  LuClipboardCheck,
  LuTabletSmartphone,
  LuWallet,
  LuChartColumn,
  LuBuilding2,
  LuUserCog,
  LuBot,
  LuLayoutPanelLeft,
  LuBotMessageSquare,
} from "react-icons/lu";

export type MainMenuItem = {
  label: string;
  icon?: IconType;
  link: string;
  color?: string;
  children?: MainMenuItem[];
  requiredPermission?: string;
};

export const mainMenuItems: MainMenuItem[] = [
  {
    label: "Home",
    icon: LuLayoutPanelLeft,
    link: "/dashboard",
  },
  {
    label: "AI Insight",
    icon: LuBot,
    link: "/dashboard/ai",
    children: [
      {
        label: "AI Agents",
        icon: LuBotMessageSquare,
        link: "/dashboard/ai/ai-agents",
      },
      {
        label: "AI Chat",
        icon: FaComments,
        link: "/dashboard/conversations",
      },
      {
        label: "AI Setup",
        icon: FaTools,
        link: "/dashboard/ai/ai-setup",
      },
    ],
  },
  {
    label: "Users",
    icon: LuUserCog,
    link: "/dashboard/users",
    requiredPermission: "view_workspaceuser",
  },
  {
    label: "Property",
    icon: LuBuilding2,
    link: "/dashboard/properties",
  },
  {
    label: "Stats",
    icon: LuChartColumn,
    link: "/dashboard/stats",
    requiredPermission: "view_reportdata",
  },
  {
    label: "Finance",
    icon: LuWallet,
    link: "/dashboard/finance",
    requiredPermission: "view_expense",
  },
  {
    label: "Forms",
    icon: LuClipboardCheck,
    link: "/dashboard/forms",
    requiredPermission: "view_form",
  },
  {
    label: "Bookings",
    icon: LuCalendarCog,
    link: "/dashboard/bookings",
    requiredPermission: "view_reservation",
  },
  {
    label: "Cleaning App",
    icon: LuTabletSmartphone,
    link: "/dashboard/cleaning-app",
    requiredPermission: "assign_others_task",
    children: [
      {
        label: "Cleaning App Operations",
        link: "/dashboard/cleaning-app/operations",
      },
      {
        label: "Cleaning App Forms",
        link: "/dashboard/cleaning-app/forms",
      },
    ],
  },
];

export const profileMenuItems: MainMenuItem[] = [
  {
    label: "Settings",
    icon: FaUser,
    link: "/dashboard/options/settings",
  },
  {
    label: "FAQ",
    icon: FaQuestionCircle,
    link: "/dashboard/options/faq",
  },
];
