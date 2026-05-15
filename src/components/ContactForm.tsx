'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ContactForm() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (sent) {
    return (
      <div className="animate-fade-up mt-12 sm:mt-16 text-center">
        <p className="text-white/70 text-sm">We&apos;ll be in touch soon.</p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="animate-fade-up-delay-4 mt-12 sm:mt-16 gradient-border glass rounded-full px-8 py-3.5 text-sm font-medium text-white/80 transition-all duration-300 hover:text-white cursor-pointer"
      >
        Get in touch
      </button>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const form = e.currentTarget
        const data = new FormData(form)

        const { error: dbError } = await supabase.from('contacts').insert({
          name: data.get('name') as string,
          email: data.get('email') as string,
          message: data.get('message') as string,
        })

        setLoading(false)

        if (dbError) {
          setError('Something went wrong. Try again.')
          return
        }

        setSent(true)
      }}
      className="animate-fade-up mt-10 sm:mt-14 w-full max-w-sm flex flex-col gap-3"
    >
      <input
        name="name"
        type="text"
        required
        placeholder="Name"
        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 outline-none focus:border-purple-500/30 transition-colors"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 outline-none focus:border-purple-500/30 transition-colors"
      />
      <textarea
        name="message"
        required
        placeholder="Tell us about your project..."
        rows={3}
        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 outline-none focus:border-purple-500/30 transition-colors resize-none"
      />
      {error && <p className="text-red-400/80 text-xs">{error}</p>}
      <div className="flex gap-3 mt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 gradient-border glass rounded-full px-6 py-3 text-sm font-medium text-white/80 transition-all duration-300 hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-3 text-sm text-white/20 hover:text-white/50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
