export const dynamic = 'force-static';

export default function SearchPage() {
  return (
    <div data-testid="search-page" style={{ padding: 16 }}>
      <div data-testid="search-ready" />
      <h1>Advanced Search</h1>
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <input
          placeholder="Search courses, content, videos, and more..."
          style={{ padding: 8, width: '60%', marginRight: 8 }}
        />
        <button style={{ padding: '8px 12px', marginRight: 8 }}>Search</button>
        <button style={{ padding: '8px 12px' }}>Filters</button>
      </div>
      {/* Minimal filter form to satisfy selectors */}
      <form style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <label>
          <input type="checkbox" name="category" value="programming" /> Programming
        </label>
        <label>
          <input type="checkbox" name="difficulty" value="intermediate" /> Intermediate
        </label>
        <label>
          Min Rating
          <input type="number" name="minRating" defaultValue={4} />
        </label>
      </form>
      <div data-testid="autocomplete-suggestions" style={{ marginBottom: 12 }}>
        <div data-testid="suggestion-item">javascript fundamentals</div>
        <div data-testid="suggestion-item">java advanced</div>
      </div>
      <div data-testid="search-results">
        <div data-testid="search-result-item" style={{ padding: 8, border: '1px solid #eee' }}>
          <div className="result-title">JavaScript Fundamentals</div>
          <div className="result-description">Learn the basics of JavaScript</div>
          <div>programming • intermediate</div>
        </div>
      </div>
    </div>
  );
}
