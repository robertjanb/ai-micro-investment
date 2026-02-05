'use client'

import { useState } from 'react'

interface HoldingCardProps {
  id: string
  ticker: string
  companyName: string | null
  quantity: number
  purchasePrice: number
  currentPrice: number
  purchaseDate: string
  gainLoss: number
  gainLossPercent: number
  notes: string | null
  onEdit: (id: string, data: { quantity?: number; notes?: string | null }) => void
  onDelete: (id: string) => void
}

export function HoldingCard({
  id,
  ticker,
  companyName,
  quantity,
  purchasePrice,
  currentPrice,
  purchaseDate,
  gainLoss,
  gainLossPercent,
  notes,
  onEdit,
  onDelete,
}: HoldingCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editQuantity, setEditQuantity] = useState(quantity.toString())
  const [editNotes, setEditNotes] = useState(notes || '')

  const isGain = gainLossPercent > 0
  const isLoss = gainLossPercent < 0

  function handleSave() {
    const newQuantity = parseFloat(editQuantity)
    if (isNaN(newQuantity) || newQuantity <= 0) return

    onEdit(id, {
      quantity: newQuantity,
      notes: editNotes || null,
    })
    setIsEditing(false)
  }

  function handleCancel() {
    setEditQuantity(quantity.toString())
    setEditNotes(notes || '')
    setIsEditing(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              {ticker}
            </span>
            {companyName && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {companyName}
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <div className="text-gray-500 dark:text-gray-400">
                  {quantity} shares
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Bought: &euro;{purchasePrice.toFixed(2)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  Now: &euro;{currentPrice.toFixed(2)}
                </div>
                <div
                  className={`font-medium ${
                    isGain
                      ? 'text-green-600 dark:text-green-400'
                      : isLoss
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {isGain ? '+' : ''}&euro;{gainLoss.toFixed(2)} ({isGain ? '+' : ''}
                  {gainLossPercent.toFixed(2)}%)
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Purchased {new Date(purchaseDate).toLocaleDateString()}
                {notes && <span className="ml-2 italic">{notes}</span>}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(id)}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
