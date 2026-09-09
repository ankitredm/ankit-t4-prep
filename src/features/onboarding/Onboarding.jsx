import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Welcome', 'Name', 'Age'];

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  function nextFromName(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setErr('What should we call you?');
      return;
    }
    setErr('');
    setStep(2);
  }

  async function finish(e) {
    e.preventDefault();
    const n = name.trim();
    const a = Number(age);
    if (!n) {
      setErr('What should we call you?');
      setStep(1);
      return;
    }
    if (!a || a < 13 || a > 120) {
      setErr('Enter an age between 13 and 120.');
      return;
    }
    setErr('');
    await onDone({ name: n, age: a });
    nav('/app');
  }

  return (
    <div className="onboard wizard">
      <div className="wizard-card page-in">
        <ol className="wizard-dots" aria-label="Setup progress">
          {STEPS.map((label, i) => (
            <li key={label} className={i <= step ? 'on' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="sr-only">{label}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="wizard-pane">
            <img
              src={`${import.meta.env.BASE_URL}brand/afterlight-logo.png`}
              alt="Afterlight"
              className="wizard-logo"
            />
            <p className="eyebrow center">Afterlight</p>
            <h1>Begin quietly.</h1>
            <p className="lede">
              Private, local-first interactive stories. Characters remember. The plot bends
              with your decisions.
            </p>
            <button className="btn wizard-cta" onClick={() => setStep(1)} autoFocus>
              Begin
            </button>
            <p className="micro">No email. No password. Everything stays on this device.</p>
          </div>
        )}

        {step === 1 && (
          <form className="wizard-pane" onSubmit={nextFromName}>
            <p className="eyebrow">First, a name</p>
            <h1>What should we call you?</h1>
            <label className="field">
              <span className="sr-only">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
                placeholder="Your name"
                maxLength={40}
                autoFocus
                enterKeyHint="next"
              />
            </label>
            {err && <p className="warn">{err}</p>}
            <button className="btn wizard-cta" type="submit">
              Continue
            </button>
            <button className="link-btn" type="button" onClick={() => { setErr(''); setStep(0); }}>
              ← Back
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="wizard-pane" onSubmit={finish}>
            <p className="eyebrow">Almost there{name.trim() ? `, ${name.trim()}` : ''}</p>
            <h1>How old are you?</h1>
            <label className="field">
              <span className="sr-only">Your age</span>
              <input
                type="number"
                min="13"
                max="120"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                autoFocus
                enterKeyHint="done"
              />
            </label>
            {err && <p className="warn">{err}</p>}
            <p className="lede">Stories shape themselves gently around your age.</p>
            <button className="btn wizard-cta" type="submit">
              Enter Afterlight
            </button>
            <button className="link-btn" type="button" onClick={() => { setErr(''); setStep(1); }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
