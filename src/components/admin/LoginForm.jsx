import { useState } from 'react'

export default function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit(email, password) }}
      className="flex flex-col gap-4"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
      )}
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="Correo electrónico" required
        className="border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
      />
      <input
        type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Contraseña" required
        className="border border-surface-border rounded-xl px-4 py-3 focus:outline-none focus:border-brand-700"
      />
      <button
        type="submit" disabled={loading}
        className="bg-brand-700 hover:bg-brand-900 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
