// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PriceOracle.sol";
import "./LendingPool.sol";

/**
 * @title BorrowingContract
 * @dev Manages collateral deposits, loan origination, repayments, and liquidations
 * @notice USD-pegged loans with HBAR disbursement and dynamic credit scoring
 *
 * Features:
 * - Dynamic collateral ratios based on iScore (130%-200%)
 * - Interest rates based on iScore (5%-12% APR)
 * - Real-time health factor calculation
 * - Automated liquidation triggers
 * - Integration with staking system via proxy accounts
 */
contract BorrowingContract is Ownable, ReentrancyGuard {
    PriceOracle public priceOracle;
    LendingPool public lendingPool;
    address public iScoreProvider;

    struct Loan {
        uint256 collateralAmount;      // HBAR collateral (8 decimals)
        uint256 borrowedAmountUSD;     // Borrowed amount in USD (8 decimals)
        uint256 borrowedAmountHBAR;    // Borrowed amount in HBAR (8 decimals)
        uint256 interestRate;          // Annual interest rate (scaled by 100)
        uint256 lastInterestUpdate;    // Timestamp of last interest calculation
        uint256 accruedInterest;       // Accrued interest in USD (8 decimals)
        uint256 iScore;                // User's credit score at loan creation
        address proxyAccountId;        // Hedera proxy account for staking
        bool active;                   // Loan status
        uint256 createdAt;             // Loan creation timestamp
    }

    mapping(address => Loan) public loans;
    mapping(address => bool) public hasActiveLoan;

    // Collateral ratios by iScore range (scaled by 100)
    uint256 public constant COLLATERAL_RATIO_0_300 = 200;   // 200%
    uint256 public constant COLLATERAL_RATIO_301_600 = 175; // 175%
    uint256 public constant COLLATERAL_RATIO_601_850 = 150; // 150%
    uint256 public constant COLLATERAL_RATIO_851_1000 = 130; // 130%

    // Interest rates by iScore range (APR, scaled by 100)
    uint256 public constant INTEREST_RATE_0_300 = 1200;    // 12%
    uint256 public constant INTEREST_RATE_301_600 = 900;   // 9%
    uint256 public constant INTEREST_RATE_601_850 = 700;   // 7%
    uint256 public constant INTEREST_RATE_851_1000 = 500;  // 5%

    // Utilization multipliers (scaled by 100)
    struct UtilizationMultiplier {
        uint256 threshold;
        uint256 multiplier;
    }
    UtilizationMultiplier[] public utilizationMultipliers;

    // Liquidation parameters
    uint256 public constant LIQUIDATION_THRESHOLD = 100; // Health factor < 1.0
    uint256 public constant LIQUIDATION_BONUS = 5;       // 5% bonus
    uint256 public constant COLLATERAL_BUFFER = 90;      // 90% of collateral value

    // Precision constants
    uint256 public constant PERCENTAGE_PRECISION = 100;
    uint256 public constant SCORE_PRECISION = 1;
    uint256 public constant PRICE_DECIMALS = 8;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    event CollateralDeposited(
        address indexed borrower,
        uint256 collateralAmount,
        uint256 iScore
    );
    event LoanCreated(
        address indexed borrower,
        uint256 borrowedUSD,
        uint256 borrowedHBAR,
        uint256 interestRate,
        uint256 iScore
    );
    event LoanRepaid(
        address indexed borrower,
        uint256 repaidAmount,
        uint256 interestPaid
    );
    event LoanLiquidated(
        address indexed borrower,
        address indexed liquidator,
        uint256 debtPaid,
        uint256 collateralSeized
    );
    event ProxyAccountCreated(
        address indexed borrower,
        address proxyAccountId
    );
    event IScoreProviderSet(address indexed provider);

    /**
     * @dev Constructor
     * @param _priceOracle Address of PriceOracle contract
     * @param _lendingPool Address of LendingPool contract
     * @param _iScoreProvider Address of iScore provider service
     */
    constructor(
        address _priceOracle,
        address payable _lendingPool,
        address _iScoreProvider
    ) Ownable(msg.sender) {
        require(_priceOracle != address(0), "Invalid price oracle");
        require(_lendingPool != address(0), "Invalid lending pool");
        require(_iScoreProvider != address(0), "Invalid iScore provider");

        priceOracle = PriceOracle(_priceOracle);
        lendingPool = LendingPool(_lendingPool);
        iScoreProvider = _iScoreProvider;

        // Initialize utilization multipliers
        utilizationMultipliers.push(UtilizationMultiplier(50, 100));  // <50%: 1.0x
        utilizationMultipliers.push(UtilizationMultiplier(70, 120));  // 50-70%: 1.2x
        utilizationMultipliers.push(UtilizationMultiplier(85, 150));  // 70-85%: 1.5x
        utilizationMultipliers.push(UtilizationMultiplier(95, 200));  // 85-95%: 2.0x
        utilizationMultipliers.push(UtilizationMultiplier(100, 300)); // >95%: 3.0x
    }

    /**
     * @dev Sets the iScore provider address
     * @param _iScoreProvider Address of iScore provider
     */
    function setIScoreProvider(address _iScoreProvider) external onlyOwner {
        require(_iScoreProvider != address(0), "Invalid iScore provider");
        iScoreProvider = _iScoreProvider;
        emit IScoreProviderSet(_iScoreProvider);
    }

    /**
     * @dev Deposit collateral and create a loan
     * @param borrowAmountUSD Amount to borrow in USD (8 decimals)
     * @param userIScore User's current iScore (0-1000)
     */
    function depositCollateralAndBorrow(
        uint256 borrowAmountUSD,
        uint256 userIScore
    ) external payable nonReentrant {
        require(!hasActiveLoan[msg.sender], "Active loan already exists");
        require(msg.value > 0, "Collateral required");
        require(borrowAmountUSD > 0, "Borrow amount must be positive");
        require(userIScore <= 1000, "Invalid iScore");

        // Get current HBAR price
        uint256 hbarPrice = priceOracle.getPrice();

        // Calculate collateral value in USD
        uint256 collateralValueUSD = (msg.value * hbarPrice) / (10 ** PRICE_DECIMALS);

        // Get required collateral ratio based on iScore
        uint256 requiredRatio = getCollateralRatio(userIScore);

        // Validate collateral sufficiency
        uint256 requiredCollateralUSD = (borrowAmountUSD * requiredRatio) / PERCENTAGE_PRECISION;
        require(
            collateralValueUSD >= requiredCollateralUSD,
            "Insufficient collateral"
        );

        // Calculate interest rate
        uint256 interestRate = getInterestRate(userIScore);

        // Calculate borrow amount in HBAR
        uint256 borrowAmountHBAR = priceOracle.usdToHbar(borrowAmountUSD);

        // Check lending pool has sufficient liquidity
        require(
            lendingPool.getTotalAvailableLiquidity() >= borrowAmountHBAR,
            "Insufficient pool liquidity"
        );

        // Create loan record
        loans[msg.sender] = Loan({
            collateralAmount: msg.value,
            borrowedAmountUSD: borrowAmountUSD,
            borrowedAmountHBAR: borrowAmountHBAR,
            interestRate: interestRate,
            lastInterestUpdate: block.timestamp,
            accruedInterest: 0,
            iScore: userIScore,
            proxyAccountId: address(0), // Set by backend
            active: true,
            createdAt: block.timestamp
        });

        hasActiveLoan[msg.sender] = true;

        emit CollateralDeposited(msg.sender, msg.value, userIScore);

        // Borrow from lending pool
        lendingPool.borrow(borrowAmountHBAR);

        // Transfer borrowed HBAR to user
        (bool success, ) = msg.sender.call{value: borrowAmountHBAR}("");
        require(success, "HBAR transfer failed");

        emit LoanCreated(
            msg.sender,
            borrowAmountUSD,
            borrowAmountHBAR,
            interestRate,
            userIScore
        );
    }

    /**
     * @dev Repay loan and retrieve collateral
     */
    function repay() external payable nonReentrant {
        require(hasActiveLoan[msg.sender], "No active loan");

        Loan storage loan = loans[msg.sender];
        require(loan.active, "Loan not active");

        // Update accrued interest
        _updateInterest(msg.sender);

        // Calculate total debt in USD
        uint256 totalDebtUSD = loan.borrowedAmountUSD + loan.accruedInterest;

        // Convert to HBAR
        uint256 totalDebtHBAR = priceOracle.usdToHbar(totalDebtUSD);

        require(msg.value >= totalDebtHBAR, "Insufficient repayment");

        // Mark loan as inactive
        loan.active = false;
        hasActiveLoan[msg.sender] = false;

        // Repay to lending pool
        lendingPool.repay{value: totalDebtHBAR}(totalDebtHBAR);

        // Emit event for backend to distribute rewards and return collateral
        emit LoanRepaid(msg.sender, totalDebtHBAR, loan.accruedInterest);

        // Return excess payment if any
        if (msg.value > totalDebtHBAR) {
            (bool success, ) = msg.sender.call{value: msg.value - totalDebtHBAR}("");
            require(success, "Excess refund failed");
        }
    }

    /**
     * @dev Liquidate an unhealthy loan
     * @param borrower Address of the borrower to liquidate
     */
    function liquidate(address borrower) external payable nonReentrant {
        require(hasActiveLoan[borrower], "No active loan");

        Loan storage loan = loans[borrower];
        require(loan.active, "Loan not active");

        // Update interest
        _updateInterest(borrower);

        // Calculate health factor
        uint256 healthFactor = calculateHealthFactor(borrower);
        require(healthFactor < LIQUIDATION_THRESHOLD, "Loan is healthy");

        // Calculate total debt in USD
        uint256 totalDebtUSD = loan.borrowedAmountUSD + loan.accruedInterest;

        // Convert debt to HBAR
        uint256 debtHBAR = priceOracle.usdToHbar(totalDebtUSD);

        require(msg.value >= debtHBAR, "Insufficient liquidation payment");

        // Calculate liquidation bonus (5% of collateral)
        uint256 bonusAmount = (loan.collateralAmount * LIQUIDATION_BONUS) / PERCENTAGE_PRECISION;

        // Mark loan as inactive
        loan.active = false;
        hasActiveLoan[borrower] = false;

        // Repay debt to lending pool
        lendingPool.repay{value: debtHBAR}(debtHBAR);

        // Emit event for backend to transfer collateral + bonus to liquidator
        emit LoanLiquidated(
            borrower,
            msg.sender,
            debtHBAR,
            loan.collateralAmount + bonusAmount
        );

        // Return excess payment if any
        if (msg.value > debtHBAR) {
            (bool success, ) = msg.sender.call{value: msg.value - debtHBAR}("");
            require(success, "Excess refund failed");
        }
    }

    /**
     * @dev Calculate health factor for a loan
     * @param borrower Address of the borrower
     * @return uint256 Health factor (scaled by 100, >100 is healthy)
     */
    function calculateHealthFactor(address borrower) public view returns (uint256) {
        Loan storage loan = loans[borrower];
        if (!loan.active) {
            return 0;
        }

        // Get current HBAR price
        uint256 hbarPrice = priceOracle.getPrice();

        // Calculate collateral value in USD
        uint256 collateralValueUSD = (loan.collateralAmount * hbarPrice) / (10 ** PRICE_DECIMALS);

        // Calculate total debt (principal + interest)
        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        uint256 interestAccrued = _calculateInterest(
            loan.borrowedAmountUSD,
            loan.interestRate,
            timeElapsed
        );
        uint256 totalDebtUSD = loan.borrowedAmountUSD + loan.accruedInterest + interestAccrued;

        if (totalDebtUSD == 0) {
            return type(uint256).max;
        }

        // Health Factor = (Collateral Value × 0.9) / Total Debt
        uint256 adjustedCollateral = (collateralValueUSD * COLLATERAL_BUFFER) / PERCENTAGE_PRECISION;
        uint256 healthFactor = (adjustedCollateral * PERCENTAGE_PRECISION) / totalDebtUSD;

        return healthFactor;
    }

    /**
     * @dev Get collateral ratio based on iScore
     * @param iScore User's credit score (0-1000)
     * @return uint256 Required collateral ratio (scaled by 100)
     */
    function getCollateralRatio(uint256 iScore) public pure returns (uint256) {
        if (iScore <= 300) {
            return COLLATERAL_RATIO_0_300;
        } else if (iScore <= 600) {
            return COLLATERAL_RATIO_301_600;
        } else if (iScore <= 850) {
            return COLLATERAL_RATIO_601_850;
        } else {
            return COLLATERAL_RATIO_851_1000;
        }
    }

    /**
     * @dev Get interest rate based on iScore
     * @param iScore User's credit score (0-1000)
     * @return uint256 Annual interest rate (scaled by 100)
     */
    function getInterestRate(uint256 iScore) public view returns (uint256) {
        uint256 baseRate;

        if (iScore <= 300) {
            baseRate = INTEREST_RATE_0_300;
        } else if (iScore <= 600) {
            baseRate = INTEREST_RATE_301_600;
        } else if (iScore <= 850) {
            baseRate = INTEREST_RATE_601_850;
        } else {
            baseRate = INTEREST_RATE_851_1000;
        }

        // Apply utilization multiplier
        uint256 utilization = _getPoolUtilization();
        uint256 multiplier = _getUtilizationMultiplier(utilization);

        return (baseRate * multiplier) / PERCENTAGE_PRECISION;
    }

    /**
     * @dev Get loan terms for a user based on iScore
     * @param userIScore User's credit score
     * @param borrowAmountUSD Desired borrow amount in USD
     * @return collateralRatio Required collateral ratio
     * @return interestRate Interest rate
     * @return maxBorrowUSD Maximum borrow amount in USD
     */
    function getLoanTerms(
        uint256 userIScore,
        uint256 borrowAmountUSD
    ) external view returns (
        uint256 collateralRatio,
        uint256 interestRate,
        uint256 maxBorrowUSD
    ) {
        collateralRatio = getCollateralRatio(userIScore);
        interestRate = getInterestRate(userIScore);

        // Calculate max borrow based on available liquidity
        uint256 availableLiquidityHBAR = lendingPool.getTotalAvailableLiquidity();
        maxBorrowUSD = priceOracle.hbarToUsd(availableLiquidityHBAR);

        return (collateralRatio, interestRate, maxBorrowUSD);
    }

    /**
     * @dev Update accrued interest for a loan
     * @param borrower Address of the borrower
     */
    function _updateInterest(address borrower) internal {
        Loan storage loan = loans[borrower];
        if (!loan.active) {
            return;
        }

        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        if (timeElapsed == 0) {
            return;
        }

        uint256 interest = _calculateInterest(
            loan.borrowedAmountUSD,
            loan.interestRate,
            timeElapsed
        );

        loan.accruedInterest += interest;
        loan.lastInterestUpdate = block.timestamp;
    }

    /**
     * @dev Calculate interest for a given amount and time period
     * @param principal Principal amount in USD
     * @param rate Annual interest rate (scaled by 100)
     * @param timeElapsed Time period in seconds
     * @return uint256 Interest amount in USD
     */
    function _calculateInterest(
        uint256 principal,
        uint256 rate,
        uint256 timeElapsed
    ) internal pure returns (uint256) {
        // Interest = Principal × Rate × Time / (100 × SecondsPerYear)
        return (principal * rate * timeElapsed) / (PERCENTAGE_PRECISION * SECONDS_PER_YEAR);
    }

    /**
     * @dev Get pool utilization rate
     * @return uint256 Utilization percentage (0-100)
     */
    function _getPoolUtilization() internal view returns (uint256) {
        (
            uint256 tier1Total,
            uint256 tier2Total,
            uint256 tier3Total,
            uint256 tier1Borrowed,
            uint256 tier2Borrowed,
            uint256 tier3Borrowed
        ) = lendingPool.getPoolStats();

        uint256 totalDeposits = tier1Total + tier2Total + tier3Total;
        if (totalDeposits == 0) {
            return 0;
        }

        uint256 totalBorrowed = tier1Borrowed + tier2Borrowed + tier3Borrowed;
        return (totalBorrowed * PERCENTAGE_PRECISION) / totalDeposits;
    }

    /**
     * @dev Get utilization multiplier based on pool utilization
     * @param utilization Current pool utilization (0-100)
     * @return uint256 Multiplier (scaled by 100)
     */
    function _getUtilizationMultiplier(uint256 utilization) internal view returns (uint256) {
        for (uint256 i = 0; i < utilizationMultipliers.length; i++) {
            if (utilization < utilizationMultipliers[i].threshold) {
                return utilizationMultipliers[i].multiplier;
            }
        }
        return utilizationMultipliers[utilizationMultipliers.length - 1].multiplier;
    }

    /**
     * @dev Set proxy account ID for a borrower (only callable by backend)
     * @param borrower Borrower address
     * @param proxyAccountId Hedera proxy account ID
     */
    function setProxyAccount(address borrower, address proxyAccountId) external {
        require(msg.sender == iScoreProvider, "Only iScore provider can set proxy account");
        require(hasActiveLoan[borrower], "No active loan");

        loans[borrower].proxyAccountId = proxyAccountId;
        emit ProxyAccountCreated(borrower, proxyAccountId);
    }

    /**
     * @dev Get loan details for a borrower
     * @param borrower Borrower address
     * @return Loan struct
     */
    function getLoan(address borrower) external view returns (Loan memory) {
        return loans[borrower];
    }

    /**
     * @dev Receive HBAR from lending pool
     */
    receive() external payable {}
}
