import { FormEvent, useEffect, useState } from 'react';
import {
  createNewAccount,
  importAccount,
  encryptPrivateKey,
  decryptPrivateKey,
  saveEncryptedWallet,
  loadEncryptedWallet,
  type EncryptedWalletRecord,
} from './lib/walletCrypto';
import { signAndSendUsdcTransfer, USDC_DECIMALS } from './lib/arcChain';
import { parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

type PermissionCard = {
  id: string;
  name: string;
  actions: string[];
  dailySpendLimit: number;
  protocolAllowlist: string[];
  status: string;
  expiresAt?: string;
  spentToday?: number;
};

type WalletRecord = EncryptedWalletRecord & { chainId: number };

type NewsItem = { id: string; title: string; summary: string };
type DAppItem = { id: string; name: string; category: string; summary: string };
type ConfirmationState = {
  kind: 'swap' | 'transfer';
  summary: string;
};

type ActivityItem = {
  id: string;
  kind: string;
  summary: string;
  status: string;
  permissionCardId?: string;
  quote?: {
    kind: string;
    amount: string;
    protocol: string;
    slippage: string;
    fee: string;
    requiresConfirmation: boolean;
  };
};

type ChatTurn = {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
};

const API_BASE = '/api';

const AVAILABLE_ACTIONS = ['swap', 'transfer', 'bridge', 'claim'];

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'permissions' | 'wallet' | 'audit' | 'explorer'>('chat');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: 'Hello! I am your Quidarc AI Assistant. You can ask me to check your balance, simulate swaps, or execute transfers on Arc Testnet.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  
  const [wallet, setWallet] = useState<WalletRecord | null>(null);
  const [walletPassword, setWalletPassword] = useState('');
  const [walletSeed, setWalletSeed] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('0.01');
  const [permissions, setPermissions] = useState<PermissionCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  
  // Permission Card Form States
  const [permissionName, setPermissionName] = useState('');
  const [selectedActions, setSelectedActions] = useState<string[]>(['swap', 'transfer']);
  const [permissionLimit, setPermissionLimit] = useState('100');
  const [permissionProtocols, setPermissionProtocols] = useState('uniswap, curve');
  const [permissionExpiryDays, setPermissionExpiryDays] = useState('30');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [dapps, setDapps] = useState<DAppItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = loadEncryptedWallet();
    if (stored) {
      setWallet({ ...stored, chainId: 5042002 });
      refreshBalance(stored.address);
    }

    fetch(`${API_BASE}/permissions`).then(async (res) => {
      const payload = (await res.json()) as { cards: PermissionCard[] };
      const cardsList = payload.cards || [];
      setPermissions(cardsList);
      const active = cardsList.find((c) => c.status === 'active');
      if (active) setSelectedCardId(active.id);
    }).catch(() => {});

    fetch(`${API_BASE}/news`).then(async (res) => {
      const payload = (await res.json()) as { items: NewsItem[] };
      setNews(payload.items || []);
    }).catch(() => {});

    fetch(`${API_BASE}/dapps`).then(async (res) => {
      const payload = (await res.json()) as { items: DAppItem[] };
      setDapps(payload.items || []);
    }).catch(() => {});

    fetch(`${API_BASE}/audit`).then(async (res) => {
      const payload = (await res.json()) as { entries: ActivityItem[] };
      setActivities(payload.entries || []);
    }).catch(() => {});
  }, []);

  const refreshBalance = async (address: string) => {
    try {
      const response = await fetch(`${API_BASE}/wallet/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const payload = await response.json();
      if (payload.balance) {
        setWalletBalance(payload.balance);
      }
    } catch {
      setWalletBalance('0.00 USDC');
    }
  };

  const handleCreateWallet = async () => {
    if (walletPassword.length < 8) {
      alert('Use a password with at least 8 characters.');
      return;
    }

    const { account, privateKeyHex } = createNewAccount();
    const encrypted = await encryptPrivateKey(privateKeyHex, walletPassword);
    const record: WalletRecord = { ...encrypted, address: account.address, chainId: 5042002, createdAt: new Date().toISOString() };

    setWallet(record);
    saveEncryptedWallet(record);
    setWalletPassword('');
    setWalletSeed('');
    await refreshBalance(record.address);
  };

  const handleImportWallet = async () => {
    if (walletPassword.length < 8 || !walletSeed.trim()) {
      alert('Enter a seed phrase or private key and a password of at least 8 characters.');
      return;
    }

    let imported;
    try {
      imported = importAccount(walletSeed);
    } catch (error) {
      alert((error as Error).message);
      return;
    }

    const encrypted = await encryptPrivateKey(imported.secretForStorage, walletPassword);
    const record: WalletRecord = { ...encrypted, address: imported.account.address, chainId: 5042002, createdAt: new Date().toISOString() };

    setWallet(record);
    saveEncryptedWallet(record);
    setWalletPassword('');
    setWalletSeed('');
    await refreshBalance(record.address);
  };

  const applyPreset = (type: 'dex' | 'micro' | 'agent') => {
    if (type === 'dex') {
      setPermissionName('DEX Trader Preset');
      setSelectedActions(['swap']);
      setPermissionLimit('50');
      setPermissionProtocols('uniswap, curve');
      setPermissionExpiryDays('30');
    } else if (type === 'micro') {
      setPermissionName('Micro-Transfers Preset');
      setSelectedActions(['transfer']);
      setPermissionLimit('10');
      setPermissionProtocols('direct-transfer');
      setPermissionExpiryDays('14');
    } else if (type === 'agent') {
      setPermissionName('Full Agent Automation Preset');
      setSelectedActions(['swap', 'transfer', 'bridge']);
      setPermissionLimit('200');
      setPermissionProtocols('uniswap, curve, aerodrome, direct-transfer');
      setPermissionExpiryDays('90');
    }
  };

  const toggleAction = (act: string) => {
    if (selectedActions.includes(act)) {
      if (selectedActions.length > 1) {
        setSelectedActions(selectedActions.filter((a) => a !== act));
      }
    } else {
      setSelectedActions([...selectedActions, act]);
    }
  };

  const sendChatMessageText = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => [...prev, userTurn]);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const payload = await response.json();

      if (payload.intent === 'balance' && wallet?.address) {
        await refreshBalance(wallet.address);
      }

      const agentTurn: ChatTurn = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: payload.reply || 'Request processed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatHistory((prev) => [...prev, agentTurn]);
      setConfirmation(payload.confirmation ? { kind: payload.confirmation.kind, summary: payload.confirmation.summary } : null);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `agent-err-${Date.now()}`,
          sender: 'agent',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleSendMessage = (event: FormEvent) => {
    event.preventDefault();
    sendChatMessageText(message);
  };

  const handleConfirmExecution = async () => {
    if (!wallet) {
      alert('No wallet loaded.');
      return;
    }

    const cardIdToUse = selectedCardId || permissions[0]?.id;

    if (confirmation?.kind === 'swap') {
      try {
        const response = await fetch(`${API_BASE}/execution/agent-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'swap',
            permissionCardId: cardIdToUse,
            protocol: 'uniswap',
            amount: transferAmount,
          }),
        });
        const payload = await response.json();
        const replyText = payload.reason ?? (payload.executed ? 'Swap executed successfully.' : 'Swap request processed.');
        
        setChatHistory((prev) => [
          ...prev,
          {
            id: `agent-swap-${Date.now()}`,
            sender: 'agent',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setConfirmation(null);
      } catch {
        alert('Swap execution error.');
      }
      return;
    }

    // --- Transfer path ---
    const toAddress = transferRecipient || '0x0000000000000000000000000000000000000000';

    try {
      const prepared = await fetch(`${API_BASE}/execution/prepare-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: wallet.address,
          toAddress,
          amount: transferAmount,
          permissionCardId: cardIdToUse,
          protocol: 'direct-transfer',
        }),
      }).then((res) => res.json());

      if (!prepared.authorized) {
        alert(`Not authorized: ${prepared.reason}`);
        setConfirmation(null);
        return;
      }

      const password = window.prompt('Enter your wallet password to sign this transaction:');
      if (!password) {
        alert('Signing cancelled.');
        setConfirmation(null);
        return;
      }

      let txHash: string;
      const privateKeyHex = await decryptPrivateKey(wallet, password);
      const account = privateKeyToAccount(privateKeyHex);
      const amountRaw = parseUnits(transferAmount || '0', USDC_DECIMALS);
      txHash = await signAndSendUsdcTransfer(account, toAddress, amountRaw);

      const confirmed = await fetch(`${API_BASE}/transactions/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          fromAddress: wallet.address,
          toAddress,
          amount: transferAmount,
          permissionCardId: cardIdToUse,
        }),
      }).then((res) => res.json());

      setChatHistory((prev) => [
        ...prev,
        {
          id: `agent-tx-${Date.now()}`,
          sender: 'agent',
          text: `Transfer broadcast to Arc Testnet! Tx Hash: ${txHash}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      setConfirmation(null);
      if (confirmed.auditEntry) {
        setActivities((current) => [confirmed.auditEntry, ...current]);
      }
    } catch (err) {
      alert(`Transfer failed: ${(err as Error).message}`);
      setConfirmation(null);
    }
  };

  const handleCreatePermission = async (event: FormEvent) => {
    event.preventDefault();
    if (!permissionName || !wallet?.address) {
      alert('Wallet and card name required.');
      return;
    }

    const daysNum = Math.max(1, Number(permissionExpiryDays) || 30);
    const expiresAtIso = new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000).toISOString();

    const payloadBody = {
      name: permissionName,
      ownerWallet: wallet.address,
      actions: selectedActions,
      dailySpendLimit: Number(permissionLimit) || 100,
      protocolAllowlist: permissionProtocols.split(',').map((entry) => entry.trim()).filter(Boolean),
      expiresAt: expiresAtIso,
    };

    try {
      const response = await fetch(`${API_BASE}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      });
      const payload = await response.json();

      if (payload.card) {
        setPermissions((current) => [...current, payload.card]);
        if (!selectedCardId) setSelectedCardId(payload.card.id);
        
        setActivities((current) => [
          { id: `activity-${Date.now()}`, kind: 'permission-created', summary: `Created permission card: ${payload.card.name}`, status: 'active', permissionCardId: payload.card.id },
          ...current,
        ]);
        setPermissionMessage(`Created permission card: ${payload.card.name}`);
        setPermissionName('');
      } else {
        alert('Failed to create permission card.');
      }
    } catch (err) {
      alert(`Error creating card: ${(err as Error).message}`);
    }
  };

  const handleRevokePermission = async (id: string) => {
    if (!confirm('Are you sure you want to instantly revoke this permission card? In-flight or future actions under this card will be blocked immediately.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/permissions/${id}/revoke`, { method: 'POST' });
      const payload = await response.json();
      if (payload.card) {
        setPermissions((current) => current.map((card) => (card.id === id ? payload.card : card)));
        setActivities((current) => [
          { id: `activity-${Date.now()}`, kind: 'permission-revoked', summary: `Revoked permission card: ${payload.card.name}`, status: payload.card.status, permissionCardId: payload.card.id },
          ...current,
        ]);
        setPermissionMessage(`Revoked card: ${payload.card.name}`);
      }
    } catch (err) {
      alert(`Revocation error: ${(err as Error).message}`);
    }
  };

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="app-shell">
      {/* Top Navigation Header */}
      <header className="top-header">
        <div className="brand-row">
          <div className="logo-icon">Q</div>
          <div>
            <div className="brand-name">Quidarc</div>
          </div>
          <span className="network-badge">
            <span className="network-dot" /> Arc Testnet
          </span>
        </div>

        <div className="header-actions">
          {wallet ? (
            <div className="wallet-pill">
              <span className="wallet-address" onClick={copyAddress} title="Click to copy address" style={{ cursor: 'pointer' }}>
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)} {copied ? '(Copied!)' : ''}
              </span>
              <span className="wallet-balance-chip">{walletBalance || '0 USDC'}</span>
            </div>
          ) : (
            <button className="btn-primary" onClick={() => setActiveTab('wallet')}>
              Connect / Create Wallet
            </button>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          💬 AI Assistant
        </button>
        <button className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`} onClick={() => setActiveTab('permissions')}>
          🛡️ Permission Cards ({permissions.length})
        </button>
        <button className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
          💳 Wallet & Transfers
        </button>
        <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          📜 Audit Log ({activities.length})
        </button>
        <button className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveTab('explorer')}>
          🌐 Arc Explorer
        </button>
      </nav>

      {/* TAB 1: AI Chat */}
      {activeTab === 'chat' && (
        <main className="main-grid">
          <section className="glass-panel chat-container">
            <div className="panel-header">
              <h2 className="panel-title">💬 Conversational AI Execution</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Powered by Arc & Circle</span>
            </div>

            <div className="chat-history">
              {chatHistory.map((turn) => (
                <div key={turn.id} className={`chat-msg ${turn.sender}`}>
                  {turn.sender === 'agent' && <div className="agent-header">✦ Quidarc Agent</div>}
                  <div>{turn.text}</div>
                </div>
              ))}

              {confirmation && (
                <div className="confirmation-box">
                  <div className="confirm-title">⚠️ Action Requires Explicit Confirmation</div>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{confirmation.summary}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button className="btn-primary" onClick={handleConfirmExecution}>
                      Confirm & Sign Transaction
                    </button>
                    <button className="btn-secondary" onClick={() => setConfirmation(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div className="suggestion-pills">
              <button className="chip-btn" onClick={() => sendChatMessageText('Check my Arc wallet balance')}>
                💰 Check Balance
              </button>
              <button className="chip-btn" onClick={() => sendChatMessageText('Swap 10 USDC to ETH on Uniswap')}>
                🔄 Swap 10 USDC → ETH
              </button>
              <button className="chip-btn" onClick={() => sendChatMessageText('Show active permission cards')}>
                🛡️ View Permissions
              </button>
              <button className="chip-btn" onClick={() => sendChatMessageText("What's new on Arc ecosystem?")}>
                🌐 Arc Ecosystem News
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-row">
              <input
                className="input-field"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask about swaps, transfers, or balance..."
              />
              <button className="btn-primary" type="submit">
                Send
              </button>
            </form>
          </section>

          {/* Side Info Panel */}
          <aside className="glass-panel">
            <h3 className="panel-title">🛡️ Active Authorizing Card</h3>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Selected Card for Chat Execution:</label>
              <select
                className="input-field"
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                {permissions.map((card) => (
                  <option key={card.id} value={card.id} style={{ background: '#0d192e', color: '#fff' }}>
                    {card.name} ({card.status}) — ${card.dailySpendLimit}/day
                  </option>
                ))}
                {permissions.length === 0 && <option value="">No cards available (Manual Confirm Mode)</option>}
              </select>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <p>🔒 <strong>Non-Custodial:</strong> Private keys are encrypted locally in your browser with AES-GCM and never touch the server.</p>
              <p>🛡️ <strong>Fail-Closed Rules:</strong> Agent actions are blocked unless an active Permission Card explicitly permits them.</p>
            </div>
          </aside>
        </main>
      )}

      {/* TAB 2: Permission Cards */}
      {activeTab === 'permissions' && (
        <main className="main-grid">
          <section className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">🛡️ Interactive Permission Cards</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scoped Delegation & Instant Revocation</span>
            </div>

            {permissionMessage && (
              <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid var(--sky-light)', borderRadius: 'var(--radius-sm)', color: 'var(--sky-light)', fontSize: '0.85rem' }}>
                {permissionMessage}
              </div>
            )}

            <div className="cards-grid">
              {permissions.map((card) => {
                const spent = card.spentToday || 0;
                const pct = Math.min(100, Math.round((spent / (card.dailySpendLimit || 1)) * 100));

                return (
                  <div key={card.id} className={`perm-card ${card.status}`}>
                    <div className="perm-header">
                      <span className="perm-name">{card.name}</span>
                      <span className={`status-tag ${card.status}`}>{card.status}</span>
                    </div>

                    <div className="meta-row">
                      <span>Actions:</span>
                      <span className="meta-value">{card.actions.join(', ')}</span>
                    </div>

                    <div className="meta-row">
                      <span>Rolling 24h Spend Cap:</span>
                      <span className="meta-value">${card.dailySpendLimit} USDC</span>
                    </div>

                    {/* Spend progress bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                        <span>Spent: ${spent}</span>
                        <span>Cap: ${card.dailySpendLimit}</span>
                      </div>
                      <div className="spend-progress-bar">
                        <div className="spend-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="meta-row">
                      <span>Protocol Allowlist:</span>
                      <span className="meta-value">{card.protocolAllowlist.join(', ') || 'All'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {card.status === 'active' && (
                        <button className="btn-danger" onClick={() => handleRevokePermission(card.id)} style={{ width: '100%' }}>
                          ⛔ Instant Revoke Card
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Form & Presets Panel */}
          <aside className="glass-panel">
            <h3 className="panel-title">⚡ Quick Creation Presets</h3>
            <div className="preset-grid">
              <button type="button" className="preset-card" onClick={() => applyPreset('dex')}>
                <div className="preset-title">⚡ DEX Trader</div>
                <div className="preset-desc">$50/day • Swaps • Uniswap/Curve</div>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset('micro')}>
                <div className="preset-title">💸 Micro-Transfers</div>
                <div className="preset-desc">$10/day • Transfers</div>
              </button>
              <button type="button" className="preset-card" onClick={() => applyPreset('agent')}>
                <div className="preset-title">🤖 Full Agent</div>
                <div className="preset-desc">$200/day • Swaps, Transfers, Bridge</div>
              </button>
            </div>

            <h3 className="panel-title" style={{ marginTop: '8px' }}>➕ Create Custom Card</h3>
            <form onSubmit={handleCreatePermission} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Card Label Name</label>
                <input className="input-field" value={permissionName} onChange={(e) => setPermissionName(e.target.value)} placeholder="e.g. Arc Trader Card" required />
              </div>

              <div className="form-group">
                <label className="form-label">Allowed Actions</label>
                <div className="action-checkboxes">
                  {AVAILABLE_ACTIONS.map((act) => (
                    <label key={act} className={`action-checkbox-label ${selectedActions.includes(act) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedActions.includes(act)}
                        onChange={() => toggleAction(act)}
                        style={{ display: 'none' }}
                      />
                      {selectedActions.includes(act) ? '✓' : '+'} {act}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Daily Spend Limit (USDC)</label>
                <input className="input-field" type="number" value={permissionLimit} onChange={(e) => setPermissionLimit(e.target.value)} placeholder="100" />
              </div>

              <div className="form-group">
                <label className="form-label">Protocol Allowlist (comma separated)</label>
                <input className="input-field" value={permissionProtocols} onChange={(e) => setPermissionProtocols(e.target.value)} placeholder="uniswap, curve" />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry (Days from now)</label>
                <input className="input-field" type="number" value={permissionExpiryDays} onChange={(e) => setPermissionExpiryDays(e.target.value)} placeholder="30" />
              </div>

              <button className="btn-primary" type="submit" style={{ marginTop: '8px' }}>
                Create Permission Card
              </button>
            </form>
          </aside>
        </main>
      )}

      {/* TAB 3: Wallet */}
      {activeTab === 'wallet' && (
        <main className="main-grid">
          <section className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title">💳 Wallet & Direct Transfers</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Non-Custodial Account Controls</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="perm-card">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Arc Testnet Address</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--sky-light)', wordBreak: 'break-all', margin: '6px 0' }}>
                  {wallet?.address || 'No wallet loaded.'}
                </div>
                {wallet && (
                  <button className="btn-secondary" onClick={copyAddress} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    {copied ? '✓ Address Copied' : '📋 Copy Address'}
                  </button>
                )}
              </div>

              <div className="perm-card">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>USDC Gas & Token Balance</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)', margin: '4px 0' }}>
                  {walletBalance || '0.00 USDC'}
                </div>
                {wallet && (
                  <button className="btn-secondary" onClick={() => refreshBalance(wallet.address)} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    🔄 Refresh Balance
                  </button>
                )}
              </div>
            </div>

            <hr style={{ borderColor: 'var(--panel-border)', margin: '16px 0' }} />

            <h3 className="panel-title">💸 Direct USDC Transfer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
              <div className="form-group">
                <label className="form-label">Recipient Address</label>
                <input className="input-field" value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} placeholder="0x..." />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (USDC)</label>
                <input className="input-field" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="0.01" />
              </div>
              <button className="btn-primary" onClick={handleConfirmExecution} style={{ width: 'fit-content' }}>
                Sign & Send Transfer
              </button>
            </div>
          </section>

          {/* Create/Import Wallet Box */}
          <aside className="glass-panel">
            <h3 className="panel-title">🔑 Manage Key Storage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Encryption Password (8+ chars)</label>
                <input className="input-field" type="password" value={walletPassword} onChange={(e) => setWalletPassword(e.target.value)} placeholder="Password" />
              </div>
              <div className="form-group">
                <label className="form-label">Seed Phrase / Key (for Import)</label>
                <input className="input-field" value={walletSeed} onChange={(e) => setWalletSeed(e.target.value)} placeholder="Optional seed phrase or 0x private key" />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button className="btn-primary" onClick={handleCreateWallet} style={{ flex: 1 }}>
                  Create New
                </button>
                <button className="btn-secondary" onClick={handleImportWallet} style={{ flex: 1 }}>
                  Import Key
                </button>
              </div>
            </div>
          </aside>
        </main>
      )}

      {/* TAB 4: Audit Log */}
      {activeTab === 'audit' && (
        <main className="glass-panel">
          <div className="panel-header">
            <h2 className="panel-title">📜 On-Chain & Permission Audit Trail</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Persistent History Log</span>
          </div>

          <div className="activity-list">
            {activities.length === 0 ? (
              <p style={{ color: 'var(--text-dim)' }}>No audit events logged yet.</p>
            ) : (
              activities.map((item) => (
                <div key={item.id} className="activity-item">
                  <div>
                    <span className="activity-kind">{item.kind}</span> — {item.summary}
                  </div>
                  <span className={`status-tag ${item.status}`}>{item.status}</span>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* TAB 5: Arc Explorer */}
      {activeTab === 'explorer' && (
        <main className="main-grid">
          <section className="glass-panel">
            <h2 className="panel-title">📰 Arc Ecosystem News</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {news.map((item) => (
                <div key={item.id} className="perm-card">
                  <div style={{ fontWeight: 600, color: 'var(--sky-light)' }}>{item.title}</div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="glass-panel">
            <h2 className="panel-title">📱 Curated Arc dApps</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dapps.map((item) => (
                <div key={item.id} className="activity-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{item.name} <span style={{ fontSize: '0.75rem', color: 'var(--sky-light)' }}>({item.category})</span></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.summary}</div>
                </div>
              ))}
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

export default App;
