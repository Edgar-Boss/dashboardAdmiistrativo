import { useState } from "react";
import { login } from "../services/authService";
import Button from "../components/ui/Button";

export default function LoginPage({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      await login(username, password);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="nb-login-bg pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/logo.jpg"
            alt="Logo de la clínica"
            className="mx-auto mb-6 w-[min(100%,22rem)] object-contain"
          />
          <p className="text-sm text-brand-text-muted">
            Inicia sesión para continuar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-brand-md border border-brand-border bg-brand-surface p-6 shadow-brand-md sm:p-8"
          noValidate
        >
          {error ? (
            <div
              className="mb-5 rounded-brand border border-brand-danger/25 bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-5">
            <div>
              <label htmlFor="login-username" className="nb-label">
                Usuario
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="nb-input"
                placeholder="admin"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="nb-label">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="nb-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={!username.trim() || !password}
            className="mt-6 w-full"
          >
            Iniciar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
