import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding({ onDone }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  return (
    <div className="onboard">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const n = name.trim();
          const a = Number(age);
          if (!n) {
            setErr('What should we call you?');
            return;
          }
          if (!a || a < 13 || a > 120) {
            setErr('Enter an age between 13 and 120.');
            return;
          }
          await onDone({ name: n, age: a });
          nav('/app');
        }}
      >
        <p className="brand">Afterlight</p>
        <h1>Begin quietly.</h1>
        <label>
          What should we call you?
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" required />
        </label>
        <label>
          How old are you?
          <input type="number" min="13" max="120" value={age} onChange={(e) => setAge(e.target.value)} required />
        </label>
        {err && <p className="warn">{err}</p>}
        <p className="lede">We keep this on your device. No email, no password.</p>
        <button className="btn" type="submit">Enter the city</button>
      </form>
    </div>
  );
}
