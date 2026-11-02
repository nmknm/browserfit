import { Download, Monitor, Moon, Sun, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { OsSelect } from '../components/layout/Layout';
import { Segmented } from '../components/ui/Controls';
import { checkBackup, clearAll, describe, flash, makeBackup, restore, summary, takeFlash } from '../lib/backup';
import { useDocTitle } from '../lib/hooks';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';

export default function Settings() {
  useDocTitle('Settings');
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  const [rows] = useState(summary);
  const [note] = useState(takeFlash);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const total = useMemo(() => rows.reduce((a, r) => a + r.count, 0), [rows]);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(makeBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `browserfit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    const checked = checkBackup(await file.text());
    if (!checked.ok) {
      setError('That file isn’t a Browserfit backup. Choose the .json file you exported from Settings.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    restore(checked.data);
    flash(`Backup restored: ${describe(summary()) || 'your settings'}.`);
    location.reload();
  };

  const clearData = () => {
    clearAll();
    flash('All saved data was cleared from this device.');
    location.reload();
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="lede">Your shortlist, quiz results and settings are saved on this device only. Export a backup to move them to another browser or device.</p>
        </div>
      </div>

      {note && (
        <p className="callout" role="status">
          {note}
        </p>
      )}

      <div className="settings">
        <section className="panel panel-pad settings__sec" aria-labelledby="look-h">
          <h2 id="look-h" className="h-sm">
            Appearance
          </h2>
          <div className="settings__row">
            <span>Theme</span>
            <Segmented<ThemePref>
              label="Theme"
              value={theme}
              onChange={(t) => {
                setThemePref(t);
                setTheme(t);
              }}
              options={[
                { value: 'system', label: 'System', icon: <Monitor aria-hidden /> },
                { value: 'light', label: 'Light', icon: <Sun aria-hidden /> },
                { value: 'dark', label: 'Dark', icon: <Moon aria-hidden /> },
              ]}
            />
          </div>
          <div className="settings__row">
            <span>Score browsers for</span>
            <OsSelect />
          </div>
        </section>

        <section className="panel panel-pad settings__sec" aria-labelledby="stored-h">
          <h2 id="stored-h" className="h-sm">
            Saved on this device
          </h2>
          {rows.length ? (
            <ul className="settings__list">
              {rows.map((r) => (
                <li key={r.label}>
                  <span className="tnum">{r.count}</span> {r.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing saved yet. Save a browser to your shortlist or take a quiz and it will show up here.</p>
          )}
          <div className="row">
            <button type="button" className="btn btn--primary" onClick={exportBackup}>
              <Download aria-hidden /> Export backup
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden /> Import backup
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-label="Choose a backup file" onChange={(e) => importBackup(e.target.files?.[0])} />
          </div>
          {error && (
            <p className="callout callout--warning" role="alert">
              {error}
            </p>
          )}
          <p className="small muted">A backup is one JSON file. Importing it replaces matching items on this device and reloads the page.</p>
        </section>

        <section className="panel panel-pad settings__sec settings__danger" aria-labelledby="clear-h">
          <h2 id="clear-h" className="h-sm">
            Clear saved data
          </h2>
          <p className="muted small">Remove everything this site has saved on this device. Export a backup first if you might want it back.</p>
          {!confirming ? (
            <div>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setConfirming(true);
                  window.setTimeout(() => confirmRef.current?.focus(), 0);
                }}
              >
                <Trash2 aria-hidden /> Clear data
              </button>
            </div>
          ) : (
            <div className="callout callout--warning settings__confirm" role="group" aria-labelledby="confirm-h">
              <h3 id="confirm-h" ref={confirmRef} tabIndex={-1} className="h-sm">
                Clear all saved data?
              </h3>
              <p>{total ? `This removes ${describe(rows)} from this device. You can’t undo this.` : 'There’s nothing saved, so this changes nothing.'}</p>
              <div className="row">
                <button type="button" className="btn btn--primary" onClick={clearData}>
                  Clear data
                </button>
                <button type="button" className="btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
