// src/lib/whatsapp.js
export function buildWhatsAppLink(message, number) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function genericHelpMessage() {
  return 'Hola Emi, tengo una pregunta.'
}

export function orderHelpMessage(orderNumber) {
  return `Hola Emi, necesito ayuda con mi pedido ${orderNumber}.`
}
