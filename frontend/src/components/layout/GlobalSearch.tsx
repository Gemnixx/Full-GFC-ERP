import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, Factory, Receipt, ShoppingCart, Loader2, ArrowRight } from 'lucide-react';
import { api, unwrap } from '../../api/client';
import { cn } from '../../lib/cn';
import { formatMoney, formatDate } from '../../lib/format';

interface SearchResults {
  products: any[];
  customers: any[];
  suppliers: any[];
  sales: any[];
  purchases: any[];
}

const EMPTY: SearchResults = {
  products: [],
  customers: [],
  suppliers: [],
  sales: [],
  purchases: [],
};

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/search', { params: { q: query, limit: 5 } })
        .then((r) => setResults(unwrap(r)))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard: Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
      // Cmd/Ctrl + K to focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  const totalResults =
    results.products.length +
    results.customers.length +
    results.suppliers.length +
    results.sales.length +
    results.purchases.length;

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className="relative w-full" ref={boxRef}>
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-500 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search products, customers, invoices… (Ctrl+K)"
          className="w-full pl-9 pr-3 py-1.5 bg-surface-hover border border-edge-base rounded-md text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-surface-card"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-card border border-edge-base rounded-lg shadow-2xl z-[1050] max-h-[500px] overflow-y-auto animate-scale-in">
          {loading && totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted">
              <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-brand-500" />
              Searching…
            </div>
          ) : totalResults === 0 ? (
            <div className="py-10 px-4 text-center">
              <Search className="w-8 h-8 mx-auto mb-2 text-ink-muted opacity-40" />
              <p className="text-sm font-medium text-ink-primary">No results found</p>
              <p className="text-xs text-ink-muted mt-1">Try a different keyword</p>
            </div>
          ) : (
            <>
              {/* Products */}
              {results.products.length > 0 && (
                <div className="border-b border-edge-light">
                  <div className="px-3 py-1.5 bg-surface-cardAlt text-[10px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3 h-3" /> Products
                  </div>
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goTo(`/products/${p.id}`)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary truncate">{p.name}</p>
                        <p className="text-xs text-ink-secondary truncate">
                          {p.model || '—'} · Stock: {p.stock}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                          Rs {formatMoney(p.salePrice)}
                        </p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div className="border-b border-edge-light">
                  <div className="px-3 py-1.5 bg-surface-cardAlt text-[10px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Customers
                  </div>
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goTo(`/customers/${c.id}`)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-xs flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary truncate">{c.name}</p>
                        <p className="text-xs text-ink-secondary truncate">{c.phone || 'No phone'}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* Suppliers */}
              {results.suppliers.length > 0 && (
                <div className="border-b border-edge-light">
                  <div className="px-3 py-1.5 bg-surface-cardAlt text-[10px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Factory className="w-3 h-3" /> Suppliers
                  </div>
                  {results.suppliers.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => goTo(`/suppliers/${s.id}`)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center text-brand-700 dark:text-brand-300 font-semibold text-xs flex-shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary truncate">{s.name}</p>
                        <p className="text-xs text-ink-secondary truncate">{s.company || s.phone || '—'}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sales */}
              {results.sales.length > 0 && (
                <div className="border-b border-edge-light">
                  <div className="px-3 py-1.5 bg-surface-cardAlt text-[10px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-3 h-3" /> Sales
                  </div>
                  {results.sales.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => goTo(`/sales/${s.id}`)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary truncate font-mono">{s.invoiceNumber}</p>
                        <p className="text-xs text-ink-secondary truncate">
                          {s.customer?.name || 'Walk-in'} · {formatDate(s.saleDate)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex-shrink-0">
                        Rs {formatMoney(s.total)}
                      </p>
                      <ArrowRight className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* Purchases */}
              {results.purchases.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 bg-surface-cardAlt text-[10px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="w-3 h-3" /> Purchases
                  </div>
                  {results.purchases.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goTo(`/purchases/${p.id}`)}
                      className="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-primary truncate font-mono">{p.purchaseNumber}</p>
                        <p className="text-xs text-ink-secondary truncate">
                          {p.supplier?.name || '—'} · {formatDate(p.purchaseDate)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex-shrink-0">
                        Rs {formatMoney(p.total)}
                      </p>
                      <ArrowRight className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {/* Footer hint */}
              <div className="px-3 py-2 border-t border-edge-light bg-surface-cardAlt text-[10px] text-ink-muted flex justify-between">
                <span>{totalResults} results</span>
                <span>
                  <kbd className="px-1 py-0.5 bg-surface-hover rounded font-mono">Esc</kbd> to close
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};