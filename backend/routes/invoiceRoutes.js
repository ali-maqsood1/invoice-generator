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
