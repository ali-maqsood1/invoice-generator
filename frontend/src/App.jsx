import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";


/**
 * 🔧 QUICK CONFIG
 * - Set your backend API base URL here. In dev, keep localhost.
 * - In prod (Vercel), point to your deployed Express URL, e.g. https://api.yourdomain.com
 */
const BACKEND_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:8000/api" // local backend
    : "/api"; // deployed backend

// ------- Utilities -------
const currency = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const computeTotal = (items) => items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

function downloadInvoicePDF(invoice, companyName) {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;


  // Heading INVOICE (center)
  doc.setFontSize(22);
  doc.setCharSpace(1.12);
  doc.setTextColor(0, 0, 128);
  doc.text("SALEEM TRADING COMPANY", 90, y, { align: "center" });
  y += 10;

  doc.setTextColor(0, 0, 0);
  doc.setCharSpace(0);
  // Invoice meta
  doc.setFontSize(16);
  doc.text("INVOICE", margin, y);
  doc.setFontSize(11);
  doc.text(`Invoice No: ${invoice.invoice_number ?? "(pending)"}`, 150, y);
  doc.text(`Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString()}`, 150, y += 8);
  y += 8;

  // Customer info
  doc.setFontSize(12);
  doc.text("Customer Name:", margin, y);
  doc.setFontSize(11);
  doc.text(`${invoice.customer_name || "-"}`, margin + 35, y);
  y += 6;
  doc.text(`Phone No: ${invoice.customer_phone || "-"}`, margin, y);
  y += 8;

  // Items table
  const rows = (invoice.items || []).map((it, idx) => [
    String(idx + 1),
    it.description || "",
    String(it.qty || 0),
    currency(it.price || 0),
    currency((Number(it.qty) || 0) * (Number(it.price) || 0)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Sr.", "Description", "Qty", "Price", "Line Total"]],
    body: rows,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [0, 0, 0] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 14 },
      2: { halign: "right", cellWidth: 18 },
      3: { halign: "right", cellWidth: 24 },
      4: { halign: "right", cellWidth: 28 }
    },
  });

  const afterTableY = doc.lastAutoTable?.finalY || y;

  // Total
  const total = computeTotal(invoice.items || []);
  doc.setFontSize(12);
  doc.text(`Total: ${currency(total)}`, 196 - margin, afterTableY + 10, { align: "right" });


  doc.save(`Invoice-${invoice.invoice_number ?? "draft"}.pdf`);
}

// ------- API helpers -------
async function apiGet(path, password) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { "x-app-password": password }
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, password, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-password": password,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${msg}`);
  }
  return res.json();
}


async function apiDelete(path, password) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "DELETE",
    headers: { "x-app-password": password },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`DELETE ${path} failed: ${res.status} ${msg}`);
  }
  return res.json();
}


