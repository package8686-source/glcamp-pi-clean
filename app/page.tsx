"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Download,
  FilePlus2,
  ImagePlus,
  Plus,
  Save,
  Trash2
} from "lucide-react";

type Currency = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "AED" | "HUF" | "DKK";
type QuoteMode = "default" | "tiered" | "group";
type PriceMode = "standard" | "platform";
type ShippingType =
  | "DDP"
  | "CIF"
  | "FOB"
  | "Sea Freight"
  | "Truck Freight"
  | "Air Freight"
  | "Express Delivery";

type CompanyInfo = {
  templateName: string;
  name: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  bankInfo: string;
  logo: string;
  seal: string;
};

type CustomerInfo = {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
};

type ProductLine = {
  id: string;
  image: string;
  description: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type ProductGroup = {
  id: string;
  title: string;
  products: ProductLine[];
  freightCharge: number;
  freightIncludedInPrice: boolean;
};

type TierPrice = {
  id: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

type TieredProduct = {
  id: string;
  image: string;
  description: string;
  sku: string;
  tiers: TierPrice[];
};

type InvoiceState = {
  piNumber: string;
  issueDate: string;
  validityDate: string;
  currency: Currency;
  shippingMethod: ShippingType;
  freightCharge: number;
  freightIncludedInPrice: boolean;
  paymentTerms: string;
  remarks: string;
};

type InvoiceStatus = "Draft" | "Final";

type InvoiceSnapshot = {
  company: CompanyInfo;
  customer: CustomerInfo;
  invoice: InvoiceState;
  quoteMode: QuoteMode;
  priceMode: PriceMode;
  products: ProductLine[];
  tieredProducts: TieredProduct[];
  productGroups: ProductGroup[];
  paymentPriceOptions: typeof paymentPriceOptions;
};

type SavedInvoice = InvoiceSnapshot & {
  invoiceId: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
};

type HistoryFilters = {
  query: string;
  date: string;
  status: "all" | InvoiceStatus;
};

const paymentPriceOptions = [
  {
    label: "AliExpress Payment",
    multiplier: 1
  },
  {
    label: "PayPal Commercial Invoice - 5% Discount",
    multiplier: 0.95
  },
  {
    label: "Business Bank Transfer - 8% Discount",
    multiplier: 0.92
  }
] as const;

const invoiceHistoryStorageKey = "glcamp-invoice-history-v1";
const invoiceDraftStorageKey = "glcamp-current-invoice-draft-v1";

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  AED: "د.إ", HUF: "Ft", DKK: "kr"
};

const shippingTypes: ShippingType[] = [
  "DDP",
  "CIF",
  "FOB",
  "Sea Freight",
  "Truck Freight",
  "Air Freight",
  "Express Delivery"
];

const defaultCompany: CompanyInfo = {
  templateName: "GLcamp Default",
  name: "GLcamp",
  legalName: "Guangzhou Lvguang Trading Co., Ltd.",
  address: "Guangzhou, Guangdong, China",
  phone: "",
  email: "",
  website: "",
  taxId: "",
  bankInfo: "",
  logo: "",
  seal: ""
};

const blankProduct = (): ProductLine => ({
  id: crypto.randomUUID(),
  image: "",
  description: "",
  sku: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 0
});

const blankTier = (): TierPrice => ({
  id: crypto.randomUUID(),
  quantity: 1,
  unitPrice: 0,
  taxRate: 0
});

const blankTieredProduct = (): TieredProduct => ({
  id: crypto.randomUUID(),
  image: "",
  description: "",
  sku: "",
  tiers: [blankTier()]
});

const today = () => new Date().toISOString().slice(0, 10);

const generateInvoiceId = () => `inv-${Date.now()}-${crypto.randomUUID()}`;

const generateFallbackPiNumber = () => `GLC-PI-${Date.now().toString().slice(-8)}`;

const cloneData = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function normalizeProducts(value: unknown): ProductLine[] {
  return Array.isArray(value) && value.length > 0 ? (value as ProductLine[]) : [blankProduct()];
}

function normalizeTieredProducts(value: unknown): TieredProduct[] {
  return Array.isArray(value) && value.length > 0 ? (value as TieredProduct[]) : [blankTieredProduct()];
}

function normalizeProductGroups(value: unknown): ProductGroup[] {
  return Array.isArray(value) && value.length > 0
    ? (value as ProductGroup[])
    : [
        {
          id: crypto.randomUUID(),
          title: "Option A - Sea Freight",
          products: [blankProduct()],
          freightCharge: 0,
          freightIncludedInPrice: false
        }
      ];
}

function normalizeSavedInvoice(value: Partial<SavedInvoice>): SavedInvoice {
  const now = new Date().toISOString();

  return {
    invoiceId: value.invoiceId || generateInvoiceId(),
    status: value.status === "Final" ? "Final" : "Draft",
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
    company: { ...defaultCompany, ...(value.company || {}) },
    customer: {
      name: "",
      company: "",
      address: "",
      phone: "",
      email: "",
      ...(value.customer || {})
    },
    invoice: {
      piNumber: value.invoice?.piNumber || generateFallbackPiNumber(),
      issueDate: value.invoice?.issueDate || today(),
      validityDate: value.invoice?.validityDate || "",
      currency: value.invoice?.currency || "USD",
      shippingMethod: value.invoice?.shippingMethod || "DDP",
      freightCharge: Number(value.invoice?.freightCharge || 0),
      freightIncludedInPrice: Boolean(value.invoice?.freightIncludedInPrice),
      paymentTerms:
        value.invoice?.paymentTerms || "30% deposit, 70% balance before shipment",
      remarks:
        value.invoice?.remarks ||
        "Prices are valid within the quotation period. Production starts after deposit confirmation."
    },
    quoteMode: value.quoteMode || "default",
    priceMode: value.priceMode || "standard",
    products: normalizeProducts(value.products),
    tieredProducts: normalizeTieredProducts(value.tieredProducts),
    productGroups: normalizeProductGroups(value.productGroups),
    paymentPriceOptions
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function money(value: number, currency: Currency) {
  return `${currencySymbols[currency]} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getProductLineAmounts(product: ProductLine) {
  const subtotal = product.quantity * product.unitPrice;
  const tax = subtotal * (product.taxRate / 100);
  const amount = subtotal + tax;

  return { subtotal, tax, amount };
}

function getTierAmounts(tier: TierPrice) {
  const subtotal = tier.quantity * tier.unitPrice;
  const tax = subtotal * (tier.taxRate / 100);
  const amount = subtotal + tax;

  return { subtotal, tax, amount };
}

function getGroupTotals(
  groupProducts: ProductLine[],
  freightCharge: number,
  freightIncludedInPrice: boolean,
  shippingMethod: ShippingType
) {
  const freightShownAsIncluded = shippingMethod === "DDP" && freightIncludedInPrice;
  const billableFreight = freightShownAsIncluded ? 0 : freightCharge;

  return groupProducts.reduce(
    (acc, product) => {
      const { subtotal, tax, amount } = getProductLineAmounts(product);
      acc.subtotal += subtotal;
      acc.tax += tax;
      acc.productAmount += amount;
      acc.total += amount;
      return acc;
    },
    { subtotal: 0, tax: 0, productAmount: 0, total: billableFreight }
  );
}

function getTieredTotals(
  tieredProducts: TieredProduct[],
  freightCharge: number,
  freightIncludedInPrice: boolean,
  shippingMethod: ShippingType
) {
  const freightShownAsIncluded = shippingMethod === "DDP" && freightIncludedInPrice;
  const billableFreight = freightShownAsIncluded ? 0 : freightCharge;

  return tieredProducts.reduce(
    (acc, product) => {
      product.tiers.forEach((tier) => {
        const { subtotal, tax, amount } = getTierAmounts(tier);
        acc.subtotal += subtotal;
        acc.tax += tax;
        acc.productAmount += amount;
        acc.total += amount;
      });
      return acc;
    },
    { subtotal: 0, tax: 0, productAmount: 0, total: billableFreight }
  );
}

function getPaymentPrices(totalAmount: number) {
  return paymentPriceOptions.map((option) => ({
    ...option,
    amount: totalAmount * option.multiplier
  }));
}

function formatQuoteMode(mode: QuoteMode) {
  if (mode === "tiered") return "Tiered Quote";
  if (mode === "group") return "Group Quote";
  return "Default Quote";
}

function getSavedInvoiceTotal(savedInvoice: SavedInvoice) {
  if (savedInvoice.quoteMode === "tiered") {
    return getTieredTotals(
      savedInvoice.tieredProducts,
      savedInvoice.invoice.freightCharge,
      savedInvoice.invoice.freightIncludedInPrice,
      savedInvoice.invoice.shippingMethod
    ).total;
  }

  if (savedInvoice.quoteMode === "group") {
    return savedInvoice.productGroups.reduce((sum, group) => {
      const groupTotal = getGroupTotals(
        group.products,
        group.freightCharge,
        group.freightIncludedInPrice,
        savedInvoice.invoice.shippingMethod
      ).total;
      return sum + groupTotal;
    }, 0);
  }

  return getGroupTotals(
    savedInvoice.products,
    savedInvoice.invoice.freightCharge,
    savedInvoice.invoice.freightIncludedInPrice,
    savedInvoice.invoice.shippingMethod
  ).total;
}

export default function Home() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [savedTemplates, setSavedTemplates] = useState<CompanyInfo[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [quoteMode, setQuoteMode] = useState<QuoteMode>("default");
  const [priceMode, setPriceMode] = useState<PriceMode>("standard");
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string>("");
  const [invoiceHistory, setInvoiceHistory] = useState<SavedInvoice[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    query: "",
    date: "",
    status: "all"
  });
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string>("");
  const [company, setCompany] = useState<CompanyInfo>(defaultCompany);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    company: "",
    address: "",
    phone: "",
    email: ""
  });
  const [products, setProducts] = useState<ProductLine[]>([
    {
      ...blankProduct(),
      description: "Outdoor camping tent",
      sku: "GLC-TENT-001",
      quantity: 10,
      unitPrice: 68,
      taxRate: 0
    }
  ]);
  const [tieredProducts, setTieredProducts] = useState<TieredProduct[]>([
    {
      ...blankTieredProduct(),
      description: "Outdoor camping tent",
      sku: "GLC-TENT-001",
      tiers: [
        {
          ...blankTier(),
          quantity: 10,
          unitPrice: 68,
          taxRate: 0
        },
        {
          ...blankTier(),
          quantity: 30,
          unitPrice: 64,
          taxRate: 0
        },
        {
          ...blankTier(),
          quantity: 50,
          unitPrice: 60,
          taxRate: 0
        }
      ]
    }
  ]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([
    {
      id: crypto.randomUUID(),
      title: "Option A - Sea Freight",
      products: [
        {
          ...blankProduct(),
          description: "Pickup canopy package",
          sku: "GLC-CANOPY-001",
          quantity: 1,
          unitPrice: 0,
          taxRate: 0
        }
      ],
      freightCharge: 0,
      freightIncludedInPrice: false
    }
  ]);
  const [invoice, setInvoice] = useState<InvoiceState>({
    piNumber: "",
    issueDate: today(),
    validityDate: "",
    currency: "USD",
    shippingMethod: "DDP",
    freightCharge: 0,
    freightIncludedInPrice: false,
    paymentTerms: "30% deposit, 70% balance before shipment",
    remarks: "Prices are valid within the quotation period. Production starts after deposit confirmation."
  });

  function createInvoiceSnapshot(): InvoiceSnapshot {
    return {
      company: cloneData(company),
      customer: cloneData(customer),
      invoice: cloneData(invoice),
      quoteMode,
      priceMode,
      products: cloneData(products),
      tieredProducts: cloneData(tieredProducts),
      productGroups: cloneData(productGroups),
      paymentPriceOptions
    };
  }

  function applySnapshot(snapshot: Partial<SavedInvoice>) {
    const normalized = normalizeSavedInvoice(snapshot);
    setCompany(normalized.company);
    setCustomer(normalized.customer);
    setInvoice(normalized.invoice);
    setQuoteMode(normalized.quoteMode);
    setPriceMode(normalized.priceMode);
    setProducts(normalized.products);
    setTieredProducts(normalized.tieredProducts);
    setProductGroups(normalized.productGroups);
  }

  function persistHistory(nextHistory: SavedInvoice[]) {
    const sortedHistory = [...nextHistory].sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
    localStorage.setItem(invoiceHistoryStorageKey, JSON.stringify(sortedHistory));
    setInvoiceHistory(sortedHistory);
  }

  useEffect(() => {
    const templates = localStorage.getItem("glcamp-company-templates");
    if (templates) {
      setSavedTemplates(JSON.parse(templates));
    }

    const storedHistory = localStorage.getItem(invoiceHistoryStorageKey);
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory) as Partial<SavedInvoice>[];
        setInvoiceHistory(
          parsedHistory
            .map((item) => normalizeSavedInvoice(item))
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        );
      } catch {
        setInvoiceHistory([]);
      }
    }

    const storedDraft = localStorage.getItem(invoiceDraftStorageKey);
    if (storedDraft) {
      try {
        const draft = normalizeSavedInvoice(JSON.parse(storedDraft) as Partial<SavedInvoice>);
        applySnapshot(draft);
        setCurrentInvoiceId(draft.invoiceId);
        setLastAutosavedAt(draft.updatedAt);
        return;
      } catch {
        localStorage.removeItem(invoiceDraftStorageKey);
      }
    }

    fetch("/api/pi-number")
      .then((res) => res.json())
      .then((data) => setInvoice((prev) => ({ ...prev, piNumber: data.piNumber })))
      .catch(() => {
        setInvoice((prev) => ({ ...prev, piNumber: generateFallbackPiNumber() }));
      });
  }, []);

  useEffect(() => {
    const autosaveTimer = window.setTimeout(() => {
      const now = new Date().toISOString();
      const invoiceId = currentInvoiceId || generateInvoiceId();
      if (!currentInvoiceId) setCurrentInvoiceId(invoiceId);

      const draft: SavedInvoice = {
        ...createInvoiceSnapshot(),
        invoiceId,
        status: "Draft",
        createdAt: now,
        updatedAt: now
      };

      localStorage.setItem(invoiceDraftStorageKey, JSON.stringify(draft));
      setLastAutosavedAt(now);
    }, 3000);

    return () => window.clearTimeout(autosaveTimer);
  }, [
    company,
    customer,
    invoice,
    quoteMode,
    priceMode,
    products,
    tieredProducts,
    productGroups,
    currentInvoiceId
  ]);

  const totals = useMemo(() => {
    if (quoteMode === "tiered") {
      return getTieredTotals(
        tieredProducts,
        invoice.freightCharge,
        invoice.freightIncludedInPrice,
        invoice.shippingMethod
      );
    }

    return getGroupTotals(
      products,
      invoice.freightCharge,
      invoice.freightIncludedInPrice,
      invoice.shippingMethod
    );
  }, [
    products,
    tieredProducts,
    quoteMode,
    invoice.freightCharge,
    invoice.freightIncludedInPrice,
    invoice.shippingMethod
  ]);

  const freightSummaryLabel = `${invoice.shippingMethod} Shipping Freight`;
  const freightShownAsIncluded = invoice.shippingMethod === "DDP" && invoice.freightIncludedInPrice;
  const freightSummaryValue = freightShownAsIncluded
    ? "/"
    : money(invoice.freightCharge, invoice.currency);

  const filteredHistory = useMemo(() => {
    const query = historyFilters.query.trim().toLowerCase();

    return invoiceHistory
      .filter((item) => {
        const matchesQuery =
          !query ||
          item.invoice.piNumber.toLowerCase().includes(query) ||
          item.customer.name.toLowerCase().includes(query) ||
          item.customer.company.toLowerCase().includes(query);
        const matchesDate = !historyFilters.date || item.invoice.issueDate === historyFilters.date;
        const matchesStatus =
          historyFilters.status === "all" || item.status === historyFilters.status;

        return matchesQuery && matchesDate && matchesStatus;
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [invoiceHistory, historyFilters]);

  const updateCompany = (key: keyof CompanyInfo, value: string) => {
    setCompany((prev) => ({ ...prev, [key]: value }));
  };

  const updateCustomer = (key: keyof CustomerInfo, value: string) => {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  };

  const updateInvoice = (key: keyof InvoiceState, value: string) => {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  };

  const updateProduct = (id: string, patch: Partial<ProductLine>) => {
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, ...patch } : product))
    );
  };

  const updateTieredProduct = (productId: string, patch: Partial<TieredProduct>) => {
    setTieredProducts((prev) =>
      prev.map((product) => (product.id === productId ? { ...product, ...patch } : product))
    );
  };

  const addTieredProduct = () => {
    setTieredProducts((prev) => [...prev, blankTieredProduct()]);
  };

  const removeTieredProduct = (productId: string) => {
    setTieredProducts((prev) =>
      prev.length === 1 ? prev : prev.filter((product) => product.id !== productId)
    );
  };

  const updateTier = (productId: string, tierId: string, patch: Partial<TierPrice>) => {
    setTieredProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              tiers: product.tiers.map((tier) =>
                tier.id === tierId ? { ...tier, ...patch } : tier
              )
            }
          : product
      )
    );
  };

  const addTier = (productId: string) => {
    setTieredProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, tiers: [...product.tiers, blankTier()] } : product
      )
    );
  };

  const removeTier = (productId: string, tierId: string) => {
    setTieredProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? {
              ...product,
              tiers:
                product.tiers.length === 1
                  ? product.tiers
                  : product.tiers.filter((tier) => tier.id !== tierId)
            }
          : product
      )
    );
  };

  const addProductGroup = () => {
    setProductGroups((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `Option ${String.fromCharCode(65 + prev.length)}`,
        products: [blankProduct()],
        freightCharge: 0,
        freightIncludedInPrice: false
      }
    ]);
  };

  const updateProductGroup = (groupId: string, patch: Partial<ProductGroup>) => {
    setProductGroups((prev) =>
      prev.map((group) => (group.id === groupId ? { ...group, ...patch } : group))
    );
  };

  const addGroupProduct = (groupId: string) => {
    setProductGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, products: [...group.products, blankProduct()] }
          : group
      )
    );
  };

  const updateGroupProduct = (
    groupId: string,
    productId: string,
    patch: Partial<ProductLine>
  ) => {
    setProductGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              products: group.products.map((product) =>
                product.id === productId ? { ...product, ...patch } : product
              )
            }
          : group
      )
    );
  };

  const removeGroupProduct = (groupId: string, productId: string) => {
    setProductGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              products:
                group.products.length === 1
                  ? group.products
                  : group.products.filter((product) => product.id !== productId)
            }
          : group
      )
    );
  };

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    callback: (value: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    callback(await readFileAsDataUrl(file));
  };

  const saveTemplate = () => {
    const nextTemplates = [
      company,
      ...savedTemplates.filter((template) => template.templateName !== company.templateName)
    ].slice(0, 12);

    localStorage.setItem("glcamp-company-templates", JSON.stringify(nextTemplates));
    setSavedTemplates(nextTemplates);
  };

  const loadTemplate = (templateName: string) => {
    const selected = savedTemplates.find((template) => template.templateName === templateName);
    if (selected) setCompany(selected);
  };

  const exportPdf = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    const html2pdf = (await import("html2pdf.js")).default;

    await html2pdf()
      .set({
        margin: 0,
        filename: `${invoice.piNumber || "proforma-invoice"}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      })
      .from(previewRef.current)
      .save();

    setIsExporting(false);
  };

  const fetchNextPiNumber = async () => {
    try {
      const response = await fetch("/api/pi-number");
      const data = await response.json();
      return data.piNumber || generateFallbackPiNumber();
    } catch {
      return generateFallbackPiNumber();
    }
  };

  const saveInvoice = (statusOverride?: InvoiceStatus) => {
    const now = new Date().toISOString();
    const invoiceId = currentInvoiceId || generateInvoiceId();
    const existing = invoiceHistory.find((item) => item.invoiceId === invoiceId);
    const savedInvoice: SavedInvoice = {
      ...createInvoiceSnapshot(),
      invoiceId,
      status: statusOverride || existing?.status || "Draft",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    const nextHistory = [
      savedInvoice,
      ...invoiceHistory.filter((item) => item.invoiceId !== invoiceId)
    ];

    setCurrentInvoiceId(invoiceId);
    persistHistory(nextHistory);
    localStorage.setItem(invoiceDraftStorageKey, JSON.stringify(savedInvoice));
    setLastAutosavedAt(now);
    return savedInvoice;
  };

  const startNewInvoice = async () => {
    if (window.confirm("Save current invoice before creating a new one?")) {
      saveInvoice("Draft");
    }

    const nextPiNumber = await fetchNextPiNumber();
    setCurrentInvoiceId(generateInvoiceId());
    setCompany(defaultCompany);
    setCustomer({ name: "", company: "", address: "", phone: "", email: "" });
    setProducts([blankProduct()]);
    setTieredProducts([blankTieredProduct()]);
    setProductGroups([
      {
        id: crypto.randomUUID(),
        title: "Option A - Sea Freight",
        products: [blankProduct()],
        freightCharge: 0,
        freightIncludedInPrice: false
      }
    ]);
    setQuoteMode("default");
    setPriceMode("standard");
    setInvoice({
      piNumber: nextPiNumber,
      issueDate: today(),
      validityDate: "",
      currency: "USD",
      shippingMethod: "DDP",
      freightCharge: 0,
      freightIncludedInPrice: false,
      paymentTerms: "30% deposit, 70% balance before shipment",
      remarks: "Prices are valid within the quotation period. Production starts after deposit confirmation."
    });
    setShowHistory(false);
  };

  const openHistoryInvoice = (savedInvoice: SavedInvoice) => {
    applySnapshot(savedInvoice);
    setCurrentInvoiceId(savedInvoice.invoiceId);
    setShowHistory(false);
  };

  const duplicateHistoryInvoice = async (savedInvoice: SavedInvoice) => {
    const now = new Date().toISOString();
    const nextPiNumber = await fetchNextPiNumber();
    const duplicate = normalizeSavedInvoice({
      ...cloneData(savedInvoice),
      invoiceId: generateInvoiceId(),
      status: "Draft",
      createdAt: now,
      updatedAt: now,
      invoice: {
        ...savedInvoice.invoice,
        piNumber: nextPiNumber,
        issueDate: today()
      }
    });

    persistHistory([duplicate, ...invoiceHistory]);
    applySnapshot(duplicate);
    setCurrentInvoiceId(duplicate.invoiceId);
    setShowHistory(false);
  };

  const deleteHistoryInvoice = (invoiceId: string) => {
    if (!window.confirm("Delete this invoice permanently?")) return;
    persistHistory(invoiceHistory.filter((item) => item.invoiceId !== invoiceId));
    if (currentInvoiceId === invoiceId) setCurrentInvoiceId("");
  };

  const markHistoryInvoiceFinal = (invoiceId: string) => {
    const now = new Date().toISOString();
    persistHistory(
      invoiceHistory.map((item) =>
        item.invoiceId === invoiceId ? { ...item, status: "Final", updatedAt: now } : item
      )
    );
  };

  const downloadHistoryPdf = (savedInvoice: SavedInvoice) => {
    applySnapshot(savedInvoice);
    setCurrentInvoiceId(savedInvoice.invoiceId);
    setShowHistory(false);
    window.setTimeout(() => {
      void exportPdf();
    }, 250);
  };

  const exportBackup = () => {
    const backup = JSON.stringify(invoiceHistory, null, 2);
    const blob = new Blob([backup], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `glcamp-invoice-history-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as Partial<SavedInvoice>[] | { invoices?: Partial<SavedInvoice>[] };
      const importedItems = Array.isArray(parsed) ? parsed : parsed.invoices || [];
      const normalizedItems = importedItems.map((item) => normalizeSavedInvoice(item));
      const merged = new Map<string, SavedInvoice>();
      [...invoiceHistory, ...normalizedItems].forEach((item) => merged.set(item.invoiceId, item));
      persistHistory(Array.from(merged.values()));
      event.target.value = "";
    } catch {
      window.alert("Import failed. Please choose a valid GLcamp invoice history JSON file.");
    }
  };

  return (
    <main className="app-shell">
      <section className="editor-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">GLcamp PI Tool</p>
            <h1>Proforma Invoice Generator</h1>
            {lastAutosavedAt && (
              <p className="autosave-note">
                Draft autosaved {new Date(lastAutosavedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="top-action-row">
            <button className="secondary-button" onClick={startNewInvoice}>
              <FilePlus2 size={17} />
              New Invoice
            </button>
            <button className="secondary-button" onClick={() => saveInvoice()}>
              <Save size={17} />
              Save Invoice
            </button>
            <button className="secondary-button" onClick={() => setShowHistory((prev) => !prev)}>
              <FilePlus2 size={17} />
              Invoice History
            </button>
            <button className="primary-button" onClick={exportPdf} disabled={isExporting}>
              <Download size={18} />
              {isExporting ? "Exporting..." : "Download PDF"}
            </button>
          </div>
        </div>

        {showHistory && (
          <section className="form-section history-panel">
            <div className="section-title">
              <h2>Invoice History</h2>
              <div className="history-backup-actions">
                <button className="secondary-button" onClick={exportBackup}>
                  Export Backup
                </button>
                <label className="secondary-button import-backup-button">
                  Import Backup
                  <input type="file" accept="application/json" onChange={importBackup} />
                </label>
              </div>
            </div>
            <div className="history-filters">
              <label>
                Search
                <input
                  placeholder="PI Number, customer name, or company"
                  value={historyFilters.query}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({ ...prev, query: event.target.value }))
                  }
                />
              </label>
              <label>
                Issue date
                <input
                  type="date"
                  value={historyFilters.date}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={historyFilters.status}
                  onChange={(event) =>
                    setHistoryFilters((prev) => ({
                      ...prev,
                      status: event.target.value as HistoryFilters["status"]
                    }))
                  }
                >
                  <option value="all">All</option>
                  <option value="Draft">Draft</option>
                  <option value="Final">Final</option>
                </select>
              </label>
            </div>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>PI Number</th>
                    <th>Customer</th>
                    <th>Issue Date</th>
                    <th>Currency</th>
                    <th>Quote Type</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item.invoiceId}>
                      <td>{item.invoice.piNumber}</td>
                      <td>
                        <strong>{item.customer.name || "-"}</strong>
                        <span>{item.customer.company || "-"}</span>
                      </td>
                      <td>{item.invoice.issueDate || "-"}</td>
                      <td>{item.invoice.currency}</td>
                      <td>{formatQuoteMode(item.quoteMode)}</td>
                      <td>{money(getSavedInvoiceTotal(item), item.invoice.currency)}</td>
                      <td>
                        <span className={item.status === "Final" ? "status-pill final" : "status-pill"}>
                          {item.status}
                        </span>
                      </td>
                      <td>{new Date(item.updatedAt).toLocaleString()}</td>
                      <td>
                        <div className="history-actions">
                          <button onClick={() => openHistoryInvoice(item)}>Open / Edit</button>
                          <button onClick={() => void duplicateHistoryInvoice(item)}>Duplicate</button>
                          <button onClick={() => downloadHistoryPdf(item)}>Download PDF</button>
                          <button onClick={() => markHistoryInvoiceFinal(item.invoiceId)}>Mark as Final</button>
                          <button className="danger-link" onClick={() => deleteHistoryInvoice(item.invoiceId)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty-history">
                        No invoice history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="section-grid">
          <section className="form-section">
            <div className="section-title">
              <Building2 size={18} />
              <h2>Company Information</h2>
            </div>
            <div className="two-col">
              <label>
                Template name
                <input
                  value={company.templateName}
                  onChange={(event) => updateCompany("templateName", event.target.value)}
                />
              </label>
              <label>
                Saved templates
                <select onChange={(event) => loadTemplate(event.target.value)} defaultValue="">
                  <option value="" disabled>
                    Select template
                  </option>
                  {savedTemplates.map((template) => (
                    <option key={template.templateName} value={template.templateName}>
                      {template.templateName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Brand
              <input
                value={company.name}
                onChange={(event) => updateCompany("name", event.target.value)}
              />
            </label>
            <label>
              Legal company name
              <input
                value={company.legalName}
                onChange={(event) => updateCompany("legalName", event.target.value)}
              />
            </label>
            <label>
              Address
              <textarea
                value={company.address}
                onChange={(event) => updateCompany("address", event.target.value)}
              />
            </label>
            <div className="two-col">
              <label>
                Phone
                <input
                  value={company.phone}
                  onChange={(event) => updateCompany("phone", event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  value={company.email}
                  onChange={(event) => updateCompany("email", event.target.value)}
                />
              </label>
            </div>
            <div className="two-col">
              <label>
                Website
                <input
                  value={company.website}
                  onChange={(event) => updateCompany("website", event.target.value)}
                />
              </label>
              <label>
                Tax ID
                <input
                  value={company.taxId}
                  onChange={(event) => updateCompany("taxId", event.target.value)}
                />
              </label>
            </div>
            <label>
              Bank information
              <textarea
                value={company.bankInfo}
                onChange={(event) => updateCompany("bankInfo", event.target.value)}
              />
            </label>
            <div className="upload-row">
              <label className="upload-button">
                <ImagePlus size={17} />
                Upload Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleImageUpload(event, (value) => updateCompany("logo", value))}
                />
              </label>
              <label className="upload-button">
                <ImagePlus size={17} />
                Upload Seal
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleImageUpload(event, (value) => updateCompany("seal", value))}
                />
              </label>
              <button className="secondary-button" onClick={saveTemplate}>
                <Save size={17} />
                Save Template
              </button>
            </div>
          </section>

          <section className="form-section">
            <div className="section-title">
              <FilePlus2 size={18} />
              <h2>Invoice Details</h2>
            </div>
            <div className="two-col">
              <label>
                PI Number
                <input
                  value={invoice.piNumber}
                  onChange={(event) => updateInvoice("piNumber", event.target.value)}
                />
              </label>
              <label>
                Currency
                <select
                  value={invoice.currency}
                  onChange={(event) => updateInvoice("currency", event.target.value)}
                >
                  {Object.keys(currencySymbols).map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Quote Type
              <select
                value={quoteMode}
                onChange={(event) => setQuoteMode(event.target.value as QuoteMode)}
              >
                <option value="default">Default Quote</option>
                <option value="tiered">Tiered Quote</option>
                <option value="group">Group Quote</option>
              </select>
            </label>
            <div className="quote-mode-switch" aria-label="Quote type switch">
              <button
                type="button"
                className={quoteMode === "default" ? "quote-mode-button active" : "quote-mode-button"}
                onClick={() => setQuoteMode("default")}
              >
                Default Quote
              </button>
              <button
                type="button"
                className={quoteMode === "tiered" ? "quote-mode-button active" : "quote-mode-button"}
                onClick={() => setQuoteMode("tiered")}
              >
                Tiered Quote
              </button>
              <button
                type="button"
                className={quoteMode === "group" ? "quote-mode-button active" : "quote-mode-button"}
                onClick={() => setQuoteMode("group")}
              >
                Group Quote
              </button>
            </div>
            <label>
              Price Type
              <select
                value={priceMode}
                onChange={(event) => setPriceMode(event.target.value as PriceMode)}
              >
                <option value="standard">Standard Price</option>
                <option value="platform">Platform Discount Price</option>
              </select>
            </label>
            <div className="price-mode-switch" aria-label="Price type switch">
              <button
                type="button"
                className={priceMode === "standard" ? "quote-mode-button active" : "quote-mode-button"}
                onClick={() => setPriceMode("standard")}
              >
                Standard Price
              </button>
              <button
                type="button"
                className={priceMode === "platform" ? "quote-mode-button active" : "quote-mode-button"}
                onClick={() => setPriceMode("platform")}
              >
                Platform Discount Price
              </button>
            </div>
            <div className="two-col">
              <label>
                Issue date
                <input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(event) => updateInvoice("issueDate", event.target.value)}
                />
              </label>
              <label>
                Valid until
                <input
                  type="date"
                  value={invoice.validityDate}
                  onChange={(event) => updateInvoice("validityDate", event.target.value)}
                />
              </label>
            </div>
            <div className="two-col">
              <label>
                Shipping method
                <select
                  value={invoice.shippingMethod}
                  onChange={(event) =>
                    setInvoice((prev) => ({
                      ...prev,
                      shippingMethod: event.target.value as ShippingType
                    }))
                  }
                >
                  {shippingTypes.map((shippingType) => (
                    <option key={shippingType} value={shippingType}>
                      {shippingType}
                    </option>
                  ))}
                </select>
              </label>
              {quoteMode !== "group" && (
                <label>
                  Shipping Freight
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoice.freightCharge}
                    onChange={(event) =>
                      setInvoice((prev) => ({ ...prev, freightCharge: Number(event.target.value) }))
                    }
                  />
                </label>
              )}
            </div>
            {quoteMode !== "group" && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={invoice.freightIncludedInPrice}
                  disabled={invoice.shippingMethod !== "DDP"}
                  onChange={(event) =>
                    setInvoice((prev) => ({
                      ...prev,
                      freightIncludedInPrice: event.target.checked
                    }))
                  }
                />
                Included in price / show as /
              </label>
            )}
            <label>
              Payment terms
              <textarea
                value={invoice.paymentTerms}
                onChange={(event) => updateInvoice("paymentTerms", event.target.value)}
              />
            </label>
          </section>

          <section className="form-section">
            <div className="section-title">
              <h2>Customer Information</h2>
            </div>
            <div className="two-col">
              <label>
                Contact name
                <input
                  value={customer.name}
                  onChange={(event) => updateCustomer("name", event.target.value)}
                />
              </label>
              <label>
                Customer company
                <input
                  value={customer.company}
                  onChange={(event) => updateCustomer("company", event.target.value)}
                />
              </label>
            </div>
            <label>
              Address
              <textarea
                value={customer.address}
                onChange={(event) => updateCustomer("address", event.target.value)}
              />
            </label>
            <div className="two-col">
              <label>
                Phone
                <input
                  value={customer.phone}
                  onChange={(event) => updateCustomer("phone", event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  value={customer.email}
                  onChange={(event) => updateCustomer("email", event.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <section className="form-section products-section">
          <div className="section-title product-title-row">
            <div>
              <h2>
                {quoteMode === "group"
                  ? "Quote Options / Groups"
                  : quoteMode === "tiered"
                    ? "Tiered Quote Products"
                    : "Product Lines"}
              </h2>
              {quoteMode === "tiered" && (
                <p className="section-note">Create quantity-based price tiers for each product.</p>
              )}
              {quoteMode === "group" && (
                <p className="section-note">Create separate quotation options such as Option A, Option B, Batch 1, or Batch 2.</p>
              )}
            </div>
            {quoteMode === "group" ? (
              <button className="secondary-button" onClick={addProductGroup}>
                <Plus size={17} />
                Add Group / Add Option
              </button>
            ) : quoteMode === "tiered" ? (
              <button className="secondary-button" onClick={addTieredProduct}>
                <Plus size={17} />
                Add Tiered Product
              </button>
            ) : (
              <button className="secondary-button" onClick={() => setProducts((prev) => [...prev, blankProduct()])}>
                <Plus size={17} />
                Add Product
              </button>
            )}
          </div>
          {quoteMode === "group" ? (
            <div className="quote-group-list">
              {productGroups.map((group) => (
                <div className="quote-group-editor" key={group.id}>
                  <div className="group-editor-head">
                    <label>
                      Group title
                      <input
                        value={group.title}
                        onChange={(event) =>
                          updateProductGroup(group.id, { title: event.target.value })
                        }
                        placeholder="Option A - Sea Freight"
                      />
                    </label>
                    <label>
                      Group Freight
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={group.freightCharge}
                        onChange={(event) =>
                          updateProductGroup(group.id, {
                            freightCharge: Number(event.target.value)
                          })
                        }
                      />
                    </label>
                    <label className="checkbox-row group-checkbox-row">
                      <input
                        type="checkbox"
                        checked={group.freightIncludedInPrice}
                        disabled={invoice.shippingMethod !== "DDP"}
                        onChange={(event) =>
                          updateProductGroup(group.id, {
                            freightIncludedInPrice: event.target.checked
                          })
                        }
                      />
                      Included in price / show as /
                    </label>
                  </div>
                  <div className="product-editor-list">
                    {group.products.map((product, index) => (
                      <div className="product-editor" key={product.id}>
                        <div className="product-index">{index + 1}</div>
                        <label className="image-upload-tile">
                          {product.image ? <img src={product.image} alt="" /> : <ImagePlus size={20} />}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              handleImageUpload(event, (value) =>
                                updateGroupProduct(group.id, product.id, { image: value })
                              )
                            }
                          />
                        </label>
                        <label className="wide-field">
                          Description
                          <input
                            value={product.description}
                            onChange={(event) =>
                              updateGroupProduct(group.id, product.id, {
                                description: event.target.value
                              })
                            }
                          />
                        </label>
                        <label>
                          SKU
                          <input
                            value={product.sku}
                            onChange={(event) =>
                              updateGroupProduct(group.id, product.id, { sku: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Qty
                          <input
                            type="number"
                            min="0"
                            value={product.quantity}
                            onChange={(event) =>
                              updateGroupProduct(group.id, product.id, {
                                quantity: Number(event.target.value)
                              })
                            }
                          />
                        </label>
                        <label>
                          Unit price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.unitPrice}
                            onChange={(event) =>
                              updateGroupProduct(group.id, product.id, {
                                unitPrice: Number(event.target.value)
                              })
                            }
                          />
                        </label>
                        <label>
                          Tax %
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.taxRate}
                            onChange={(event) =>
                              updateGroupProduct(group.id, product.id, {
                                taxRate: Number(event.target.value)
                              })
                            }
                          />
                        </label>
                        <label className="line-amount-field">
                          Amount
                          <input
                            readOnly
                            value={money(getProductLineAmounts(product).amount, invoice.currency)}
                          />
                        </label>
                        <button
                          className="icon-button"
                          aria-label="Remove product"
                          onClick={() => removeGroupProduct(group.id, product.id)}
                          disabled={group.products.length === 1}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="secondary-button group-add-product" onClick={() => addGroupProduct(group.id)}>
                    <Plus size={17} />
                    Add Product
                  </button>
                </div>
              ))}
            </div>
          ) : quoteMode === "tiered" ? (
            <div className="tiered-product-list">
              {tieredProducts.map((product, productIndex) => (
                <div className="tiered-product-editor" key={product.id}>
                  <div className="tiered-product-head">
                    <div className="product-index">{productIndex + 1}</div>
                    <label className="image-upload-tile">
                      {product.image ? <img src={product.image} alt="" /> : <ImagePlus size={20} />}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleImageUpload(event, (value) =>
                            updateTieredProduct(product.id, { image: value })
                          )
                        }
                      />
                    </label>
                    <label className="wide-field">
                      Description
                      <input
                        value={product.description}
                        onChange={(event) =>
                          updateTieredProduct(product.id, { description: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      SKU
                      <input
                        value={product.sku}
                        onChange={(event) =>
                          updateTieredProduct(product.id, { sku: event.target.value })
                        }
                      />
                    </label>
                    <button
                      className="icon-button"
                      aria-label="Remove tiered product"
                      onClick={() => removeTieredProduct(product.id)}
                      disabled={tieredProducts.length === 1}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="tier-list">
                    {product.tiers.map((tier, tierIndex) => (
                      <div className="tier-editor" key={tier.id}>
                        <div className="tier-label">Tier {tierIndex + 1}</div>
                        <label>
                          Qty
                          <input
                            type="number"
                            min="0"
                            value={tier.quantity}
                            onChange={(event) =>
                              updateTier(product.id, tier.id, { quantity: Number(event.target.value) })
                            }
                          />
                        </label>
                        <label>
                          Unit price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.unitPrice}
                            onChange={(event) =>
                              updateTier(product.id, tier.id, { unitPrice: Number(event.target.value) })
                            }
                          />
                        </label>
                        <label>
                          Tax %
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.taxRate}
                            onChange={(event) =>
                              updateTier(product.id, tier.id, { taxRate: Number(event.target.value) })
                            }
                          />
                        </label>
                        <label className="line-amount-field">
                          Amount
                          <input
                            readOnly
                            value={money(getTierAmounts(tier).amount, invoice.currency)}
                          />
                        </label>
                        <button
                          className="icon-button"
                          aria-label="Remove tier"
                          onClick={() => removeTier(product.id, tier.id)}
                          disabled={product.tiers.length === 1}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="secondary-button group-add-product" onClick={() => addTier(product.id)}>
                    <Plus size={17} />
                    Add Price Tier
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="product-editor-list">
              {products.map((product, index) => (
                <div className="product-editor" key={product.id}>
                  <div className="product-index">{index + 1}</div>
                  <label className="image-upload-tile">
                    {product.image ? <img src={product.image} alt="" /> : <ImagePlus size={20} />}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleImageUpload(event, (value) => updateProduct(product.id, { image: value }))
                      }
                    />
                  </label>
                  <label className="wide-field">
                    Description
                    <input
                      value={product.description}
                      onChange={(event) => updateProduct(product.id, { description: event.target.value })}
                    />
                  </label>
                  <label>
                    SKU
                    <input
                      value={product.sku}
                      onChange={(event) => updateProduct(product.id, { sku: event.target.value })}
                    />
                  </label>
                  <label>
                    Qty
                    <input
                      type="number"
                      min="0"
                      value={product.quantity}
                      onChange={(event) => updateProduct(product.id, { quantity: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Unit price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.unitPrice}
                      onChange={(event) => updateProduct(product.id, { unitPrice: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Tax %
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.taxRate}
                      onChange={(event) => updateProduct(product.id, { taxRate: Number(event.target.value) })}
                    />
                  </label>
                  <label className="line-amount-field">
                    Amount
                    <input
                      readOnly
                      value={money(getProductLineAmounts(product).amount, invoice.currency)}
                    />
                  </label>
                  <button
                    className="icon-button"
                    aria-label="Remove product"
                    onClick={() => setProducts((prev) => prev.filter((item) => item.id !== product.id))}
                    disabled={products.length === 1}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label>
            Remarks
            <textarea
              value={invoice.remarks}
              onChange={(event) => updateInvoice("remarks", event.target.value)}
            />
          </label>
        </section>
      </section>

      <aside className="preview-panel">
        <div className="preview-toolbar">
          <div>
            <p className="eyebrow">Live Preview</p>
            <strong>{invoice.piNumber || "New PI"}</strong>
          </div>
          <button className="primary-button compact" onClick={exportPdf} disabled={isExporting}>
            <Download size={18} />
            PDF
          </button>
        </div>

        <div className="invoice-paper" ref={previewRef}>
          <header className="invoice-header">
            <div className="brand-block">
              {company.logo ? <img className="logo" src={company.logo} alt="Company logo" /> : <div className="logo-placeholder">GL</div>}
              <div>
                <h2>{company.name}</h2>
                <p>{company.legalName}</p>
              </div>
            </div>
            <div className="invoice-heading">
              <h1>PROFORMA INVOICE</h1>
              <p>{invoice.piNumber}</p>
            </div>
          </header>

          <section className="invoice-meta">
            <div>
              <h3>Seller</h3>
              <p>{company.legalName}</p>
              <p>{company.address}</p>
              <p>{company.phone}</p>
              <p>{company.email}</p>
              <p>{company.website}</p>
              <p>{company.taxId && `Tax ID: ${company.taxId}`}</p>
            </div>
            <div>
              <h3>Bill To</h3>
              <p>{customer.company || "Customer Company"}</p>
              <p>{customer.name}</p>
              <p>{customer.address}</p>
              <p>{customer.phone}</p>
              <p>{customer.email}</p>
            </div>
            <div>
              <h3>Invoice</h3>
              <p>Issue Date: {invoice.issueDate}</p>
              <p>Valid Until: {invoice.validityDate || "-"}</p>
              <p>Currency: {invoice.currency}</p>
              <p>Shipping: {invoice.shippingMethod}</p>
              <p>
                {quoteMode === "group"
                  ? "Freight: Shown by option"
                  : `${freightSummaryLabel}: ${freightSummaryValue}`}
              </p>
            </div>
          </section>

          {quoteMode === "group" ? (
            <section className="invoice-groups">
              {productGroups.map((group, groupIndex) => {
                const groupTotals = getGroupTotals(
                  group.products,
                  group.freightCharge,
                  group.freightIncludedInPrice,
                  invoice.shippingMethod
                );
                const groupFreightShownAsIncluded =
                  invoice.shippingMethod === "DDP" && group.freightIncludedInPrice;
                const groupFreightValue = groupFreightShownAsIncluded
                  ? "/"
                  : money(group.freightCharge, invoice.currency);

                return (
                  <section className="invoice-group" key={group.id}>
                    <h3>{group.title || `Option ${groupIndex + 1}`}</h3>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Description</th>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Tax</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.products.map((product) => {
                          const { tax, amount } = getProductLineAmounts(product);
                          return (
                            <tr key={product.id}>
                              <td className="product-image-cell">
                                {product.image ? <img className="product-thumb" src={product.image} alt="" /> : "-"}
                              </td>
                              <td>{product.description || "-"}</td>
                              <td>{product.sku || "-"}</td>
                              <td>{product.quantity}</td>
                              <td>{money(product.unitPrice, invoice.currency)}</td>
                              <td>{money(tax, invoice.currency)}</td>
                              <td>{money(amount, invoice.currency)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="totals-card group-totals-card">
                      <div>
                        <span>Product Amount</span>
                        <strong>{money(groupTotals.subtotal, invoice.currency)}</strong>
                      </div>
                      <div>
                        <span>Tax</span>
                        <strong>{money(groupTotals.tax, invoice.currency)}</strong>
                      </div>
                      <div>
                        <span>{freightSummaryLabel}</span>
                        <strong>{groupFreightValue}</strong>
                      </div>
                      <div className="grand-total">
                        <span>Total Amount</span>
                        <strong>{money(groupTotals.total, invoice.currency)}</strong>
                      </div>
                      {priceMode === "platform" && (
                        <div className="payment-totals">
                          {getPaymentPrices(groupTotals.total).map((option) => (
                            <div key={option.label}>
                              <span>{option.label}</span>
                              <strong>{money(option.amount, invoice.currency)}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </section>
          ) : quoteMode === "tiered" ? (
            <>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Description</th>
                    <th>SKU</th>
                    <th>Tier Qty</th>
                    <th>Unit</th>
                    <th>Tax</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {tieredProducts.flatMap((product) =>
                    product.tiers.map((tier, tierIndex) => {
                      const { tax, amount } = getTierAmounts(tier);
                      return (
                        <tr key={`${product.id}-${tier.id}`}>
                          <td className="product-image-cell">
                            {tierIndex === 0
                              ? product.image
                                ? <img className="product-thumb" src={product.image} alt="" />
                                : "-"
                              : ""}
                          </td>
                          <td>{tierIndex === 0 ? product.description || "-" : ""}</td>
                          <td>{tierIndex === 0 ? product.sku || "-" : ""}</td>
                          <td>{tier.quantity}</td>
                          <td>{money(tier.unitPrice, invoice.currency)}</td>
                          <td>{money(tax, invoice.currency)}</td>
                          <td>{money(amount, invoice.currency)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <section className="invoice-bottom">
                <div className="terms-block">
                  <h3>Payment Terms</h3>
                  <p>{invoice.paymentTerms}</p>
                  <h3>Bank Information</h3>
                  <p>{company.bankInfo || "-"}</p>
                  <h3>Remarks</h3>
                  <p>{invoice.remarks}</p>
                </div>
                <div className="totals-card">
                  <div>
                    <span>Product Amount</span>
                    <strong>{money(totals.productAmount, invoice.currency)}</strong>
                  </div>
                  <div>
                    <span>{freightSummaryLabel}</span>
                    <strong>{freightSummaryValue}</strong>
                  </div>
                  <div className="grand-total">
                    <span>Total Amount</span>
                    <strong>{money(totals.total, invoice.currency)}</strong>
                  </div>
                  {priceMode === "platform" && (
                    <div className="payment-totals">
                      {getPaymentPrices(totals.total).map((option) => (
                        <div key={option.label}>
                          <span>{option.label}</span>
                          <strong>{money(option.amount, invoice.currency)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {company.seal && <img className="seal" src={company.seal} alt="Company seal" />}
                </div>
              </section>
            </>
          ) : (
            <>
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Description</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Tax</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const { tax, amount } = getProductLineAmounts(product);
                    return (
                      <tr key={product.id}>
                        <td className="product-image-cell">
                          {product.image ? <img className="product-thumb" src={product.image} alt="" /> : "-"}
                        </td>
                        <td>{product.description || "-"}</td>
                        <td>{product.sku || "-"}</td>
                        <td>{product.quantity}</td>
                        <td>{money(product.unitPrice, invoice.currency)}</td>
                        <td>{money(tax, invoice.currency)}</td>
                        <td>{money(amount, invoice.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <section className="invoice-bottom">
                <div className="terms-block">
                  <h3>Payment Terms</h3>
                  <p>{invoice.paymentTerms}</p>
                  <h3>Bank Information</h3>
                  <p>{company.bankInfo || "-"}</p>
                  <h3>Remarks</h3>
                  <p>{invoice.remarks}</p>
                </div>
                <div className="totals-card">
                  <div>
                    <span>Product Amount</span>
                    <strong>{money(totals.productAmount, invoice.currency)}</strong>
                  </div>
                  <div>
                    <span>{freightSummaryLabel}</span>
                    <strong>{freightSummaryValue}</strong>
                  </div>
                  <div className="grand-total">
                    <span>Total Amount</span>
                    <strong>{money(totals.total, invoice.currency)}</strong>
                  </div>
                  {priceMode === "platform" && (
                    <div className="payment-totals">
                      {getPaymentPrices(totals.total).map((option) => (
                        <div key={option.label}>
                          <span>{option.label}</span>
                          <strong>{money(option.amount, invoice.currency)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {company.seal && <img className="seal" src={company.seal} alt="Company seal" />}
                </div>
              </section>
            </>
          )}

          {quoteMode === "group" && (
            <section className="invoice-bottom group-terms-bottom">
              <div className="terms-block">
                <h3>Payment Terms</h3>
                <p>{invoice.paymentTerms}</p>
                <h3>Bank Information</h3>
                <p>{company.bankInfo || "-"}</p>
                <h3>Remarks</h3>
                <p>{invoice.remarks}</p>
              </div>
              <div className="totals-card seal-card">
                {company.seal && <img className="seal" src={company.seal} alt="Company seal" />}
              </div>
            </section>
          )}

          <footer className="invoice-footer">
            <p>{company.legalName} | {company.email || company.website || "GLcamp"}</p>
          </footer>
        </div>
      </aside>
    </main>
  );
}
