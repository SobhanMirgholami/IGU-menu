// Prints only the receipt, on a page exactly as long as the receipt.
// CSS can't say "80mm wide, as tall as the content", so we measure it here.
export function printReceipt() {
  const receipt = document.getElementById('receipt')
  if (!receipt) return

  const heightMm = Math.ceil((receipt.offsetHeight * 25.4) / 96) + 6

  const pageStyle = document.createElement('style')
  pageStyle.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`
  document.head.appendChild(pageStyle)
  document.documentElement.classList.add('printing-receipt')

  function cleanup() {
    pageStyle.remove()
    document.documentElement.classList.remove('printing-receipt')
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
}
