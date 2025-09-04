import React from "react";

export default function BulkActions({ selected, onDelete, onCancel, onCollect }) {
  if (!selected.length) return null;

  return (
    <div className="flex flex-wrap gap-2 bg-gray-100 p-3 rounded-lg">
      <span className="font-semibold">{selected.length} selected</span>
      <button
        onClick={onDelete}
        className="px-3 py-1 rounded-lg border bg-red-500 text-white hover:bg-red-600"
      >
        Delete
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 rounded-lg border bg-gray-400 text-white hover:bg-gray-500"
      >
        Cancel
      </button>
      <button
        onClick={onCollect}
        className="px-3 py-1 rounded-lg border bg-green-500 text-white hover:bg-green-600"
      >
        Collect
      </button>
    </div>
  );
}
