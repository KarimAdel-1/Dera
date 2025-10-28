# Dera Protocol Test Suite

Comprehensive testing suite for Dera Protocol smart contracts on Hedera.

## Test Structure

```
test/
├── unit/                      # Unit tests for individual contracts
│   ├── Pool.test.js          # Pool contract tests
│   ├── DeraSupplyToken.test.js  # Supply token tests
│   ├── DeraBorrowToken.test.js  # Borrow token tests
│   ├── ValidationLogic.test.js  # Validation library tests
│   └── DeraOracle.test.js    # Oracle tests
├── integration/               # Integration tests for full flows
│   ├── SupplyBorrowRepay.test.js  # Main flow tests
│   ├── Liquidation.test.js   # Liquidation tests
│   └── InterestAccrual.test.js    # Interest calculation tests
├── mocks/                     # Mock contracts for testing
│   ├── MockERC20.sol         # Mock ERC20 token
│   ├── MockOracle.sol        # Mock price oracle
│   └── MockHederaPrecompiles.sol  # Mock Hedera system contracts
└── README.md                  # This file
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run with Coverage Report
```bash
npm run test:coverage
```

### Run with Gas Reporting
```bash
REPORT_GAS=true npm test
```

## Test Categories

### Unit Tests
- **Purpose**: Test individual contract functions in isolation
- **Scope**: Single contract, mocked dependencies
- **Speed**: Fast (< 1 second per test)
- **Coverage**: All public/external functions

### Integration Tests
- **Purpose**: Test complete user flows across multiple contracts
- **Scope**: Full protocol deployment, real interactions
- **Speed**: Slower (1-5 seconds per test)
- **Coverage**: Real-world scenarios

### Fuzz Tests
- **Purpose**: Test with random inputs to find edge cases
- **Scope**: Critical mathematical functions
- **Speed**: Slow (many iterations)
- **Coverage**: Edge cases, overflow/underflow

## Key Test Scenarios

### 1. Supply Flow
- User supplies assets to pool
- Receives supply tokens (dTokens)
- Balance updates correctly
- Interest accrues over time

### 2. Borrow Flow
- User supplies collateral
- Borrows against collateral
- Health factor validation
- Interest accrues on debt

### 3. Repay Flow
- User repays borrowed amount + interest
- Debt reduced correctly
- Can use type(uint256).max for full repayment
- Can repay on behalf of others

### 4. Withdraw Flow
- User withdraws supplied assets
- Burns supply tokens
- Validates sufficient balance
- Checks health factor if user has debt

### 5. Liquidation Flow
- Price drops causing health factor < 1.0
- Liquidator repays debt
- Liquidator receives collateral + bonus
- User's position updated
- Partial liquidation support

### 6. Interest Accrual
- Supply APY calculation
- Borrow APY calculation
- Index updates over time
- Compound interest
- Asset factor (protocol fee)

### 7. Oracle Integration
- Price fetching from Pyth
- Staleness checks
- Confidence validation
- Fallback mechanism

### 8. Access Control
- Admin functions restricted
- Emergency pause functionality
- Configurator permissions
- Pool-only minting/burning

## Writing New Tests

### Test Template
```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("MyContract", function () {
  async function deployFixture() {
    const [owner, user1] = await ethers.getSigners();
    const MyContract = await ethers.getContractFactory("MyContract");
    const contract = await MyContract.deploy();
    return { contract, owner, user1 };
  }

  it("Should do something", async function () {
    const { contract, user1 } = await loadFixture(deployFixture);
    await expect(contract.someFunction()).to.not.be.reverted;
  });
});
```

### Best Practices
1. **Use Fixtures**: Load fixtures for consistent test state
2. **Test Reverts**: Verify error conditions with `expect().to.be.revertedWith()`
3. **Test Events**: Verify events are emitted with correct parameters
4. **Test Edge Cases**: Zero amounts, max uint256, dust amounts
5. **Gas Optimization**: Measure gas costs for common operations
6. **Time Manipulation**: Use `time.increase()` for interest accrual tests

## Test Coverage Goals

- **Lines**: > 90%
- **Functions**: > 95%
- **Branches**: > 85%
- **Statements**: > 90%

## Continuous Integration

Tests automatically run on:
- Every pull request
- Before deployment to testnet
- Before deployment to mainnet

## Hedera-Specific Testing

### HTS Integration Tests
- Token association
- Token transfers via precompile
- HTS token creation

### HCS Integration Tests
- Event submission to HCS
- Topic creation
- Message verification

### Node Staking Tests
- Staking HBAR with nodes
- Reward calculation
- Dual yield distribution

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
**Solution**: Increase timeout in hardhat.config.js `mocha.timeout`

**Issue**: Out of gas errors
**Solution**: Increase gas limit in network config or optimize contracts

**Issue**: Mock contracts not found
**Solution**: Ensure mocks are in `test/mocks/` and paths are correct

**Issue**: Fixture state persists between tests
**Solution**: Use `loadFixture()` for isolated test state

## Contributing

When adding new features:
1. Write unit tests for new functions
2. Add integration tests for new flows
3. Update this README with new test descriptions
4. Ensure all tests pass before submitting PR
5. Maintain > 90% code coverage

## Resources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [Chai Assertion Library](https://www.chaijs.com/api/bdd/)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Hedera Documentation](https://docs.hedera.com/)
