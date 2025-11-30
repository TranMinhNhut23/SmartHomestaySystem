#!/bin/bash
# Script setup quick cho dev

echo "🔧 Setting up development environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file first"
    exit 1
fi

# Check if USE_MONGO_TRANSACTIONS is set
if grep -q "USE_MONGO_TRANSACTIONS" .env; then
    echo "✅ USE_MONGO_TRANSACTIONS already configured"
else
    echo "📝 Adding USE_MONGO_TRANSACTIONS=false to .env..."
    echo "" >> .env
    echo "# Disable MongoDB transactions for standalone MongoDB (dev)" >> .env
    echo "USE_MONGO_TRANSACTIONS=false" >> .env
    echo "✅ Added!"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. npm start"
echo "2. Test deposit in app"
echo "3. Run: node check-wallet.js"


