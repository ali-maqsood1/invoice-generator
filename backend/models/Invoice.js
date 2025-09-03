import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema({
  invoice_number: { type: String, unique: true, required: true },
  customer_name: String,
  customer_phone: String,
  items: [
    {
      description: String,
      qty: Number,
      price: Number
    }
  ],
  total: Number,
  canceled: { type: Boolean, default: false },
  collected: {type: Boolean, default: false},
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model("Invoice", invoiceSchema);
