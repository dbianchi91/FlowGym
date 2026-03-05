/**
 * Formats an ISO date string (YYYY-MM-DD) to Italian format (dd/MM/yyyy)
 * @param isoDate String in format YYYY-MM-DD
 * @returns String in format dd/MM/yyyy
 */
export const formatToItalianDate = (isoDate: string): string => {
    if (!isoDate) return '';

    // Split YYYY-MM-DD
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate; // Return as is if format is unexpected

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};

/**
 * Returns today's date in dd/MM/yyyy format
 */
export const getTodayItalianDate = (): string => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
};
