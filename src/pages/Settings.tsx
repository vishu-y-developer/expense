import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { currentMonthKey, formatMonthLabel } from '../utils/date';
import {
  exportBackup,
  importBackupMerge,
  importBackupReplace,
  transactionsToCSV,
  validateBackupData,
  clearAllData,
  type BackupData,
} from '../db/repository';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import type { AppSettings } from '../types';

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function Settings() {
  const { getBudget, setBudget, settings, updateTheme, refreshAll, transactions } = useApp();
  const month = currentMonthKey();
  const [budgetInput, setBudgetInput] = useState(String(getBudget(month) || ''));
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [showClear, setShowClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveBudget() {
    const amount = parseFloat(budgetInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage('Enter a valid budget amount (0 or greater).');
      return;
    }
    await setBudget(month, amount);
    setBudgetSaved(true);
    setMessage(null);
    setTimeout(() => setBudgetSaved(false), 1500);
  }

  async function handleExportJSON() {
    const data = await exportBackup();
    downloadFile(`money-tracker-backup-${month}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  async function handleExportCSV() {
    const csv = transactionsToCSV(transactions);
    downloadFile(`money-tracker-transactions-${month}.csv`, csv, 'text/csv');
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!validateBackupData(parsed)) {
          setMessage('That file does not look like a valid backup.');
          return;
        }
        setPendingImport(parsed);
      } catch {
        setMessage('Could not read that file. Make sure it is a valid backup JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function confirmImport() {
    if (!pendingImport) return;
    if (importMode === 'replace') {
      await importBackupReplace(pendingImport);
      setMessage('Backup restored. All previous data was replaced.');
    } else {
      const { added, skipped } = await importBackupMerge(pendingImport);
      setMessage(`Import complete: ${added} added, ${skipped} duplicates skipped.`);
    }
    setPendingImport(null);
    await refreshAll();
  }

  async function handleClearAll() {
    await clearAllData();
    setShowClear(false);
    setMessage('All data cleared.');
    await refreshAll();
  }

  const themeOptions: { value: AppSettings['theme']; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="card stack">
        <div className="icon-row">
          <span className="icon-badge">
            <Icon name="wallet" size={16} />
          </span>
          <span className="section-title">Monthly Budget</span>
        </div>
        <span className="hero-sub">
          Your intended spending allowance for {formatMonthLabel(month)}. This is not a daily
          limit, so spend more some days and less on others.
        </span>
        <div className="row" style={{ gap: 10 }}>
          <input
            className="input"
            inputMode="decimal"
            type="number"
            min="0"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
          <button className="btn" style={{ width: 'auto', padding: '13px 20px' }} onClick={saveBudget}>
            {budgetSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="card stack">
        <span className="section-title">Appearance</span>
        <div className="chip-row">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${settings.theme === opt.value ? 'active' : ''}`}
              onClick={() => updateTheme(opt.value)}
            >
              <Icon name={opt.value === 'light' ? 'sun' : opt.value === 'dark' ? 'moon' : 'system'} size={14} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <span className="section-title">Backup & Data</span>
        <button className="btn btn-secondary" onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="download" size={16} /> Export JSON Backup
        </button>
        <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="download" size={16} /> Export CSV
        </button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="upload" size={16} /> Import JSON Backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      <div className="card stack">
        <span className="section-title" style={{ color: 'var(--negative)' }}>
          Danger Zone
        </span>
        <button className="btn btn-danger" onClick={() => setShowClear(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Icon name="trash" size={16} /> Clear All Data
        </button>
      </div>

      <div className="card stack">
        <div className="icon-row">
          <span className="icon-badge">
            <Icon name="shield" size={17} />
          </span>
          <span className="section-title">Privacy</span>
        </div>
        <span className="hero-sub">
          Your financial data is stored locally on this device. No analytics. No tracking. No
          third-party financial API. No cloud upload. No network request is required for normal
          usage.
        </span>
      </div>

      {message && (
        <div className="card" style={{ fontSize: 14 }}>
          {message}
        </div>
      )}

      {pendingImport && (
        <div className="modal-overlay" onClick={() => setPendingImport(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-drag-indicator" />
            <h3 style={{ margin: '0 0 8px' }}>Import backup</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
              This file contains {pendingImport.transactions.length} transactions. Choose how to
              import it.
            </p>
            <div className="chip-row" style={{ marginBottom: 16 }}>
              <button
                className={`chip ${importMode === 'merge' ? 'active' : ''}`}
                onClick={() => setImportMode('merge')}
              >
                Merge (skip duplicates)
              </button>
              <button
                className={`chip ${importMode === 'replace' ? 'active' : ''}`}
                onClick={() => setImportMode('replace')}
              >
                Replace everything
              </button>
            </div>
            {importMode === 'replace' && (
              <p style={{ color: 'var(--negative)', fontSize: 13, fontWeight: 600 }}>
                This will permanently delete your current data before importing.
              </p>
            )}
            <div className="stack">
              <button className="btn" onClick={confirmImport}>
                Confirm Import
              </button>
              <button className="btn btn-secondary" onClick={() => setPendingImport(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClear && (
        <ConfirmDialog
          title="Clear all data?"
          message={`This permanently deletes all ${transactions.length} transactions, budgets, and settings from this device. This cannot be undone.`}
          confirmLabel="Delete Everything"
          danger
          onConfirm={handleClearAll}
          onCancel={() => setShowClear(false)}
        />
      )}
    </div>
  );
}
