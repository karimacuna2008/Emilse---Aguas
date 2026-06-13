export default function WhatsAppLink() {
  const number  = import.meta.env.VITE_WHATSAPP_NUMBER
  const message = encodeURIComponent('Hola Emi, tengo una pregunta sobre mi pedido.')
  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-2xl transition-colors z-50"
      aria-label="Contactar a Emi por WhatsApp"
    >
      💬
    </a>
  )
}
