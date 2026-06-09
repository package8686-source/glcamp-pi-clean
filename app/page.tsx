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

type Currency = "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "AED";
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

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  AED: "د.إ"
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

const today = () => new Date().toISOString().slice(0, 10);

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

export default function Home() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [savedTemplates, setSavedTemplates] = useState<CompanyInfo[]>([]);
  const [isExporting, setIsExporting] = useState(false);
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

  useEffect(() => {
    const templates = localStorage.getItem("glcamp-company-templates");
    if (templates) {
      setSavedTemplates(JSON.parse(templates));
    }

    fetch("/api/pi-number")
      .then((res) => res.json())
      .then((data) => setInvoice((prev) => ({ ...prev, piNumber: data.piNumber })))
      .catch(() => {
        const fallback = `GLC-PI-${Date.now().toString().slice(-8)}`;
        setInvoice((prev) => ({ ...prev, piNumber: fallback }));
      });
  }, []);

  const totals = useMemo(() => {
    const freightShownAsIncluded = invoice.shippingMethod === "DDP" && invoice.freightIncludedInPrice;
    const billableFreight = freightShownAsIncluded ? 0 : invoice.freightCharge;

    return products.reduce(
      (acc, product) => {
        const subtotal = product.quantity * product.unitPrice;
        const tax = subtotal * (product.taxRate / 100);
        acc.subtotal += subtotal;
        acc.tax += tax;
        acc.productAmount += subtotal + tax;
        acc.total += subtotal + tax;
        return acc;
      },
      { subtotal: 0, tax: 0, productAmount: 0, total: billableFreight }
    );
  }, [products, invoice.freightCharge, invoice.freightIncludedInPrice, invoice.shippingMethod]);

  const freightSummaryLabel = `${invoice.shippingMethod} Shipping Freight`;
  const freightShownAsIncluded = invoice.shippingMethod === "DDP" && invoice.freightIncludedInPrice;
  const freightSummaryValue = freightShownAsIncluded
    ? "/"
    : money(invoice.freightCharge, invoice.currency);

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

  return (
    <main className="app-shell">
      <section className="editor-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">GLcamp PI Tool</p>
            <h1>Proforma Invoice Generator</h1>
          </div>
          <button className="primary-button" onClick={exportPdf} disabled={isExporting}>
            <Download size={18} />
            {isExporting ? "Exporting..." : "Download PDF"}
          </button>
        </div>

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
            </div>
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
            <h2>Product Lines</h2>
            <button className="secondary-button" onClick={() => setProducts((prev) => [...prev, blankProduct()])}>
              <Plus size={17} />
              Add Product
            </button>
          </div>
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
              <p>{freightSummaryLabel}: {freightSummaryValue}</p>
            </div>
          </section>

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
                const subtotal = product.quantity * product.unitPrice;
                const tax = subtotal * (product.taxRate / 100);
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
                    <td>{money(subtotal + tax, invoice.currency)}</td>
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
              {company.seal && <img className="seal" src={company.seal} alt="Company seal" />}
            </div>
          </section>

          <footer className="invoice-footer">
            <p>{company.legalName} | {company.email || company.website || "GLcamp"}</p>
          </footer>
        </div>
      </aside>
    </main>
  );
}
