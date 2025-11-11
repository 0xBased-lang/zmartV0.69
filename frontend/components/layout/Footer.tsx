export function Footer() {
  return (
    <footer className="bg-surface-background border-t border-border-default text-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-display font-bold text-brand-primary">ZMART v0.69</h3>
            <p className="text-text-tertiary mt-2 text-sm">
              Decentralized prediction markets on Solana
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3 text-text-primary">Quick Links</h4>
            <ul className="space-y-2 text-sm text-text-tertiary">
              <li>
                <a href="/markets" className="hover:text-brand-primary transition-colors">
                  Markets
                </a>
              </li>
              <li>
                <a href="/portfolio" className="hover:text-brand-primary transition-colors">
                  Portfolio
                </a>
              </li>
              <li>
                <a href="/markets/create" className="hover:text-brand-primary transition-colors">
                  Create Market
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-3 text-text-primary">Resources</h4>
            <ul className="space-y-2 text-sm text-text-tertiary">
              <li>
                <a href="/docs" className="hover:text-brand-primary transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/zmart"
                  className="hover:text-brand-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/zmart"
                  className="hover:text-brand-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border-subtle mt-8 pt-6 text-center text-sm text-text-tertiary">
          <p>&copy; {new Date().getFullYear()} ZMART. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
