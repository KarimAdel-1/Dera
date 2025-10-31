// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title DeraMultiAssetStaking
 * @author Dera Protocol
 * @notice Multi-asset staking with dynamic APR rates and sustainability controls
 * @dev Supports HBAR, HTS tokens, and NFT staking with flexible lock periods
 *
 * KEY FEATURES:
 * - Dynamic APR rates based on TVL (Total Value Locked)
 * - Multiple lock periods (7, 30, 90, 180, 365 days)
 * - NFT staking with fixed daily rewards
 * - Reward pool sustainability checks
 * - Emergency unstaking with penalties
 * - Pausable for emergency situations
 *
 * DYNAMIC RATE MECHANISM:
 * - Low TVL → Higher APR (attract more stakers)
 * - High TVL → Lower APR (manage sustainability)
 * - Rates adjust automatically based on thresholds
 *
 * SUSTAINABILITY:
 * - Max reward pool utilization: 80%
 * - Emergency unstake penalty: 20%
 * - Reward pool must be funded before staking
 */
contract DeraMultiAssetStaking is ReentrancyGuard, Ownable, Pausable {
    /**
     * @notice Information about a user's stake
     * @param amount Amount of tokens staked (0 for NFTs)
     * @param lockPeriod Lock period in days
     * @param startTime Timestamp when stake was created
     * @param lastClaimTime Last time rewards were claimed
     * @param asset Asset address (address(0) for HBAR)
     * @param isNFT Whether this is an NFT stake
     * @param nftSerialNumber NFT serial number if isNFT is true
     * @param active Whether stake is currently active
     */
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

    /**
     * @notice Reward pool tracking
     * @param totalRewards Total rewards funded to the pool
     * @param distributedRewards Rewards already distributed or reserved
     * @param lastUpdateTime Last time pool was updated
     */
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
    
    event TokenStaked(address indexed user, address asset, uint256 amount, uint256 lockPeriod);
    event NFTStaked(address indexed user, address nftContract, uint256 serialNumber, uint256 lockPeriod);
    event Unstaked(address indexed user, uint256 stakeIndex, uint256 amount, uint256 rewards);
    event RewardsClaimed(address indexed user, uint256 stakeIndex, uint256 rewards);
    event RewardPoolFunded(uint256 amount);
    event RatesUpdated(uint256 tvl, uint256 multiplier);

    /**
     * @notice Initialize staking contract
     * @param _rewardToken Address of reward token (address(0) for HBAR)
     */
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

    /**
     * @notice Check if reward token is native HBAR
     * @return bool True if rewards are paid in HBAR
     */
    function isNativeReward() internal view returns (bool) {
        return rewardToken == address(0);
    }

    /**
     * @notice Fund reward pool with HBAR
     * @dev Only callable by owner, increases total rewards
     */
    function fundRewardPoolHBAR() external payable onlyOwner {
        require(msg.value > 0, "No HBAR sent");
        rewardPool.totalRewards += msg.value;
        rewardPool.lastUpdateTime = block.timestamp;
        emit RewardPoolFunded(msg.value);
    }

    /**
     * @notice Fund reward pool with ERC20/HTS tokens
     * @param amount Amount of tokens to fund
     * @dev Requires prior approval from owner
     */
    function fundRewardPoolToken(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(!isNativeReward(), "Reward token is native HBAR");
        // transferFrom requires owner to approve this contract beforehand
        IERC20(rewardToken).transferFrom(msg.sender, address(this), amount);
        rewardPool.totalRewards += amount;
        rewardPool.lastUpdateTime = block.timestamp;
        emit RewardPoolFunded(amount);
    }

    /**
     * @notice Calculate current dynamic rate multiplier based on TVL
     * @return uint256 Multiplier (50-150, where 100 = 1.0x)
     * @dev Higher TVL = lower multiplier, lower TVL = higher multiplier
     */
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

    /**
     * @notice Get effective APR for a lock period
     * @param lockPeriod Lock period in days
     * @return uint256 Effective APR in basis points (100 = 1%)
     * @dev Applies dynamic multiplier to base rate
     */
    function getEffectiveAPR(uint256 lockPeriod) public view returns (uint256) {
        uint256 baseRate = baseAPRRates[lockPeriod];
        require(baseRate > 0, "Unsupported lock period");
        
        uint256 multiplier = getCurrentRateMultiplier();
        return (baseRate * multiplier) / BASE_MULTIPLIER;
    }

    /**
     * @notice Check if reward pool can sustain a new stake
     * @param principal Amount to stake
     * @param lockPeriod Lock period in days
     * @return bool True if pool has sufficient rewards
     * @dev Prevents over-commitment of reward pool
     */
    function canSustainStake(uint256 principal, uint256 lockPeriod) public view returns (bool) {
        uint256 projectedRewards = calculateRewards(principal, lockPeriod, principal == 0);
        uint256 availableRewards = rewardPool.totalRewards > rewardPool.distributedRewards
            ? rewardPool.totalRewards - rewardPool.distributedRewards
            : 0;

        if (rewardPool.totalRewards == 0) {
            // If pool has no funds, it cannot sustain any stake that requires rewards
            return projectedRewards == 0;
        }

        uint256 projectedDistributed = rewardPool.distributedRewards + projectedRewards;
        uint256 projectedUtilization = (projectedDistributed * 10000) / rewardPool.totalRewards;

        return projectedUtilization <= maxRewardPoolUtilization && projectedRewards <= availableRewards;
    }

    /**
     * @notice Calculate total rewards for a stake
     * @param principal Amount staked
     * @param lockPeriod Lock period in days
     * @param isNFTStake Whether this is an NFT stake
     * @return uint256 Total rewards to be earned
     */
    function calculateRewards(uint256 principal, uint256 lockPeriod, bool isNFTStake) public view returns (uint256) {
        if (isNFTStake) {
            // lockPeriod is in days for NFTs
            return nftDailyReward * lockPeriod;
        }

        uint256 effectiveAPR = getEffectiveAPR(lockPeriod);
        // APR calculation using days: principal * APR * days / (365 * 10000)
        return (principal * effectiveAPR * lockPeriod) / (365 * 10000);
    }

    /**
     * @notice Stake HBAR with a lock period
     * @param lockPeriod Lock period in days (7, 30, 90, 180, or 365)
     * @dev Requires sufficient reward pool capacity
     */
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
        uint256 projectedRewards = calculateRewards(msg.value, lockPeriod, false);
        rewardPool.distributedRewards += projectedRewards;

        emit TokenStaked(msg.sender, address(0), msg.value, lockPeriod);
        emit RatesUpdated(totalValueLocked, getCurrentRateMultiplier());
    }

    /**
     * @notice Stake an NFT
     * @param nftContract Address of NFT contract
     * @param serialNumber NFT serial number
     * @param lockPeriod Lock period in days
     * @dev NFT must be approved for transfer first
     */
    function stakeNFT(address nftContract, uint256 serialNumber, uint256 lockPeriod) 
        external nonReentrant whenNotPaused {
        require(supportedAssets[nftContract], "Asset not supported");
        require(baseAPRRates[lockPeriod] > 0, "Invalid lock period");
        require(canSustainStake(0, lockPeriod), "Insufficient reward pool");

        // Transfer NFT to contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), serialNumber);

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
        uint256 projectedRewards = calculateRewards(0, lockPeriod, true);
        rewardPool.distributedRewards += projectedRewards;

        emit NFTStaked(msg.sender, nftContract, serialNumber, lockPeriod);
    }

    /**
     * @notice Calculate claimable rewards for a stake
     * @param user User address
     * @param stakeIndex Index of stake in user's stakes array
     * @return uint256 Amount of rewards claimable
     */
    function getClaimableRewards(address user, uint256 stakeIndex) public view returns (uint256) {
        require(stakeIndex < userStakes[user].length, "Invalid stake index");
        
        StakeInfo memory stake = userStakes[user][stakeIndex];
        if (!stake.active) return 0;

        uint256 timeStaked = block.timestamp - stake.lastClaimTime; // seconds
        if (timeStaked < 1) return 0;

        if (stake.isNFT) {
            // NFT reward is daily; compute days elapsed (floor)
            uint256 daysStaked = timeStaked / 1 days;
            return nftDailyReward * daysStaked;
        } else {
            // compute rewards fractionally: (principal * APR * seconds) / (365 days * 10000)
            uint256 effectiveAPR = getEffectiveAPR(stake.lockPeriod);
            return (stake.amount * effectiveAPR * timeStaked) / (365 days * 10000);
        }
    }

    /**
     * @notice Claim rewards without unstaking
     * @param stakeIndex Index of stake to claim from
     * @dev Updates lastClaimTime to current timestamp
     */
    function claimRewards(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stake = userStakes[msg.sender][stakeIndex];
        require(stake.active, "Stake not active");

        uint256 rewards = getClaimableRewards(msg.sender, stakeIndex);
        require(rewards > 0, "No rewards to claim");

        stake.lastClaimTime = block.timestamp;

        // decrease reserved distributedRewards by the paid amount
        if (rewardPool.distributedRewards >= rewards) {
            rewardPool.distributedRewards -= rewards;
        } else {
            rewardPool.distributedRewards = 0;
        }

        // Transfer rewards
        if (isNativeReward()) {
            // Payout HBAR
            payable(msg.sender).transfer(rewards);
        } else {
            // Payout ERC20/HTS token
            IERC20(rewardToken).transfer(msg.sender, rewards);
        }

        emit RewardsClaimed(msg.sender, stakeIndex, rewards);
    }

    /**
     * @notice Unstake and claim rewards
     * @param stakeIndex Index of stake to unstake
     * @dev Applies 20% penalty if unstaking before lock period expires
     */
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stake = userStakes[msg.sender][stakeIndex];
        require(stake.active, "Stake not active");

        bool isLockExpired = block.timestamp >= stake.startTime + (stake.lockPeriod * 1 days);
        uint256 rewards = getClaimableRewards(msg.sender, stakeIndex);

        // If not expired, apply emergency penalty to principal
        uint256 payoutPrincipal = stake.amount;
        if (!isLockExpired && payoutPrincipal > 0) {
            payoutPrincipal = (payoutPrincipal * (10000 - emergencyPenalty)) / 10000;
        }

        // mark inactive and adjust TVL
        stake.active = false;
        totalValueLocked = totalValueLocked >= stake.amount ? totalValueLocked - stake.amount : 0;
        if (totalActiveStakes > 0) totalActiveStakes--;

        // reduce reserved rewards
        if (rewardPool.distributedRewards >= rewards) {
            rewardPool.distributedRewards -= rewards;
        } else {
            rewardPool.distributedRewards = 0;
        }

        // Payout principal and rewards (HBAR or token)
        if (payoutPrincipal > 0) {
            payable(msg.sender).transfer(payoutPrincipal);
        }
        if (rewards > 0) {
            if (isNativeReward()) {
                payable(msg.sender).transfer(rewards);
            } else {
                IERC20(rewardToken).transfer(msg.sender, rewards);
            }
        }

        // Return NFT if applicable
        if (stake.isNFT) {
            IERC721(stake.asset).transferFrom(address(this), msg.sender, stake.nftSerialNumber);
        }

        emit Unstaked(msg.sender, stakeIndex, payoutPrincipal, rewards);
        emit RatesUpdated(totalValueLocked, getCurrentRateMultiplier());
    }

    /**
     * @notice Get all stakes for a user
     * @param user User address
     * @return StakeInfo[] Array of user's stakes
     */
    function getUserStakes(address user) external view returns (StakeInfo[] memory) {
        return userStakes[user];
    }

    /**
     * @notice Get reward pool status
     * @return totalRewards Total rewards funded
     * @return distributedRewards Rewards distributed or reserved
     * @return availableRewards Rewards still available
     * @return utilizationRate Pool utilization in basis points
     */
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

    /**
     * @notice Set whether an asset is supported for staking
     * @param asset Asset address
     * @param supported Whether asset is supported
     */
    function setSupportedAsset(address asset, bool supported) external onlyOwner {
        supportedAssets[asset] = supported;
    }

    /**
     * @notice Update base APR rate for a lock period
     * @param lockPeriod Lock period in days
     * @param newRate New APR in basis points (max 2000 = 20%)
     */
    function updateAPRRates(uint256 lockPeriod, uint256 newRate) external onlyOwner {
        require(newRate <= 2000, "Rate too high"); // Max 20% APR
        baseAPRRates[lockPeriod] = newRate;
    }

    /**
     * @notice Update TVL thresholds for dynamic rates
     * @param _lowThreshold Low TVL threshold
     * @param _highThreshold High TVL threshold
     */
    function updateTVLThresholds(uint256 _lowThreshold, uint256 _highThreshold) external onlyOwner {
        require(_lowThreshold < _highThreshold, "Invalid thresholds");
        lowTVLThreshold = _lowThreshold;
        highTVLThreshold = _highThreshold;
    }

    /**
     * @notice Update sustainability parameters
     * @param _maxUtilization Max reward pool utilization (max 9000 = 90%)
     * @param _penalty Emergency unstake penalty (max 5000 = 50%)
     */
    function updateSustainabilityLimits(uint256 _maxUtilization, uint256 _penalty) external onlyOwner {
        require(_maxUtilization <= 9000, "Max utilization too high"); // Max 90%
        require(_penalty <= 5000, "Penalty too high"); // Max 50%
        maxRewardPoolUtilization = _maxUtilization;
        emergencyPenalty = _penalty;
    }

    /**
     * @notice Pause staking operations
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause staking operations
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw all HBAR
     * @dev Only for emergency situations, use with caution
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @notice Accept HBAR deposits
     * @dev Allows contract to receive HBAR
     */
    receive() external payable {
        // Allow contract to receive HBAR for reward pool funding
    }

    /**
     * @notice Check reward accounting consistency
     * @return bool True if accounting is consistent
     */
    function checkRewardConsistency() external view returns (bool) {
        return rewardPool.totalRewards >= rewardPool.distributedRewards;
    }
}