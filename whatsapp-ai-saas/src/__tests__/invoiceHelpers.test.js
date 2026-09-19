import { describe, it, expect } from 'vitest';
import { calc, toFiniteNumber } from '../components/invoice/helpers';

describe('invoice helpers — calc / toFiniteNumber', () => {
    it('calcule sub/tax/total pour des nombres', () => {
        const r = calc([{ qty: 2, price: 15000 }], 18);
        expect(r.sub).toBe(30000);
        expect(r.tax).toBe(5400);
        expect(r.total).toBe(35400);
    });

    it('coerce les strings numériques (qty/price/taxRate)', () => {
        const r = calc([{ qty: '2', price: '15000' }], '18');
        expect(r.total).toBe(35400);
    });

    it('ne produit pas de NaN pour des prix invalides', () => {
        const r = calc([{ qty: 1, price: 'abc' }], 0);
        expect(Number.isNaN(r.total)).toBe(false);
        expect(r.total).toBe(0);
    });

    it('accepte espaces et virgule décimale dans les montants', () => {
        expect(toFiniteNumber('15 000')).toBe(15000);
        expect(toFiniteNumber('15,5')).toBe(15.5);
        expect(calc([{ qty: 2, price: '15 000' }], 0).total).toBe(30000);
    });
});
