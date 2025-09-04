import React from "react";

export default function SummaryBar({ invoices }) {
  const total = invoices.length;
  const collected = invoices.filter((i) => i.collected).length;
  const canceled = invoices.filter((i) => i.canceled).length;
  const pending = total - collected - canceled;

  const cards = [
    { label: "Total", value: total, color: "bg-gray-200" },
    { label: "Collected", value: collected, color: "bg-green-200" },
    { label: "Pending", value: pending, color: "bg-yellow-200" },
    { label: "Canceled", value: canceled, color: "bg-red-200" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-xl p-4 shadow ${c.color} text-center`}
        >
          <div className="text-lg font-bold">{c.value}</div>
          <div className="text-sm text-gray-700">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
