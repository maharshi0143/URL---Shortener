import { useMemo, useState } from 'react';

const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

function ShortenerPage() {
  const [url, setUrl] = useState('');
  const [strategy, setStrategy] = useState('hash');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shortUrl, setShortUrl] = useState('');

  const payload = useMemo(() => {
    const body = {
      url,
      strategy
    };

    if (expiresAt) {
      body.expires_at = new Date(expiresAt).toISOString();
    }

    return body;
  }, [url, strategy, expiresAt]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setShortUrl('');

    try {
      const response = await fetch(`${baseUrl}/api/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to shorten URL');
      }

      setShortUrl(data.short_url);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card card-spotlight">
      <h2>Create a short URL</h2>
      <p className="muted">Choose your generation strategy and issue globally unique short links.</p>

      <form className="stack" onSubmit={handleSubmit}>
        <label>
          Long URL
          <input
            data-testid="url-input"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/very/long/path"
            required
          />
        </label>

        <label>
          Strategy
          <select
            data-testid="strategy-select"
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
          >
            <option value="hash">Hash</option>
            <option value="snowflake">Snowflake</option>
          </select>
        </label>

        <label>
          Expiration (optional)
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </label>

        <button data-testid="shorten-button" type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Shorten URL'}
        </button>
      </form>

      <div data-testid="result-display" className="result-panel">
        {shortUrl && (
          <p>
            Short URL: <a href={shortUrl}>{shortUrl}</a>
          </p>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
}

export default ShortenerPage;
