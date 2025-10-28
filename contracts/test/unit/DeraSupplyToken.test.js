const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * Unit Tests for DeraSupplyToken.sol
 * Tests supply token (aToken equivalent) functionality
 */
describe("DeraSupplyToken Contract - Unit Tests", function () {
  async function deployTokenFixture() {
    const [owner, user1, user2, pool] = await ethers.getSigners();

    // Deploy DeraSupplyToken
    const DeraSupplyToken = await ethers.getContractFactory(
      "contracts/protocol/tokenization/DeraSupplyToken.sol:DeraSupplyToken"
    );

    // Note: DeraSupplyToken initialization requires Pool address
    // For unit tests, we use a mock or the pool signer address
    const supplyToken = await DeraSupplyToken.deploy(pool.address);

    await supplyToken.initialize(
      pool.address, // pool
      ethers.ZeroAddress, // treasury (not needed for basic tests)
      ethers.ZeroAddress, // underlying asset
      ethers.ZeroAddress, // incentives controller
      6, // decimals
      "Dera Supply USDC",
      "dUSDC",
      "0x00" // params
    );

    return { supplyToken, owner, user1, user2, pool };
  }

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { supplyToken } = await loadFixture(deployTokenFixture);
      expect(await supplyToken.name()).to.equal("Dera Supply USDC");
      expect(await supplyToken.symbol()).to.equal("dUSDC");
    });

    it("Should have correct decimals", async function () {
      const { supplyToken } = await loadFixture(deployTokenFixture);
      expect(await supplyToken.decimals()).to.equal(6);
    });
  });

  describe("Minting", function () {
    it("Should allow Pool to mint tokens", async function () {
      const { supplyToken, pool, user1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27); // 1.0 in RAY (27 decimals)

      // Only pool can mint
      await expect(
        supplyToken.connect(pool).mint(user1.address, user1.address, mintAmount, index)
      ).to.not.be.reverted;
    });

    it("Should revert when non-Pool tries to mint", async function () {
      const { supplyToken, user1 } = await loadFixture(deployTokenFixture);

      const mintAmount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      await expect(
        supplyToken.connect(user1).mint(user1.address, user1.address, mintAmount, index)
      ).to.be.revertedWithCustomError(supplyToken, "CallerMustBePool");
    });
  });

  describe("Burning", function () {
    it("Should allow Pool to burn tokens", async function () {
      const { supplyToken, pool, user1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      // First mint
      await supplyToken.connect(pool).mint(user1.address, user1.address, amount, index);

      // Then burn
      await expect(
        supplyToken.connect(pool).burn(user1.address, user1.address, amount, index)
      ).to.not.be.reverted;
    });

    it("Should revert when burning more than balance", async function () {
      const { supplyToken, pool, user1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      // Try to burn without minting first
      await expect(
        supplyToken.connect(pool).burn(user1.address, user1.address, amount, index)
      ).to.be.reverted;
    });
  });

  describe("Transfers", function () {
    it("Should allow transfers between users", async function () {
      const { supplyToken, pool, user1, user2 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      // Mint to user1
      await supplyToken.connect(pool).mint(user1.address, user1.address, amount, index);

      // Transfer to user2
      const transferAmount = ethers.parseUnits("500", 6);
      await expect(supplyToken.connect(user1).transfer(user2.address, transferAmount))
        .to.not.be.reverted;
    });

    it("Should update balances correctly after transfer", async function () {
      const { supplyToken, pool, user1, user2 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      await supplyToken.connect(pool).mint(user1.address, user1.address, amount, index);

      const transferAmount = ethers.parseUnits("500", 6);
      await supplyToken.connect(user1).transfer(user2.address, transferAmount);

      // Check balances (approximately, due to scaled balance calculations)
      const user1Balance = await supplyToken.balanceOf(user1.address);
      const user2Balance = await supplyToken.balanceOf(user2.address);

      expect(user1Balance).to.be.closeTo(
        ethers.parseUnits("500", 6),
        ethers.parseUnits("1", 6)
      );
      expect(user2Balance).to.be.closeTo(
        transferAmount,
        ethers.parseUnits("1", 6)
      );
    });
  });

  describe("Scaled Balance", function () {
    it("Should return correct scaled balance", async function () {
      const { supplyToken, pool, user1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      await supplyToken.connect(pool).mint(user1.address, user1.address, amount, index);

      const scaledBalance = await supplyToken.scaledBalanceOf(user1.address);
      expect(scaledBalance).to.be.gt(0);
    });

    it("Should calculate balance from scaled balance correctly", async function () {
      const { supplyToken, pool, user1 } = await loadFixture(deployTokenFixture);

      const amount = ethers.parseUnits("1000", 6);
      const index = ethers.parseUnits("1", 27);

      await supplyToken.connect(pool).mint(user1.address, user1.address, amount, index);

      const balance = await supplyToken.balanceOf(user1.address);
      expect(balance).to.be.closeTo(amount, ethers.parseUnits("1", 6));
    });
  });
});
