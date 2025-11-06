import { Header } from '@/components/layout/Header';

export default function Home() {
  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h1 className="text-4xl font-bold text-primary">ZMART v0.69</h1>
          <p className="text-gray-600 mt-2">Connect your wallet to get started!</p>
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            <p>✅ Wallet integration working</p>
            <p>✅ Balance display</p>
            <p>✅ Connection state management</p>
            <p>✅ Multi-wallet support (Phantom, Solflare, Torus)</p>
          </div>
        </div>
      </div>
    </>
  );
}