// ------- Components -------
function PasswordGate({ onAuthed }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const tryLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiGet("/invoices", password);
      onAuthed(password);
      toast.success("Logged in successfully!!");
    } catch (err) {
      setError("Incorrect Password!");
      toast.error("Incorrect Password!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-center">Enter Password</h1>
        <form onSubmit={tryLogin} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full border rounded-xl p-3 pr-12 focus:outline-none focus:ring"
              placeholder="Enter password here..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-black"
              tabIndex={-1}
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 bg-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
}


function ItemsTable({ items, setItems }) {
  const updateItem = (idx, patch) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch };
    setItems(next);
  };
  const addRow = () => setItems([...items, { description: "", qty: 0, price: 0 }]);
  const removeRow = (idx) => setItems(items.filter((_, i) => i !== idx));

  const total = useMemo(() => computeTotal(items), [items]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-2 w-12">Sr.</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2 w-24 text-right">Qty</th>
              <th className="py-2 pr-2 w-28 text-right">Price</th>
              <th className="py-2 pr-2 w-32 text-right">Line Total</th>
              <th className="py-2 pr-2 w-16"/>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
              return (
                <tr key={idx} className="border-b last:border-b-0">
                  <td className="py-2 pr-2">{idx + 1}</td>
                  <td className="py-2 pr-2">
                    <input
                      className="w-full border rounded-lg p-2"
                      value={it.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder="Item description"
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      min="0"
                      className="w-full border rounded-lg p-2 text-right"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, { qty: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg p-2 text-right"
                      value={it.price}
                      onChange={(e) => updateItem(idx, { price: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">{currency(lineTotal)}</td>
                  <td className="py-2 pr-2 text-right">
                    <button
                      onClick={() => removeRow(idx)}
                      className="px-2 py-1 rounded-lg border hover:bg-red-500 hover:text-white cursor-pointer"
                      title="Remove row"
                    >✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button onClick={addRow} className="rounded-xl px-3 py-2 border hover:bg-gray-500 cursor-pointer hover:text-white">+ Add Row</button>
        <div className="ml-auto text-right font-semibold">Total: {currency(total)}</div>
      </div>
    </div>
  );
}

function InvoiceForm({ password, onCreated }) {
  const navigate = useNavigate();
  const companyName = "Saleem Trading Company";
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [items, setItems] = useState([{ description: "", qty: 0, price: 0 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  const total = useMemo(() => computeTotal(items), [items]);

  async function handleGenerate() {
    setError("");
    if (!customerName.trim()) return setError("Customer name is required.");
    if (!items.length || !items[0].description.trim()) return setError("Add at least one item.");

    setBusy(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        items: items.filter(it => Number(it.qty) > 0)
        .map(it => ({
          description: it.description.trim(),
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
        })),
      };
      // Create on backend (assigns sequential invoice_number)
      const invoice = await apiPost("/invoices", password, payload);

      // Generate & download PDF
      downloadInvoicePDF(invoice, companyName);

      // Clear form, keep company name
      setCustomerName("");
      setCustomerPhone("");
      setItems([{ description: "", qty: 0, price: 0 }]);

      onCreated?.(invoice);
    } catch (e) {
      setError(e.message || "Failed to generate invoice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1
          className="text-3xl flex-1 font-extrabold p-3"
          
        >{companyName}</h1>
        <div className="text-xl font-semibold">INVOICE</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          className="border rounded-xl p-3"
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          type="tel"
          className="border rounded-xl p-3"
          placeholder="Customer Phone"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>

      <ItemsTable items={items} setItems={setItems} />

      <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="rounded-xl px-4 py-3 bg-black text-white hover:opacity-50 disabled:opacity-50 cursor-pointer"
          >
            {busy ? "Generating..." : "Generate & Download PDF"}
          </button>
          <div className="ml-auto font-semibold">Total: {currency(total)}</div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="text-right">
          <button
            className="mt-4 px-4 py-2 rounded-xl border hover:bg-gray-300 hover: cursor-pointer"
            onClick={() => navigate("/logs")}
          >
            View Previous Invoices →
          </button>
        </div>
    </div>
  );
}

function InvoiceLog({ password, refreshKey, onDeleted }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const companyName = "Saleem trading Company";
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiGet("/invoices", password);
        setList(data);
      } catch (err) {
        console.error("Error in Invoice Log:", err);
        setError("Failed to load invoices.");
      } finally {
        setLoading(false);
      }
    })();
  }, [password, refreshKey]);


  const filtered = list.filter(inv =>
    String(inv.invoice_number ?? "")
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );


  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await apiDelete(`/invoices/${id}`, password);
      onDeleted?.(); // refresh parent
    } catch (e) {
      alert(e.message || "Delete failed.");
    }
  }

  if (loading) return <div className="bg-white rounded-2xl shadow p-6">Loading logs...</div>;
  if (error) return <div className="bg-white rounded-2xl shadow p-6 text-red-600">{error}</div>;

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-lg font-semibold">Previous Invoices</h2>
        <input
          className="sm:ml-auto border rounded-lg p-2 w-full sm:w-auto"
          placeholder="Search by ID or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="px-3 py-1 rounded-lg border hover:bg-gray-200"
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
        <div className="sm:ml-auto text-sm text-gray-500">{list.length} total</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-2">Invoice #</th>
              <th className="py-2 pr-2">Customer</th>
              <th className="py-2 pr-2">Phone</th>
              <th className="py-2 pr-2">Total</th>
              <th className="py-2 pr-2">Date & Time</th>
              <th className="py-2 pr-2 w-48"/>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv._id || inv.invoice_number} className="border-b last:border-b-0">
                <td className="py-2 pr-2">{inv.invoice_number}</td>
                <td className="py-2 pr-2">{inv.customer_name}</td>
                <td className="py-2 pr-2">{inv.customer_phone}</td>
                <td className="py-2 pr-2">{currency(inv.total)}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {new Date(inv.created_at).toLocaleString()}
                </td>

                <td className="py-2 pr-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-3 py-1 rounded-lg border hover:bg-green-500 hover:text-white cursor-pointer"
                      onClick={() => downloadInvoicePDF(inv, companyName)}
                    >Download PDF</button>
                    <button
                      className="px-3 py-1 rounded-lg border text-red-600 hover:bg-red-300 cursor-pointer"
                      onClick={() => handleDelete(inv._id)}
                    >Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InvoiceApp() {
  const [password, setPassword] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <BrowserRouter>
      {!password ? (
        <>
          <PasswordGate onAuthed={setPassword} />
          <Toaster position="top-center"/>
        </>
      ) : (
        <>
          <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              <header className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold">Invoice Generator</h1>
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <button
                    className="px-3 py-1 rounded-lg border cursor-pointer hover:text-white hover:bg-black"
                    onClick={() => { setPassword(null); }}
                  >
                    Logout
                  </button>
                </div>
              </header>

              <Routes>
                <Route
                  path="/"
                  element={
                    <InvoiceForm
                      password={password}
                      onCreated={() => setRefreshKey((k) => k + 1)}
                    />
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <InvoiceLog
                      password={password}
                      refreshKey={refreshKey}
                      onDeleted={() => setRefreshKey((k) => k + 1)}
                    />
                  }
                />
              </Routes>
            </div>
          </div>
          <Toaster position="top-center"/>
        </>
      )}
    </BrowserRouter>
  );
}


// Mount if running standalone (optional)
// if (typeof document !== "undefined") {
//   const rootEl = document.getElementById("root");
//   if (rootEl) {
//     const root = createRoot(rootEl);
//     root.render(
//       <InvoiceApp />
//     );
//   }
// }
