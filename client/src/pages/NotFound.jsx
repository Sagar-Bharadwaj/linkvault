import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p>There is nothing at this address.</p>
      <Link to="/">Back to your links</Link>
    </div>
  );
}
