export const formatMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

export const formatNumber = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-PK').format(Number(n || 0));

export const formatDate = (d?: string | Date) =>
  d
    ? new Date(d).toLocaleDateString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

export const formatDateTime = (d?: string | Date) =>
  d
    ? new Date(d).toLocaleString('en-PK', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

export const formatTime = (d?: string | Date) =>
  d
    ? new Date(d).toLocaleTimeString('en-PK', {
        hour: '2-digit', minute: '2-digit',
      })
    : '—';