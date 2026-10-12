export const formatPrice = (price) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price)

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  })