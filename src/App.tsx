import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, CheckCircle2,
  ClipboardList, FileCheck2, FileText, LayoutDashboard, LoaderCircle,
  LockKeyhole, LogOut, Moon, Plus, RefreshCw, Search, Settings,
  ShieldCheck, Sun, Wallet, X, UploadCloud, Trash2
} from 'lucide-react';

type Finding = {
  field: string;
  result: 'CONSISTENT' | 'MISMATCH' | 'MISSING' | 'REVIEW';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
  recommendation: string;
  sources: { source: string; quote: string }[];
};

type Evidence = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  sha256: string;
  extractedText?: string;
};

type Tx = {
  id: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientEmail: string;
  clientCountry: string;
  amount: number;
  currency: string;
  service: string;
  dueDate: string;
  status: string;
  cancellationReason?: string;
  cancelledAt?: string;
  sources: {
    chatText: string;
    agreementText: string;
    invoice: {
      number: string;
      amount: number | null;
      currency: string;
      description: string;
    };
    paypal: any;
  };
  evidence: Evidence[];
  analysis?: {
    summary: string;
    overall: string;
    findings: Finding[];
    extractedFacts: any[];
    clarificationQuestions: string[];
    limitations: string[];
  };
  findings: Finding[];
    approvedSnapshot: any;
  paypal?: any;
  paypalInvoices?: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    label: string;
    status: string;
    href?: string;
    createdAt?: string;
    sentAt?: string;
    paidAt?: string;
    payments?: any[];
  }[];
  events: any[];
};

type Health = {
  ok: boolean;
  aiConfigured: boolean;
  paypalConfigured: boolean;
  paypalEnvironment: string;
};

type Page =
  | 'overview'
  | 'transactions'
  | 'evidence'
  | 'paypal'
  | 'reports'
  | 'settings';

/* Worldwide country list using ISO country/territory codes. */
const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW`.split(' ');

const regionNames = new Intl.DisplayNames(['en'], {
  type: 'region'
});

const COUNTRIES = COUNTRY_CODES
  .map(code => ({
    code,
    name: regionNames.of(code) || code
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

/* Use browser-supported ISO currency codes, with a fallback list. */
const getSupportedValues = (
  Intl as unknown as {
    supportedValuesOf?: (key: 'currency') => string[];
  }
).supportedValuesOf;

const currencyCodes: string[] =
  typeof getSupportedValues === 'function'
    ? getSupportedValues('currency')
    : `AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWL`.split(' ');

const currencyNames = new Intl.DisplayNames(['en'], {
  type: 'currency'
});

const CURRENCIES = [...new Set(currencyCodes)]
  .sort()
  .map(code => ({
    code,
    name: currencyNames.of(code) || code
  }));

const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
};

const emptyForm = {
  clientName: '',
  clientEmail: '',
  clientCountry: '',
  amount: '',
  currency: 'USD',
  service: '',
  dueDate: '',
  chatText: '',
  agreementText: '',
  invoiceNumber: '',
  invoiceAmount: '',
  invoiceCurrency: 'USD',
  invoiceDescription: ''
};

async function api<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('txnora_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return body;
}

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('txnora_token')
  );

  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  const [accountEmail, setAccountEmail] = useState(
    () => localStorage.getItem('txnora_email') || ''
  );

  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [page, setPage] = useState<Page>('overview');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [dark, setDark] = useState(
    () => localStorage.getItem('txnora_theme') !== 'light'
  );

  const [form, setForm] = useState(emptyForm);

  const [defaultCurrency, setDefaultCurrency] = useState(
    () => localStorage.getItem('txnora_default_currency') || 'USD'
  );

  const [defaultCountry, setDefaultCountry] = useState(
    () => localStorage.getItem('txnora_default_country') || ''
  );

  const load = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const [records, status] = await Promise.all([
        api<Tx[]>('/api/transactions'),
        api<Health>('/api/health')
      ]);

      setTransactions(records);
      setHealth(status);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void load();
  }, [token]);

  useEffect(() => {
    localStorage.setItem('txnora_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const authenticate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const result = await api<{ token: string }>(
        '/api/auth/' + authMode,
        {
          method: 'POST',
          body: JSON.stringify({
            email: authEmail,
            password: authPassword
          })
        }
      );

      const email = authEmail.trim().toLowerCase();

      localStorage.setItem('txnora_token', result.token);
      localStorage.setItem('txnora_email', email);

      setAccountEmail(email);
      setToken(result.token);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const current =
    transactions.find(tx => tx.id === selected) || null;

  const filtered = useMemo(
    () =>
      transactions.filter(tx => {
        const matchesText = [
          tx.id,
          tx.clientName,
          tx.clientCountry,
          tx.service,
          tx.status
        ]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase());

        return (
          matchesText &&
          (statusFilter === 'ALL' || tx.status === statusFilter)
        );
      }),
    [transactions, query, statusFilter]
  );

  const evidenceRows = useMemo(
    () =>
      transactions.flatMap(tx =>
        (tx.evidence || []).map(file => ({ tx, file }))
      ),
    [transactions]
  );

  /* Never add unlike currencies together. */
  const valueByCurrency = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach(tx => {
      totals.set(
        tx.currency,
        (totals.get(tx.currency) || 0) + Number(tx.amount || 0)
      );
    });

    return [...totals.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [transactions]);

    const paidByCurrency = useMemo(() => {
    const totals = new Map<string, number>();

    transactions.forEach(tx => {
      const invoices = Array.isArray(tx.paypalInvoices)
        ? tx.paypalInvoices
        : tx.paypal?.invoiceId
          ? [{ ...tx.paypal, amount: Number(tx.amount || 0) }]
          : [];

      invoices
        .filter(invoice =>
          String(invoice.status || '').toUpperCase() === 'PAID'
        )
        .forEach(invoice => {
          const amount = Number(invoice.amount || 0);

          totals.set(
            tx.currency,
            (totals.get(tx.currency) || 0) + amount
          );
        });
    });

    return [...totals.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [transactions]);

  const updateForm = (key: string, value: string) => {
    setForm(previous => ({
      ...previous,
      [key]: value
    }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      currency: defaultCurrency,
      invoiceCurrency: defaultCurrency,
      clientCountry: defaultCountry
    });

    setShowCreate(true);
  };

  const openEdit = async (tx: Tx) => {
  let editableTx = tx;

  if (
    (Array.isArray(tx.paypalInvoices) && tx.paypalInvoices.length > 0) ||
    tx.paypal?.invoiceId
  ) {
    const confirmed = window.confirm(
      'This transaction has one or more PayPal invoices. TXNORA will verify all invoices and remove eligible unpaid drafts from PayPal before allowing edits. Invoices with payment history cannot be detached. Continue?'
    );

    if (!confirmed) return;

    setBusy('Preparing transaction edit');
    setError('');
    setNotice('');

    try {
      editableTx = await api<Tx>(
        `/api/transactions/${tx.id}/paypal/prepare-edit`,
        {
          method: 'POST',
          body: JSON.stringify({})
        }
      );

      await load();
    } catch (e) {
      setError((e as Error).message);
      return;
    } finally {
      setBusy('');
    }
  }

  setEditingId(editableTx.id);

  setForm({
    clientName: editableTx.clientName || '',
    clientEmail: editableTx.clientEmail || '',
    clientCountry: editableTx.clientCountry || '',
    amount: String(editableTx.amount ?? ''),
    currency: editableTx.currency || 'USD',
    service: editableTx.service || '',
    dueDate: editableTx.dueDate || '',
    chatText: editableTx.sources?.chatText || '',
    agreementText: editableTx.sources?.agreementText || '',
    invoiceNumber: editableTx.sources?.invoice?.number || '',
    invoiceAmount: editableTx.sources?.invoice?.amount == null
      ? ''
      : String(editableTx.sources.invoice.amount),
    invoiceCurrency:
      editableTx.sources?.invoice?.currency || editableTx.currency || 'USD',
    invoiceDescription: editableTx.sources?.invoice?.description || ''
  });

  setError('');
  setNotice('');
  setShowCreate(true);
};

  const closeTransactionModal = () => {
    setShowCreate(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveDefaults = (currency: string, country: string) => {
    setDefaultCurrency(currency);
    setDefaultCountry(country);

    localStorage.setItem('txnora_default_currency', currency);
    localStorage.setItem('txnora_default_country', country);

    setNotice('Transaction defaults saved.');
  };

  const exportWorkspace = () => {
    const data = {
      product: 'TXNORA',
      exportedAt: new Date().toISOString(),
      account: accountEmail,
      transactions
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      })
    );

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      `txnora-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const run = async (
    label: string,
    operation: () => Promise<any>
  ) => {
    setBusy(label);
    setError('');
    setNotice('');

    try {
      const result = await operation();

      await load();

      if (result?.id) {
        setSelected(result.id);
        setPage('transactions');
      }

      setNotice(`${label} completed.`);
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy('');
    }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      ...form,
      amount: Number(form.amount),
      invoiceAmount: form.invoiceAmount
        ? Number(form.invoiceAmount)
        : undefined
    };

    const isEditing = Boolean(editingId);
    const transactionId = editingId;

    const saved = await run(
      isEditing ? 'Transaction update' : 'Transaction creation',
      () =>
        api<Tx>(
          isEditing
            ? `/api/transactions/${transactionId}`
            : '/api/transactions',
          {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
          }
        )
    );

    if (saved) {
      setShowCreate(false);
      setEditingId(null);
      setSelected(saved.id || transactionId || null);
      setPage('transactions');
      setForm(emptyForm);
    }
  };

  const upload = async (file: File, txId?: string) => {
    const targetId = txId || current?.id;

    if (!targetId) return;

    const data = new FormData();
    data.append('file', file);

    await run('Evidence upload', () =>
      api(`/api/transactions/${targetId}/evidence`, {
        method: 'POST',
        body: data
      })
    );
  };
