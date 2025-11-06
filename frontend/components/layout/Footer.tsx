export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-primary-400">ZMART v0.69</h3>
            <p className="text-gray-400 mt-2 text-sm">
              Decentralized prediction markets on Solana
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="/markets" className="hover:text-primary-400 transition-colors">
                  Markets
                </a>
              </li>
              <li>
                <a href="/portfolio" className="hover:text-primary-400 transition-colors">
                  Portfolio
                </a>
              </li>
              <li>
                <a href="/markets/create" className="hover:text-primary-400 transition-colors">
                  Create Market
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="/docs" className="hover:text-primary-400 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/zmart"
                  className="hover:text-primary-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/zmart"
                  className="hover:text-primary-400 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} ZMART. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
