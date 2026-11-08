import { MessageCircle } from 'lucide-react'

export function BotonWhatsApp({ telefono, texto, children }: { telefono: string; texto: string; children: React.ReactNode }) {
  return (
    <a
      href={`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marca px-4 font-bold text-sobre-marca"
    >
      <MessageCircle aria-hidden size={22} /> {children}
    </a>
  )
}
