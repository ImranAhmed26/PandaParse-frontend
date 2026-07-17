import { NavLink } from "@/types/Home/banner";
import { Upload, History, Settings, BarChart3, Folder, Home } from "lucide-react";

export const metadataConst = {
  title: "OCRParse — Accurate OCR for invoices, receipts & documents",
  description:
    "Transform invoices, receipts, and documents into structured JSON/CSV data in seconds. OCRParse's AI extracts and structures your data with industry-leading accuracy.",
};

export const navLinkData: NavLink[] = [
  { name: "home", id: 1, value: "home", link: "/", dropdown: false },
  { name: "Pricing", id: 2, value: "pricing", link: "/pricing", dropdown: false },
  { name: "App", id: 2, value: "app", link: "/dashboard", dropdown: false },
  {
    name: "Service",
    id: 2,
    value: "OCR",
    link: "/",
    dropdown: true,
    options: [
      {
        name: "OCR",
        link: "/",
        details: "Collaborate, Share, and Track Your Work",
      },
    ],
  },
];

export const brandData = {
  name: `Panda Parse`,
  slogan: `. . .`,
  address: `Add Address`,
};

export const sideBarData = {
  menuItems: [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: BarChart3,
    },
    {
      title: "Workspace",
      path: "/workspace",
      icon: Folder,
    },
    {
      title: "Upload",
      path: "/uploads",
      icon: Upload,
    },
    {
      title: "Documents",
      path: "/documents",
      icon: Folder,
    },
    {
      title: "History",
      path: "#",
      icon: History,
    },
    {
      title: "Settings",
      path: "#",
      icon: Settings,
    },
    {
      title: "Home",
      path: "/",
      icon: Home,
    },
  ],
};

export const countryList = [
  { code: "en", name: "English", countryCode: "US" },
  { code: "de", name: "Deutsch", countryCode: "DE" },
  { code: "nl", name: "Dutch", countryCode: "NL" },
];

export const workspaces = {
  data: [
    {
      id: "w1",
      name: "Client: Acme Corp",
      createdAt: "June 10, 2025",
      documents: [{ id: "doc1" }, { id: "doc2" }],
    },
    {
      id: "w2",
      name: "Q2 2025 VAT Docs",
      createdAt: "June 12, 2025",
      documents: [{ id: "doc3" }],
    },
    {
      id: "w3",
      name: "Marketing Budget",
      createdAt: "June 25, 2025",
      documents: [],
    },
    {
      id: "w11",
      name: "Client: Acme Corp",
      createdAt: "June 10, 2025",
      documents: [{ id: "doc1" }, { id: "doc2" }],
    },
    {
      id: "w21",
      name: "Q2 2025 VAT Docs",
      createdAt: "June 12, 2025",
      documents: [{ id: "doc3" }],
    },
    {
      id: "w31",
      name: "Marketing Budget",
      createdAt: "June 25, 2025",
      documents: [],
    },
  ],
};
