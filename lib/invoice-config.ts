// Everything that never changes from one document to the next lives here.
// Edit this file if the TIN, address, phone numbers or bank account change.
export const invoiceConfig = {
  // The letterhead on Zuri's printed stationery is dark green.
  brandColor: "#14532d",
  companyName: "ZURI TOURS & CAR HIRE",
  tagline: "Transport Logistics, Shuttle Services, Tours and Travel Consultant",
  email: "info@zuritours.co.tz",
  phones: "+255784840633  +255719111311",
  tin: "106-331-219",
  address: {
    line1: "Plot No 85 Block A2",
    line2: "Mikocheni Light Industrial Area",
    line3: "P. O. Box 31711",
    city: "Dar es Salaam",
  },
  bank: {
    accountName: "Zuri Tours and Car Hire",
    accountNumber: "0150548119100",
    branch: "CRDB/ Mikocheni",
    place: "Mikocheni / Dar es Salaam",
  },
  slogan: "We Serve with Excellency and Timely",
  signOff: "For Zuri Tours & Car Hire",
};

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underThousand(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10), r = n % 10;
    return TENS[t] + (r ? "-" + ONES[r] : "");
  }
  const h = Math.floor(n / 100), r = n % 100;
  return ONES[h] + " Hundred" + (r ? " " + underThousand(r) : "");
}

// Invoices state the total in words, so the figure can't be quietly altered.
export function amountInWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "Zero Only";

  const units: Array<[number, string]> = [
    [1_000_000_000, "Billion"],
    [1_000_000, "Million"],
    [1_000, "Thousand"],
  ];

  let rest = n;
  const parts: string[] = [];

  for (const [value, name] of units) {
    if (rest >= value) {
      const count = Math.floor(rest / value);
      parts.push(`${underThousand(count)} ${name}`);
      rest = rest % value;
    }
  }
  if (rest > 0) parts.push(underThousand(rest));

  return parts.join(", ") + " Only";
}
