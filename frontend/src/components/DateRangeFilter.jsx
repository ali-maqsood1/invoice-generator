import React, { useState } from "react";

export default function DateRangeFilter({ onChange }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function apply() {
    if (onChange) onChange({ from, to });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="border rounded-lg p-2"
      />
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="border rounded-lg p-2"
      />
      <button
        onClick={apply}
        className="px-3 py-2 rounded-lg border bg-gray-200 hover:bg-gray-300"
      >
        Apply
      </button>
    </div>
  );
}
