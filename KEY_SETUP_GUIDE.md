# 🔑 Hedera Private Key Setup Guide

## Understanding Your Keys

You need **ONE private key** in **TWO different formats**:

### 1. HEDERA_OPERATOR_KEY (DER Format)
- **What:** Your Hedera private key in DER format
- **Where to get:** From Hedera Portal
- **Format:** Starts with `302e`
- **Length:** ~96 characters
- **Example:** `302e020100300506032b657004220420a1b2c3d4e5f6...`
- **Used by:** Hedera SDK (@hashgraph/sdk)

### 2. PRIVATE_KEY (Hex Format)
- **What:** The SAME key but in raw hex format
- **Where to get:** Extract from the DER key OR from Hedera Portal
- **Format:** 64 hex characters (can have `0x` prefix)
- **Length:** 64 characters (+ optional `0x` = 66 total)
- **Example:** `0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2`
- **Used by:** ethers.js for EVM operations

### 3. HEDERA_OPERATOR_ID
- **What:** Your Hedera account ID
- **Where to get:** From Hedera Portal
- **Format:** `0.0.xxxxx` (e.g., `0.0.1234567`)
- **Example:** `0.0.4716452`

---

## 📋 Step-by-Step: Getting Your Credentials

### Step 1: Create Hedera Testnet Account

1. Visit: **https://portal.hedera.com/**
2. Click **"Register"** or **"Sign Up"**
3. Choose **Testnet** (free)
4. Complete registration

### Step 2: Access Your Credentials

Once logged in to Hedera Portal:

1. Go to **"Testnet"** section
2. Look for **"Account Details"** or **"Credentials"**
3. You should see:
   - **Account ID**: `0.0.xxxxxxx`
   - **Private Key**: Starts with `302e...`

### Step 3: Extract the Hex Key

The **PRIVATE_KEY** (hex format) is embedded in your **HEDERA_OPERATOR_KEY** (DER format).

#### Method 1: Extract from DER Key

Your DER key looks like this:
```
302e020100300506032b657004220420[XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX]
```

The part in brackets `[...]` is your hex private key (64 characters).

**Example:**
```
DER key:
302e020100300506032b657004220420a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

Hex key (extract the last 64 characters):
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

Add 0x prefix:
0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

#### Method 2: Use Online Tool (CAUTION)

⚠️ **NEVER paste your real private key on random websites!**

For testnet ONLY (with throwaway keys), you can use:
- DER to Hex converters
- But again, **ONLY for testnet keys you plan to discard**

#### Method 3: Use Our Setup Wizard

The easiest and safest way:

```bash
npm run setup-env
```

The wizard will:
- Guide you through the process
- Help extract the hex key from your DER key
- Validate both formats
- Create your `.env` file automatically

---

## 📝 Example .env Configuration

Here's what your `contracts/.env` should look like:

```env
# Hedera Network Configuration
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
HEDERA_MAINNET_RPC=https://mainnet.hashio.io/api

# Private key for deployment (Hex format - 64 characters)
PRIVATE_KEY=0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

# Hedera Account IDs
HEDERA_OPERATOR_ID=0.0.1234567
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

# ... rest of the file ...
```

---

## 🎯 Quick Reference

| Variable | Format | Starts With | Length | Where to Get |
|----------|--------|-------------|---------|--------------|
| HEDERA_OPERATOR_ID | `0.0.xxxxx` | `0.0.` | ~10 chars | Hedera Portal |
| HEDERA_OPERATOR_KEY | DER | `302e` | ~96 chars | Hedera Portal |
| PRIVATE_KEY | Hex | `0x` | 66 chars (with 0x) | Extract from DER |

---

## 🔄 Converting DER to Hex (Manual Method)

If you want to do it manually:

### Step 1: Get your DER key from Hedera Portal
```
302e020100300506032b657004220420a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### Step 2: Find the hex key
The DER format has this structure:
```
302e020100300506032b65700422042[0][XXXXXXXX...64 chars...XXXXXXXX]
                                  ^^
                        This prefix + 64 hex chars
```

### Step 3: Extract the last 64 characters
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### Step 4: Add 0x prefix
```
0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

---

## 💡 Using the Setup Wizard (RECOMMENDED)

The easiest way to set this up correctly:

```bash
npm run setup-env
```

**What it does:**
1. ✅ Asks for your Hedera Account ID
2. ✅ Asks for your DER private key
3. ✅ Helps you extract/enter the hex key
4. ✅ Validates all formats
5. ✅ Creates the `.env` file correctly
6. ✅ Prevents common errors

**Example interaction:**
```
Enter your Hedera Account ID: 0.0.1234567
✅ Valid account ID

Enter your Hedera Private Key (DER): 302e020100...
✅ Valid Hedera private key

Enter your Private Key (hex): 0xa1b2c3d4...
✅ Valid private key

✅ SUCCESS! Your .env file has been created!
```

---

## 🆘 Troubleshooting

### Error: "private key too short"
- ❌ Your PRIVATE_KEY is not 64 hex characters
- ✅ Extract the last 64 characters from your DER key
- ✅ Add `0x` prefix

### Error: "Invalid account"
- ❌ Your HEDERA_OPERATOR_ID format is wrong
- ✅ Must be: `0.0.xxxxx` (example: `0.0.1234567`)

### Error: "Invalid credentials"
- ❌ Your keys don't match or are incorrect
- ✅ Re-copy from Hedera Portal
- ✅ Make sure you're using testnet keys (not mainnet)

### Can't find credentials in Hedera Portal?
1. Make sure you're logged into **Testnet** (not Mainnet)
2. Look for "Account Details" or "API Keys" section
3. You may need to "Create New Account" first

---

## 🔒 Security Best Practices

### ✅ DO:
- Use the setup wizard for validation
- Keep your private keys secure
- Never commit `.env` to git (it's in `.gitignore`)
- Use testnet keys for testing

### ❌ DON'T:
- Share your private keys with anyone
- Paste private keys on random websites
- Commit `.env` file to git
- Use mainnet keys for testing

---

## 📞 Still Stuck?

1. **Try the setup wizard first:**
   ```bash
   npm run setup-env
   ```

2. **Verify your setup:**
   ```bash
   npm run verify-setup
   ```

3. **Check these files:**
   - `JUDGE_QUICKSTART.md` - Step-by-step guide
   - `DEPLOYMENT_SCRIPTS_GUIDE.md` - All scripts explained
   - `README.md` - Complete documentation

---

## 🎯 Quick Start Summary

```bash
# Option 1: Use the wizard (EASIEST)
npm run setup-env

# Option 2: Manual
cp contracts/.env.example contracts/.env
nano contracts/.env
# Add your 3 credentials:
# - HEDERA_OPERATOR_ID (from portal)
# - HEDERA_OPERATOR_KEY (from portal)
# - PRIVATE_KEY (extract from DER key)

# Then verify
npm run verify-setup

# Then deploy
npm run deploy:hackathon
```

---

**Remember: You need ONE private key in TWO formats!** 🔑
