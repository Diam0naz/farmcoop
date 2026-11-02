// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FarmCoopVerifier {
    error NotCoordinator();
    error NotVerifierOrCoordinator();
    error AlreadyVerified();
    error NotVerified();
    error ZeroAddress();
    error InvalidVerifierCount();

    address public immutable coordinator;

    mapping(address => bool) public isVerifier;
    mapping(uint256 => bool) public verified;

    event ListingVerified(uint256 indexed listingId, address by);
    event ListingUnverified(uint256 indexed listingId);

    modifier onlyCoordinator() {
        if (msg.sender != coordinator) revert NotCoordinator();
        _;
    }

    constructor(address coordinator_, address[] memory verifiers_) {
        if (coordinator_ == address(0)) revert ZeroAddress();
        if (verifiers_.length == 0 || verifiers_.length > 10) revert InvalidVerifierCount();

        coordinator = coordinator_;

        for (uint256 i = 0; i < verifiers_.length; i++) {
            address verifier = verifiers_[i];
            if (verifier == address(0)) revert ZeroAddress();
            isVerifier[verifier] = true;
        }
    }

    function addVerifier(address verifier) external onlyCoordinator {
        if (verifier == address(0)) revert ZeroAddress();
        isVerifier[verifier] = true;
    }

    function removeVerifier(address verifier) external onlyCoordinator {
        isVerifier[verifier] = false;
    }

    function verify(uint256 listingId) external {
        if (msg.sender != coordinator && !isVerifier[msg.sender]) {
            revert NotVerifierOrCoordinator();
        }
        if (verified[listingId]) revert AlreadyVerified();

        verified[listingId] = true;
        emit ListingVerified(listingId, msg.sender);
    }

    function unverify(uint256 listingId) external onlyCoordinator {
        if (!verified[listingId]) revert NotVerified();

        verified[listingId] = false;
        emit ListingUnverified(listingId);
    }

    function isListingVerified(uint256 listingId) external view returns (bool) {
        return verified[listingId];
    }
}
