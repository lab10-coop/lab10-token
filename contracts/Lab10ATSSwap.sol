pragma solidity ^0.4.24;

import { ERC820Client } from "./ERC820Client.sol";

contract Lab10ATSSwap is ERC820Client {
    address public owner;
    address public swappableToken;
    uint256 public constant LAB10_ATS_MULTIPLIER = 75;

    event Swapped(address account, uint256 lab10Amount, uint256 atsAmount);

    constructor(address _swappableToken) public {
        owner = msg.sender;
        swappableToken = _swappableToken;
        setInterfaceImplementation("ERC777TokensRecipient", this);
    }

    // let the owner deposit and withdraw ATS
    function () payable public {
        require(msg.sender == owner);
        if(msg.value == 0) {
            msg.sender.transfer(address(this).balance);
        }
    }

    // swaps received tokens
    function tokensReceived(
        address,
        address _from,
        address,
        uint256 _amount,
        bytes,
        bytes
    )
    public
    {
        // accept only our tokens
        require(msg.sender == swappableToken);
        uint256 atsAmount = _amount * LAB10_ATS_MULTIPLIER;
        // transfer corresponding ATS to the sender
        _from.transfer(atsAmount);
        emit Swapped(_from, _amount, atsAmount);
    }
}