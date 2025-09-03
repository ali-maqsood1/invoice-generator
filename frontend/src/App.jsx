import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
  Download,
  Trash2,
  Edit2,
  XCircle,
  CheckCircle,
  Filter,
} from 'lucide-react';

/**
 * 🔧 QUICK CONFIG
 * - Set your backend API base URL here. In dev, keep localhost.
 * - In prod (Vercel), point to your deployed Express URL, e.g. https://api.yourdomain.com
 */
const BACKEND_URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:8000/api' // local backend
    : '/api'; // deployed backend

// ------- Utilities -------
const currency = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const computeTotal = (items) =>
  items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0),
    0
  );

function downloadInvoicePDF(invoice, companyName = 'Saleem Trading Company') {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const margin = 35;
  let y = margin;

  // ====== COMPANY HEADING ======
  doc.setFont('times', 'bold'); // bold for company name
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 128); // dark blue
  doc.text(companyName.toUpperCase(), 105, y, { align: 'center' });
  y += 12;

  // ====== INVOICE HEADING ======
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 105, y, { align: 'center' });
  y += 10;

  // ====== CUSTOMER + INVOICE META ======
  doc.setFont('times', 'normal');
  doc.setFontSize(12);

  /// Left: Customer
  doc.text(`Customer Name: ${invoice.customer_name || '-'}`, margin, y);
  y += 6;
  doc.text(`Phone No: ${invoice.customer_phone || '-'}`, margin, y);

  // Right: Invoice number & date
  y -= 6;
  doc.text(`Invoice No: ${invoice.invoice_number ?? '(pending)'}`, 135, y);
  y += 6;
  doc.text(
    `Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString()}`,
    135,
    y
  );

  y += 10;

  // ====== ITEMS TABLE ======
  const rows = (invoice.items || []).map((it, idx) => [
    String(idx + 1),
    it.description || '',
    String(it.qty || 0),
    currency(it.price || 0),
    currency((Number(it.qty) || 0) * (Number(it.price) || 0)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Sr.', 'Description', 'Qty', 'Price', 'Total']],
    body: rows,
    theme: 'grid', // adds lines between rows/columns
    styles: { font: 'times', fontSize: 11, cellPadding: 3 },
    headStyles: { fillColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      2: { halign: 'left', cellWidth: 20 },
      3: { halign: 'left', cellWidth: 25 },
      4: { halign: 'left', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  const afterTableY = doc.lastAutoTable?.finalY || y;

  // ====== TOTAL ======
  const total = computeTotal(invoice.items || []);
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text(`Grand Total: ${currency(total)}`, 210 - margin, afterTableY + 10, {
    align: 'right',
  });

  // ====== SAVE PDF ======
  doc.save(`Invoice-${invoice.invoice_number ?? 'draft'}.pdf`);
}

// ------- API helpers -------
async function apiGet(path, password) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'x-app-password': password },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, password, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': password,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${msg}`);
  }
  return res.json();
}

async function apiPut(path, password, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': password,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`PUT ${path} failed: ${res.status} ${msg}`);
  }

  return res.json();
}

async function apiDelete(path, password) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'DELETE',
    headers: { 'x-app-password': password },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`DELETE ${path} failed: ${res.status} ${msg}`);
  }
  return res.json();
}

