import Counter from "../models/Counter.js";

export async function getNextInvoiceNumber() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "invoice_number" },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );

  return `INV-${String(counter.sequence_value).padStart(5, "0")}`;
}
