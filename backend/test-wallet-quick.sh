#!/bin/bash
# Script test nhanh wallet

echo "🧪 Testing Wallet System..."
echo ""

echo "1️⃣ Checking wallet balance..."
node check-wallet.js

echo ""
echo "2️⃣ Testing IPN callback..."
node test-ipn.js

echo ""
echo "3️⃣ Checking wallet balance again..."
node check-wallet.js

echo ""
echo "✅ Test completed!"


