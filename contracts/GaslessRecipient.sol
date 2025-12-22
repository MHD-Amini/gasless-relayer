// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GaslessRecipient
 * @notice Example ERC2771-compliant contract that accepts gasless transactions
 * @dev Demonstrates how to build dApps that support meta-transactions
 * 
 * Key features:
 * - Uses _msgSender() instead of msg.sender to get the original user
 * - Uses _msgData() instead of msg.data for calldata
 * - Fully compatible with the GaslessForwarder
 */
contract GaslessRecipient is ERC2771Context, Ownable {
    
    // Token-like balances for demonstration
    mapping(address => uint256) public balances;
    
    // User data storage for demonstration
    mapping(address => string) public userNames;
    
    // Counter for gasless interactions
    uint256 public totalGaslessActions;
    
    // Events
    event GaslessTransfer(address indexed from, address indexed to, uint256 amount);
    event GaslessMint(address indexed to, uint256 amount);
    event NameUpdated(address indexed user, string name);
    event GaslessAction(address indexed user, string action);

    /**
     * @notice Constructor
     * @param trustedForwarder Address of the trusted forwarder contract
     */
    constructor(address trustedForwarder) 
        ERC2771Context(trustedForwarder) 
        Ownable(_msgSender())
    {
        // Mint initial tokens to deployer for testing
        balances[_msgSender()] = 1000000 * 10**18;
    }

    /**
     * @notice Transfer tokens (gasless)
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) external {
        address sender = _msgSender(); // Gets ORIGINAL user, not relayer!
        
        require(balances[sender] >= amount, "Insufficient balance");
        require(to != address(0), "Invalid recipient");
        
        balances[sender] -= amount;
        balances[to] += amount;
        totalGaslessActions++;
        
        emit GaslessTransfer(sender, to, amount);
        emit GaslessAction(sender, "transfer");
    }

    /**
     * @notice Mint tokens (gasless) - for testing
     * @param amount Amount to mint
     */
    function mint(uint256 amount) external {
        address sender = _msgSender();
        
        require(amount <= 1000 * 10**18, "Max mint exceeded");
        
        balances[sender] += amount;
        totalGaslessActions++;
        
        emit GaslessMint(sender, amount);
        emit GaslessAction(sender, "mint");
    }

    /**
     * @notice Set user name (gasless)
     * @param name User's display name
     */
    function setName(string calldata name) external {
        address sender = _msgSender();
        
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name length");
        
        userNames[sender] = name;
        totalGaslessActions++;
        
        emit NameUpdated(sender, name);
        emit GaslessAction(sender, "setName");
    }

    /**
     * @notice Get balance of an address
     * @param account Address to query
     * @return Balance
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    /**
     * @notice Check if an address is a trusted forwarder
     * @param forwarder Address to check
     * @return True if trusted
     */
    function isTrustedForwarder(address forwarder) public view override returns (bool) {
        return super.isTrustedForwarder(forwarder);
    }

    /**
     * @notice Get the trusted forwarder address
     * @return Forwarder address
     */
    function trustedForwarder() public view returns (address) {
        return _trustedForwarder;
    }

    /**
     * @notice Admin function to update forwarder (for upgrades)
     * @dev In production, consider using a proxy pattern instead
     */
    // Note: ERC2771Context doesn't allow changing forwarder after deployment
    // This is intentional for security. Deploy a new contract if forwarder changes.

    /**
     * @notice Helper to encode a transfer call
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return Encoded function call data
     */
    function encodeTransfer(address to, uint256 amount) external pure returns (bytes memory) {
        return abi.encodeWithSelector(this.transfer.selector, to, amount);
    }

    /**
     * @notice Helper to encode a mint call
     * @param amount Amount to mint
     * @return Encoded function call data
     */
    function encodeMint(uint256 amount) external pure returns (bytes memory) {
        return abi.encodeWithSelector(this.mint.selector, amount);
    }

    /**
     * @notice Helper to encode a setName call
     * @param name User's name
     * @return Encoded function call data
     */
    function encodeSetName(string calldata name) external pure returns (bytes memory) {
        return abi.encodeWithSelector(this.setName.selector, name);
    }
}
