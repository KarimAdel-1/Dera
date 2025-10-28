// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeraDeploymentConfig
 * @author Dera Protocol
 * @notice Deployment configuration and setup helper for Dera Protocol
 *
 * PURPOSE:
 * Provides a single contract to coordinate deployment and configuration of all
 * Dera Protocol components including Phase 2 Hedera-exclusive features.
 *
 * DEPLOYMENT FLOW:
 * 1. Deploy core contracts (Pool, tokens, etc.)
 * 2. Deploy Phase 2 contracts (HCS, staking, analytics, rate model)
 * 3. Deploy DeraProtocolIntegration
 * 4. Deploy DeraDeploymentConfig (this contract)
 * 5. Call setupProtocol() to wire everything together
 *
 * CONFIGURATION STORED:
 * - All contract addresses
 * - HCS topic IDs
 * - Staking parameters
 * - Interest rate model parameters
 * - Admin addresses
 */
contract DeraDeploymentConfig {
  // ============ Core Protocol Addresses ============

  address public pool;
  address public poolConfigurator;
  address public addressesProvider;
  address public oracle;

  // ============ Phase 2 Integration Addresses ============

  address public hcsEventStreamer;
  address public nodeStakingContract;
  address public analyticsContract;
  address public interestRateModel;
  address public protocolIntegration;

  // ============ HCS Configuration ============

  struct HCSConfig {
    uint64 supplyTopicId;
    uint64 withdrawTopicId;
    uint64 borrowTopicId;
    uint64 repayTopicId;
    uint64 liquidationTopicId;
    uint64 configTopicId;
    uint64 governanceTopicId;
    uint64 analyticsTopicId;
  }

  HCSConfig public hcsConfig;

  // ============ Node Staking Configuration ============

  struct StakingConfig {
    uint64[] initialNodes;      // Initial nodes to stake with
    uint256[] initialAmounts;   // Initial amounts per node
    uint256 minStakeAmount;     // Minimum HBAR to stake
    uint256 rewardDistributionFrequency; // How often to distribute rewards
  }

  StakingConfig public stakingConfig;

  // ============ Interest Rate Model Configuration ============

  struct RateModelConfig {
    uint256 optimalUtilization;  // Optimal utilization rate
    uint256 baseRate;             // Base interest rate
    uint256 slope1;               // Rate slope below optimal
    uint256 slope2;               // Rate slope above optimal
    uint256 assetFactor;          // Protocol fee percentage
  }

  mapping(address => RateModelConfig) public assetRateConfigs;

  // ============ Admin & Roles ============

  address public admin;
  address public emergencyAdmin;
  address public hcsAdmin;
  address public stakingAdmin;

  // ============ Deployment Status ============

  bool public coreDeployed;
  bool public phase2Deployed;
  bool public integrationConfigured;
  bool public fullyInitialized;

  // ============ Events ============

  event CoreContractsSet(address pool, address configurator, address provider);
  event Phase2ContractsSet(address hcs, address staking, address analytics, address rates);
  event HCSTopicsConfigured(uint64 supplyTopic, uint64 borrowTopic, uint64 liquidationTopic);
  event ProtocolFullyInitialized(uint256 timestamp);

  error OnlyAdmin();
  error NotInitialized();
  error AlreadyInitialized();

  modifier onlyAdmin() {
    if (msg.sender != admin) revert OnlyAdmin();
    _;
  }

  constructor(address _admin) {
    admin = _admin;
  }

  // ============ Step 1: Set Core Contracts ============

  /**
   * @notice Set core protocol contract addresses
   * @dev Must be called first after deployment
   */
  function setCoreContracts(
    address _pool,
    address _poolConfigurator,
    address _addressesProvider,
    address _oracle
  ) external onlyAdmin {
    require(!coreDeployed, "Core already set");

    pool = _pool;
    poolConfigurator = _poolConfigurator;
    addressesProvider = _addressesProvider;
    oracle = _oracle;

    coreDeployed = true;

    emit CoreContractsSet(_pool, _poolConfigurator, _addressesProvider);
  }

  // ============ Step 2: Set Phase 2 Contracts ============

  /**
   * @notice Set Phase 2 Hedera-exclusive contract addresses
   */
  function setPhase2Contracts(
    address _hcsEventStreamer,
    address _nodeStaking,
    address _analytics,
    address _interestRateModel,
    address _protocolIntegration
  ) external onlyAdmin {
    require(coreDeployed, "Core not deployed");
    require(!phase2Deployed, "Phase 2 already set");

    hcsEventStreamer = _hcsEventStreamer;
    nodeStakingContract = _nodeStaking;
    analyticsContract = _analytics;
    interestRateModel = _interestRateModel;
    protocolIntegration = _protocolIntegration;

    phase2Deployed = true;

    emit Phase2ContractsSet(_hcsEventStreamer, _nodeStaking, _analytics, _interestRateModel);
  }

  // ============ Step 3: Configure HCS Topics ============

  /**
   * @notice Configure HCS topic IDs
   * @dev Topics must be created via Hedera SDK before calling this
   */
  function configureHCSTopics(
    uint64 _supplyTopic,
    uint64 _withdrawTopic,
    uint64 _borrowTopic,
    uint64 _repayTopic,
    uint64 _liquidationTopic,
    uint64 _configTopic,
    uint64 _governanceTopic,
    uint64 _analyticsTopic
  ) external onlyAdmin {
    hcsConfig = HCSConfig({
      supplyTopicId: _supplyTopic,
      withdrawTopicId: _withdrawTopic,
      borrowTopicId: _borrowTopic,
      repayTopicId: _repayTopic,
      liquidationTopicId: _liquidationTopic,
      configTopicId: _configTopic,
      governanceTopicId: _governanceTopic,
      analyticsTopicId: _analyticsTopic
    });

    emit HCSTopicsConfigured(_supplyTopic, _borrowTopic, _liquidationTopic);
  }

  // ============ Step 4: Configure Node Staking ============

  /**
   * @notice Configure initial node staking parameters
   */
  function configureNodeStaking(
    uint64[] calldata nodes,
    uint256[] calldata amounts,
    uint256 minStake,
    uint256 distributionFreq
  ) external onlyAdmin {
    require(nodes.length == amounts.length, "Length mismatch");

    stakingConfig = StakingConfig({
      initialNodes: nodes,
      initialAmounts: amounts,
      minStakeAmount: minStake,
      rewardDistributionFrequency: distributionFreq
    });
  }

  // ============ Step 5: Configure Interest Rate Models ============

  /**
   * @notice Set interest rate model configuration for an asset
   */
  function setAssetRateConfig(
    address asset,
    uint256 optimalUtil,
    uint256 baseRate,
    uint256 slope1,
    uint256 slope2,
    uint256 assetFactor
  ) external onlyAdmin {
    assetRateConfigs[asset] = RateModelConfig({
      optimalUtilization: optimalUtil,
      baseRate: baseRate,
      slope1: slope1,
      slope2: slope2,
      assetFactor: assetFactor
    });
  }

  // ============ Step 6: Initialize Full Protocol ============

  /**
   * @notice Wire all contracts together and initialize the protocol
   * @dev This is the final step after all configuration is complete
   */
  function initializeProtocol() external onlyAdmin {
    require(coreDeployed, "Core not deployed");
    require(phase2Deployed, "Phase 2 not deployed");
    require(!fullyInitialized, "Already initialized");

    // 1. Initialize HCS Event Streamer with topic IDs
    if (hcsEventStreamer != address(0)) {
      (bool success, ) = hcsEventStreamer.call(
        abi.encodeWithSignature(
          "initializeTopics(uint64,uint64,uint64,uint64,uint64,uint64,uint64)",
          hcsConfig.supplyTopicId,
          hcsConfig.withdrawTopicId,
          hcsConfig.borrowTopicId,
          hcsConfig.repayTopicId,
          hcsConfig.liquidationTopicId,
          hcsConfig.configTopicId,
          hcsConfig.governanceTopicId
        )
      );
      require(success, "HCS init failed");
    }

    // 2. Configure Protocol Integration
    if (protocolIntegration != address(0)) {
      // Set HCS streamer
      (bool success1, ) = protocolIntegration.call(
        abi.encodeWithSignature("setHCSEventStreamer(address)", hcsEventStreamer)
      );

      // Set node staking
      (bool success2, ) = protocolIntegration.call(
        abi.encodeWithSignature("setNodeStakingContract(address)", nodeStakingContract)
      );

      // Set analytics
      (bool success3, ) = protocolIntegration.call(
        abi.encodeWithSignature("setAnalyticsContract(address)", analyticsContract)
      );

      require(success1 && success2 && success3, "Integration config failed");
    }

    fullyInitialized = true;

    emit ProtocolFullyInitialized(block.timestamp);
  }

  // ============ Admin Functions ============

  /**
   * @notice Set admin addresses for different roles
   */
  function setAdmins(
    address _emergencyAdmin,
    address _hcsAdmin,
    address _stakingAdmin
  ) external onlyAdmin {
    emergencyAdmin = _emergencyAdmin;
    hcsAdmin = _hcsAdmin;
    stakingAdmin = _stakingAdmin;
  }

  // ============ View Functions ============

  /**
   * @notice Get all core contract addresses
   */
  function getCoreContracts() external view returns (
    address _pool,
    address _configurator,
    address _provider,
    address _oracle
  ) {
    return (pool, poolConfigurator, addressesProvider, oracle);
  }

  /**
   * @notice Get all Phase 2 contract addresses
   */
  function getPhase2Contracts() external view returns (
    address _hcs,
    address _staking,
    address _analytics,
    address _rates,
    address _integration
  ) {
    return (
      hcsEventStreamer,
      nodeStakingContract,
      analyticsContract,
      interestRateModel,
      protocolIntegration
    );
  }

  /**
   * @notice Get HCS configuration
   */
  function getHCSConfig() external view returns (HCSConfig memory) {
    return hcsConfig;
  }

  /**
   * @notice Get staking configuration
   */
  function getStakingConfig() external view returns (StakingConfig memory) {
    return stakingConfig;
  }

  /**
   * @notice Get interest rate configuration for an asset
   */
  function getAssetRateConfig(address asset) external view returns (RateModelConfig memory) {
    return assetRateConfigs[asset];
  }

  /**
   * @notice Check deployment status
   */
  function getDeploymentStatus() external view returns (
    bool _coreDeployed,
    bool _phase2Deployed,
    bool _integrationConfigured,
    bool _fullyInitialized
  ) {
    return (coreDeployed, phase2Deployed, integrationConfigured, fullyInitialized);
  }

  /**
   * @notice Transfer admin role
   */
  function transferAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "Invalid admin");
    admin = newAdmin;
  }
}
