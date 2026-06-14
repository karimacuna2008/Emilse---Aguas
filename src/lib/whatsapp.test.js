// src/lib/whatsapp.test.js
import { describe, it, expect } from 'vitest'
import { buildWhatsAppLink, genericHelpMessage, orderHelpMessage } from './whatsapp'

describe('whatsapp', () => {
  it('builds a wa.me link with url-encoded message', () => {
    expect(buildWhatsAppLink('Hola Emi', '5215555555555'))
      .toBe('https://wa.me/5215555555555?text=Hola%20Emi')
  })
  it('generic help message', () => {
    expect(genericHelpMessage()).toBe('Hola Emi, tengo una pregunta.')
  })
  it('order help message includes the order id', () => {
    expect(orderHelpMessage('EM-007')).toBe('Hola Emi, necesito ayuda con mi pedido EM-007.')
  })
})
