import React from 'react';

const APK =
  import.meta.env.VITE_APK_URL ||
  'https://github.com/ankitredm/ankit-t4-prep/releases/latest/download/Afterlight.apk';
const VERSION = '1.0.2';

const genres = ['Horror', 'Mystery', 'Thriller', 'Fantasy', 'Sci-fi', 'Drama', 'Comedy', 'Adventure', 'Romance', 'Supernatural', 'Historical', 'Superhero', 'Crime', 'Paranormal'];

export default function Landing() {
  return (
    <div className="landing">
      <header className="hero">
        <nav className="nav">
          <div className="brand">
            <img src={`${import.meta.env.BASE_URL}brand/afterlight-logo.png`} alt="" className="brand-mark" />
            Afterlight
          </div>
          <a className="btn" href={APK}>
            Download APK
          </a>
        </nav>
        <h1>Your Story. Your Choices. Your World.</h1>
        <p className="lede">
          Afterlight is a private, local-first interactive story studio. Characters remember what matters.
          The plot bends with your decisions. No account. No feed. Just the night you walk into.
        </p>
        <div className="cta-row">
          <a className="btn" href={APK}>
            Download APK
          </a>
          <a className="btn ghost" href="#features">
            Explore Features
          </a>
        </div>
        <p className="lede" style={{ marginTop: 16, fontSize: 13 }}>
          Android APK · version {VERSION}
        </p>
      </header>

      <section className="section" id="features">
        <h2>AI Interactive Stories</h2>
        <p className="lede">Stories answer what you actually do — not a menu of three buttons. Speak, hesitate, trust, or walk away. The narrative listens.</p>
      </section>

      <section className="section">
        <div className="grid-3">
          <article className="card">
            <h3>Characters That Remember</h3>
            <p className="lede">Promises, secrets, and the way you treated someone last night stay in a layered memory — recent talk, long-term moments, and structured story state.</p>
          </article>
          <article className="card">
            <h3>Your Choices Matter</h3>
            <p className="lede">Who you trust, which street you enter, which clue you keep — branches change relationships, discoveries, and endings.</p>
          </article>
          <article className="card">
            <h3>Generate Your Scene</h3>
            <p className="lede">Ask for an image of the current moment: place, weather, faces, clothing. Characters keep a visual profile so they stay recognizable.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>Choose Your Genre</h2>
        <div className="genre-pills">
          {genres.map((g) => (
            <span className="pill" key={g}>{g}</span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Character Consistency</h2>
        <p className="lede">Hair, eyes, coat, and bearing are stored with each person. Clothing can change with the scene; identity should not.</p>
      </section>

      <section className="section">
        <h2>Private & Local-First</h2>
        <p className="lede">This personal build keeps profile, stories, and keys on your device. No signup, no analytics, no public profile.</p>
      </section>

      <section className="section">
        <h2>Built for Immersion</h2>
        <p className="lede">A dark story-first chat: narration in quiet italics, dialogue in clear voice, your words in their own space. Technical meters stay out of the scene.</p>
        <div className="mock" aria-hidden="true" />
      </section>

      <footer className="footer">
        Afterlight is an original interactive-story product. Download APK uses the GitHub Release asset <code>Afterlight.apk</code> (override with <code>VITE_APK_URL</code>).
        <div style={{ marginTop: 16 }}>
          <a className="btn" href={APK}>Download APK</a>
        </div>
      </footer>
    </div>
  );
}