// ------- Components -------
function PasswordGate({ onAuthed }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const tryLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiGet('/invoices', password);
      onAuthed(password);
      toast.success('Logged in successfully!!');
    } catch (err) {
      setError('Incorrect Password!');
      toast.error('Incorrect Password!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen w-full flex items-center justify-center bg-gray-50 p-6'>
      <div className='w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4'>
        <h1 className='text-2xl font-semibold text-center'>Enter Password</h1>
        <form onSubmit={tryLogin} className='space-y-3'>
          <div className='relative'>
            <input
              type={showPassword ? 'text' : 'password'}
              className='w-full border rounded-xl p-3 pr-12 focus:outline-none focus:ring'
              placeholder='Enter password here...'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type='button'
              onClick={() => setShowPassword((prev) => !prev)}
              className='absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-black'
              tabIndex={-1}
            >
              {showPassword ? 'hide' : 'show'}
            </button>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full rounded-xl py-3 bg-black text-white hover:opacity-90 disabled:opacity-50'
          >
            {loading ? 'Checking...' : 'Unlock'}
          </button>
          {error && <p className='text-red-600 text-sm text-center'>{error}</p>}
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
  const addRow = () =>
    setItems([...items, { description: '', qty: 0, price: 0 }]);
  const removeRow = (idx) => setItems(items.filter((_, i) => i !== idx));

  const total = useMemo(() => computeTotal(items), [items]);

  return (
    <div className='space-y-3'>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='py-2 pr-2 w-12'>Sr.</th>
              <th className='py-2 pr-2'>Description</th>
              <th className='py-2 pr-2 w-24 text-right'>Qty</th>
              <th className='py-2 pr-2 w-28 text-right'>Price</th>
              <th className='py-2 pr-2 w-32 text-right'>Total</th>
              <th className='py-2 pr-2 w-16' />
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
              return (
                <tr key={idx} className='border-b last:border-b-0'>
                  <td className='py-2 pr-2'>{idx + 1}</td>
                  <td className='py-2 pr-2'>
                    <input
                      className='w-full border rounded-lg p-2'
                      value={it.description}
                      onChange={(e) =>
                        updateItem(idx, { description: e.target.value })
                      }
                      placeholder='Item description'
                    />
                  </td>
                  <td className='py-2 pr-2 text-right'>
                    <input
                      type='number'
                      min='0'
                      className='w-full border rounded-lg p-2 text-right'
                      value={it.qty}
                      onChange={(e) => updateItem(idx, { qty: e.target.value })}
                    />
                  </td>
                  <td className='py-2 pr-2 text-right'>
                    <input
                      type='number'
                      min='0'
                      step='0.01'
                      className='w-full border rounded-lg p-2 text-right'
                      value={it.price}
                      onChange={(e) =>
                        updateItem(idx, { price: e.target.value })
                      }
                    />
                  </td>
                  <td className='py-2 pr-2 text-right'>
                    {currency(lineTotal)}
                  </td>
                  <td className='py-2 pr-2 text-right'>
                    <button
                      onClick={() => removeRow(idx)}
                      className='px-2 py-1 rounded-lg border hover:bg-red-500 hover:text-white cursor-pointer'
                      title='Remove row'
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className='flex gap-2'>
        <button
          onClick={addRow}
          className='rounded-xl px-3 py-2 border hover:bg-gray-500 cursor-pointer hover:text-white'
        >
          + Add Row
        </button>
      </div>
    </div>
  );
}

function InvoiceForm({ password, onCreated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const companyName = 'Saleem Trading Company';

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState([{ description: '', qty: 0, price: 0 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);

  const total = useMemo(() => computeTotal(items), [items]);

  // Pre-fill form if editing
  useEffect(() => {
    if (location.state?.invoiceToEdit) {
      const invoice = location.state.invoiceToEdit;
      setCustomerName(invoice.customer_name || '');
      setCustomerPhone(invoice.customer_phone || '');
      setItems(invoice.items || [{ description: '', qty: 0, price: 0 }]);
      setEditingInvoiceId(invoice._id);
      // Clear state to avoid auto-fill next navigation
      navigate('/', { replace: true, state: {} });
    }
  }, []);

  async function handleGenerate() {
    setError('');

    if (!customerName.trim()) return setError('Customer name is required.');
    if (!items.length || !items[0].description.trim())
      return setError('Add at least one item.');

    setBusy(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        items: items
          .filter((it) => Number(it.qty) > 0)
          .map((it) => ({
            description: it.description.trim(),
            qty: Number(it.qty) || 0,
            price: Number(it.price) || 0,
          })),
      };

      let invoice;
      if (editingInvoiceId) {
        // Edit existing invoice
        invoice = await apiPut(
          `/invoices/${editingInvoiceId}`,
          password,
          payload
        );
      } else {
        // Create new invoice
        invoice = await apiPost('/invoices', password, payload);
      }

      // Generate & download PDF
      downloadInvoicePDF(invoice, companyName);

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setItems([{ description: '', qty: 0, price: 0 }]);
      setEditingInvoiceId(null);

      onCreated?.(invoice);
    } catch (e) {
      setError(e.message || 'Failed to generate invoice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className='bg-white rounded-2xl shadow p-6 space-y-6'>
      <div className='flex items-center gap-3'>
        <h1 className='text-3xl flex-1 font-extrabold p-3'>{companyName}</h1>
        <div className='text-xl font-semibold'>
          {editingInvoiceId ? 'EDIT INVOICE' : 'INVOICE'}
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <input
          className='border rounded-xl p-3'
          placeholder='Customer Name'
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          type='tel'
          className='border rounded-xl p-3'
          placeholder='Customer Phone'
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>

      <ItemsTable items={items} setItems={setItems} />

      <div className='flex items-center gap-3'>
        <button
          onClick={handleGenerate}
          disabled={busy}
          className='rounded-xl px-4 py-3 bg-black text-white hover:opacity-50 disabled:opacity-50 cursor-pointer'
        >
          {busy
            ? editingInvoiceId
              ? 'Saving...'
              : 'Generating...'
            : editingInvoiceId
            ? 'Save Changes'
            : 'Generate & Download PDF'}
        </button>
        <div className='ml-auto font-semibold'>Total: {currency(total)}</div>
      </div>

      {error && <p className='text-red-600 text-sm'>{error}</p>}

      <div className='text-right'>
        <button
          className='mt-4 px-4 py-2 rounded-xl border hover:bg-gray-300 hover: cursor-pointer'
          onClick={() => navigate('/logs')}
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
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, collected, canceled, recent
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const navigate = useNavigate();
  const companyName = 'Saleem Trading Company';

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiGet('/invoices', password);
        setList(data);
      } catch (err) {
        console.error('Error in Invoice Log:', err);
        setError('Failed to load invoices.');
      } finally {
        setLoading(false);
      }
    })();
  }, [password, refreshKey]);

  const filtered = list
    .filter(
      (inv) =>
        String(inv.invoice_number ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        inv.customer_name?.toLowerCase().includes(search.toLowerCase())
    )
    .filter((inv) => {
      if (filter === 'collected') return inv.collected;
      if (filter === 'canceled') return inv.canceled;
      if (filter === 'recent') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return new Date(inv.created_at) >= oneMonthAgo;
      }
      return true; // "all"
    });

  async function handleCancelInvoice(id) {
    try {
      await apiPut(`/invoices/${id}`, password, { canceled: true });
      onDeleted?.(); // refresh logs
      toast.success('Invoice has been canceled.');
    } catch (e) {
      toast.error(e.message || 'Failed to cancel invoice.');
    }
  }

  async function handleCollectedInvoice(id) {
    try {
      await apiPut(`/invoices/${id}`, password, { collected: true });
      onDeleted?.(); // refresh logs
      toast.success('Invoice has been collected!');
    } catch (e) {
      toast.error(e.message || 'Failed to collect invoice.');
    }
  }

  function handleEditInvoice(invoice) {
    // Navigate back to the form with pre-filled invoice
    navigate('/', { state: { invoiceToEdit: invoice } });
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this invoice?'))
      return;
    try {
      await apiDelete(`/invoices/${id}`, password);
      onDeleted?.();
    } catch (e) {
      alert(e.message || 'Delete failed.');
    }
  }

  async function handleDeleteAll() {
    const confirmText = window.prompt(
      "This will permanently delete ALL invoices.\nType 'CONFIRM' to proceed."
    );
    if (confirmText !== 'CONFIRM') return;

    if (!filtered.length) {
      toast.error('No invoices to delete.');
      return;
    }

    try {
      // Sequential deletion (safer for large data)
      for (const inv of filtered) {
        await apiDelete(`/invoices/${inv._id}`, password);
      }

      onDeleted?.(); // refresh parent
      toast.success('All invoices have been deleted.');
    } catch (e) {
      console.error('Delete All failed:', e);
      toast.error(e.message || 'Failed to delete all invoices.');
    }
  }

  async function generateExcelSummary() {
    if (!filtered.length) {
      toast.error('No invoices to summarize.');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices Summary');

    // Header row
    worksheet.addRow([
      'Invoice #',
      'Customer',
      'Phone',
      'Date',
      'Description',
      'Qty',
      'Price',
      'Sub Total',
      'Grand Total',
      'Collected',
    ]);

    // Style header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const sortedInvoices = [...filtered].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    for (const inv of sortedInvoices) {
      const items = inv.items || [];
      items.forEach((item) => {
        const row = worksheet.addRow([
          inv.invoice_number,
          inv.customer_name,
          inv.customer_phone,
          new Date(inv.created_at).toLocaleDateString(),
          item.description,
          item.qty,
          item.price,
          (item.qty || 0) * (item.price || 0),
          inv.total,
          inv.collected ? '             Yes' : '             No',
        ]);

        if (inv.canceled) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFCCCC' },
            };
          });
        }
      });
    }

    worksheet.columns.forEach((col) => {
      col.width = 15;
    });

    // Exporting Excel
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Invoices_Summary.xlsx');
    toast.success('Summary has been downloaded successfully!');
  }

  if (loading)
    return (
      <div className='bg-white rounded-2xl shadow p-6'>Loading logs...</div>
    );
  if (error)
    return (
      <div className='bg-white rounded-2xl shadow p-6 text-red-600'>
        {error}
      </div>
    );

  return (
    <div className='bg-white rounded-2xl shadow p-6 space-y-3'>
      <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
        <button
          className='px-3 py-1 mr-2 rounded-lg border hover:bg-gray-500 hover:text-white cursor-pointer'
          onClick={() => navigate('/')}
        >
          ← Back
        </button>

        <h2 className='text-xl font-semibold'>Previous Invoices</h2>

        <input
          className='sm:ml-auto border rounded-lg p-2 w-full sm:w-auto'
          placeholder='Search by ID or name'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className='relative'>
          <button
            onClick={() => setShowFilterMenu((prev) => !prev)}
            className='px-3 py-2 rounded-lg border bg-gray-200 hover:bg-gray-300 flex items-center gap-1'
          >
            <Filter className='w-4 h-4' />
            <span className='hidden sm:inline'>Filter</span>
          </button>

          {showFilterMenu && (
            <div className='absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-lg border z-50'>
              <button
                onClick={() => {
                  setFilter('all');
                  setShowFilterMenu(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  filter === 'all' ? 'bg-gray-100 font-semibold' : ''
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilter('collected');
                  setShowFilterMenu(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  filter === 'collected' ? 'bg-gray-100 font-semibold' : ''
                }`}
              >
                Collected
              </button>
              <button
                onClick={() => {
                  setFilter('canceled');
                  setShowFilterMenu(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  filter === 'canceled' ? 'bg-gray-100 font-semibold' : ''
                }`}
              >
                Canceled
              </button>
              <button
                onClick={() => {
                  setFilter('recent');
                  setShowFilterMenu(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 ${
                  filter === 'recent' ? 'bg-gray-100 font-semibold' : ''
                }`}
              >
                Recent (1 month)
              </button>
            </div>
          )}
        </div>

        <button
          onClick={generateExcelSummary}
          className='px-3 py-1 rounded-lg border bg-green-500 text-white hover:bg-green-600 cursor-pointer'
        >
          Get Summary
        </button>
        <button
          onClick={handleDeleteAll}
          className='px-3 py-1 rounded-lg border bg-red-500 text-white hover:bg-red-600 cursor-pointer'
        >
          Delete All
        </button>

        <div className='text-sm text-gray-500'>{list.length} total</div>
      </div>

      <div className='overflow-x-auto'>
        <table className='w-full text-sm border-collapse'>
          <thead>
            <tr className='text-left border-b'>
              <th className='py-3 pr-3'>Invoice #</th>
              <th className='py-3 pr-3'>Customer</th>
              <th className='py-3 pr-3'>Phone</th>
              <th className='py-3 pr-3'>Total</th>
              <th className='py-3 pr-3'>Date & Time</th>
              <th className='py-3 pr-3 w-48'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr
                key={inv._id || inv.invoice_number}
                className={`border-b last:border-b-0 ${
                  inv.canceled ? 'bg-red-100 opacity-80' : ''
                } ${inv.collected ? 'bg-green-100 opacity-80' : ''}`}
              >
                <td className='py-5 px-3'>{inv.invoice_number}</td>
                <td className='py-5 px-3'>{inv.customer_name}</td>
                <td className='py-5 px-3'>{inv.customer_phone}</td>
                <td className='py-5 px-3'>{currency(inv.total)}</td>
                <td className='py-5 px-3'>
                  {new Date(inv.created_at).toLocaleString()}
                </td>
                <td className='py-5 px-2'>
                  <div className='flex flex-wrap gap-3 justify-start sm:justify-end'>
                    {/* Download */}
                    <button
                      className='flex items-center gap-1 px-3 py-2 rounded-lg border bg-blue-500 text-white hover:bg-blue-600'
                      onClick={() => downloadInvoicePDF(inv, companyName)}
                    >
                      <Download className='w-4 h-4 sm:w-auto sm:h-auto' />
                      <span className='hidden sm:inline'>Download</span>
                    </button>

                    {/* Delete */}
                    <button
                      className='flex items-center gap-1 px-3 py-2 rounded-lg border bg-red-100 text-red-600 hover:bg-red-200'
                      onClick={() => handleDelete(inv._id)}
                    >
                      <Trash2 className='w-4 h-4 sm:w-auto sm:h-auto' />
                      <span className='hidden sm:inline'>Delete</span>
                    </button>

                    {!inv.canceled && !inv.collected && (
                      <>
                        {/* Edit */}
                        <button
                          className='flex items-center gap-1 px-3 py-2 rounded-lg border bg-yellow-400 text-white hover:bg-yellow-500'
                          onClick={() => handleEditInvoice(inv)}
                        >
                          <Edit2 className='w-4 h-4 sm:w-auto sm:h-auto' />
                          <span className='hidden sm:inline'>Edit</span>
                        </button>

                        {/* Cancel */}
                        <button
                          className='flex items-center gap-1 px-3 py-2 rounded-lg border bg-gray-400 text-white hover:bg-gray-500'
                          onClick={() => handleCancelInvoice(inv._id)}
                        >
                          <XCircle className='w-4 h-4 sm:w-auto sm:h-auto' />
                          <span className='hidden sm:inline'>Cancel</span>
                        </button>

                        <button
                          className='flex items-center gap-1 px-3 py-2 rounded-lg border bg-green-500 text-white hover:bg-green-600'
                          onClick={() => handleCollectedInvoice(inv._id)}
                        >
                          <CheckCircle className='w-4 h-4 sm:w-auto sm:h-auto' />
                          <span className='hidden sm:inline'>Collect</span>
                        </button>
                      </>
                    )}
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
          <Toaster position='top-center' />
        </>
      ) : (
        <>
          <div className='bg-gray-100 p-6'>
            <div className='max-w-5xl mx-auto space-y-6'>
              <header className='flex items-center gap-3'>
                <h1 className='text-2xl font-semibold'>Invoice Generator</h1>
                <div className='ml-auto flex items-center gap-2 text-sm'>
                  <button
                    className='px-3 py-1 rounded-lg border cursor-pointer hover:text-white hover:bg-black'
                    onClick={() => {
                      setPassword(null);
                    }}
                  >
                    Logout
                  </button>
                </div>
              </header>

              <Routes>
                <Route
                  path='/'
                  element={
                    <div className='max-w-5xl mx-auto space-y-6'>
                      <InvoiceForm
                        password={password}
                        onCreated={() => setRefreshKey((k) => k + 1)}
                      />
                    </div>
                  }
                />
                <Route
                  path='/logs'
                  element={
                    <div className='space-y-6'>
                      {' '}
                      {/* full width, no max-w */}
                      <InvoiceLog
                        password={password}
                        refreshKey={refreshKey}
                        onDeleted={() => setRefreshKey((k) => k + 1)}
                      />
                    </div>
                  }
                />
              </Routes>
            </div>
          </div>
          <Toaster position='top-center' />
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
