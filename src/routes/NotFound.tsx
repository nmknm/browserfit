import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Empty } from '../components/ui/Controls';
import { useDocTitle } from '../lib/hooks';

export default function NotFound() {
  useDocTitle('Page not found');
  return (
    <div className="container page">
      <h1 className="sr-only">Page not found</h1>
      <Empty
        icon={<Compass />}
        title="This page doesn’t exist"
        action={
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn btn--primary">
              Go to the home page
            </Link>
            <Link to="/browsers" className="btn">
              Browse all browsers
            </Link>
          </div>
        }
      >
        The link may be old or mistyped. Search with Ctrl K, or start from one of these.
      </Empty>
    </div>
  );
}
