// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./tokens/LPInstant.sol";
import "./tokens/LPWarm.sol";
import "./tokens/LPCold.sol";

/**
 * @title LendingPool
 * @dev Manages lender deposits across three liquidity tiers
 * @notice Three tiers with different liquidity characteristics and APYs
 *
 * Tier 1 (Instant): 30% lendable, 70% reserve, no lock
 * Tier 2 (Warm): 70% lendable, 30% reserve, 30-day notice
 * Tier 3 (Cold): 100% lendable, 0% reserve, 90-day lock
 */
contract LendingPool is Ownable, ReentrancyGuard {
    // LP Token contracts
    LPInstant public lpInstant;
    LPWarm public lpWarm;
    LPCold public lpCold;

    // Borrowing contract address
    address public borrowingContract;

    // Emergency pause state
    bool public paused;

    // Tier configurations
    struct TierConfig {
        uint256 lendablePercentage; // Percentage that can be lent out (0-100)
        uint256 reservePercentage;  // Percentage kept in reserve (0-100)
        uint256 lockPeriod;          // Lock period in seconds
        uint256 apyMultiplier;       // APY multiplier (1.0, 1.3, 1.7 scaled by 100)
    }

    mapping(uint8 => TierConfig) public tierConfigs;

    // Tier balances
    mapping(uint8 => uint256) public tierTotalDeposits;
    mapping(uint8 => uint256) public tierBorrowed;

    // Withdrawal requests for Tier 2 (30-day notice)
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestTime;
        bool fulfilled;
    }
    mapping(address => WithdrawalRequest) public tier2WithdrawalRequests;

    // Deposit lock tracking for Tier 3
    mapping(address => uint256) public tier3DepositTime;

    // Base lender rate (70% of borrower interest)
    uint256 public constant LENDER_RATE_PERCENTAGE = 70;
    // Staking bonus APY (~2%)
    uint256 public constant STAKING_BONUS_APY = 200; // 2.00% (scaled by 100)
    // Constants
    uint256 public constant PERCENTAGE_PRECISION = 100;
    uint256 public constant APY_PRECISION = 100;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    event Deposited(
        address indexed user,
        uint8 indexed tier,
        uint256 amount,
        uint256 lpTokens
    );
    event Withdrawn(
        address indexed user,
        uint8 indexed tier,
        uint256 amount,
        uint256 lpTokens
    );
    event WithdrawalRequested(
        address indexed user,
        uint256 amount,
        uint256 fulfillmentDate
    );
    event BorrowingContractSet(address indexed borrowingContract);
    event Borrowed(
        address indexed borrower,
        uint256 amount,
        uint256 fromTier1,
        uint256 fromTier2,
        uint256 fromTier3
    );
    event Repaid(
        address indexed borrower,
        uint256 amount,
        uint256 toTier1,
        uint256 toTier2,
        uint256 toTier3
    );
    event EmergencyPaused(address indexed pauser);
    event EmergencyUnpaused(address indexed unpauser);

    /**
     * @dev Constructor initializes the three LP token contracts
     * @param _lpInstant Address of LPInstant token
     * @param _lpWarm Address of LPWarm token
     * @param _lpCold Address of LPCold token
     */
    constructor(
        address _lpInstant,
        address _lpWarm,
        address _lpCold
    ) Ownable(msg.sender) {
        require(_lpInstant != address(0), "Invalid LP Instant address");
        require(_lpWarm != address(0), "Invalid LP Warm address");
        require(_lpCold != address(0), "Invalid LP Cold address");

        lpInstant = LPInstant(_lpInstant);
        lpWarm = LPWarm(_lpWarm);
        lpCold = LPCold(_lpCold);

        // Configure Tier 1 (Instant)
        tierConfigs[1] = TierConfig({
            lendablePercentage: 30,
            reservePercentage: 70,
            lockPeriod: 0,
            apyMultiplier: 100 // 1.0x
        });

        // Configure Tier 2 (Warm - 30 day notice)
        tierConfigs[2] = TierConfig({
            lendablePercentage: 70,
            reservePercentage: 30,
            lockPeriod: 30 days,
            apyMultiplier: 130 // 1.3x (base + 3% premium)
        });

        // Configure Tier 3 (Cold - 90 day lock)
        tierConfigs[3] = TierConfig({
            lendablePercentage: 100,
            reservePercentage: 0,
            lockPeriod: 90 days,
            apyMultiplier: 170 // 1.7x (base + 6% premium)
        });
    }

    /**
     * @dev Sets the borrowing contract address
     * @param _borrowingContract Address of the borrowing contract
     */
    function setBorrowingContract(address _borrowingContract) external onlyOwner {
        require(_borrowingContract != address(0), "Invalid borrowing contract");
        borrowingContract = _borrowingContract;
        emit BorrowingContractSet(_borrowingContract);
    }

    /**
     * @dev Pause all deposits, withdrawals, and borrows in emergency
     */
    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @dev Deposit HBAR into a specific tier
     * @param tier Tier to deposit into (1, 2, or 3)
     */
    function deposit(uint8 tier) external payable nonReentrant {
        require(!paused, "Contract is paused");
        require(tier >= 1 && tier <= 3, "Invalid tier");
        require(msg.value > 0, "Deposit amount must be positive");

        // Calculate LP tokens to mint (1:1 ratio initially)
        uint256 lpTokens = msg.value;

        // Update tier total deposits
        tierTotalDeposits[tier] += msg.value;

        // Mint LP tokens based on tier
        if (tier == 1) {
            lpInstant.mint(msg.sender, lpTokens);
        } else if (tier == 2) {
            lpWarm.mint(msg.sender, lpTokens);
        } else {
            lpCold.mint(msg.sender, lpTokens);
            tier3DepositTime[msg.sender] = block.timestamp;
        }

        emit Deposited(msg.sender, tier, msg.value, lpTokens);
    }

    /**
     * @dev Withdraw HBAR from a specific tier
     * @param tier Tier to withdraw from (1, 2, or 3)
     * @param lpTokenAmount Amount of LP tokens to burn
     */
    function withdraw(uint8 tier, uint256 lpTokenAmount) external nonReentrant {
        require(!paused, "Contract is paused");
        require(tier >= 1 && tier <= 3, "Invalid tier");
        require(lpTokenAmount > 0, "Amount must be positive");

        // Validate user has sufficient LP tokens
        uint256 userBalance;
        if (tier == 1) {
            userBalance = lpInstant.balanceOf(msg.sender);
        } else if (tier == 2) {
            userBalance = lpWarm.balanceOf(msg.sender);
        } else {
            userBalance = lpCold.balanceOf(msg.sender);
        }
        require(userBalance >= lpTokenAmount, "Insufficient LP tokens");

        // Check tier-specific constraints
        if (tier == 2) {
            // Tier 2: Check withdrawal request exists and is ready
            WithdrawalRequest storage request = tier2WithdrawalRequests[msg.sender];
            require(request.amount >= lpTokenAmount, "No withdrawal request or insufficient amount");
            require(
                block.timestamp >= request.requestTime + tierConfigs[2].lockPeriod,
                "Withdrawal notice period not met"
            );
            require(!request.fulfilled, "Withdrawal already fulfilled");
        } else if (tier == 3) {
            // Tier 3: Check lock period has passed
            require(
                block.timestamp >= tier3DepositTime[msg.sender] + tierConfigs[3].lockPeriod,
                "Lock period not met"
            );
        }

        // Calculate HBAR amount (1:1 ratio for now, can be updated for interest accrual)
        uint256 hbarAmount = lpTokenAmount;

        // Check available liquidity
        uint256 availableLiquidity = getAvailableLiquidity(tier);
        require(availableLiquidity >= hbarAmount, "Insufficient liquidity");

        // Burn LP tokens
        if (tier == 1) {
            lpInstant.burn(msg.sender, lpTokenAmount);
        } else if (tier == 2) {
            lpWarm.burn(msg.sender, lpTokenAmount);
            tier2WithdrawalRequests[msg.sender].fulfilled = true;
        } else {
            lpCold.burn(msg.sender, lpTokenAmount);
        }

        // Update tier total deposits
        tierTotalDeposits[tier] -= hbarAmount;

        // Transfer HBAR to user
        (bool success, ) = msg.sender.call{value: hbarAmount}("");
        require(success, "HBAR transfer failed");

        emit Withdrawn(msg.sender, tier, hbarAmount, lpTokenAmount);
    }

    /**
     * @dev Request withdrawal for Tier 2 (30-day notice)
     * @param amount Amount of LP tokens to withdraw
     */
    function requestWithdrawal(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(
            lpWarm.balanceOf(msg.sender) >= amount,
            "Insufficient LP tokens"
        );

        WithdrawalRequest storage request = tier2WithdrawalRequests[msg.sender];
        require(request.amount == 0 || request.fulfilled, "Existing request pending");

        tier2WithdrawalRequests[msg.sender] = WithdrawalRequest({
            amount: amount,
            requestTime: block.timestamp,
            fulfilled: false
        });

        uint256 fulfillmentDate = block.timestamp + tierConfigs[2].lockPeriod;
        emit WithdrawalRequested(msg.sender, amount, fulfillmentDate);
    }

    /**
     * @dev Get available liquidity for a tier
     * @param tier Tier to check (1, 2, or 3)
     * @return uint256 Available HBAR for withdrawal or lending
     */
    function getAvailableLiquidity(uint8 tier) public view returns (uint256) {
        require(tier >= 1 && tier <= 3, "Invalid tier");

        uint256 totalDeposits = tierTotalDeposits[tier];
        uint256 borrowed = tierBorrowed[tier];
        TierConfig memory config = tierConfigs[tier];

        // Available = (Total Deposits - Borrowed) capped by reserve requirements
        uint256 maxLendable = (totalDeposits * config.lendablePercentage) / PERCENTAGE_PRECISION;

        if (borrowed >= maxLendable) {
            return 0;
        }

        return maxLendable - borrowed;
    }

    /**
     * @dev Get total available liquidity across all tiers
     * @return uint256 Total HBAR available for new loans
     */
    function getTotalAvailableLiquidity() external view returns (uint256) {
        return getAvailableLiquidity(1) + getAvailableLiquidity(2) + getAvailableLiquidity(3);
    }

    /**
     * @dev Calculate APY for a tier
     * @param tier Tier to calculate APY for
     * @param baseRate Base interest rate from borrowing
     * @return uint256 APY percentage (scaled by 100)
     */
    function calculateAPY(uint8 tier, uint256 baseRate) public view returns (uint256) {
        require(tier >= 1 && tier <= 3, "Invalid tier");

        TierConfig memory config = tierConfigs[tier];

        // Base lender rate = borrower rate × utilization × 70%
        uint256 utilization = getUtilization(tier);
        uint256 lenderRate = (baseRate * utilization * LENDER_RATE_PERCENTAGE) /
                            (PERCENTAGE_PRECISION * PERCENTAGE_PRECISION);

        // Apply tier multiplier
        uint256 tierAdjustedRate = (lenderRate * config.apyMultiplier) / APY_PRECISION;

        // Add staking bonus
        uint256 finalAPY = tierAdjustedRate + STAKING_BONUS_APY;

        return finalAPY;
    }

    /**
     * @dev Get utilization rate for a tier
     * @param tier Tier to check
     * @return uint256 Utilization percentage (0-100)
     */
    function getUtilization(uint8 tier) public view returns (uint256) {
        require(tier >= 1 && tier <= 3, "Invalid tier");

        uint256 totalDeposits = tierTotalDeposits[tier];
        if (totalDeposits == 0) {
            return 0;
        }

        uint256 borrowed = tierBorrowed[tier];
        return (borrowed * PERCENTAGE_PRECISION) / totalDeposits;
    }

    /**
     * @dev Borrow HBAR from the pool (only callable by BorrowingContract)
     * @param amount Amount of HBAR to borrow
     */
    function borrow(uint256 amount) external nonReentrant {
        require(!paused, "Contract is paused");
        require(msg.sender == borrowingContract, "Only borrowing contract can borrow");
        require(amount > 0, "Borrow amount must be positive");

        // Borrow from tiers in order: 3 (Cold), 2 (Warm), 1 (Instant)
        uint256 remaining = amount;
        uint256 fromTier1 = 0;
        uint256 fromTier2 = 0;
        uint256 fromTier3 = 0;

        // Try Tier 3 first (most profitable for lenders)
        uint256 tier3Available = getAvailableLiquidity(3);
        if (remaining > 0 && tier3Available > 0) {
            fromTier3 = remaining > tier3Available ? tier3Available : remaining;
            tierBorrowed[3] += fromTier3;
            remaining -= fromTier3;
        }

        // Then Tier 2
        if (remaining > 0) {
            uint256 tier2Available = getAvailableLiquidity(2);
            if (tier2Available > 0) {
                fromTier2 = remaining > tier2Available ? tier2Available : remaining;
                tierBorrowed[2] += fromTier2;
                remaining -= fromTier2;
            }
        }

        // Finally Tier 1
        if (remaining > 0) {
            uint256 tier1Available = getAvailableLiquidity(1);
            require(tier1Available >= remaining, "Insufficient liquidity");
            fromTier1 = remaining;
            tierBorrowed[1] += remaining;
            remaining = 0;
        }

        require(remaining == 0, "Could not fulfill borrow request");

        emit Borrowed(borrowingContract, amount, fromTier1, fromTier2, fromTier3);

        // Transfer HBAR to borrowing contract
        (bool success, ) = borrowingContract.call{value: amount}("");
        require(success, "HBAR transfer failed");
    }

    /**
     * @dev Repay HBAR to the pool (only callable by BorrowingContract)
     * @param amount Amount of HBAR being repaid
     */
    function repay(uint256 amount) external payable nonReentrant {
        require(msg.sender == borrowingContract, "Only borrowing contract can repay");
        require(msg.value == amount, "Incorrect repayment amount");

        // Repay to tiers in reverse order: 1, 2, 3
        uint256 remaining = amount;
        uint256 toTier1 = 0;
        uint256 toTier2 = 0;
        uint256 toTier3 = 0;

        if (tierBorrowed[1] > 0) {
            toTier1 = remaining > tierBorrowed[1] ? tierBorrowed[1] : remaining;
            tierBorrowed[1] -= toTier1;
            remaining -= toTier1;
        }

        if (remaining > 0 && tierBorrowed[2] > 0) {
            toTier2 = remaining > tierBorrowed[2] ? tierBorrowed[2] : remaining;
            tierBorrowed[2] -= toTier2;
            remaining -= toTier2;
        }

        if (remaining > 0 && tierBorrowed[3] > 0) {
            toTier3 = remaining > tierBorrowed[3] ? tierBorrowed[3] : remaining;
            tierBorrowed[3] -= toTier3;
            remaining -= toTier3;
        }

        emit Repaid(borrowingContract, amount, toTier1, toTier2, toTier3);
    }

    /**
     * @dev Get pool statistics
     * @return tier1Total Total Tier 1 deposits
     * @return tier2Total Total Tier 2 deposits
     * @return tier3Total Total Tier 3 deposits
     * @return tier1Borrowed Tier 1 borrowed amount
     * @return tier2Borrowed Tier 2 borrowed amount
     * @return tier3Borrowed Tier 3 borrowed amount
     */
    function getPoolStats() external view returns (
        uint256 tier1Total,
        uint256 tier2Total,
        uint256 tier3Total,
        uint256 tier1Borrowed,
        uint256 tier2Borrowed,
        uint256 tier3Borrowed
    ) {
        return (
            tierTotalDeposits[1],
            tierTotalDeposits[2],
            tierTotalDeposits[3],
            tierBorrowed[1],
            tierBorrowed[2],
            tierBorrowed[3]
        );
    }

    /**
     * @dev Fallback to receive HBAR
     */
    receive() external payable {}
}
