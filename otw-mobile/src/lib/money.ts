/**
 * Money from the backend arrives as JSON numbers (BigDecimal, scale 2, HALF_UP on the server).
 * Display only: never add, split or settle on the phone. Totals and shares come from the server.
 */
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export const formatPeso = (amount: number | null | undefined) => peso.format(amount ?? 0);

/** User input with at most 2 decimals ("1500", "1500.5", "1500.50"). Send it as typed once valid. */
export const isValidAmount = (input: string) => /^\d{1,9}(\.\d{1,2})?$/.test(input.trim());

/** Integer centavos, only for a live preview (e.g. an even split). Never send the result to the server. */
export const toCentavos = (input: string) => Math.round(Number(input) * 100);
