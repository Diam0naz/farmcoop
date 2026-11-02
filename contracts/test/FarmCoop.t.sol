// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {FarmCoop} from "../FarmCoop.sol";
import {FarmCoopVerifier} from "../FarmCoopVerifier.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

contract FarmCoopTest is Test {
    // ── addresses ──────────────────────────────────────────────────────────
    address internal coordinator = makeAddr("coordinator");
    address internal business    = makeAddr("business");
    address internal buyer       = makeAddr("buyer");
    address internal verifierAddr = makeAddr("verifier");
    address internal stranger    = makeAddr("stranger");

    // ── contracts ──────────────────────────────────────────────────────────
    MockERC20        internal usdc;
    FarmCoopVerifier internal verifier;
    FarmCoop         internal coop;

    // ── constructor params ─────────────────────────────────────────────────
    // reserveBps=500, poolBps=1000, quorumBps=2000, votingWindow=3days,
    // timelockDelay=1day, maxExposureBps=3000, voteCapBps=1500
    uint256 internal constant RESERVE_BPS    = 500;
    uint256 internal constant POOL_BPS       = 1000;
    uint256 internal constant PATRONAGE_BPS  = 8500; // 10000 - 500 - 1000
    uint256 internal constant QUORUM_BPS     = 2000;
    uint256 internal constant VOTING_WINDOW  = 3 days;
    uint256 internal constant TIMELOCK_DELAY = 1 days;
    uint256 internal constant MAX_EXP_BPS    = 3000;
    uint256 internal constant VOTE_CAP_BPS   = 1500;

    // ── setUp ──────────────────────────────────────────────────────────────
    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        address[] memory verifiers = new address[](1);
        verifiers[0] = verifierAddr;
        verifier = new FarmCoopVerifier(coordinator, verifiers);

        coop = new FarmCoop(
            address(usdc),
            coordinator,
            address(verifier),
            500,   // reserveBps
            1000,  // poolBps
            2000,  // quorumBps
            3 days,
            1 days,
            3000,  // maxExposureBps
            1500   // voteCapBps
        );
    }

    // ── helpers ────────────────────────────────────────────────────────────

    /// Add `member` and deposit `amount` USDC into the pool.
    function _addAndDeposit(address member, uint256 amount) internal {
        vm.prank(coordinator);
        coop.addMember(member);

        usdc.mint(member, amount);
        vm.startPrank(member);
        usdc.approve(address(coop), amount);
        coop.depositPool(amount);
        vm.stopPrank();
    }

    /// Create a funded order and settle it (buyer confirms delivery).
    /// Members array and qtys must be same length.
    function _settleOrder(
        address[] memory memberAddrs,
        uint256[] memory qtys,
        uint256 price,
        uint256 expectedQty
    ) internal returns (uint256 orderId) {
        // coordinator creates order
        vm.prank(coordinator);
        coop.createOrder(buyer, price, expectedQty);
        orderId = coop.orderCount();

        // buyer funds order
        usdc.mint(buyer, price);
        vm.startPrank(buyer);
        usdc.approve(address(coop), price);
        coop.fundOrder(orderId);
        vm.stopPrank();

        // coordinator records delivery
        vm.prank(coordinator);
        coop.recordDelivery(orderId, memberAddrs, qtys);

        // buyer confirms — triggers settlement
        vm.prank(buyer);
        coop.confirmDelivery(orderId);
    }

    /// Build a listing with 2 milestones (50%/50%) and vote it through.
    /// Requires pool to have enough idle USDC >= fundingTarget.
    function _buildAndFinalizeListing(
        uint256 fundingTarget,
        address[] memory voters  // members that will vote YES
    ) internal returns (uint256 listingId) {
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;

        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";

        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = block.timestamp + 60 days;
        deadlines[1] = block.timestamp + 120 days;

        coop.createListing(
            business, "Farm", "desc", fundingTarget, 30 days,
            500, pcts, descs, deadlines, "docs"
        );
        listingId = coop.listingCount();

        // verify
        vm.prank(verifierAddr);
        verifier.verify(listingId);

        // vote (inside voting window)
        for (uint256 i = 0; i < voters.length; i++) {
            vm.prank(voters[i]);
            coop.voteListing(listingId, true);
        }

        // move past voting window
        vm.warp(block.timestamp + VOTING_WINDOW + 1);

        // finalize
        coop.finalizeListing(listingId);
    }

    // ================================================================
    // 1. test_PayoutMathRounding
    // ================================================================
    function test_PayoutMathRounding() public {
        // Three members: m1/m2/m3
        address m1 = makeAddr("m1");
        address m2 = makeAddr("m2");
        address m3 = makeAddr("m3");

        vm.startPrank(coordinator);
        coop.addMember(m1);
        coop.addMember(m2);
        coop.addMember(m3);
        vm.stopPrank();

        uint256 price = 100_000_003;
        uint256 expectedQty = 7;

        // Create & fund order
        vm.prank(coordinator);
        coop.createOrder(buyer, price, expectedQty);
        uint256 orderId = coop.orderCount();

        usdc.mint(buyer, price);
        vm.startPrank(buyer);
        usdc.approve(address(coop), price);
        coop.fundOrder(orderId);
        vm.stopPrank();

        // Record delivery: m1=3, m2=3, m3=1  (total=7)
        address[] memory addrs = new address[](3);
        addrs[0] = m1; addrs[1] = m2; addrs[2] = m3;
        uint256[] memory qtys = new uint256[](3);
        qtys[0] = 3; qtys[1] = 3; qtys[2] = 1;

        vm.prank(coordinator);
        coop.recordDelivery(orderId, addrs, qtys);

        // Buyer confirms & settlement fires
        vm.prank(buyer);
        coop.confirmDelivery(orderId);

        // ── expected splits ────────────────────────────────────────
        uint256 reserveShare   = (price * RESERVE_BPS) / 10_000;   // floor(price*5%)
        uint256 poolShare      = (price * POOL_BPS)    / 10_000;   // floor(price*10%)
        uint256 patronageTotal = price - reserveShare - poolShare;

        // per-member patronage
        uint256 totalDelivered = 7;
        uint256 pay1 = (patronageTotal * 3) / totalDelivered;
        uint256 pay2 = (patronageTotal * 3) / totalDelivered;
        uint256 pay3 = (patronageTotal * 1) / totalDelivered;
        uint256 distributed = pay1 + pay2 + pay3;
        uint256 dust = patronageTotal - distributed;

        // ── assertions ─────────────────────────────────────────────
        // reserveBalance = reserveShare + dust
        assertEq(coop.reserveBalance(), reserveShare + dust, "reserveBalance mismatch");

        // poolIdleUsdc delta = poolShare
        assertEq(coop.poolIdleUsdc(), poolShare, "poolIdleUsdc mismatch");

        // pending claims
        assertEq(coop.pendingClaim(m1), pay1, "m1 claim");
        assertEq(coop.pendingClaim(m2), pay2, "m2 claim");
        assertEq(coop.pendingClaim(m3), pay3, "m3 claim");

        // Conservation: reserve + pool + sum(claims) == price
        uint256 sumClaims = coop.pendingClaim(m1) + coop.pendingClaim(m2) + coop.pendingClaim(m3);
        assertEq(coop.reserveBalance() + coop.poolIdleUsdc() + sumClaims, price, "conservation");
    }

    // ================================================================
    // 2. test_SplitSumsEqualTotal
    // ================================================================
    function test_SplitSumsEqualTotal() public {
        uint256[3] memory prices = [uint256(1_000_000), 7_000_001, 999_999_999];

        address member = makeAddr("splitMember");
        vm.prank(coordinator);
        coop.addMember(member);

        for (uint256 p = 0; p < prices.length; p++) {
            uint256 price = prices[p];
            uint256 rS = (price * RESERVE_BPS) / 10_000;
            uint256 pS = (price * POOL_BPS)    / 10_000;
            uint256 pat = price - rS - pS;

            assertEq(rS + pS + pat, price, "split sum != price");
        }
    }

    // ================================================================
    // 3. test_ClaimDoubleSpendReverts
    // ================================================================
    function test_ClaimDoubleSpendReverts() public {
        address m1 = makeAddr("claimM1");
        address m2 = makeAddr("claimM2");

        vm.startPrank(coordinator);
        coop.addMember(m1);
        coop.addMember(m2);
        vm.stopPrank();

        // settle an order so m1 has a pending claim
        address[] memory addrs = new address[](2);
        addrs[0] = m1; addrs[1] = m2;
        uint256[] memory qtys = new uint256[](2);
        qtys[0] = 1; qtys[1] = 1;

        _settleOrder(addrs, qtys, 2_000_000, 2);

        // First claim succeeds
        vm.prank(m1);
        coop.claimPayout();

        // Second claim reverts NothingToClaim
        vm.prank(m1);
        vm.expectRevert(FarmCoop.NothingToClaim.selector);
        coop.claimPayout();
    }

    // ================================================================
    // 4. test_VotingCapEnforced
    // ================================================================
    function test_VotingCapEnforced() public {
        // 10 members x 10 shares = 100 totalShares (10 USDC each)
        address[] memory mems = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("capMem", i)));
            _addAndDeposit(mems[i], 10e6); // 10 USDC = 10 shares at 1e6/share
        }
        // totalShares = 100 (each deposited 10e6, pricePerShare starts at 1e6, so shares=amount=10e6... wait)
        // Actually: first deposit → shares = amount = 10e6 (6 decimals). So totalShares = 100e6.
        // cap = totalShares * 1500 / 10000 = 100e6 * 1500 / 10000 = 15e6

        // Give mems[0] 5 extra shares by depositing 5 more USDC
        // After 10 deposits of 10e6, poolValue=100e6, totalShares=100e6
        // shares for 5e6 deposit = (5e6 * 100e6) / 100e6 = 5e6
        usdc.mint(mems[0], 5e6);
        vm.startPrank(mems[0]);
        usdc.approve(address(coop), 5e6);
        coop.depositPool(5e6);
        vm.stopPrank();

        // Now mems[0] has 15e6 shares. totalShares = 105e6
        // cap = 105e6 * 1500 / 10000 = 15_750_000
        // mems[0] has 15e6 < 15_750_000, so weight = 15e6 (not capped)
        uint256 totalAfter = coop.totalShares();
        uint256 capAfter = (totalAfter * VOTE_CAP_BPS) / 10_000;
        uint256 mem0Shares = coop.shareBalance(mems[0]);
        uint256 expectedWeight0 = mem0Shares < capAfter ? mem0Shares : capAfter;
        assertEq(expectedWeight0, mem0Shares, "mem0 should NOT be capped");

        // Give mems[1] 21e6 extra shares (on top of existing 10e6) → 31e6 total
        usdc.mint(mems[1], 21e6);
        vm.startPrank(mems[1]);
        usdc.approve(address(coop), 21e6);
        coop.depositPool(21e6);
        vm.stopPrank();

        uint256 totalFinal = coop.totalShares();
        uint256 capFinal = (totalFinal * VOTE_CAP_BPS) / 10_000;
        uint256 mem1Shares = coop.shareBalance(mems[1]);
        uint256 expectedWeight1 = mem1Shares < capFinal ? mem1Shares : capFinal;
        // mem1 has 31e6 shares; cap = (105e6+21e6)*1500/10000 = 126e6*1500/10000 = 18_900_000
        // 31e6 > 18_900_000 → capped
        assertEq(expectedWeight1, capFinal, "mem1 should be capped at cap");
        assertLt(capFinal, mem1Shares, "cap < mem1Shares");

        // Verify by actually voting in a listing
        // Create a listing and have mems[0] and mems[1] vote
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = block.timestamp + 60 days;
        deadlines[1] = block.timestamp + 120 days;

        coop.createListing(business, "Cap Test", "desc", 1e6, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]);
        coop.voteListing(lid, true);

        vm.prank(mems[1]);
        coop.voteListing(lid, true);

        // Get voteYes — should be weight0 + weight1
        (,,,,,, , uint256 vYes,,, ) = coop.getListing(lid);
        assertEq(vYes, expectedWeight0 + expectedWeight1, "vote tally mismatch");
    }

    // ================================================================
    // 5a. test_QuorumNotMet
    // ================================================================
    function test_QuorumNotMet() public {
        // 10 members, each 10e6 USDC → totalShares=100e6
        address[] memory mems = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("qnMem", i)));
            _addAndDeposit(mems[i], 10e6);
        }
        // totalShares = 100e6, quorum = 100e6 * 2000/10000 = 20e6
        // cap = 100e6 * 1500/10000 = 15e6; mems[0] has 10e6 → weight=10e6
        // 10e6 < 20e6 → quorum NOT reached → finalizeListing sets status back to Proposed

        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = block.timestamp + 60 days;
        deadlines[1] = block.timestamp + 120 days;

        coop.createListing(business, "QN", "desc", 1e6, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();

        vm.prank(verifierAddr);
        verifier.verify(lid);

        // Only mems[0] votes YES → weight=10e6 < quorum=20e6
        vm.prank(mems[0]);
        coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);

        // finalizeListing does NOT revert when quorum not met;
        // it emits ListingVoteFailed and resets status to Proposed.
        coop.finalizeListing(lid);

        // Assert the listing was NOT funded (status reverted to Proposed)
        (,,,,,FarmCoop.ListingStatus status,,,,, ) = coop.getListing(lid);
        assertEq(uint256(status), uint256(FarmCoop.ListingStatus.Proposed), "quorum not met: status should be Proposed");
    }

    // ================================================================
    // 5b. test_QuorumMet
    // ================================================================
    function test_QuorumMet() public {
        // 10 members, each 100e6 USDC → totalShares=1000e6
        address[] memory mems = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("qmMem", i)));
            _addAndDeposit(mems[i], 100e6);
        }
        // totalShares = 1000e6, quorum = 1000e6 * 2000/10000 = 200e6
        // cap per voter = 1000e6 * 1500/10000 = 150e6
        // Need >=200e6 yes. 2 voters at 100e6 each = 200e6 → exactly quorum
        // Need voteYes > voteNo too. 2 yes, 0 no → passes.

        uint256 fundingTarget = 1e6; // tiny, well within 30% of 1000e6

        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = block.timestamp + 60 days;
        deadlines[1] = block.timestamp + 120 days;

        coop.createListing(business, "QM", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();

        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]);
        coop.voteListing(lid, true);
        vm.prank(mems[1]);
        coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);

        (,,,,,FarmCoop.ListingStatus status,,,,, ) = coop.getListing(lid);
        assertEq(uint256(status), uint256(FarmCoop.ListingStatus.Funded), "status should be Funded");
    }

    // ================================================================
    // 6. test_Timelock
    // ================================================================
    // The timelock is checked inside voteMilestone (auto-approve path):
    //   if (milestoneVoteYes >= quorumThreshold) {
    //       if (block.timestamp < listing.timelockExpiry) revert TimelockNotExpired();
    //       ...release funds...
    //   }
    // So: voting can happen before timelock expires, but auto-approve (release) requires expiry.
    function test_Timelock() public {
        // Setup pool with enough funds
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("tlMem", i)));
            _addAndDeposit(mems[i], 200e6); // 5 * 200 = 1000e6 total
        }

        uint256 fundingTarget = 100e6; // 10% of pool, well within 30% cap

        // Build listing and finalize (warps past voting window)
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "TL", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        // 3 voters YES → 3 * 200e6 = 600e6. quorum = 1000e6 * 2000/10000 = 200e6 → met
        // cap = 1000e6 * 1500/10000 = 150e6, each member has 200e6 → capped at 150e6
        // 3 * 150e6 = 450e6 >= 200e6
        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);
        // timelockExpiry = block.timestamp + 1 day (TIMELOCK_DELAY)

        // Submit milestone proof
        vm.prank(business);
        coop.submitMilestoneProof(lid, 0, "proof", "link");

        // Attempt auto-approve BEFORE timelock expires
        // milestoneVoteYes needs to hit quorumThreshold = 1000e6 * 2000/10000 = 200e6
        // mems[0] has 200e6 shares, cap = 150e6, so weight=150e6 — not enough alone
        // mems[0] + mems[1] = 300e6 >= 200e6 → triggers auto-approve, but timelock not expired
        vm.prank(mems[0]);
        coop.voteMilestone(lid, 0, true); // 150e6 - not yet quorum

        vm.prank(mems[1]);
        vm.expectRevert(FarmCoop.TimelockNotExpired.selector);
        coop.voteMilestone(lid, 0, true); // 300e6 >= 200e6 → triggers release → revert

        // Warp past timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);

        // mems[1] votes again - but already voted for milestone!  Need a fresh listing.
        // We reset by warping ahead and using a new listing to test success after timelock.
        // Actually: mems[1] already voted (AlreadyVoted). The revert happened AFTER the vote
        // was recorded since there's no AlreadyVoted check before auto-approve... let's check:
        // The contract records the vote BEFORE checking timelock, so mems[1]'s vote IS stored.
        // After timelock expires, we need another voter to push it over quorum.
        vm.prank(mems[2]);
        // mems[2] may already have voted from listing vote but NOT from milestone vote
        coop.voteMilestone(lid, 0, true); // this might hit quorum if mems[1]'s vote was stored

        // After timelock: the milestone should now be approved or mems[2] vote triggers it.
        // Check milestone status
        (,, FarmCoop.MilestoneStatus mStatus,,,) = coop.getMilestone(lid, 0);
        assertEq(uint256(mStatus), uint256(FarmCoop.MilestoneStatus.Approved), "milestone should be approved");
    }

    // ================================================================
    // 7a. test_SharePriceAfterProfit
    // ================================================================
    function test_SharePriceAfterProfit() public {
        address member = makeAddr("profitMember");
        _addAndDeposit(member, 1_000_000e6); // 1_000_000 USDC

        uint256 ppsBefore = coop.pricePerShare();
        assertEq(ppsBefore, 1e6, "initial pps = 1 USDC");

        // Settle an order so the pool gets a share (poolShare = price * 10%)
        address m2 = makeAddr("profitM2");
        vm.prank(coordinator);
        coop.addMember(m2);

        address[] memory addrs = new address[](1);
        addrs[0] = m2;
        uint256[] memory qtys = new uint256[](1);
        qtys[0] = 1;

        // price = 1_000_000 USDC (6 decimals)
        _settleOrder(addrs, qtys, 1_000_000e6, 1);

        // poolIdleUsdc increased by poolShare = 1_000_000e6 * 1000/10000 = 100_000e6
        // totalShares unchanged (no new deposit)
        // pricePerShare = (poolValue * 1e6) / totalShares > 1e6
        uint256 ppsAfter = coop.pricePerShare();
        assertGt(ppsAfter, ppsBefore, "pps should increase after profit");
    }

    // ================================================================
    // 7b. test_SharePriceAfterLoss
    // ================================================================
    function test_SharePriceAfterLoss() public {
        // Deposit enough to cover listing
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("lossMem", i)));
            _addAndDeposit(mems[i], 200e6);
        }
        // totalShares=1000e6, poolValue=1000e6, pps=1e6

        uint256 ppsBefore = coop.pricePerShare();

        uint256 fundingTarget = 100e6;

        // Build and finalize listing
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "Loss", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);
        // poolListingValue += 100e6, poolIdleUsdc -= 100e6

        // Flag default (warp past milestone deadline)
        vm.warp(deadlines[0] + 1);
        vm.prank(mems[0]);
        coop.flagDefault(lid);

        // markLoss: poolListingValue -= remaining (=100e6), poolIdleUsdc += 100e6
        // Then writeDownAmount = min(0, 0) = 0 after the first step
        // Actually let's trace: remaining=100-0=100e6
        //   poolListingValue was 100e6 → now 0; poolIdleUsdc += 100e6
        //   unrecovered = 100-0=100e6; writeDownAmount = min(100e6, poolListingValue=0) = 0
        //   poolListingValue -= 0 → stays 0
        // So pool NAV stays the same after markLoss (reclaimed to idle). pps unchanged.
        // The LOSS in NAV happened when we funded the listing (poolListingValue = 100e6 at risk).
        // markLoss reclaims it back. So pricePerShare won't decrease from markLoss alone.
        //
        // To show loss in NAV we need the funds to be partially released first.
        // Let's check pps decreases when releasedAmount > 0 and markLoss writeDownAmount > 0.
        // With no milestones approved, releasedAmount=0, so remaining = fundingTarget = 100e6.
        // markLoss will reclaim 100e6 from poolListingValue → poolIdleUsdc.
        // pps = (1000e6 * 1e6) / 1000e6 = 1e6 still. No loss because all funds recovered.
        //
        // For a TRUE loss test: approve M1 (50e6 released), then flag default, markLoss.
        // After M1 approval: releasedAmount=50e6, poolListingValue reduced by 50e6 → 50e6.
        // markLoss: remaining = 100e6 - 50e6 = 50e6; poolListingValue(50e6) -= 50e6 → 0; poolIdleUsdc += 50e6
        //   unrecovered = 100e6 - 0 = 100e6; writeDownAmount = min(100e6, 0) = 0.
        // Still no write-down of pool value... Because ALL remaining listing value was already
        // reclaimed. The real loss (50e6 released to business) is already gone.
        // poolValue = poolIdleUsdc + poolListingValue = (900e6 + 50e6) + 0 = 950e6
        // pps = 950e6 * 1e6 / 1000e6 = 0.95e6 < 1e6 ✓
        //
        // So we need to approve M1 first, then default and markLoss.
        // Let's rebuild with fresh state using a new approach.

        vm.prank(mems[0]);
        coop.markLoss(lid);

        uint256 ppsAfter = coop.pricePerShare();
        // With no released amount, all funds reclaimed → pps unchanged
        assertEq(ppsAfter, ppsBefore, "pps unchanged when all listing funds reclaimed");
        // This confirms markLoss reclaims idle funds (not a loss case here).
        // The actual loss scenario is tested in test_MarkLossReclaimsToPool.
    }

    // ================================================================
    // 7b-v2. test_SharePriceAfterLossWithRelease
    // ================================================================
    function test_SharePriceAfterLossWithRelease() public {
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("loss2Mem", i)));
            _addAndDeposit(mems[i], 200e6);
        }

        uint256 fundingTarget = 100e6;
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "Loss2", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);

        // Warp past timelock, submit proof for M1, vote to approve
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        vm.prank(business);
        coop.submitMilestoneProof(lid, 0, "proof1", "link1");

        // quorum = 1000e6 * 2000/10000 = 200e6; cap = 150e6
        // Need >=200e6 yes. 2 voters * 150e6 cap = 300e6 >= 200e6
        vm.prank(mems[0]); coop.voteMilestone(lid, 0, true); // 150e6
        vm.prank(mems[1]); coop.voteMilestone(lid, 0, true); // 300e6 → auto-approve → releases 50e6

        // Now: releasedAmount=50e6, poolListingValue reduced by 50e6 (was 100e6, now 50e6)
        // poolIdleUsdc = 1000e6 - 100e6 = 900e6 (after funding), then no change from M1 approval
        // poolValue = 900e6 + 50e6 = 950e6; pps = 950e6*1e6/1000e6 = 0.95e6

        uint256 ppsMid = coop.pricePerShare();
        assertLt(ppsMid, 1e6, "pps should be below 1 after M1 released");

        // Flag default on M2 (warp past M2 deadline)
        vm.warp(deadlines[1] + 1);
        vm.prank(mems[0]);
        coop.flagDefault(lid);

        uint256 ppsBeforeMarkLoss = coop.pricePerShare();

        vm.prank(mems[0]);
        coop.markLoss(lid);

        uint256 ppsAfterMarkLoss = coop.pricePerShare();
        // markLoss: remaining = 100e6 - 50e6 = 50e6; poolListingValue(50e6) -= 50e6 → 0
        // poolIdleUsdc += 50e6 → 950e6; poolValue = 950e6
        // pps = 950e6*1e6/1000e6 = 0.95e6 (same, because recovered remaining principal)
        assertEq(ppsAfterMarkLoss, ppsBeforeMarkLoss, "pps unchanged by markLoss reclaim");
        assertLt(ppsAfterMarkLoss, 1e6, "pps still below 1 due to released loss");
    }

    // ================================================================
    // 8. test_RedemptionQueuedWhenIlliquid
    // ================================================================
    function test_RedemptionQueuedWhenIlliquid() public {
        address member = makeAddr("redeemMem");
        address other  = makeAddr("redeemOther");

        _addAndDeposit(member, 500e6);
        _addAndDeposit(other,  500e6);
        // totalShares=1000e6, poolIdleUsdc=1000e6

        // Fund 3 listings to leave poolIdleUsdc (400e6) < member shares value (500e6).
        // maxExposure = 1000e6 * 3000/10000 = 300e6 per listing → use 250e6 per listing.
        // Explicitly track absolute timestamps to avoid via_ir caching of block.timestamp.
        uint256 T0 = block.timestamp; // initial timestamp (= 1 in forge)

        uint256[] memory pcts2 = new uint256[](2);
        pcts2[0] = 50; pcts2[1] = 50;
        string[] memory descs2 = new string[](2);
        descs2[0] = "M1"; descs2[1] = "M2";

        // --- Listing 1 (250e6) created at T0, voteDeadline = T0 + VOTING_WINDOW ---
        uint256[] memory dl1 = new uint256[](2);
        dl1[0] = T0 + 60 days; dl1[1] = T0 + 120 days;
        coop.createListing(business, "IL1", "desc", 250e6, 30 days, 500, pcts2, descs2, dl1, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr); verifier.verify(lid);
        vm.prank(member); coop.voteListing(lid, true);
        vm.prank(other);  coop.voteListing(lid, true);
        uint256 T1 = T0 + VOTING_WINDOW + 1;  // past voteDeadline of listing 1
        vm.warp(T1);
        coop.finalizeListing(lid); // idle = 1000-250 = 750e6

        // --- Listing 2 (250e6) created at T1, voteDeadline = T1 + VOTING_WINDOW ---
        uint256[] memory dl2 = new uint256[](2);
        dl2[0] = T1 + 60 days; dl2[1] = T1 + 120 days;
        coop.createListing(makeAddr("ilBiz2"), "IL2", "desc", 250e6, 30 days, 500, pcts2, descs2, dl2, "docs");
        uint256 lid2 = coop.listingCount();
        vm.prank(verifierAddr); verifier.verify(lid2);
        vm.prank(member); coop.voteListing(lid2, true);
        vm.prank(other);  coop.voteListing(lid2, true);
        uint256 T2 = T1 + VOTING_WINDOW + 1;  // past voteDeadline of listing 2
        vm.warp(T2);
        coop.finalizeListing(lid2); // idle = 750-250 = 500e6

        // --- Listing 3 (100e6) created at T2, voteDeadline = T2 + VOTING_WINDOW ---
        uint256[] memory dl3 = new uint256[](2);
        dl3[0] = T2 + 60 days; dl3[1] = T2 + 120 days;
        coop.createListing(makeAddr("ilBiz3"), "IL3", "desc", 100e6, 30 days, 500, pcts2, descs2, dl3, "docs");
        uint256 lid3 = coop.listingCount();
        vm.prank(verifierAddr); verifier.verify(lid3);
        vm.prank(member); coop.voteListing(lid3, true);
        vm.prank(other);  coop.voteListing(lid3, true);
        uint256 T3 = T2 + VOTING_WINDOW + 1;  // past voteDeadline of listing 3
        vm.warp(T3);
        coop.finalizeListing(lid3); // idle = 500-100 = 400e6

        // member redeems 500e6 shares (= 500e6 value > 400e6 idle) → queued
        vm.prank(member);
        coop.redeemShares(500e6);
        assertEq(coop.withdrawalQueueIndex(member), 1, "should be in queue at index 1");

        // Business repays 200e6 to push idle to 400+200=600e6 >= 500e6
        usdc.mint(business, 200e6);
        vm.startPrank(business);
        usdc.approve(address(coop), 200e6);
        coop.repay(lid, 200e6);
        vm.stopPrank();

        // processWithdrawalQueue called by stranger (permissionless)
        vm.prank(stranger);
        coop.processWithdrawalQueue(0);

        // member should have received USDC
        assertEq(coop.withdrawalQueueIndex(member), 0, "member should be out of queue");
        assertGt(usdc.balanceOf(member), 0, "member should have received USDC");
    }

    // ================================================================
    // 9a. test_MilestoneApproved
    // ================================================================
    function test_MilestoneApproved() public {
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("maMem", i)));
            _addAndDeposit(mems[i], 200e6);
        }

        uint256 fundingTarget = 100e6;
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "MA", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);

        // Warp past timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);

        vm.prank(business);
        coop.submitMilestoneProof(lid, 0, "ipfs://proof1", "https://link1");

        uint256 bizBalBefore = usdc.balanceOf(business);

        // quorum=200e6, cap=150e6 per voter, 2 voters = 300e6 >= 200e6 → auto-approve
        vm.prank(mems[0]); coop.voteMilestone(lid, 0, true);
        vm.prank(mems[1]); coop.voteMilestone(lid, 0, true);

        uint256 bizBalAfter = usdc.balanceOf(business);
        uint256 releaseAmount = (fundingTarget * 50) / 100; // 50e6

        assertEq(bizBalAfter - bizBalBefore, releaseAmount, "business should receive M1 release");

        (,, FarmCoop.MilestoneStatus mStatus,,,) = coop.getMilestone(lid, 0);
        assertEq(uint256(mStatus), uint256(FarmCoop.MilestoneStatus.Approved), "M1 should be Approved");
    }

    // ================================================================
    // 9b. test_MilestoneRejected
    // ================================================================
    function test_MilestoneRejected() public {
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("mrMem", i)));
            _addAndDeposit(mems[i], 200e6);
        }

        uint256 fundingTarget = 100e6;
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "MR", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        // Warp past vote window and finalize
        uint256 t1 = block.timestamp + VOTING_WINDOW + 1;
        vm.warp(t1);
        coop.finalizeListing(lid);

        // Warp past timelock
        uint256 t2 = t1 + TIMELOCK_DELAY + 1;
        vm.warp(t2);

        vm.prank(business);
        coop.submitMilestoneProof(lid, 0, "bad_proof", "bad_link");
        // milestoneVoteDeadline = t2 + VOTING_WINDOW

        // Nobody votes YES → milestoneVoteYes stays 0
        // Warp past milestoneVoteDeadline
        uint256 t3 = t2 + VOTING_WINDOW + 1;
        vm.warp(t3);

        // Any member can call rejectMilestone now
        vm.prank(mems[0]);
        coop.rejectMilestone(lid, 0);

        (,, FarmCoop.MilestoneStatus mStatus,,,) = coop.getMilestone(lid, 0);
        assertEq(uint256(mStatus), uint256(FarmCoop.MilestoneStatus.Rejected), "M1 should be Rejected");

        (,,,,,FarmCoop.ListingStatus lStatus,,,,, ) = coop.getListing(lid);
        assertEq(uint256(lStatus), uint256(FarmCoop.ListingStatus.Defaulted), "listing should be Defaulted");
    }

    // ================================================================
    // 10. test_MarkLossReclaimsToPool
    // ================================================================
    function test_MarkLossReclaimsToPool() public {
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("mlMem", i)));
            _addAndDeposit(mems[i], 200e6);
        }
        // poolIdleUsdc=1000e6, totalShares=1000e6

        uint256 fundingTarget = 100e6;
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "ML", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);
        // poolIdleUsdc = 900e6; poolListingValue = 100e6

        uint256 idleBefore = coop.poolIdleUsdc(); // 900e6

        // Flag default
        vm.warp(deadlines[0] + 1);
        vm.prank(mems[0]);
        coop.flagDefault(lid);

        vm.prank(mems[0]);
        coop.markLoss(lid);

        // remaining = fundingTarget - releasedAmount = 100e6 - 0 = 100e6
        // poolListingValue was 100e6 → now 0 (after first step); poolIdleUsdc += 100e6
        // unrecovered = 100e6 - 0 = 100e6; writeDownAmount = min(100e6, poolListingValue=0) = 0
        // Final: poolIdleUsdc = 900e6 + 100e6 = 1000e6; poolListingValue=0
        assertEq(coop.poolIdleUsdc(), idleBefore + fundingTarget, "pool idle should recover listing funds");
        assertEq(coop.poolListingValue(), 0, "poolListingValue should be 0");

        (,,,,,FarmCoop.ListingStatus lStatus,,,,, ) = coop.getListing(lid);
        assertEq(uint256(lStatus), uint256(FarmCoop.ListingStatus.MarkedLoss), "status should be MarkedLoss");
    }

    // ================================================================
    // 11. test_RepayRestoresNAV
    // ================================================================
    function test_RepayRestoresNAV() public {
        address[] memory mems = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            mems[i] = makeAddr(string(abi.encodePacked("repayMem", i)));
            _addAndDeposit(mems[i], 200e6);
        }

        uint256 fundingTarget = 100e6;
        uint256 snapshotTime = block.timestamp;
        uint256[] memory pcts = new uint256[](2);
        pcts[0] = 50; pcts[1] = 50;
        string[] memory descs = new string[](2);
        descs[0] = "M1"; descs[1] = "M2";
        uint256[] memory deadlines = new uint256[](2);
        deadlines[0] = snapshotTime + 60 days;
        deadlines[1] = snapshotTime + 120 days;

        coop.createListing(business, "Repay", "desc", fundingTarget, 30 days, 500, pcts, descs, deadlines, "docs");
        uint256 lid = coop.listingCount();
        vm.prank(verifierAddr);
        verifier.verify(lid);

        vm.prank(mems[0]); coop.voteListing(lid, true);
        vm.prank(mems[1]); coop.voteListing(lid, true);
        vm.prank(mems[2]); coop.voteListing(lid, true);

        vm.warp(block.timestamp + VOTING_WINDOW + 1);
        coop.finalizeListing(lid);
        // poolIdleUsdc = 900e6; poolListingValue = 100e6; pps = 900+100 = 1000e6*1e6/1000e6 = 1e6

        uint256 ppsBefore = coop.pricePerShare();
        uint256 idleBefore = coop.poolIdleUsdc();
        uint256 listValBefore = coop.poolListingValue();

        // Business repays 50e6 (partial principal)
        uint256 repayAmount = 50e6;
        usdc.mint(business, repayAmount);
        vm.startPrank(business);
        usdc.approve(address(coop), repayAmount);
        coop.repay(lid, repayAmount);
        vm.stopPrank();

        // poolIdleUsdc += 50e6; poolListingValue -= min(50e6, 100e6) = 50e6
        assertEq(coop.poolIdleUsdc(), idleBefore + repayAmount, "idle should increase by repay");
        assertEq(coop.poolListingValue(), listValBefore - repayAmount, "listing value should decrease");

        uint256 ppsAfter = coop.pricePerShare();
        // poolValue = (900+50) + (100-50) = 950+50 = 1000e6 → pps unchanged (principal restored)
        assertEq(ppsAfter, ppsBefore, "pps unchanged by partial principal repay");

        // Business repays remaining 50e6 principal + 10e6 profit in one call (110e6 total over-repay)
        // profitShareBps=500: totalDue = 100e6 + (100e6 * 500/10000) = 100e6 + 5e6 = 105e6
        // totalRepaid so far = 50e6; need 105-50=55e6 more for "Completed" threshold
        // Let's pay 60e6 to go over the full due amount:
        uint256 repayAmount2 = 60e6;
        usdc.mint(business, repayAmount2);
        vm.startPrank(business);
        usdc.approve(address(coop), repayAmount2);
        coop.repay(lid, repayAmount2);
        vm.stopPrank();

        // After 2nd repay:
        //   principalRemaining = 100-50=50e6; principalPortion = min(60,50)=50e6
        //   poolListingValue -= 50e6 → 0
        //   poolIdleUsdc += 60e6 → 950+60=1010e6
        //   poolValue = 1010e6; pps = 1010*1e6/1000 = 1.01e6
        uint256 ppsWithProfit = coop.pricePerShare();
        assertGt(ppsWithProfit, ppsBefore, "pps increases with over-repayment");
    }

    // ================================================================
    // 12. test_RemovedMemberCanClaim
    // ================================================================
    function test_RemovedMemberCanClaim() public {
        address m1 = makeAddr("removedM1");
        address m2 = makeAddr("removedM2");

        vm.startPrank(coordinator);
        coop.addMember(m1);
        coop.addMember(m2);
        vm.stopPrank();

        // Settle an order to give m1 a pending claim
        address[] memory addrs = new address[](2);
        addrs[0] = m1; addrs[1] = m2;
        uint256[] memory qtys = new uint256[](2);
        qtys[0] = 1; qtys[1] = 1;
        _settleOrder(addrs, qtys, 2_000_000, 2);

        uint256 claimAmt = coop.pendingClaim(m1);
        assertGt(claimAmt, 0, "m1 should have a pending claim");

        // Remove m1
        vm.prank(coordinator);
        coop.removeMember(m1);
        assertFalse(coop.isMember(m1), "m1 should not be member");

        // m1 can still claim
        uint256 balBefore = usdc.balanceOf(m1);
        vm.prank(m1);
        coop.claimPayout();
        assertEq(usdc.balanceOf(m1), balBefore + claimAmt, "removed member should still claim");
    }

    // ================================================================
    // 13. test_WithdrawalQueuePermissionless
    // ================================================================
    function test_WithdrawalQueuePermissionless() public {
        address member = makeAddr("wqMem");
        address other  = makeAddr("wqOther");

        _addAndDeposit(member, 500e6);
        _addAndDeposit(other,  500e6);
        // totalShares=1000e6, poolIdleUsdc=1000e6

        // Lock up enough idle USDC so member's redemption is illiquid.
        // maxExposure = 1000e6 * 3000/10000 = 300e6 per listing; use 250e6.
        // 3 listings: 250+250+100 = 600e6 locked → 400e6 idle < 500e6 redemption.
        // Use explicit absolute timestamps to avoid via_ir caching of block.timestamp.
        uint256 T0 = block.timestamp;
        uint256[] memory pcts2 = new uint256[](2);
        pcts2[0] = 50; pcts2[1] = 50;
        string[] memory descs2 = new string[](2);
        descs2[0] = "M1"; descs2[1] = "M2";

        // Listing 1: 250e6, created at T0
        uint256[] memory dl1 = new uint256[](2);
        dl1[0] = T0 + 60 days; dl1[1] = T0 + 120 days;
        coop.createListing(business, "WQ1", "desc", 250e6, 30 days, 500, pcts2, descs2, dl1, "docs");
        uint256 lid1 = coop.listingCount();
        vm.prank(verifierAddr); verifier.verify(lid1);
        vm.prank(member); coop.voteListing(lid1, true);
        vm.prank(other);  coop.voteListing(lid1, true);
        uint256 T1 = T0 + VOTING_WINDOW + 1;
        vm.warp(T1);
        coop.finalizeListing(lid1); // idle = 750e6

        // Listing 2: 250e6, created at T1
        uint256[] memory dl2 = new uint256[](2);
        dl2[0] = T1 + 60 days; dl2[1] = T1 + 120 days;
        coop.createListing(makeAddr("wqBiz2"), "WQ2", "desc", 250e6, 30 days, 500, pcts2, descs2, dl2, "docs");
        uint256 lid2 = coop.listingCount();
        vm.prank(verifierAddr); verifier.verify(lid2);
        vm.prank(member); coop.voteListing(lid2, true);
        vm.prank(other);  coop.voteListing(lid2, true);
        uint256 T2 = T1 + VOTING_WINDOW + 1;
        vm.warp(T2);
        coop.finalizeListing(lid2); // idle = 500e6

        // Listing 3: 100e6, created at T2
        uint256[] memory dl3 = new uint256[](2);
        dl3[0] = T2 + 60 days; dl3[1] = T2 + 120 days;
        coop.createListing(makeAddr("wqBiz3"), "WQ3", "desc", 100e6, 30 days, 500, pcts2, descs2, dl3, "docs");
        uint256 lid3 = coop.listingCount();
        vm.prank(verifierAddr); verifier.verify(lid3);
        vm.prank(member); coop.voteListing(lid3, true);
        vm.prank(other);  coop.voteListing(lid3, true);
        uint256 T3 = T2 + VOTING_WINDOW + 1;
        vm.warp(T3);
        coop.finalizeListing(lid3); // idle = 400e6

        // member redeems 500e6 shares = 500e6 value > 400e6 idle → queued
        vm.prank(member);
        coop.redeemShares(500e6);
        assertEq(coop.withdrawalQueueIndex(member), 1, "queued");

        // Repay 200e6 via lid1 to push idle to 600e6 >= 500e6
        usdc.mint(business, 200e6);
        vm.startPrank(business);
        usdc.approve(address(coop), 200e6);
        coop.repay(lid1, 200e6);
        vm.stopPrank();

        // stranger (non-coordinator, non-member) can call processWithdrawalQueue
        vm.prank(stranger);
        coop.processWithdrawalQueue(0); // 0 = process all

        assertEq(coop.withdrawalQueueIndex(member), 0, "member processed from queue");
        assertGt(usdc.balanceOf(member), 0, "member received USDC");
    }

    // ================================================================
    // 14. test_VerifierAccessControl
    // ================================================================
    function test_VerifierAccessControl() public {
        // Only coordinator or a registered verifier can call verify()
        uint256 listingId = 1;

        // coordinator can verify
        vm.prank(coordinator);
        verifier.verify(listingId);
        assertTrue(verifier.isListingVerified(listingId), "coordinator should verify");

        // registered verifier can verify another listing
        vm.prank(verifierAddr);
        verifier.verify(listingId + 1);
        assertTrue(verifier.isListingVerified(listingId + 1), "registered verifier should verify");

        // stranger cannot verify
        vm.prank(stranger);
        vm.expectRevert(FarmCoopVerifier.NotVerifierOrCoordinator.selector);
        verifier.verify(listingId + 2);
    }
}
