export const currentUser = {
  id: "u1",
  name: "Rajesh Kumar",
  phone: "+91 98765 43210",
  email: "rajesh@example.com",
  businessType: "Grocery Store",
  location: "Mumbai, India",
  language: "English",
};

export const dashboardStats = {
  earnings: 12500,
  expenses: 4800,
  profit: 7700,
};

export const recentActivity = [
  { id: "a1", date: "2026-03-28", description: "Sold 10kg Rice, 5L Milk", earnings: 850, expenses: 0, type: "sale" as const },
  { id: "a2", date: "2026-03-27", description: "Purchased vegetables stock", earnings: 0, expenses: 1200, type: "expense" as const },
  { id: "a3", date: "2026-03-27", description: "Sold cooking oil, spices", earnings: 620, expenses: 0, type: "sale" as const },
];

export const ledgerEntries = [
  { id: "l1", date: "2026-03-28", earnings: 850, expenses: 200, profit: 650, status: "confirmed" as const, items: ["10kg Rice - ₹500", "5L Milk - ₹350"], expenseBreakdown: ["Transport - ₹100", "Packaging - ₹100"], confidence: 0.95, transcript: "Today I sold 10 kilo rice for 500 rupees and 5 litre milk for 350 rupees. Transport cost 100 and packaging 100." },
  { id: "l2", date: "2026-03-27", earnings: 620, expenses: 1200, profit: -580, status: "approximate" as const, items: ["Cooking Oil - ₹320", "Spices - ₹300"], expenseBreakdown: ["Vegetable Stock - ₹1200"], confidence: 0.78, transcript: "I bought vegetables for 1200 rupees and sold cooking oil 320 and spices around 300." },
  { id: "l3", date: "2026-03-26", earnings: 1500, expenses: 300, profit: 1200, status: "confirmed" as const, items: ["Flour 20kg - ₹800", "Sugar 10kg - ₹500", "Tea - ₹200"], expenseBreakdown: ["Electricity - ₹300"], confidence: 0.92, transcript: "Sold flour 20 kilo 800 rupees, sugar 10 kilo 500 rupees, tea packets 200 rupees. Electricity bill was 300." },
  { id: "l4", date: "2026-03-25", earnings: 980, expenses: 450, profit: 530, status: "confirmed" as const, items: ["Dairy Products - ₹580", "Snacks - ₹400"], expenseBreakdown: ["Rent share - ₹300", "Misc - ₹150"], confidence: 0.88, transcript: "Dairy products sold for 580, snacks for 400. Paid rent share 300 and miscellaneous 150." },
  { id: "l5", date: "2026-03-24", earnings: 1100, expenses: 600, profit: 500, status: "approximate" as const, items: ["Mixed groceries - ₹1100"], expenseBreakdown: ["Supplier payment - ₹600"], confidence: 0.72, transcript: "Total sales around 1100 rupees today, paid supplier about 600." },
];

export const weeklyInsights = [
  { day: "Mon", earnings: 980, expenses: 450 },
  { day: "Tue", earnings: 1100, expenses: 600 },
  { day: "Wed", earnings: 1500, expenses: 300 },
  { day: "Thu", earnings: 620, expenses: 1200 },
  { day: "Fri", earnings: 850, expenses: 200 },
  { day: "Sat", earnings: 1800, expenses: 400 },
  { day: "Sun", earnings: 2100, expenses: 350 },
];

export const insightMessages = [
  { id: "i1", type: "positive" as const, title: "Weekend Boost!", message: "You earn 40% more on weekends. Consider stocking extra on Fridays." },
  { id: "i2", type: "negative" as const, title: "Milk Cost Rising", message: "Milk procurement cost increased 15% this month compared to last." },
  { id: "i3", type: "positive" as const, title: "Top Seller", message: "Rice is your best-selling item this week, contributing 35% of revenue." },
  { id: "i4", type: "neutral" as const, title: "Steady Expenses", message: "Your transport costs have remained stable for the past 2 weeks." },
];

export const suggestions = [
  { id: "s1", item: "Rice (10kg bags)", currentQty: 5, suggestedQty: 12, reason: "Sold out 3 times this week. High demand on weekends." },
  { id: "s2", item: "Milk (1L packets)", currentQty: 20, suggestedQty: 30, reason: "Daily demand averaging 25 units, current stock runs out by 3 PM." },
  { id: "s3", item: "Cooking Oil (1L)", currentQty: 8, suggestedQty: 8, reason: "Stock level matches demand. No change needed." },
  { id: "s4", item: "Sugar (1kg)", currentQty: 3, suggestedQty: 10, reason: "Festival season approaching. Historical data shows 3x increase." },
];

export const alerts = [
  { id: "al1", type: "warning" as const, title: "Expenses Increased", message: "Today's expenses are 60% higher than your weekly average.", metric: "₹1,200 vs avg ₹750" },
  { id: "al2", type: "danger" as const, title: "Low Sales Alert", message: "Sales dropped 30% compared to the same day last week.", metric: "₹620 vs ₹890" },
  { id: "al3", type: "info" as const, title: "Stock Running Low", message: "Rice and Sugar stocks are below reorder threshold.", metric: "3 items below minimum" },
];

export const adminVendors = [
  { id: "v1", name: "Rajesh Kumar", business: "Grocery Store", location: "Mumbai", status: "active" as const, entries: 45, earnings: 52000, lastActive: "2026-03-28" },
  { id: "v2", name: "Priya Sharma", business: "Vegetable Shop", location: "Delhi", status: "active" as const, entries: 38, earnings: 41000, lastActive: "2026-03-28" },
  { id: "v3", name: "Amit Patel", business: "Dairy Store", location: "Ahmedabad", status: "inactive" as const, entries: 12, earnings: 18000, lastActive: "2026-03-20" },
  { id: "v4", name: "Sunita Devi", business: "Kirana Shop", location: "Jaipur", status: "active" as const, entries: 29, earnings: 34000, lastActive: "2026-03-27" },
];

export const mockTranscripts = [
  "Today I sold 10 kilo rice for 500 rupees, 5 litre milk for 350 rupees. My transport cost was 100 rupees and packaging was 100 rupees.",
  "Sold cooking oil 3 bottles for 320 rupees and spice packets for 300 rupees. Bought vegetables stock for 1200 from mandi.",
  "Morning sales were good. Flour 20 kilo sold for 800, sugar 10 kilo for 500, and tea packets for 200 rupees total. Paid electricity 300.",
];
