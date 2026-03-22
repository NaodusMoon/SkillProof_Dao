export function shortenAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(value)
}

export function formatRelativeDate(value: string) {
  const deltaHours = Math.round((new Date(value).getTime() - Date.now()) / 3600000)
  return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(deltaHours, 'hour')
}
