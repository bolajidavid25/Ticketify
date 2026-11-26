'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateStudentIdAction } from '@/app/(frontend)/auth-actions'

export function StudentIdForm({ currentId }: { currentId?: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [studentId, setStudentId] = useState(currentId || '')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setIsError(false)

    startTransition(async () => {
      const result = await updateStudentIdAction(studentId)
      setMessage(result.message)
      setIsError(!result.ok)
      if (result.ok) {
        router.refresh()
      }
    })
  }

  if (currentId) {
    return <span className="font-black text-[#173b2a]">{currentId}</span>
  }

  return (
    <form className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center" onSubmit={handleSubmit}>
      <input
        aria-label="Student ID"
        className="h-10 rounded-xl border border-[#c2cdc5] px-3 text-sm font-semibold uppercase text-[#10271e] outline-none focus:border-[#16844b] focus:ring-1 focus:ring-[#16844b]"
        disabled={isPending}
        maxLength={50}
        onChange={(e) => setStudentId(e.target.value)}
        placeholder="Enter your student ID"
        required
        type="text"
        value={studentId}
      />
      <button
        className="h-10 rounded-xl bg-[#0b2a1d] px-4 text-xs font-black text-[#c8ff66] transition hover:bg-[#16844b] disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Saving…' : 'Save ID'}
      </button>
      {message && (
        <span className={`text-xs font-bold ${isError ? 'text-[#c6383f]' : 'text-[#16844b]'}`}>
          {message}
        </span>
      )}
    </form>
  )
}
