import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface HashPackCleanupGuideProps {
  onClose: () => void;
}

const HashPackCleanupGuide: React.FC<HashPackCleanupGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connection Issue Detected</h2>
              <p className="text-sm text-gray-600">Old pairing sessions are causing errors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Why is this happening?</h3>
            <p className="text-sm text-yellow-800">
              You have <strong>old pairing sessions</strong> saved in your HashPack wallet from previous
              connection attempts. These old sessions have different encryption keys and are causing
              decryption errors.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              Clean Up HashPack Wallet
            </h3>
            <div className="ml-8 space-y-2 text-sm text-gray-700">
              <p>1. Open your <strong>HashPack wallet</strong></p>
              <p>2. Go to <strong>Settings</strong> → <strong>Connected dApps</strong> (or "Paired Connections")</p>
              <p>3. Look for all entries named <strong>"Dera Platform"</strong></p>
              <p className="pl-4 text-red-600 font-medium">
                → You likely have 2-3 entries with different topic IDs
              </p>
              <p>4. <strong>Disconnect/Remove ALL of them</strong> (click the disconnect or trash icon for each)</p>
              <p>5. Close HashPack wallet completely</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              Clear Browser Data
            </h3>
            <div className="ml-8 space-y-2 text-sm text-gray-700">
              <p className="font-medium">Choose one option:</p>
              <div className="pl-4 space-y-1">
                <p><strong>Option A (Easiest):</strong> Open this app in an <strong>Incognito/Private window</strong></p>
                <p><strong>Option B:</strong> Press F12 → Console → Run: <code className="bg-gray-100 px-2 py-1 rounded">localStorage.clear()</code> → Refresh page</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              Reconnect Your Wallet
            </h3>
            <div className="ml-8 space-y-2 text-sm text-gray-700">
              <p>1. Click <strong>"Connect Wallet"</strong> in Dera</p>
              <p>2. Select <strong>"HashPack"</strong></p>
              <p>3. In HashPack, select your account and click <strong>"Pair"</strong></p>
              <p className="text-green-600 font-medium">
                ✓ You should now see only ONE "Dera Platform" entry in HashPack
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">After Following These Steps:</h3>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
              <li>No more decryption errors</li>
              <li>Only ONE pairing session in HashPack</li>
              <li>Smooth wallet connections</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
            >
              I'll Do This Now
            </button>
            <button
              onClick={() => {
                window.open('https://www.hashpack.app/', '_blank');
              }}
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50"
            >
              Open HashPack Docs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HashPackCleanupGuide;
