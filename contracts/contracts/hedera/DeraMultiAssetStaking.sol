// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract DeraMultiAssetStaking is ReentrancyGuard, Ownable, Pausable {
    
    struct StakeInfo {
        uint256 amount;
        uint256 lockPeriod; // in days
        uint256 startTime;
        uint256 lastClaimTime;
        address asset;
        bool isNFT;
        uint256 nftSerialNumber;
        bool active;
    }

    struct RewardPool {
        uint256 totalRewards;
        uint256 distributedRewards;
        uint256 lastUpdateTime;
    }

    // Standard APR rates (basis points: 100 = 1%)
    mapping(uint256 => uint256) public baseAPRRates;
    
    // Dynamic rate multipliers based on TVL
    uint256 public constant MIN_MULTIPLIER = 50; // 0.5x
    uint256 public constant MAX_MULTIPLIER = 150; // 1.5x
    uint256 public constant BASE_MULTIPLIER = 100; // 1.0x
    
    // TVL thresholds for dynamic rates
    uint256 public lowTVLThreshold = 100000 * 1e8; // 100k HBAR
    uint256 public highTVLThreshold = 1000000 * 1e8; // 1M HBAR
    
    // Sustainability limits
    uint256 public maxRewardPoolUtilization = 8000; // 80% max utilization
    uint256 public emergencyPenalty = 2000; // 20% penalty
    
    mapping(address => StakeInfo[]) public userStakes;
    mapping(address => bool) public supportedAssets;
    
    RewardPool public rewardPool;
    address public rewardToken;
    uint256 public totalValueLocked;
    uint256 public totalActiveStakes;
    
    // NFT fixed reward rate (HBAR per day)
    uint256 public nftDailyReward = 1 * 1e8; // 1 HBAR per day
    
    event Staked(address indexed user, address asset, uint256 amount, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 stakeIndex, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 stakeIndex, uint256 rewards);
    event RewardPoolFunded(uint256 amount);
    event RatesUpdated(uint256 tvl, uint256 multiplier);

    constructor(address _rewardToken) {
        rewardToken = _rewardToken;
        
        // Initialize standard APR rates (basis points)
        baseAPRRates[7] = 200;   // 2% APR for 7 days
        baseAPRRates[30] = 400;  // 4% APR for 30 days  
        baseAPRRates[90] = 700;  // 7% APR for 90 days
        baseAPRRates[180] = 1000; // 10% APR for 180 days
        baseAPRRates[365] = 1200; // 12% APR for 365 days
        
        rewardPool.lastUpdateTime = block.timestamp;
    }

    // Fund the reward pool
    function fundRewardPool() external payable onlyOwner {
        rewardPool.totalRewards += msg.value;
        rewardPool.lastUpdateTime = block.timestamp;
        emit RewardPoolFunded(msg.value);
    }

    // Calculate current dynamic rate multiplier based on TVL
    function getCurrentRateMultiplier() public view returns (uint256) {
        if (totalValueLocked <= lowTVLThreshold) {
            return MAX_MULTIPLIER; // Higher rates for low TVL to attract stakers
        } else if (totalValueLocked >= highTVLThreshold) {
            return MIN_MULTIPLIER; // Lower rates for high TVL to manage sustainability
        } else {
            // Linear interpolation between thresholds
            uint256 range = highTVLThreshold - lowTVLThreshold;
            uint256 position = totalValueLocked - lowTVLThreshold;
            uint256 multiplierRange = MAX_MULTIPLIER - MIN_MULTIPLIER;
            
            return MAX_MULTIPLIER - (position * multiplierRange / range);
        }
    }

    // Get effective APR for a lock period
    function getEffectiveAPR(uint256 lockPeriod) public view returns (uint256) {
        uint256 baseRate = baseAPRRates[lockPeriod];
        require(baseRate > 0, "Unsupported lock period");
        
        uint256 multiplier = getCurrentRateMultiplier();
        return (baseRate * multiplier) / BASE_MULTIPLIER;
    }

    // Check if reward pool can sustain new stake
    function canSustainStake(uint256 principal, uint256 lockPeriod) public view returns (bool) {
        uint256 projectedRewards = calculateRewards(principal, lockPeriod);
        uint256 availableRewards = rewardPool.totalRewards - rewardPool.distributedRewards;
        uint256 projectedUtilization = ((rewardPool.distributedRewards + projectedRewards) * 10000) / rewardPool.totalRewards;
        
        return projectedUtilization <= maxRewardPoolUtilization && projectedRewards <= availableRewards;
    }

    // Calculate rewards using APR
    function calculateRewards(uint256 principal, uint256 lockPeriod) public view returns (uint256) {
        uint256 effectiveAPR = getEffectiveAPR(lockPeriod);
        
        // For NFTs, use fixed daily rate
        if (principal == 0) {
            return nftDailyReward * lockPeriod;
        }
        
        // APR calculation: (principal * APR * days) / (365 * 10000)
        return (principal * effectiveAPR * lockPeriod) / (365 * 10000);
    }

    // Stake HBAR
    function stakeHBAR(uint256 lockPeriod) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Amount must be greater than 0");
        require(baseAPRRates[lockPeriod] > 0, "Invalid lock period");
        require(canSustainStake(msg.value, lockPeriod), "Insufficient reward pool");

        StakeInfo memory newStake = StakeInfo({
            amount: msg.value,
            lockPeriod: lockPeriod,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            asset: address(0), // HBAR
            isNFT: false,
            nftSerialNumber: 0,
            active: true
        });

        userStakes[msg.sender].push(newStake);
        totalValueLocked += msg.value;
        totalActiveStakes++;

        // Reserve rewards
        uint256 projectedRewards = calculateRewards(msg.value, lockPeriod);
        rewardPool.distributedRewards += projectedRewards;

        emit Staked(msg.sender, address(0), msg.value, lockPeriod);
        emit RatesUpdated(totalValueLocked, getCurrentRateMultiplier());
    }

    // Stake NFT
    function stakeNFT(address nftContract, uint256 serialNumber, uint256 lockPeriod) 
        external nonReentrant whenNotPaused {
        require(supportedAssets[nftContract], "Asset not supported");
        require(baseAPRRates[lockPeriod] > 0, "Invalid lock period");
        require(canSustainStake(0, lockPeriod), "Insufficient reward pool");

        // Transfer NFT to contract (implementation depends on NFT standard)
        // IERC721(nftContract).transferFrom(msg.sender, address(this), serialNumber);

        StakeInfo memory newStake = StakeInfo({
            amount: 0,
            lockPeriod: lockPeriod,
            startTime: block.timestamp,
            lastClaimTime: block.timestamp,
            asset: nftContract,
            isNFT: true,
            nftSerialNumber: serialNumber,
            active: true
        });

        userStakes[msg.sender].push(newStake);
        totalActiveStakes++;

        // Reserve NFT rewards
        uint256 projectedRewards = calculateRewards(0, lockPeriod);
        rewardPool.distributedRewards += projectedRewards;

        emit Staked(msg.sender, nftContract, serialNumber, lockPeriod);
    }

    // Calculate claimable rewards for a stake
    function getClaimableRewards(address user, uint256 stakeIndex) public view returns (uint256) {
        require(stakeIndex < userStakes[user].length, "Invalid stake index");
        
        StakeInfo memory stake = userStakes[user][stakeIndex];
        if (!stake.active) return 0;

        uint256 timeStaked = block.timestamp - stake.lastClaimTime;
        uint256 daysStaked = timeStaked / 86400; // Convert to days
        
        if (daysStaked == 0) return 0;

        if (stake.isNFT) {
            return nftDailyReward * daysStaked;
        } else {
            uint256 effectiveAPR = getEffectiveAPR(stake.lockPeriod);
            return (stake.amount * effectiveAPR * daysStaked) / (365 * 10000);
        }
    }

    // Claim rewards without unstaking
    function claimRewards(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stake = userStakes[msg.sender][stakeIndex];
        require(stake.active, "Stake not active");

        uint256 rewards = getClaimableRewards(msg.sender, stakeIndex);
        require(rewards > 0, "No rewards to claim");

        stake.lastClaimTime = block.timestamp;
        
        // Transfer rewards
        payable(msg.sender).transfer(rewards);

        emit RewardsClaimed(msg.sender, stakeIndex, rewards);
    }

    // Unstake with or without penalty
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stake = userStakes[msg.sender][stakeIndex];
        require(stake.active, "Stake not active");

        bool isLockExpired = block.timestamp >= stake.startTime + (stake.lockPeriod * 86400);
        uint256 principal = stake.amount;
        uint256 rewards = getClaimableRewards(msg.sender, stakeIndex);

        if (!isLockExpired) {
            // Apply emergency penalty to principal
            principal = (principal * (10000 - emergencyPenalty)) / 10000;
        }

        stake.active = false;
        totalValueLocked -= stake.amount;
        totalActiveStakes--;

        // Transfer principal and rewards
        if (principal > 0) {
            payable(msg.sender).transfer(principal);
        }
        if (rewards > 0) {
            payable(msg.sender).transfer(rewards);
        }

        // Return NFT if applicable
        if (stake.isNFT) {
            // IERC721(stake.asset).transferFrom(address(this), msg.sender, stake.nftSerialNumber);
        }

        emit Unstaked(msg.sender, stakeIndex, principal, rewards);
        emit RatesUpdated(totalValueLocked, getCurrentRateMultiplier());
    }

    // Get user's active stakes
    function getUserStakes(address user) external view returns (StakeInfo[] memory) {
        return userStakes[user];
    }

    // Get reward pool status
    function getRewardPoolStatus() external view returns (
        uint256 totalRewards,
        uint256 distributedRewards,
        uint256 availableRewards,
        uint256 utilizationRate
    ) {
        totalRewards = rewardPool.totalRewards;
        distributedRewards = rewardPool.distributedRewards;
        availableRewards = totalRewards - distributedRewards;
        utilizationRate = totalRewards > 0 ? (distributedRewards * 10000) / totalRewards : 0;
    }

    // Admin functions
    function setSupportedAsset(address asset, bool supported) external onlyOwner {
        supportedAssets[asset] = supported;
    }

    function updateAPRRates(uint256 lockPeriod, uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high"); // Max 20% APR
        baseAPRRates[lockPeriod] = newRate;
    }

    function updateTVLThresholds(uint256 _lowThreshold, uint256 _highThreshold) external onlyOwner {
        require(_lowThreshold < _highThreshold, "Invalid thresholds");
        lowTVLThreshold = _lowThreshold;
        highTVLThreshold = _highThreshold;
    }

    function updateSustainabilityLimits(uint256 _maxUtilization, uint256 _penalty) external onlyOwner {
        require(_maxUtilization <= 9000, "Max utilization too high"); // Max 90%
        require(_penalty <= 5000, "Penalty too high"); // Max 50%
        maxRewardPoolUtilization = _maxUtilization;
        emergencyPenalty = _penalty;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency withdraw (only owner)
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}