// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title GaslessForwarder
 * @notice EIP-2771 compliant Trusted Forwarder for meta-transactions
 * @dev Verifies signatures and forwards calls to target contracts
 * 
 * This contract is based on OpenZeppelin's MinimalForwarder but with additional
 * features for production use:
 * - Deadline enforcement
 * - Batch execution
 * - Event logging for monitoring
 */
contract GaslessForwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;      // User's address
        address to;        // Target contract address
        uint256 value;     // ETH value to forward
        uint256 gas;       // Gas limit for the call
        uint256 nonce;     // User's nonce for replay protection
        uint256 deadline;  // Unix timestamp deadline
        bytes data;        // Encoded function call
    }

    // Type hash for EIP-712 signature
    bytes32 private constant _TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,uint256 deadline,bytes data)"
    );

    // Mapping of user address => nonce
    mapping(address => uint256) private _nonces;

    // Events
    event Executed(
        address indexed from,
        address indexed to,
        uint256 nonce,
        bool success,
        bytes returndata
    );
    
    event BatchExecuted(
        uint256 count,
        uint256 successCount
    );

    constructor() EIP712("GaslessForwarder", "1") {}

    /**
     * @notice Get the current nonce for a user
     * @param from User's address
     * @return Current nonce
     */
    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @notice Verify a forward request signature
     * @param req Forward request
     * @param signature EIP-712 signature
     * @return True if signature is valid
     */
    function verify(ForwardRequest calldata req, bytes calldata signature) 
        public 
        view 
        returns (bool) 
    {
        address signer = _hashTypedDataV4(
            keccak256(abi.encode(
                _TYPEHASH,
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                req.deadline,
                keccak256(req.data)
            ))
        ).recover(signature);

        return _nonces[req.from] == req.nonce && 
               signer == req.from &&
               block.timestamp <= req.deadline;
    }

    /**
     * @notice Execute a verified forward request
     * @param req Forward request
     * @param signature EIP-712 signature
     * @return success Whether the call succeeded
     * @return returndata Return data from the call
     */
    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool success, bytes memory returndata)
    {
        require(verify(req, signature), "GaslessForwarder: invalid signature");
        
        _nonces[req.from] = req.nonce + 1;

        // Append the original sender address to calldata (EIP-2771)
        (success, returndata) = req.to.call{gas: req.gas, value: req.value}(
            abi.encodePacked(req.data, req.from)
        );

        // Validate gas was provided
        // See https://ronan.eth.limo/blog/ethereum-gas-dangers/
        if (gasleft() <= req.gas / 63) {
            assembly {
                invalid()
            }
        }

        emit Executed(req.from, req.to, req.nonce, success, returndata);

        return (success, returndata);
    }

    /**
     * @notice Execute multiple forward requests in a batch
     * @dev Gas optimization for multiple transactions
     * @param requests Array of forward requests
     * @param signatures Array of corresponding signatures
     * @return results Array of success/failure for each request
     */
    function executeBatch(
        ForwardRequest[] calldata requests,
        bytes[] calldata signatures
    )
        external
        payable
        returns (bool[] memory results)
    {
        require(
            requests.length == signatures.length,
            "GaslessForwarder: length mismatch"
        );

        results = new bool[](requests.length);
        uint256 successCount = 0;

        for (uint256 i = 0; i < requests.length; i++) {
            try this.execute(requests[i], signatures[i]) returns (bool success, bytes memory) {
                results[i] = success;
                if (success) successCount++;
            } catch {
                results[i] = false;
            }
        }

        emit BatchExecuted(requests.length, successCount);

        return results;
    }

    /**
     * @notice Get the domain separator for EIP-712
     * @return Domain separator hash
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Required for receiving ETH for value transfers
     */
    receive() external payable {}
}