const deleteEvidence = async (
  evidenceId: string,
  fileName: string,
  txId?: string
) => {
  const targetId = txId || current?.id;

  if (!targetId) return;

  const confirmed = window.confirm(
    `Permanently delete "${fileName}"? This will also clear the transaction's AI analysis and approval so it can be reviewed again.`
  );

  if (!confirmed) return;

  await run('Evidence deletion', () =>
    api(`/api/transactions/${targetId}/evidence/${evidenceId}`, {
      method: 'DELETE'
    })
  );
};
  const action = async (path: string, label: string) => {
    if (!current) return;

    await run(label, () =>
      api(`/api/transactions/${current.id}/${path}`, {
        method: 'POST',
        body: JSON.stringify({})
      })
    );
  };
const cancelTransaction = async () => {
  if (!current) return;

  const reason = window.prompt(
    'Why is this transaction being cancelled?'
  );

  if (reason === null) return;

  if (!reason.trim()) {
    setError('Please enter a cancellation reason.');
    return;
  }

  if (reason.trim().length > 500) {
    setError('The cancellation reason must be 500 characters or fewer.');
    return;
  }

  const confirmed = window.confirm(
    `Cancel the transaction for ${current.clientName}? This will preserve its history.`
  );

  if (!confirmed) return;

  await run('Transaction cancellation', () =>
    api(`/api/transactions/${current.id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason.trim() })
    })
  );
};

const deleteTransaction = async () => {
  if (!current) return;

  const confirmed = window.confirm(
    `Permanently delete draft ${current.id}? This cannot be undone.`
  );

  if (!confirmed) return;

  const deletedId = current.id;

  const result = await run('Transaction deletion', () =>
    api(`/api/transactions/${deletedId}`, {
      method: 'DELETE'
    })
  );

  if (result) {
    setSelected(null);
    setPage('transactions');
  }
};
  const downloadReport = async (tx: Tx) => {
    try {
      const response = await fetch(
        `/api/transactions/${tx.id}/report`,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem('txnora_token') || ''}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Could not download transaction report.');
      }

      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = `${tx.id}-report.txt`;
      anchor.click();

      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const go = (next: Page) => {
    setPage(next);
    setSelected(null);
    setError('');
    setNotice('');
    setQuery('');
    setStatusFilter('ALL');
  };

   const stats = {
    total: transactions.length,
    needsReview: transactions.filter(
      tx => tx.status === 'REVIEW_REQUIRED'
    ).length,
    mismatches: transactions.filter(
      tx => tx.status === 'MISMATCH'
    ).length,
    approved: transactions.filter(
      tx => tx.status === 'APPROVED'
    ).length,
    unpaid: transactions.reduce((total, tx) => {
      const invoices = Array.isArray(tx.paypalInvoices)
        ? tx.paypalInvoices
        : tx.paypal?.invoiceId
          ? [tx.paypal]
          : [];

      return total + invoices.filter(invoice =>
        !['PAID', 'CANCELLED', 'REFUNDED'].includes(
          String(invoice.status || '').toUpperCase()
        )
      ).length;
    }, 0)
  };

  if (!token) {
    return (
      <div className="auth-screen">
        <form className="auth-card" onSubmit={authenticate}>
          <div className="brand">
            <div className="brand-mark">T</div>
            <div>
              <b>TXNORA</b>
              <small>TRANSACTION INTEGRITY</small>
            </div>
          </div>

          <h1>
            {authMode === 'register'
              ? 'Create your workspace'
              : 'Welcome back'}
          </h1>

          <p>Secure access to your transaction integrity workspace.</p>

          {error && <div className="alert error">{error}</div>}

          <label>
            Email address
            <input
              required
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              minLength={10}
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
            />
          </label>

          <button className="primary">
            {authMode === 'register' ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() =>
              setAuthMode(
                authMode === 'register' ? 'login' : 'register'
              )
            }
          >
            {authMode === 'register'
              ? 'Already registered? Sign in'
              : 'First time? Create account'}
          </button>

          <small>
            One account per local workspace. Passwords are stored as salted hashes.
          </small>
        </form>
      </div>
    );
  }

  const nav: [Page, string, any][] = [
    ['overview', 'Overview', LayoutDashboard],
    ['transactions', 'Transactions', FileText],
    ['evidence', 'Evidence', FileCheck2],
    ['paypal', 'PayPal', Wallet],
    ['reports', 'Reports', BarChart3],
    ['settings', 'Settings', Settings]
  ];

  const title =
    selected && current
      ? 'Transaction details'
      : ({
          overview: 'Overview',
          transactions: 'Transactions',
          evidence: 'Evidence library',
          paypal: 'PayPal invoices',
          reports: 'Reports',
          settings: 'Settings'
        } as Record<Page, string>)[page];

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div>
            <b>TXNORA</b>
            <small>TRANSACTION INTEGRITY</small>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        {nav.map(([key, label, Icon]) => (
          <button
            key={key}
            className={`nav-item ${
              page === key && !selected ? 'active' : ''
            }`}
            onClick={() => go(key)}
          >
            <Icon size={19} />
            {label}
            {key === 'transactions' && <span>{transactions.length}</span>}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={20} />
            <div>
              <b>Evidence-first workflow</b>
              <small>AI findings require review</small>
            </div>
          </div>

          <button className="nav-item" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? 'Light' : 'Dark'} appearance
          </button>

          <button
            className="nav-item"
            onClick={() => {
              localStorage.removeItem('txnora_token');
              localStorage.removeItem('txnora_email');
              setAccountEmail('');
              setToken(null);
              setTransactions([]);
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>

          <small className="version">TXNORA · WORKSPACE</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">TRANSACTION OPERATIONS</div>
            <h1>{title}</h1>
          </div>

          <div className="top-actions">
            <button className="primary" onClick={openCreate}>
              <Plus size={18} />
              New transaction
            </button>
          </div>
        </header>

        {(error || notice) && (
          <div className={error ? 'alert error' : 'alert success'}>
            <span>{error || notice}</span>
            <button
              onClick={() => {
                setError('');
                setNotice('');
              }}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {selected && current ? (
          <section className="detail-view">
            <button
              className="back"
              onClick={() => {
                setSelected(null);
                setPage('transactions');
              }}
            >
              <ArrowRight size={17} />
              All transactions
            </button>

            <div className="detail-heading">
              <div>
                <div className="eyebrow">{current.id}</div>
                <h2>{current.clientName}</h2>
                <p>
                  {current.service} · {current.clientCountry || 'Country not specified'}
                </p>
              </div>

              <div className="detail-amount">
                {money(current.amount, current.currency)}
                <small>Agreed transaction amount</small>
               {current.status !== 'CANCELLED' && (
  <div className="transaction-management-actions">
    <button
  className="secondary"
  type="button"
  disabled={!!busy}
  onClick={() => void openEdit(current)}
>
  Edit transaction
</button>

    <button
      className="secondary"
      type="button"
      disabled={!!busy}
      onClick={cancelTransaction}
    >
      Cancel transaction
    </button>

    {current.status === 'COLLECTING' &&
      !(Array.isArray(current.paypalInvoices)
        ? current.paypalInvoices.length > 0
        : !!current.paypal?.invoiceId) &&
      !current.analysis &&
      !current.approvedSnapshot &&
      !(current.evidence || []).length && (
        <button
          className="secondary"
          type="button"
          disabled={!!busy}
          onClick={deleteTransaction}
        >
          Delete draft
        </button>
      )}
  </div>
)}

{current.status === 'CANCELLED' && (
  <div className="cancellation-notice">
    <b>Transaction cancelled</b>
    <p>{current.cancellationReason}</p>
    {current.cancelledAt && (
      <small>
        {new Date(current.cancelledAt).toLocaleString()}
      </small>
    )}
  </div>
)}
                
                
              </div>
            </div>

            <div className="detail-grid">
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <b>Transaction evidence</b>
                    <small>Original source material and uploaded files</small>
                  </div>

                  <label className="upload-btn">
                    <UploadCloud size={18} />
                    Add evidence
                    <input
  type="file"
  accept=".pdf,.txt,.md,.png,.jpg,.jpeg"
  onChange={e => {
    const file = e.target.files?.[0];

    if (file) {
      upload(file);
      e.target.value = '';
    }
  }}
/>
                  </label>
                </div>

                <div className="source-block">
                  <label>CLIENT CONVERSATION</label>
                  <p>
                    {current.sources.chatText || 'No conversation text supplied.'}
                  </p>
                </div>

                <div className="source-block">
                  <label>SERVICE AGREEMENT</label>
                  <p>
                    {current.sources.agreementText || 'No agreement text supplied.'}
                  </p>
                </div>

                <div className="source-block">
                  <label>EXISTING INVOICE DETAILS</label>
                  <p>
                    {current.sources.invoice.number || 'Invoice number not supplied'}
                    {' · '}
                    {current.sources.invoice.amount
                      ? money(
                          current.sources.invoice.amount,
                          current.sources.invoice.currency
                        )
                      : 'Amount not separately supplied'}
                    <br />
                    {current.sources.invoice.description ||
                      'No invoice description supplied.'}
                  </p>
                </div>

                {current.evidence.map(file => (
  <div className="file-row" key={file.id}>
    <FileText size={19} />

    <div>
      <b>{file.name}</b>
      <small>
        {(file.size / 1024).toFixed(1)} KB · SHA-256{' '}
        {file.sha256.slice(0, 12)}…
      </small>
    </div>

    <button
      className="secondary"
      type="button"
      disabled={
        !!busy ||
        (Array.isArray(current.paypalInvoices)
          ? current.paypalInvoices.length > 0
          : !!current.paypal?.invoiceId)
      }
      title={
        (Array.isArray(current.paypalInvoices)
          ? current.paypalInvoices.length > 0
          : !!current.paypal?.invoiceId)
          ? 'Remove or cancel the linked PayPal invoice before deleting evidence.'
          : 'Delete this evidence file'
      }
      onClick={() => void deleteEvidence(file.id, file.name)}
    >
      <Trash2 size={16} />
      Delete
    </button>
  </div>
))}

                <div className="panel-actions">
                  <button
                    className="primary"
                    disabled={!!busy}
                    onClick={() => action('analyze', 'Gemini analysis')}
                  >
                    <Activity size={18} />
                    {busy === 'Gemini analysis'
                      ? 'Analysing…'
                      : 'Run AI verification'}
                  </button>

                  <button
                    className="secondary"
                    onClick={() => downloadReport(current)}
                  >
                    <ArrowDownToLine size={18} />
                    Download report
                  </button>
                </div>
              </section>

              <section className="panel assessment">
                <div className="panel-title">
                  <div>
                    <b>Consistency assessment</b>
                    <small>AI findings supported by supplied evidence</small>
                  </div>

                  <span className={`status ${current.status.toLowerCase()}`}>
                    {current.status.replaceAll('_', ' ')}
                  </span>
                </div>

                {busy === 'Gemini analysis' ? (
                  <div className="analysis-loading">
                    <LoaderCircle className="spin" size={28} />
                    <b>Analysing supplied evidence</b>
                    <p>The analysis result will appear here when the API responds.</p>
                  </div>
                ) : current.analysis ? (
                  <>
                    <p className="ai-summary">{current.analysis.summary}</p>

                    {current.findings.map((finding, index) => (
                      <div className="finding" key={index}>
                        <div className="finding-top">
                          <b>{finding.field}</b>
                          <span className={`result ${finding.result.toLowerCase()}`}>
                            {finding.result} · {finding.severity}
                          </span>
                        </div>

                        <p>{finding.explanation}</p>
                        <small>{finding.recommendation}</small>

                        {finding.sources?.map((source, i) => (
                          <blockquote key={i}>
                            “{source.quote}”
                            <cite>— {source.source}</cite>
                          </blockquote>
                        ))}
                      </div>
                    ))}

                    {current.analysis.clarificationQuestions?.length > 0 && (
                      <div className="questions">
                        <b>Clarification required</b>
                        {current.analysis.clarificationQuestions.map((question, i) => (
                          <p key={i}>{question}</p>
                        ))}
                      </div>
                    )}

                    {current.analysis.limitations?.length > 0 && (
                      <div className="limitations">
                        <b>Analysis limitations</b>
                        {current.analysis.limitations.map((item, i) => (
                          <p key={i}>{item}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-analysis">
                    <Activity size={30} />
                    <b>Verification not run</b>
                    <p>
                      Run AI verification to compare the conversation,
                      agreement, invoice and uploaded evidence.
                    </p>
                  </div>
                )}

                <div className="panel-actions">
  {current.status === 'READY_FOR_APPROVAL' &&
  current.analysis?.overall === 'CONSISTENT' ? (
    <button
      className="primary"
      disabled={!!busy}
      onClick={() => action('approve', 'Transaction approval')}
    >
      Approve transaction snapshot
    </button>
  ) : (
    <button
      className="secondary"
      disabled={!!busy}
      onClick={() => action('analyze', 'Gemini analysis')}
    >
      <RefreshCw size={17} />
      Re-run verification
    </button>
  )}
</div>
              </section>
            </div>

            <section className="panel">
  <div className="panel-title">
    <div>
      <b>PayPal invoices</b>
      <small>Create separate invoices for approved payment milestones</small>
    </div>
    <Wallet size={20} />
  </div>

  {(() => {
    const invoices =
      current.paypalInvoices ||
      (current.paypal?.invoiceId ? [current.paypal] : []);

    const createdTotal = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0
    );

    const remaining = Math.max(
      0,
      Number(current.amount) - createdTotal
    );

    return (
      <>
        <div className="paypal-setup">
          <p>Contract: {money(current.amount, current.currency)}</p>
          <p>Already invoiced: {money(createdTotal, current.currency)}</p>
          <p>Remaining: {money(remaining, current.currency)}</p>

          <button
            className="primary"
            disabled={
              !current.approvedSnapshot ||
              !current.clientEmail ||
              !health?.paypalConfigured ||
              remaining <= 0 ||
              !!busy
            }
            onClick={async () => {
              const amountInput = window.prompt(
                `Enter invoice amount. Remaining: ${remaining.toFixed(2)} ${current.currency}`
              );

              if (amountInput === null) return;

              const amount = Number(amountInput);

              if (
                !Number.isFinite(amount) ||
                amount <= 0 ||
                amount > remaining
              ) {
                setError('Enter a valid amount within the remaining contract value.');
                return;
              }

              const label = window.prompt(
                'Enter invoice description, for example: Advance payment'
              );

              if (!label?.trim()) return;

              setBusy('PayPal invoice creation');
              setError('');
              setNotice('');

              try {
                await api<Tx>(
                  `/api/transactions/${current.id}/paypal/invoice`,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      amount,
                      label: label.trim()
                    })
                  }
                );

                await load();
                setNotice('PayPal invoice created successfully.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy('');
              }
            }}
          >
            <Plus size={17} />
            Create invoice
          </button>
        </div>

        {invoices.length > 0 && (
          <div className="timeline">
            {invoices.map(invoice => (
              <div className="timeline-item" key={invoice.invoiceId}>
                <i />
                <div>
                  <b>{invoice.label || 'Payment invoice'}</b>

                  <p>
                    {money(Number(invoice.amount || 0), current.currency)}
                  </p>

                  <small>Invoice ID: {invoice.invoiceId}</small>
                  <small>Status: {invoice.status}</small>

                  {invoice.href && (
                    <p>
                      <a
                        href={invoice.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open PayPal invoice
                      </a>
                    </p>
                  )}

                  <div className="panel-actions">
                    <button
                      className="secondary"
                      disabled={!!busy}
                      onClick={() =>
                        action(
                          `paypal/${encodeURIComponent(invoice.invoiceId)}/refresh`,
                          'PayPal status refresh'
                        )
                      }
                    >
                      <RefreshCw size={17} />
                      Refresh status
                    </button>

                    {invoice.status === 'DRAFT' && (
                      <button
                        className="primary"
                        disabled={!!busy}
                        onClick={() =>
                          action(
                            `paypal/${encodeURIComponent(invoice.invoiceId)}/send`,
                            'PayPal invoice send'
                          )
                        }
                      >
                        Send invoice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!invoices.length && (
          <p>
            {current.approvedSnapshot
              ? 'No invoices created yet.'
              : 'Approve a consistent transaction before creating invoices.'}
          </p>
        )}
      </>
    );
  })()}
</section>

            <section className="panel">
              <div className="panel-title">
                <div>
                  <b>Audit history</b>
                  <small>Recorded actions for this transaction</small>
                </div>
                <LockKeyhole size={20} />
              </div>

              {current.events?.length ? (
                <div className="timeline">
                  {[...current.events].reverse().map(event => (
                    <div className="timeline-item" key={event.id}>
                      <i />
                      <div>
                        <b>{event.type.replaceAll('_', ' ')}</b>
                        <p>{event.detail}</p>
                        <small>{new Date(event.at).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty compact">No activity recorded.</div>
              )}
            </section>
          </section>
        ) : page === 'overview' ? (
          <>
            <div className="welcome">
              <div>
                <h2>Workspace performance</h2>
                <p>Live summary of the transaction records in this workspace.</p>
              </div>

              <button className="secondary" onClick={load}>
                <RefreshCw size={17} />
                Refresh
              </button>
            </div>

            <div className="stats-grid overview-stats">
              <div className="stat-card">
                <span>Transactions</span>
                <b>{stats.total}</b>
                <small>All saved transaction records</small>
              </div>

              <div className="stat-card">
                <span>Awaiting review</span>
                <b>{stats.needsReview}</b>
                <small>AI returned a review outcome</small>
              </div>

              <div className="stat-card">
                <span>Discrepancies</span>
                <b>{stats.mismatches}</b>
                <small>AI identified a mismatch</small>
              </div>

              <div className="stat-card">
                <span>Approved</span>
                <b>{stats.approved}</b>
                <small>Approved transaction snapshots</small>
              </div>
            </div>

            <div className="overview-grid">
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <b>Transaction value by currency</b>
                    <small>
                      Agreed transaction amounts, grouped without mixing currencies
                    </small>
                  </div>
                  <BarChart3 size={21} />
                </div>

                {valueByCurrency.length ? (
                  <div className="currency-breakdown">
                    {valueByCurrency.map(([currency, total]) => (
                      <div className="currency-row" key={currency}>
                        <div>
                          <b>{currency}</b>
                          <small>
                            {transactions.filter(tx => tx.currency === currency).length}
                            {' '}transaction(s)
                          </small>
                        </div>
                        <strong>{money(total, currency)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty compact">
                    <b>No transaction value yet</b>
                    <p>Values will appear after you create transaction records.</p>
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panel-title">
                  <div>
                    <b>Payment collection</b>
                    <small>
                      Amounts recorded against transactions with PayPal invoices
                    </small>
                  </div>
                  <Wallet size={21} />
                </div>

                {paidByCurrency.length ? (
                  <div className="currency-breakdown">
                    {paidByCurrency.map(([currency, total]) => (
                      <div className="currency-row" key={currency}>
                        <div>
                          <b>{currency}</b>
                          <small>Invoice status marked paid by PayPal</small>
                        </div>
                        <strong>{money(total, currency)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty compact">
                    <b>No confirmed paid invoices</b>
                    <p>
                      Paid totals appear only when PayPal reports a paid invoice status.
                    </p>
                  </div>
                )}

                <div className="overview-footnote">
                  Invoices awaiting payment: <b>{stats.unpaid}</b>
                </div>
              </section>
            </div>

            <section className="panel">
              <div className="panel-title">
                <div>
                  <b>Requires attention</b>
                  <small>Transactions that need a decision or evidence review</small>
                </div>

                <button className="text-action" onClick={() => go('transactions')}>
                  Open transaction register <ArrowRight size={16} />
                </button>
              </div>

              {transactions.filter(tx =>
                ['REVIEW_REQUIRED', 'MISMATCH', 'COLLECTING'].includes(tx.status)
              ).length ? (
                <div className="attention-list">
                  {transactions
                    .filter(tx =>
                      ['REVIEW_REQUIRED', 'MISMATCH', 'COLLECTING'].includes(tx.status)
                    )
                    .slice(0, 6)
                    .map(tx => (
                      <button
                        className="attention-item"
                        key={tx.id}
                        onClick={() => {
                          setSelected(tx.id);
                          setPage('transactions');
                        }}
                      >
                        <div>
                          <b>{tx.clientName}</b>
                          <small>{tx.id} · {tx.service}</small>
                        </div>

                        <span className={`status ${tx.status.toLowerCase()}`}>
                          {tx.status.replaceAll('_', ' ')}
                        </span>

                        <strong>{money(tx.amount, tx.currency)}</strong>
                        <ArrowRight size={17} />
                      </button>
                    ))}
                </div>
              ) : (
                <div className="empty compact">
                  <b>No transactions currently flagged</b>
                  <p>New and incomplete transactions will appear here when they need attention.</p>
                </div>
              )}
            </section>

            <section className="panel table-panel">
              <div className="panel-title">
                <div>
                  <b>Recently updated</b>
                  <small>Latest transaction activity</small>
                </div>

                <button className="text-action" onClick={() => go('transactions')}>
                  All transactions <ArrowRight size={16} />
                </button>
              </div>

              <TransactionTable
                rows={transactions.slice(0, 5)}
                open={id => {
                  setSelected(id);
                  setPage('transactions');
                }}
                loading={loading}
                create={openCreate}
              />
            </section>
          </>
        ) : page === 'transactions' ? (
          <section className="panel table-panel">
            <div className="panel-title register-heading">
              <div>
                <b>Transaction register</b>
                <small>Search and manage individual client engagements</small>
              </div>

              <div className="register-controls">
                <div className="searchbox">
                  <Search size={18} />
                  <input
                    placeholder="Search client, ID, country or service"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  {[
                    'COLLECTING',
  'READY_FOR_APPROVAL',
  'REVIEW_REQUIRED',
  'MISMATCH',
  'APPROVED',
  'CANCELLED'
                  ].map(status => (
                    <option key={status} value={status}>
                      {status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <TransactionTable
              rows={filtered}
              open={id => setSelected(id)}
              loading={loading}
              create={openCreate}
            />
          </section>
        ) : page === 'evidence' ? (
          <>
            <div className="welcome">
              <div>
                <h2>Evidence repository</h2>
                <p>
                  Source files linked to individual transactions. Evidence is not shared across clients.
                </p>
              </div>
              <div className="evidence-count">
                {evidenceRows.length} uploaded file(s)
              </div>
            </div>

            <div className="evidence-summary">
              <div className="evidence-summary-card">
                <FileText size={21} />
                <div>
                  <b>{evidenceRows.length}</b>
                  <small>Uploaded files</small>
                </div>
              </div>

              <div className="evidence-summary-card">
                <ClipboardList size={21} />
                <div>
                  <b>
                    {transactions.filter(tx =>
                      !tx.sources.chatText &&
                      !tx.sources.agreementText &&
                      !(tx.evidence || []).length
                    ).length}
                  </b>
                  <small>Transactions with no supplied evidence</small>
                </div>
              </div>

              <div className="evidence-summary-card">
                <ShieldCheck size={21} />
                <div>
                  <b>{evidenceRows.filter(row => !!row.file.sha256).length}</b>
                  <small>Files with SHA-256 hash</small>
                </div>
              </div>
            </div>

            {evidenceRows.length ? (
              <section className="panel">
                <div className="panel-title">
                  <div>
                    <b>Uploaded source documents</b>
                    <small>Choose a file to open its associated transaction</small>
                  </div>
                  <FileCheck2 size={21} />
                </div>

                <div className="evidence-grid">
                  {evidenceRows.map(({ tx, file }) => (
                    <article className="evidence-card" key={file.id}>
                      <div className="evidence-card-icon">
                        <FileText size={23} />
                      </div>

                      <div className="evidence-card-content">
                        <b>{file.name}</b>
                        <small>{tx.clientName} · {tx.id}</small>
                        <small>
                          {(file.size / 1024).toFixed(1)} KB ·{' '}
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </small>
                        <small className="hash-text">
                          SHA-256: {file.sha256}
                        </small>
                      </div>

                      <div className="evidence-card-actions">
  <button
    className="secondary"
    type="button"
    onClick={() => {
      setSelected(tx.id);
      setPage('transactions');
    }}
  >
    Open transaction
  </button>

  <button
    className="secondary"
    type="button"
    disabled={
      !!busy ||
      (Array.isArray(tx.paypalInvoices)
        ? tx.paypalInvoices.length > 0
        : !!tx.paypal?.invoiceId)
    }
    title={
      (Array.isArray(tx.paypalInvoices)
        ? tx.paypalInvoices.length > 0
        : !!tx.paypal?.invoiceId)
        ? 'Remove or cancel the linked PayPal invoice before deleting evidence.'
        : 'Delete this evidence file'
    }
    onClick={() => void deleteEvidence(file.id, file.name, tx.id)}
  >
    <Trash2 size={16} />
    Delete
  </button>
</div>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section className="panel">
                <div className="empty">
                  <FileCheck2 size={34} />
                  <b>No uploaded files</b>
                  <p>
                    Evidence files will appear here after you upload them to a transaction.
                    You can also paste conversation or agreement text directly into a transaction.
                  </p>
                  <button className="primary" onClick={() => go('transactions')}>
                    View transactions
                  </button>
                </div>
              </section>
            )}

            <section className="panel">
              <div className="panel-title">
                <div>
                  <b>Transactions missing source material</b>
                  <small>
                    Records with no pasted conversation, agreement or uploaded file
                  </small>
                </div>
              </div>

              {transactions.filter(tx =>
                !tx.sources.chatText &&
                !tx.sources.agreementText &&
                !(tx.evidence || []).length
              ).length ? (
                <div className="attention-list">
                  {transactions
                    .filter(tx =>
                      !tx.sources.chatText &&
                      !tx.sources.agreementText &&
                      !(tx.evidence || []).length
                    )
                    .map(tx => (
                      <button
                        className="attention-item"
                        key={tx.id}
                        onClick={() => {
                          setSelected(tx.id);
                          setPage('transactions');
                        }}
                      >
                        <div>
                          <b>{tx.clientName}</b>
                          <small>{tx.id} · {tx.service}</small>
                        </div>

                        <span className="status review_required">
                          Evidence missing
                        </span>

                        <strong>{money(tx.amount, tx.currency)}</strong>
                        <ArrowRight size={17} />
                      </button>
                    ))}
                </div>
              ) : (
                <div className="empty compact">
                  <b>No records in this category</b>
                </div>
              )}
            </section>
          </>
        ) : page === 'paypal' ? (
          <section className="panel">
            <div className="panel-title">
              <div>
                <b>PayPal invoice register</b>
                <small>Invoices linked to approved transaction records</small>
              </div>
              <Wallet size={21} />
            </div>

            {transactions.some(tx =>
              Array.isArray(tx.paypalInvoices)
                ? tx.paypalInvoices.length > 0
                : !!tx.paypal?.invoiceId
            ) ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>INVOICE ID</th>
                      <th>TRANSACTION</th>
                      <th>CLIENT</th>
                      <th>AMOUNT</th>
                      <th>PAYPAL STATUS</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.flatMap(tx => {
                      const invoices = Array.isArray(tx.paypalInvoices)
                        ? tx.paypalInvoices
                        : tx.paypal?.invoiceId
                          ? [tx.paypal]
                          : [];

                      return invoices.map(invoice => (
                        <tr
                          key={`${tx.id}-${invoice.invoiceId}`}
                          onClick={() => {
                            setSelected(tx.id);
                            setPage('transactions');
                          }}
                        >
                          <td><b>{invoice.invoiceId}</b></td>
                          <td>{tx.id}</td>
                          <td>
                            {tx.clientName}
                            <small>{tx.clientCountry}</small>
                          </td>
                          <td>
                            {money(
                              Number(invoice.amount ?? tx.amount),
                              tx.currency
                            )}
                          </td>
                          <td>{invoice.status}</td>
                          <td><ArrowRight size={17} /></td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <Wallet size={32} />
                <b>No PayPal invoices yet</b>
                <p>Invoices appear here after they are created from approved transactions.</p>
              </div>
            )}
          </section>
        ) : page === 'reports' ? (
          <section className="panel">
            <div className="panel-title">
              <div>
                <b>Transaction reports</b>
                <small>Download evidence-backed reports for saved transactions</small>
              </div>
              <BarChart3 size={21} />
            </div>

            {transactions.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>TRANSACTION</th>
                      <th>CLIENT</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                      <th>REPORT</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td>
                          <b>{tx.id}</b>
                          <small>{tx.service}</small>
                        </td>
                        <td>{tx.clientName}</td>
                        <td>{money(tx.amount, tx.currency)}</td>
                        <td>{tx.status.replaceAll('_', ' ')}</td>
                        <td>
                          <button
                            className="small-action"
                            onClick={() => downloadReport(tx)}
                          >
                            <ArrowDownToLine size={16} />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <ClipboardList size={32} />
                <b>No reports available</b>
                <p>Create a transaction to generate its report.</p>
              </div>
            )}
          </section>
        ) : (
          <div className="settings-layout">
            <section className="panel settings-panel">
              <div className="panel-title">
                <div>
                  <b>Workspace profile</b>
                  <small>Account information for this workspace</small>
                </div>
                <ShieldCheck size={21} />
              </div>

              <div className="setting-row">
                <div>
                  <b>Signed-in account</b>
                  <p>{accountEmail}</p>
                </div>
                <span className="setting-value">Single-user workspace</span>
              </div>
            </section>

            <section className="panel settings-panel">
              <div className="panel-title">
                <div>
                  <b>International transaction defaults</b>
                  <small>
                    Optional defaults. Client country and payment currency remain independent.
                  </small>
                </div>
                <ClipboardList size={21} />
              </div>

              <div className="settings-fields">
                <label>
                  Default payment currency
                  <select
                    value={defaultCurrency}
                    onChange={e =>
                      saveDefaults(e.target.value, defaultCountry)
                    }
                  >
                    {CURRENCIES.map(item => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Default client country
                  <select
                    value={defaultCountry}
                    onChange={e =>
                      saveDefaults(defaultCurrency, e.target.value)
                    }
                  >
                    <option value="">No default country</option>
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="settings-help">
                These defaults only prefill new records. They do not restrict the countries
                or currencies you can use for individual transactions.
              </p>
            </section>

            <section className="panel settings-panel">
              <div className="panel-title">
                <div>
                  <b>Verification safeguards</b>
                  <small>Core controls for transaction approval</small>
                </div>
                <LockKeyhole size={21} />
              </div>

              <div className="setting-row">
                <div>
                  <b>AI analysis before approval</b>
                  <p>Analysis is required before a transaction can be approved.</p>
                </div>
                <span className="fixed-rule">Enforced</span>
              </div>

              <div className="setting-row">
                <div>
                  <b>Mismatch approval block</b>
                  <p>
                    Transactions with an AI mismatch outcome cannot be approved through the current workflow.
                  </p>
                </div>
                <span className="fixed-rule">Enforced</span>
              </div>

              <div className="setting-row">
                <div>
                  <b>Approval before PayPal invoice</b>
                  <p>An approved snapshot is required before invoice creation.</p>
                </div>
                <span className="fixed-rule">Enforced</span>
              </div>
            </section>

            <section className="panel settings-panel">
              <div className="panel-title">
                <div>
                  <b>Data management</b>
                  <small>Export transaction records and evidence metadata</small>
                </div>
                <ArrowDownToLine size={21} />
              </div>

              <div className="setting-row">
                <div>
                  <b>Export workspace data</b>
                  <p>
                    Download a JSON copy of transaction details, AI findings,
                    approval records and evidence metadata.
                  </p>
                </div>

                <button
                  className="secondary"
                  onClick={exportWorkspace}
                  disabled={!transactions.length}
                >
                  <ArrowDownToLine size={17} />
                  Export data
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={event =>
            event.target === event.currentTarget && closeTransactionModal()
          }
        >
          <form className="modal" onSubmit={create}>
            <div className="modal-head">
              <div>
                <div className="eyebrow">
                  {editingId ? 'EDIT TRANSACTION' : 'NEW TRANSACTION'}
                </div>
                <h2>
                  {editingId ? 'Edit transaction' : 'Create transaction'}
                </h2>
                <p>
                  Enter the agreed details. Client location and payment currency are separate.
                </p>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={closeTransactionModal}
              >
                <X />
              </button>
            </div>

            <div className="form-grid">
              <label>
                Client / buyer name
                <input
                  required
                  value={form.clientName}
                  onChange={e => updateForm('clientName', e.target.value)}
                />
              </label>

              <label>
                Client email
                <input
                  required
                  type="email"
                  value={form.clientEmail}
                  onChange={e => updateForm('clientEmail', e.target.value)}
                />
              </label>

              <label className="wide">
                Client country
                <select
                  value={form.clientCountry}
                  onChange={e => updateForm('clientCountry', e.target.value)}
                >
                  <option value="">Select client's country</option>
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Agreed amount
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => updateForm('amount', e.target.value)}
                />
              </label>

              <label>
                Payment currency
                <select
                  value={form.currency}
                  onChange={e => updateForm('currency', e.target.value)}
                >
                  {CURRENCIES.map(item => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wide">
                Agreed service / project scope
                <input
                  required
                  value={form.service}
                  onChange={e => updateForm('service', e.target.value)}
                  placeholder="Example: website development, five pages"
                />
              </label>

              <label>
                Expected delivery date
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => updateForm('dueDate', e.target.value)}
                />
              </label>

              <div className="field-note">
                The selected currency is the agreed transaction currency.
                PayPal may support a smaller set of currencies for invoicing;
                PayPal validates it when the invoice is created.
              </div>

              <label className="wide">
                Client conversation
                <textarea
                  rows={4}
                  value={form.chatText}
                  onChange={e => updateForm('chatText', e.target.value)}
                  placeholder="Paste the relevant WhatsApp, email or other client conversation"
                />
              </label>

              <label className="wide">
                Service agreement
                <textarea
                  rows={4}
                  value={form.agreementText}
                  onChange={e => updateForm('agreementText', e.target.value)}
                  placeholder="Paste the agreed deliverables, fees and terms"
                />
              </label>

              <div className="subhead">Existing invoice details (optional)</div>

              <label>
                Invoice number
                <input
                  value={form.invoiceNumber}
                  onChange={e => updateForm('invoiceNumber', e.target.value)}
                />
              </label>

              <label>
                Invoice amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.invoiceAmount}
                  onChange={e => updateForm('invoiceAmount', e.target.value)}
                />
              </label>

              <label>
                Invoice currency
                <select
                  value={form.invoiceCurrency}
                  onChange={e => updateForm('invoiceCurrency', e.target.value)}
                >
                  {CURRENCIES.map(item => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="wide">
                Invoice description
                <input
                  value={form.invoiceDescription}
                  onChange={e =>
                    updateForm('invoiceDescription', e.target.value)
                  }
                />
              </label>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="secondary"
                onClick={closeTransactionModal}
              >
                Cancel
              </button>

              <button className="primary" disabled={!!busy}>
                {busy === (editingId ? 'Transaction update' : 'Transaction creation')
                  ? (editingId ? 'Saving…' : 'Creating…')
                  : (editingId ? 'Save changes' : 'Create transaction')}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TransactionTable({
  rows,
  open,
  loading,
  create
}: {
  rows: Tx[];
  open: (id: string) => void;
  loading: boolean;
  create: () => void;
}) {
  if (loading) {
    return (
      <div className="empty">
        <LoaderCircle className="spin" />
        Loading records…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="empty">
        <FileCheck2 size={34} />
        <b>No transactions yet</b>
        <p>
          Create a transaction to begin checking the agreed scope and payment details.
        </p>
        <button className="primary" onClick={create}>
          <Plus size={17} />
          Create transaction
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>CLIENT</th>
            <th>AGREED VALUE</th>
            <th>STATUS</th>
            <th>UPDATED</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {rows.map(tx => (
            <tr key={tx.id} onClick={() => open(tx.id)}>
              <td>
                <b>{tx.id}</b>
                <small>{tx.service}</small>
              </td>

              <td>
                {tx.clientName}
                <small>{tx.clientCountry || 'Country not supplied'}</small>
              </td>

              <td className="amount">{money(tx.amount, tx.currency)}</td>

              <td>
                <span className={`status ${tx.status.toLowerCase()}`}>
                  {tx.status.replaceAll('_', ' ')}
                </span>
              </td>

              <td>{new Date(tx.updatedAt).toLocaleDateString()}</td>
              <td><ArrowRight size={18} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;