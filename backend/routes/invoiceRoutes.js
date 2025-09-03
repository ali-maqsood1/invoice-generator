import express from "express";
import Invoice from "../models/Invoice.js";
import Counter from "../models/Counter.js";
import { getNextInvoiceNumber } from "../utils/getNextInvoiceNumber.js";

const router = express.Router();

// Middleware for password check
router.use((req, res, next) => {
  const password = req.headers["x-app-password"];
  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
});


// GET all invoices (log)
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ created_at: -1 });
    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST new invoice
router.post("/", async (req, res) => {
  try {
    const { customer_name, customer_phone, items } = req.body;

    // Format invoice number like "INV-00001"
    const formattedInvoiceNumber = await getNextInvoiceNumber();

    const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

    const invoice = new Invoice({
      invoice_number: formattedInvoiceNumber,
      customer_name,
      customer_phone,
      items,
      total
    });

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT update invoice
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_phone, items, canceled, collected } = req.body;

    const total = items ? items.reduce((sum, i) => sum + i.qty * i.price, 0) : undefined;

    const updateFields = {
      ...(customer_name !== undefined && { customer_name }),
      ...(customer_phone !== undefined && { customer_phone }),
      ...(items !== undefined && { items, total }),
      ...(canceled !== undefined && { canceled }),
      ...(collected !== undefined && { collected }),
    };

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updatedInvoice) return res.status(404).json({ message: "Invoice not found" });

    res.json(updatedInvoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// DELETE invoice by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedInvoice = await Invoice.findByIdAndDelete(id);

    if (!deletedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ message: "Invoice deleted successfully", deletedInvoice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
