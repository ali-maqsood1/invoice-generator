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
  advance: { type: Number, default: 0 }, 
  canceled: { type: Boolean, default: false },
  collected: {type: Boolean, default: false},
  created_at: { type: Date, default: Date.now }
});


invoiceSchema.virtual("grand_total").get(function () {
  return (this.total || 0) - (this.advance || 0);
});

invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

export default mongoose.model("Invoice", invoiceSchema);
