# About

The lab10 token (symbol: _lab10_) contract is deployed on [ARTIS Σ1](https://github.com/lab10-coop/sigma1).  
_lab10_ are periodically issued to [lab10 collective members](https://lab10.coop/en/about#lab10-team) as a complement to conventional (fiat) payments.  
It is designed to be a flexible means for rewarding contributors. Its value/utility is not predefined. Instead it's supposed to be swappable/redeemable for lab10 related valuables/services whenever the lab10 collective decides so through its internal governance processes.

The first _lab10_ use case is that of swapping it for ATS, the [blockchain-native token](https://medium.com/untitled-inc/the-token-classification-framework-290b518eaab6) of ARTIS.

# Technical

We decided to make _lab10_ an [ERC777](https://eips.ethereum.org/EIPS/eip-777) token which is [ERC20](https://eips.ethereum.org/EIPS/eip-20) compatible.  
ERC777 reflects a lot of the lessons learned with ERC20 and defines interfaces which are similar to that of the blockchain-native token.  

The choice of ERC777 already facilitated implementation of the first use case for _lab10_:  
the swap contract (which allows to swap 1 lab10 for 75 ATS) uses ERC777 hooks as an elegant mechanism for a contract to act upon a token transfer. This allows the swap operation to be implemented as an atomic transaction which is triggered by a simple ERC20 transfer, as is supported by any Ethereum wallet.  

The code is based on the [ERC777 reference implementation](https://github.com/jacquesd/ERC777), with some refactoring and simplifications added.
