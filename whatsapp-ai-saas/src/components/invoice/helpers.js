/** Coerce qty/price/tax to a finite number; non-numeric input becomes fallback. */
export function toFiniteNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
}

export function calc(items, taxRate = 0) {
    const sub = (items || []).reduce(
        (s, i) => s + toFiniteNumber(i.qty) * toFiniteNumber(i.price),
        0
    );
    const rate = toFiniteNumber(taxRate);
    const tax = sub * (rate / 100);
    return { sub, tax, total: sub + tax };
}

export function fmt(n, cur = 'XOF') {
    return n.toLocaleString('fr-FR', { style: 'currency', currency: cur, minimumFractionDigits: 2 });
}

export function monthlyRevenue(invoices) {
    const m = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const d = m.map(name => ({ name, rev: 0 }));
    invoices.forEach(inv => {
        if (!inv.createdAt) return;
        d[new Date(inv.createdAt).getMonth()].rev += calc(inv.items, inv.taxRate).total;
    });
    return d;
}

export function freshInvoice(userProfile = {}) {
    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + 30);

    const senderParts = [
        `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
        userProfile.email,
        userProfile.phone,
        userProfile.address
    ].filter(Boolean).join('\n');

    return {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-${today.getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
        companyName: userProfile.companyName || '',
        companyTagline: '',
        senderInfo: senderParts,
        companyLogo: userProfile.companyLogo || null, clientLogo: null,
        clientName: '', clientEmail: '', clientAddress: '',
        issueDate: today.toISOString().split('T')[0],
        dueDate: due.toISOString().split('T')[0],
        items: [{ id: `li-${Date.now()}`, description: '', qty: 1, price: 0 }],
        taxRate: 20, notes: '', status: 'draft', template: 'clean', currency: 'XOF',
        createdAt: today.toISOString(),
    };
}
