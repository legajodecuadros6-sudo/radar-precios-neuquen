export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount).replace('ARS', '$');
};

export const formatPercentage = (percent: number): string => {
  return `${Math.round(percent)}%`;
};

export const formatDateDisplay = (dateStr: string): string => {
  try {
    const date = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00-03:00' : dateStr);
    if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';
    return date.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Salta',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};
