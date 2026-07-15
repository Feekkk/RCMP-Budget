import { Clock, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

export type Status = "Pending" | "Endorsed" | "Rejected";

export const statusConfig: Record<Status, { icon: LucideIcon; tone: string }> = {
  Pending: { icon: Clock, tone: "text-amber-600 bg-amber-100" },
  Endorsed: { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
  Rejected: { icon: XCircle, tone: "text-red-600 bg-red-100" },
};

export type RequestItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type BudgetRequest = {
  id: string;
  title: string;
  department: string;
  requester: string;
  date: string;
  status: Status;
  items: RequestItem[];
};

export const formatRM = (value: number) =>
  `RM ${value.toLocaleString("en-MY")}`;

export const itemTotal = (item: RequestItem) => item.quantity * item.unitPrice;

export const requestTotal = (request: BudgetRequest) =>
  request.items.reduce((sum, item) => sum + itemTotal(item), 0);

let requests: BudgetRequest[] = [
  {
    id: "PRF-2087",
    title: "Meeting room upgrade",
    department: "IT Department",
    requester: "Afiq Danial",
    date: "14 Jul 2026",
    status: "Pending",
    items: [
      { name: "Ergonomic office chair", quantity: 6, unitPrice: 0 },
      { name: "Conference table", quantity: 1, unitPrice: 0 },
      { name: "HDMI cables (3m)", quantity: 4, unitPrice: 0 },
    ],
  },
  {
    id: "PRF-2086",
    title: "Projector for meeting room",
    department: "IT Department",
    requester: "Mei Ling Tan",
    date: "13 Jul 2026",
    status: "Pending",
    items: [
      { name: "4K laser projector", quantity: 1, unitPrice: 0 },
      { name: "Ceiling mount kit", quantity: 1, unitPrice: 0 },
      { name: "Projection screen (120\")", quantity: 1, unitPrice: 0 },
    ],
  },
  {
    id: "PRF-2085",
    title: "Annual software licenses",
    department: "Operations",
    requester: "Hafiz Rahman",
    date: "12 Jul 2026",
    status: "Pending",
    items: [
      { name: "Project management suite", quantity: 25, unitPrice: 0 },
      { name: "Design tool licenses", quantity: 15, unitPrice: 0 },
    ],
  },
  {
    id: "PRF-2084",
    title: "Quarterly stationery restock",
    department: "Human Resources",
    requester: "Nur Sabrina",
    date: "11 Jul 2026",
    status: "Pending",
    items: [
      { name: "A4 paper (boxes)", quantity: 10, unitPrice: 0 },
      { name: "Ballpoint pens (box of 50)", quantity: 4, unitPrice: 0 },
      { name: "Whiteboard markers", quantity: 20, unitPrice: 0 },
      { name: "Document trays", quantity: 6, unitPrice: 0 },
    ],
  },
  {
    id: "PRF-2079",
    title: "Team laptop refresh",
    department: "IT Department",
    requester: "Afiq Danial",
    date: "2 Jul 2026",
    status: "Endorsed",
    items: [
      { name: "14-inch business laptop", quantity: 5, unitPrice: 3700 },
      { name: "Laptop docking station", quantity: 5, unitPrice: 420 },
      { name: "Wireless mouse", quantity: 5, unitPrice: 65 },
    ],
  },
  {
    id: "PRF-2071",
    title: "Marketing print run",
    department: "Marketing",
    requester: "Mei Ling Tan",
    date: "20 Jun 2026",
    status: "Rejected",
    items: [
      { name: "Brochure print run (5,000)", quantity: 1, unitPrice: 2750 },
      { name: "Roll-up banner", quantity: 2, unitPrice: 220 },
    ],
  },
];

export const getRequests = () => requests;

export const getRequest = (id: string) => requests.find((req) => req.id === id);

export const updateRequestStatus = (id: string, status: Status) => {
  requests = requests.map((req) => (req.id === id ? { ...req, status } : req));
  return getRequest(id);
};

export const updateRequestItemPrice = (
  id: string,
  itemName: string,
  unitPrice: number,
) => {
  requests = requests.map((req) =>
    req.id === id
      ? {
          ...req,
          items: req.items.map((item) =>
            item.name === itemName ? { ...item, unitPrice } : item,
          ),
        }
      : req,
  );
  return getRequest(id);
};
