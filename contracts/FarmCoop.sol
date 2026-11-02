// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFarmCoopVerifier {
    function isListingVerified(uint256 listingId) external view returns (bool);
}

contract FarmCoop is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // NOTE: loops over members are used for settlement/allocation logic.
    // Keep member count practical (roughly <= 200) to avoid block gas issues.

    error NotCoordinator();
    error NotMember();
    error ZeroAddress();
    error InvalidBps();
    error InvalidValue();
    error NotBuyer();
    error NotBusiness();
    error NotFunded();
    error NotDeliveryRecorded();
    error NotConfirmed();
    error NothingToClaim();
    error ArrayLengthMismatch();
    error NotMemberAddress();
    error OrderAlreadyFunded();
    error InvalidOrderStatus();
    error InvalidListingStatus();
    error ListingNotVerified();
    error VoteWindowClosed();
    error VoteWindowOpen();
    error AlreadyVoted();
    error QuorumNotMet();
    error ExposureLimitExceeded();
    error InsufficientPoolIdle();
    error QueueExists();
    error NotInQueue();
    error InvalidMilestone();
    error MilestoneNotPending();
    error MilestoneNotProofSubmitted();
    error MilestoneDeadlinePassed();
    error TimelockNotExpired();
    error InvalidFundingTarget();
    error InvalidMilestoneConfig();
    error InvalidDeadline();
    error NoShares();
    error ZeroTotalDelivered();

    enum OrderStatus {
        Pending,
        Funded,
        DeliveryRecorded,
        Confirmed,
        Paid
    }

    enum ListingStatus {
        Proposed,
        Verified,
        Funded,
        Active,
        Completed,
        Defaulted,
        MarkedLoss
    }

    enum MilestoneStatus {
        Pending,
        ProofSubmitted,
        Approved,
        Rejected,
        Missed
    }

    struct Order {
        uint256 id;
        address buyer;
        uint256 price;
        uint256 expectedQty;
        OrderStatus status;
        bool buyerConfirmed;
        uint256 totalDelivered;
        mapping(address => uint256) delivered;
    }

    struct Milestone {
        uint256 pct;
        string description;
        MilestoneStatus status;
        string proof;
        string proofLink;
        uint256 deadline;
        uint256 milestoneVoteDeadline;
    }

    struct Listing {
        uint256 id;
        address business;
        string name;
        string description;
        uint256 fundingTarget;
        uint256 fundingDeadline;
        uint256 profitShareBps;
        string docsHash;
        ListingStatus status;
        uint256 totalFunded;
        uint256 totalRepaid;
        uint256 repaidPrincipal;
        uint256 releasedAmount;
        uint256 voteYes;
        uint256 voteNo;
        uint256 voteDeadline;
        uint256 timelockExpiry;
        mapping(address => uint256) contribution;
        mapping(address => bool) hasVoted;
        Milestone[] milestones;
        uint256 currentMilestone;
        mapping(uint256 => mapping(address => bool)) milestoneVoted;
        mapping(uint256 => uint256) milestoneVoteYes;
    }

    struct WithdrawalRequest {
        address member;
        uint256 shares;
        uint256 requestedAt;
    }

    address public immutable USDC;
    address public immutable coordinator;
    address public immutable verifierContract;

    uint256 public immutable RESERVE_BPS;
    uint256 public immutable POOL_BPS;
    uint256 public immutable PATRONAGE_BPS;
    uint256 public immutable QUORUM_BPS;
    uint256 public immutable VOTING_WINDOW;
    uint256 public immutable TIMELOCK_DELAY;
    uint256 public immutable MAX_EXPOSURE_BPS;
    uint256 public immutable VOTE_CAP_BPS;

    mapping(address => bool) public isMember;
    address[] public members;

    mapping(uint256 => Order) private orders;
    uint256 public orderCount;
    mapping(address => uint256) public pendingClaim;
    uint256 public reserveBalance;

    uint256 public poolIdleUsdc;
    uint256 public poolListingValue;
    uint256 public totalShares;
    mapping(address => uint256) public shareBalance;

    mapping(uint256 => WithdrawalRequest) public withdrawalQueue;
    uint256 public withdrawalQueueHead;
    uint256 public withdrawalQueueTail;
    mapping(address => uint256) public withdrawalQueueIndex; // 1-indexed, 0 means not in queue

    mapping(uint256 => Listing) private listings;
    uint256 public listingCount;

    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);

    event OrderCreated(uint256 indexed orderId, address indexed buyer, uint256 price, uint256 expectedQty);
    event OrderFunded(uint256 indexed orderId, address indexed buyer, uint256 price);
    event DeliveryRecorded(uint256 indexed orderId, uint256 totalDelivered);
    event DeliveryConfirmed(uint256 indexed orderId, address indexed buyer);
    event OrderSettled(uint256 indexed orderId, uint256 reserveAmount, uint256 poolShare, uint256 patronageTotal);
    event PayoutClaimed(address indexed member, uint256 amount);
    event ReserveWithdrawn(address indexed to, uint256 amount);

    event PoolDeposit(address indexed member, uint256 amount, uint256 shares);
    event PoolRedeem(address indexed member, uint256 shares, uint256 usdcValue);
    event WithdrawalQueued(address indexed member, uint256 shares);
    event WithdrawalProcessed(address indexed member, uint256 shares, uint256 usdcValue);

    event ListingCreated(uint256 indexed listingId, address indexed business, uint256 fundingTarget);
    event ListingVoted(uint256 indexed listingId, address indexed voter, bool support, uint256 weight);
    event ListingFunded(uint256 indexed listingId, uint256 fundingTarget, uint256 timelockExpiry);
    event ListingVoteFailed(uint256 indexed listingId);
    event MilestoneProofSubmitted(uint256 indexed listingId, uint256 indexed milestoneIdx, string proof);
    event MilestoneVoted(uint256 indexed listingId, uint256 indexed milestoneIdx, address indexed voter, bool approve);
    event MilestoneApproved(uint256 indexed listingId, uint256 indexed milestoneIdx, uint256 releaseAmount);
    event MilestoneRejected(uint256 indexed listingId, uint256 indexed milestoneIdx);
    event ListingDefaulted(uint256 indexed listingId);
    event FundsReclaimed(uint256 indexed listingId, uint256 remaining);
    event Repaid(uint256 indexed listingId, uint256 amount, uint256 totalRepaid);
    event PoolNAVRestored(uint256 indexed listingId, uint256 amount);
    event LossMarked(uint256 indexed listingId, uint256 writeDownAmount);

    modifier onlyCoordinator() {
        if (msg.sender != coordinator) revert NotCoordinator();
        _;
    }

    modifier onlyMember() {
        if (!isMember[msg.sender]) revert NotMember();
        _;
    }

    constructor(
        address usdc_,
        address coordinator_,
        address verifier_,
        uint256 reserveBps_,
        uint256 poolBps_,
        uint256 quorumBps_,
        uint256 votingWindow_,
        uint256 timelockDelay_,
        uint256 maxExposureBps_,
        uint256 voteCapBps_
    ) {
        if (usdc_ == address(0) || coordinator_ == address(0) || verifier_ == address(0)) revert ZeroAddress();
        if (reserveBps_ + poolBps_ > 10_000) revert InvalidBps();
        if (quorumBps_ > 10_000 || maxExposureBps_ > 5_000 || voteCapBps_ > 10_000) revert InvalidBps();
        if (votingWindow_ == 0 || timelockDelay_ == 0) revert InvalidValue();

        USDC = usdc_;
        coordinator = coordinator_;
        verifierContract = verifier_;

        RESERVE_BPS = reserveBps_;
        POOL_BPS = poolBps_;
        PATRONAGE_BPS = 10_000 - reserveBps_ - poolBps_;
        QUORUM_BPS = quorumBps_;
        VOTING_WINDOW = votingWindow_;
        TIMELOCK_DELAY = timelockDelay_;
        MAX_EXPOSURE_BPS = maxExposureBps_;
        VOTE_CAP_BPS = voteCapBps_;
    }

    // =========================
    // SECTION A — MEMBERS
    // =========================

    function addMember(address member) external onlyCoordinator {
        if (member == address(0)) revert ZeroAddress();
        if (!isMember[member]) {
            isMember[member] = true;
            members.push(member);
            emit MemberAdded(member);
        }
    }

    function removeMember(address member) external onlyCoordinator {
        if (isMember[member]) {
            isMember[member] = false;
            emit MemberRemoved(member);
        }
    }

    function memberCount() external view returns (uint256) {
        return members.length;
    }

    // =========================
    // SECTION B — PRODUCE ORDERS
    // =========================

    function createOrder(address buyer, uint256 price, uint256 expectedQty) external onlyCoordinator {
        if (buyer == address(0)) revert ZeroAddress();
        if (price == 0 || expectedQty == 0) revert InvalidValue();

        orderCount++;
        Order storage order = orders[orderCount];
        order.id = orderCount;
        order.buyer = buyer;
        order.price = price;
        order.expectedQty = expectedQty;
        order.status = OrderStatus.Pending;

        emit OrderCreated(orderCount, buyer, price, expectedQty);
    }

    function fundOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        if (order.buyer == address(0)) revert InvalidValue();
        if (msg.sender != order.buyer) revert NotBuyer();
        if (order.status != OrderStatus.Pending) revert OrderAlreadyFunded();

        // CEI: effects before interaction
        order.status = OrderStatus.Funded;

        IERC20(USDC).safeTransferFrom(msg.sender, address(this), order.price);

        emit OrderFunded(orderId, msg.sender, order.price);
    }

    function recordDelivery(uint256 orderId, address[] calldata memberAddrs, uint256[] calldata qtys) external onlyCoordinator {
        if (memberAddrs.length != qtys.length) revert ArrayLengthMismatch();

        Order storage order = orders[orderId];
        if (order.status != OrderStatus.Funded) revert NotFunded();

        for (uint256 i = 0; i < memberAddrs.length; i++) {
            address member = memberAddrs[i];
            if (!isMember[member]) revert NotMemberAddress();
            order.delivered[member] = qtys[i];
        }

        uint256 newTotalDelivered;
        for (uint256 i = 0; i < members.length; i++) {
            newTotalDelivered += order.delivered[members[i]];
        }

        order.totalDelivered = newTotalDelivered;
        order.status = OrderStatus.DeliveryRecorded;

        emit DeliveryRecorded(orderId, newTotalDelivered);
    }

    function confirmDelivery(uint256 orderId) external {
        Order storage order = orders[orderId];
        if (msg.sender != order.buyer) revert NotBuyer();
        if (order.status != OrderStatus.DeliveryRecorded) revert NotDeliveryRecorded();

        order.buyerConfirmed = true;
        order.status = OrderStatus.Confirmed;

        emit DeliveryConfirmed(orderId, msg.sender);

        _settleOrder(orderId);
    }

    function _settleOrder(uint256 orderId) internal nonReentrant {
        Order storage order = orders[orderId];
        if (order.status != OrderStatus.Confirmed || !order.buyerConfirmed) revert NotConfirmed();
        if (order.totalDelivered == 0) revert ZeroTotalDelivered();

        uint256 price = order.price;
        uint256 reserveShare = (price * RESERVE_BPS) / 10_000;
        uint256 poolShare = (price * POOL_BPS) / 10_000;
        uint256 patronageTotal = price - reserveShare - poolShare;

        uint256 distributed;
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            uint256 deliveredQty = order.delivered[member];
            if (deliveredQty == 0) continue;

            uint256 memberPay = (patronageTotal * deliveredQty) / order.totalDelivered;
            if (memberPay > 0) {
                pendingClaim[member] += memberPay;
                distributed += memberPay;
            }
        }

        uint256 dust = patronageTotal - distributed;

        reserveBalance += reserveShare + dust;
        poolIdleUsdc += poolShare;
        order.status = OrderStatus.Paid;

        emit OrderSettled(orderId, reserveShare + dust, poolShare, patronageTotal);
    }

    function claimPayout() external nonReentrant {
        uint256 amount = pendingClaim[msg.sender];
        if (amount == 0) revert NothingToClaim();

        // CEI
        pendingClaim[msg.sender] = 0;

        IERC20(USDC).safeTransfer(msg.sender, amount);

        emit PayoutClaimed(msg.sender, amount);
    }

    function claimableBalance(address member) external view returns (uint256) {
        return pendingClaim[member];
    }

    function withdrawReserve(address to, uint256 amount) external onlyCoordinator nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount > reserveBalance) revert InvalidValue();

        // CEI
        reserveBalance -= amount;

        IERC20(USDC).safeTransfer(to, amount);

        emit ReserveWithdrawn(to, amount);
    }

    // =========================
    // SECTION C — INVESTMENT POOL
    // =========================

    function poolValue() public view returns (uint256) {
        return poolIdleUsdc + poolListingValue;
    }

    function pricePerShare() external view returns (uint256) {
        if (totalShares == 0) return 1e6;
        return (poolValue() * 1e6) / totalShares;
    }

    function depositPool(uint256 amount) external nonReentrant onlyMember {
        if (amount == 0) revert InvalidValue();

        uint256 shares;
        uint256 currentPoolValue = poolValue();

        if (totalShares == 0) {
            shares = amount;
        } else {
            if (currentPoolValue == 0) revert InvalidValue();
            shares = (amount * totalShares) / currentPoolValue;
        }

        if (shares == 0) revert NoShares();

        // CEI
        shareBalance[msg.sender] += shares;
        totalShares += shares;
        poolIdleUsdc += amount;

        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);

        emit PoolDeposit(msg.sender, amount, shares);
    }

    function redeemShares(uint256 shares) external nonReentrant {
        if (shares == 0) revert InvalidValue();
        if (withdrawalQueueIndex[msg.sender] != 0) revert QueueExists();

        uint256 memberShares = shareBalance[msg.sender];
        if (memberShares < shares) revert NoShares();
        if (totalShares == 0) revert InvalidValue();

        uint256 usdcValue = (shares * poolValue()) / totalShares;

        if (usdcValue <= poolIdleUsdc) {
            // CEI
            shareBalance[msg.sender] = memberShares - shares;
            totalShares -= shares;
            poolIdleUsdc -= usdcValue;

            IERC20(USDC).safeTransfer(msg.sender, usdcValue);

            emit PoolRedeem(msg.sender, shares, usdcValue);
        } else {
            uint256 idx = withdrawalQueueTail;
            withdrawalQueue[idx] = WithdrawalRequest({member: msg.sender, shares: shares, requestedAt: block.timestamp});
            withdrawalQueueTail = idx + 1;
            withdrawalQueueIndex[msg.sender] = idx + 1;

            emit WithdrawalQueued(msg.sender, shares);
        }
    }

    function processWithdrawalQueue(uint256 maxItems) external nonReentrant {
        uint256 head = withdrawalQueueHead;
        uint256 tail = withdrawalQueueTail;
        uint256 processed;

        while (head < tail) {
            if (maxItems != 0 && processed >= maxItems) {
                break;
            }
            WithdrawalRequest memory req = withdrawalQueue[head];

            if (req.member == address(0)) {
                head++;
                processed++;
                continue;
            }

            if (shareBalance[req.member] < req.shares || totalShares == 0) {
                withdrawalQueueIndex[req.member] = 0;
                delete withdrawalQueue[head];
                head++;
                processed++;
                continue;
            }

            uint256 usdcValue = (req.shares * poolValue()) / totalShares;
            if (usdcValue > poolIdleUsdc) {
                break; // FIFO: stop at first request that cannot be fully filled.
            }

            // CEI
            shareBalance[req.member] -= req.shares;
            totalShares -= req.shares;
            poolIdleUsdc -= usdcValue;
            withdrawalQueueIndex[req.member] = 0;
            delete withdrawalQueue[head];
            head++;

            IERC20(USDC).safeTransfer(req.member, usdcValue);

            emit WithdrawalProcessed(req.member, req.shares, usdcValue);
            processed++;
        }

        withdrawalQueueHead = head;
        if (withdrawalQueueHead == withdrawalQueueTail) {
            withdrawalQueueHead = 0;
            withdrawalQueueTail = 0;
        }
    }

    // =========================
    // SECTION D — BUSINESS LISTINGS
    // =========================

    function createListing(
        address business,
        string calldata name,
        string calldata description,
        uint256 fundingTarget,
        uint256 fundingPeriod,
        uint256 profitShareBps,
        uint256[] calldata milestonePcts,
        string[] calldata milestoneDescs,
        uint256[] calldata milestoneDeadlines,
        string calldata docsHash
    ) external {
        if (business == address(0)) revert ZeroAddress();
        if (fundingTarget == 0) revert InvalidFundingTarget();
        if (fundingPeriod == 0) revert InvalidValue();
        if (milestonePcts.length < 2 || milestonePcts.length > 4) revert InvalidMilestoneConfig();
        if (milestonePcts.length != milestoneDescs.length || milestonePcts.length != milestoneDeadlines.length) {
            revert ArrayLengthMismatch();
        }

        uint256 pctSum;
        for (uint256 i = 0; i < milestonePcts.length; i++) {
            pctSum += milestonePcts[i];
            if (milestoneDeadlines[i] <= block.timestamp) revert InvalidDeadline();
        }
        if (pctSum != 100) revert InvalidMilestoneConfig();

        listingCount++;
        Listing storage listing = listings[listingCount];
        listing.id = listingCount;
        listing.business = business;
        listing.name = name;
        listing.description = description;
        listing.fundingTarget = fundingTarget;
        listing.fundingDeadline = block.timestamp + fundingPeriod;
        listing.profitShareBps = profitShareBps;
        listing.docsHash = docsHash;
        listing.status = ListingStatus.Proposed;
        listing.voteDeadline = block.timestamp + VOTING_WINDOW;

        for (uint256 i = 0; i < milestonePcts.length; i++) {
            listing.milestones.push(
                Milestone({
                    pct: milestonePcts[i],
                    description: milestoneDescs[i],
                    status: MilestoneStatus.Pending,
                    proof: "",
                    proofLink: "",
                    deadline: milestoneDeadlines[i],
                    milestoneVoteDeadline: 0
                })
            );
        }

        emit ListingCreated(listingCount, business, fundingTarget);
    }

    function voteListing(uint256 listingId, bool support) external onlyMember {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (!IFarmCoopVerifier(verifierContract).isListingVerified(listingId)) revert ListingNotVerified();
        if (block.timestamp > listing.voteDeadline) revert VoteWindowClosed();
        if (listing.hasVoted[msg.sender]) revert AlreadyVoted();

        uint256 cap = (totalShares * VOTE_CAP_BPS) / 10_000;
        uint256 weight = _min(shareBalance[msg.sender], cap);

        if (support) {
            listing.voteYes += weight;
        } else {
            listing.voteNo += weight;
        }
        listing.hasVoted[msg.sender] = true;

        emit ListingVoted(listingId, msg.sender, support, weight);
    }

    function finalizeListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (block.timestamp <= listing.voteDeadline) revert VoteWindowOpen();
        if (!IFarmCoopVerifier(verifierContract).isListingVerified(listingId)) revert ListingNotVerified();
        if (listing.status != ListingStatus.Proposed && listing.status != ListingStatus.Verified) revert InvalidListingStatus();

        uint256 quorumThreshold = (totalShares * QUORUM_BPS) / 10_000;
        bool quorumReached = (listing.voteYes + listing.voteNo) >= quorumThreshold;
        bool passed = quorumReached && listing.voteYes > listing.voteNo;

        if (passed) {
            uint256 currentPoolValue = poolValue();
            if (listing.fundingTarget > (currentPoolValue * MAX_EXPOSURE_BPS) / 10_000) revert ExposureLimitExceeded();
            if (poolIdleUsdc < listing.fundingTarget) revert InsufficientPoolIdle();

            listing.status = ListingStatus.Funded;
            listing.timelockExpiry = block.timestamp + TIMELOCK_DELAY;
            listing.totalFunded = listing.fundingTarget;

            poolIdleUsdc -= listing.fundingTarget;
            poolListingValue += listing.fundingTarget;

            if (totalShares == 0) revert NoShares();
            uint256 sumContrib;
            address dustRecipient = address(0);

            for (uint256 i = 0; i < members.length; i++) {
                address member = members[i];
                uint256 memberShares = shareBalance[member];
                if (memberShares == 0) continue;

                uint256 contribution = (memberShares * listing.fundingTarget) / totalShares;
                listing.contribution[member] = contribution;
                sumContrib += contribution;

                if (dustRecipient == address(0)) {
                    dustRecipient = member;
                }
            }

            if (sumContrib < listing.fundingTarget && dustRecipient != address(0)) {
                listing.contribution[dustRecipient] += (listing.fundingTarget - sumContrib);
            }

            emit ListingFunded(listingId, listing.fundingTarget, listing.timelockExpiry);
        } else {
            listing.status = ListingStatus.Proposed;
            emit ListingVoteFailed(listingId);
        }
    }

    function submitMilestoneProof(
        uint256 listingId,
        uint256 milestoneIdx,
        string calldata proof,
        string calldata proofLink
    ) external {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (msg.sender != listing.business) revert NotBusiness();
        if (milestoneIdx != listing.currentMilestone) revert InvalidMilestone();
        if (listing.status != ListingStatus.Funded && listing.status != ListingStatus.Active) revert InvalidListingStatus();

        Milestone storage milestone = listing.milestones[milestoneIdx];
        if (milestone.status != MilestoneStatus.Pending) revert MilestoneNotPending();
        if (milestone.deadline <= block.timestamp) revert MilestoneDeadlinePassed();

        milestone.proof = proof;
        milestone.proofLink = proofLink;
        milestone.status = MilestoneStatus.ProofSubmitted;
        milestone.milestoneVoteDeadline = block.timestamp + VOTING_WINDOW;

        emit MilestoneProofSubmitted(listingId, milestoneIdx, proof);
    }

    function voteMilestone(uint256 listingId, uint256 milestoneIdx, bool approve) external onlyMember nonReentrant {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (milestoneIdx != listing.currentMilestone) revert InvalidMilestone();

        Milestone storage milestone = listing.milestones[milestoneIdx];
        if (milestone.status != MilestoneStatus.ProofSubmitted) revert MilestoneNotProofSubmitted();
        if (listing.milestoneVoted[milestoneIdx][msg.sender]) revert AlreadyVoted();

        uint256 cap = (totalShares * VOTE_CAP_BPS) / 10_000;
        uint256 weight = _min(shareBalance[msg.sender], cap);

        listing.milestoneVoted[milestoneIdx][msg.sender] = true;
        if (approve) {
            listing.milestoneVoteYes[milestoneIdx] += weight;
        }

        emit MilestoneVoted(listingId, milestoneIdx, msg.sender, approve);

        uint256 quorumThreshold = (totalShares * QUORUM_BPS) / 10_000;
        if (listing.milestoneVoteYes[milestoneIdx] >= quorumThreshold) {
            if (block.timestamp < listing.timelockExpiry) revert TimelockNotExpired();

            uint256 releaseAmount = (listing.fundingTarget * milestone.pct) / 100;

            milestone.status = MilestoneStatus.Approved;
            listing.releasedAmount += releaseAmount;
            if (poolListingValue >= releaseAmount) {
                poolListingValue -= releaseAmount;
            } else {
                poolListingValue = 0;
            }

            if (listing.status == ListingStatus.Funded) {
                listing.status = ListingStatus.Active;
            }

            listing.currentMilestone += 1;
            if (listing.currentMilestone == listing.milestones.length) {
                listing.status = ListingStatus.Completed;
            }

            IERC20(USDC).safeTransfer(listing.business, releaseAmount);

            emit MilestoneApproved(listingId, milestoneIdx, releaseAmount);
        }
    }

    function rejectMilestone(uint256 listingId, uint256 milestoneIdx) external onlyMember {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (milestoneIdx != listing.currentMilestone) revert InvalidMilestone();

        Milestone storage milestone = listing.milestones[milestoneIdx];
        if (milestone.status != MilestoneStatus.ProofSubmitted) revert MilestoneNotProofSubmitted();

        uint256 quorumThreshold = (totalShares * QUORUM_BPS) / 10_000;
        if (!(block.timestamp > milestone.milestoneVoteDeadline && listing.milestoneVoteYes[milestoneIdx] < quorumThreshold)) {
            revert QuorumNotMet();
        }

        milestone.status = MilestoneStatus.Rejected;
        listing.status = ListingStatus.Defaulted;

        emit MilestoneRejected(listingId, milestoneIdx);
        emit ListingDefaulted(listingId);
    }

    function flagDefault(uint256 listingId) external onlyMember {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (listing.status != ListingStatus.Active && listing.status != ListingStatus.Funded) revert InvalidListingStatus();

        uint256 idx = listing.currentMilestone;
        if (idx >= listing.milestones.length) revert InvalidMilestone();

        Milestone storage milestone = listing.milestones[idx];
        if (block.timestamp <= milestone.deadline) revert InvalidDeadline();

        milestone.status = MilestoneStatus.Missed;
        listing.status = ListingStatus.Defaulted;

        emit ListingDefaulted(listingId);
    }

    function repay(uint256 listingId, uint256 amount) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (msg.sender != listing.business) revert NotBusiness();
        if (amount == 0) revert InvalidValue();
        if (listing.status != ListingStatus.Completed && listing.status != ListingStatus.Active && listing.status != ListingStatus.Funded) {
            revert InvalidListingStatus();
        }
        if (listing.totalFunded == 0) revert InvalidValue();

        listing.totalRepaid += amount;

        uint256 principalRemaining = listing.fundingTarget - listing.repaidPrincipal;
        uint256 principalPortion = _min(amount, principalRemaining);
        listing.repaidPrincipal += principalPortion;

        if (poolListingValue >= principalPortion) {
            poolListingValue -= principalPortion;
        } else {
            poolListingValue = 0;
        }
        poolIdleUsdc += amount;

        uint256 totalDue = listing.fundingTarget + ((listing.fundingTarget * listing.profitShareBps) / 10_000);
        if (listing.totalRepaid >= totalDue) {
            listing.status = ListingStatus.Completed;
        }

        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amount);

        emit Repaid(listingId, amount, listing.totalRepaid);
        emit PoolNAVRestored(listingId, amount);
    }

    function markLoss(uint256 listingId) external onlyMember {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert InvalidValue();
        if (listing.status != ListingStatus.Defaulted && listing.status != ListingStatus.Funded) revert InvalidListingStatus();

        uint256 remaining = listing.fundingTarget - listing.releasedAmount;
        if (poolListingValue >= remaining) {
            poolListingValue -= remaining;
        } else {
            poolListingValue = 0;
        }
        poolIdleUsdc += remaining;
        emit FundsReclaimed(listingId, remaining);
        emit PoolNAVRestored(listingId, remaining);

        uint256 unrecovered = listing.fundingTarget - listing.repaidPrincipal;
        uint256 writeDownAmount = _min(unrecovered, poolListingValue);

        poolListingValue -= writeDownAmount;
        listing.status = ListingStatus.MarkedLoss;

        emit LossMarked(listingId, writeDownAmount);
    }

    // =========================
    // SECTION E — VIEW HELPERS
    // =========================

    function getOrder(
        uint256 orderId
    )
        external
        view
        returns (
            address buyer,
            uint256 price,
            uint256 expectedQty,
            OrderStatus status,
            bool buyerConfirmed,
            uint256 totalDelivered
        )
    {
        Order storage order = orders[orderId];
        return (order.buyer, order.price, order.expectedQty, order.status, order.buyerConfirmed, order.totalDelivered);
    }

    function getListing(
        uint256 listingId
    )
        external
        view
        returns (
            address business,
            string memory name,
            string memory description,
            uint256 fundingTarget,
            uint256 profitShareBps,
            ListingStatus status,
            uint256 totalFunded,
            uint256 voteYes,
            uint256 voteNo,
            uint256 voteDeadline,
            uint256 currentMilestone
        )
    {
        Listing storage listing = listings[listingId];
        return (
            listing.business,
            listing.name,
            listing.description,
            listing.fundingTarget,
            listing.profitShareBps,
            listing.status,
            listing.totalFunded,
            listing.voteYes,
            listing.voteNo,
            listing.voteDeadline,
            listing.currentMilestone
        );
    }

    function getMilestone(
        uint256 listingId,
        uint256 milestoneIdx
    )
        external
        view
        returns (
            uint256 pct,
            string memory description,
            MilestoneStatus status,
            string memory proof,
            string memory proofLink,
            uint256 deadline
        )
    {
        Listing storage listing = listings[listingId];
        Milestone storage milestone = listing.milestones[milestoneIdx];
        return (
            milestone.pct,
            milestone.description,
            milestone.status,
            milestone.proof,
            milestone.proofLink,
            milestone.deadline
        );
    }

    function getFunderContribution(uint256 listingId, address funder) external view returns (uint256) {
        return listings[listingId].contribution[funder];
    }

    function getRepaymentClaim(uint256 listingId, address funder) external pure returns (uint256) {
        listingId;
        funder;
        return 0;
    }

    function getOrderDelivered(uint256 orderId, address member) external view returns (uint256) {
        return orders[orderId].delivered[member];
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
