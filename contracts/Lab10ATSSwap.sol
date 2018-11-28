pragma solidity ^0.4.24;

import { ERC820Client } from "./ERC820Client.sol";

contract Lab10ATSSwap is ERC820Client {
    mapping(address => uint) public balances;

    constructor() public {
        setInterfaceImplementation("ERC777TokensRecipient", this);
    }

    function tokensReceived(
        address _operator,
        address _from,
        address _to,
        uint256 _amount,
        bytes _data,
        bytes _operatorData
    )
    public
    {
        balances[_from] += _amount;
    }
}