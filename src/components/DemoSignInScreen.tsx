import { useState, type FormEvent } from "react";
import tdgLogoMark from "../assets/tdg_logo_mark.png";

type DemoSignInScreenProps = {
  loading: boolean;
  error: string;
  onSubmit: (userId: string, password: string) => Promise<void>;
};

export function DemoSignInScreen({ loading, error, onSubmit }: DemoSignInScreenProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(userId.trim(), password);
  }

  return (
    <div className="tdg-signin-page">
      <div className="tdg-signin-card tdg-card">
        <div className="tdg-signin-brand">
          <img className="tdg-logo-mark" src={tdgLogoMark} alt="" aria-hidden />
          <div>
            <h1 className="tdg-signin-title">Technical Diagram Generator</h1>
            <p className="tdg-signin-sub">Demo sign-in for local training use.</p>
          </div>
        </div>

        <form className="tdg-signin-form" onSubmit={handleSubmit}>
          <div className="tdg-field">
            <label htmlFor="demo-user-id" className="tdg-settings-label">
              Demo user ID
            </label>
            <input
              id="demo-user-id"
              className="tdg-input"
              type="text"
              autoComplete="username"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="tdg-field">
            <label htmlFor="demo-password" className="tdg-settings-label">
              Demo password
            </label>
            <input
              id="demo-password"
              className="tdg-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error ? (
            <p className="tdg-signin-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="tdg-generate tdg-signin-submit" disabled={loading || !userId.trim()}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
