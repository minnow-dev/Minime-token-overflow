## MinimeToken

[https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol](https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol)

### Disclaimer

Given solidity code is version 0.2.0 of MiniMeToken. But same Overflow is available on other versions.

### Background

Minime token uses custom struct `Checkpoint` to snapshot value at specific block.

```javascript
/// @dev `Checkpoint` is the structure that attaches a block number to a
///  given value, the block number attached is the one that last changed the
///  value
struct  Checkpoint {
  // `fromBlock` is the block number that the value was generated from
  uint128 fromBlock;
  // `value` is the amount of tokens at a specific block number
  uint128 value;

}
```

`Checkpoint` has two fields, `fromBlock` and `value`. To optimize gas usage, Minime token is designed to use `uint128` in `Checkpoint` fields instead of `uint256`. 

`totalSupply` (used for token's total minted amount) and `balances` uses `Checkpoint` and it is a core feature of Minime token.

All `Checkpoint` values are stored and updated by `updateValueAtNow()` function.

```javascript
/// @dev `updateValueAtNow` used to update the `balances` map and the
///  `totalSupplyHistory`
/// @param checkpoints The history of data being updated
/// @param _value The new number of tokens
function updateValueAtNow(Checkpoint[] storage checkpoints, uint _value
    ) internal  {
  if ((checkpoints.length == 0)
      || (checkpoints[checkpoints.length -1].fromBlock < block.number)) {
    Checkpoint storage newCheckPoint = checkpoints[ checkpoints.length++  ];
    newCheckPoint.fromBlock =  uint128(block.number);
    newCheckPoint.value = uint128(_value);

  } else {
    Checkpoint storage oldCheckPoint = checkpoints[checkpoints.length-1];
    oldCheckPoint.value = uint128(_value);

  }

}
```

For reading `totalSupply`, `getValueAt()` is used in `totalSupplyAt()`. And for `balances`, `getValueAt()` is used in `balanceOfAt()`.

But unlike storing/updating process, read functions(`getValueAt(), totalSupplyAt(), balanceOfAt()`) returns `uint` which defaults to `uint256` . Which causes following overflow exploits.

### Overflow 1 - generateTokens()
```javascript
function generateTokens(address _owner, uint _amount
    ) public onlyController returns (bool) {
  uint curTotalSupply = totalSupply();
  require(curTotalSupply + _amount >= curTotalSupply); // Check for overflow
  uint previousBalanceTo = balanceOf(_owner);
  require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
  updateValueAtNow(totalSupplyHistory, curTotalSupply + _amount);
  updateValueAtNow(balances[_owner], previousBalanceTo + _amount);
  Transfer(0, _owner, _amount);
  return true;

}
```
`updateValueAtNow` function updates one of `Checkpoint`'s field, value. value is `uint128` type, while `previoustBalanceTo`, `_amount` are `uint(uint256)` type. That makes chance to overflow.

Even for the `require` functions(which has comments of 'Check for overflow') that tries to check for overflow, since `curTotalSupply` and `_amount` is `uint256` , Overflow check is not working properly.

For example, when `curTotalSupply` is 2**128 - 10 and `_amount` is 11, inside of `require` will be same as, (`2**128 - 10 + 11 >= 2**128 - 10`) ⇒ (`2**128 + 1 >= 2*128 - 10`). And makes it possible to pass the `require` statement.

And at `updateValueAtNow()` , `_value` is casted to `uint128` , stored value will be `1`.

As a result, `totalSupply` is overflowed.

### Overflow 2 - doTransfer()
```javascript
function doTransfer(address _from, address _to, uint _amount) internal {
  if (_amount == 0) {
    Transfer(_from, _to, _amount);    // Follow the spec to louch the event when transfer 0
    return;

  }

  require(parentSnapShotBlock < block.number);

  // Do not allow transfer to 0x0 or the token contract itself
  require((_to != 0) && (_to != address(this)));

  // If the amount being transfered is more than the balance of the
  //  account the transfer throws
  var previousBalanceFrom = balanceOfAt(_from, block.number);

  require(previousBalanceFrom >= _amount);

  // Alerts the token controller of the transfer
  if (isContract(controller)) {
    require(TokenController(controller).onTransfer(_from, _to, _amount));

  }

  // First update the balance array with the new value for the address
  //  sending the tokens
  updateValueAtNow(balances[_from], previousBalanceFrom - _amount);

  // Then update the balance array with the new value for the address
  //  receiving the tokens
  var previousBalanceTo = balanceOfAt(_to, block.number);
  require(previousBalanceTo + _amount >= previousBalanceTo); // Check for overflow
  updateValueAtNow(balances[_to], previousBalanceTo + _amount);

  // An event to make the transfer easy to find on the blockchain
  Transfer(_from, _to, _amount);


}
```
as same as `generateToken()`, `doTransfer()` uses `updateAtNow()`, it can also cause overflow.


## Affected Products

All smart contracts using minime token is affected.
List below is all we could find using online search.
We'll update when we find more.
If you know other contract that uses minimetoken, leave issue on github.
Each codes can be found on `${project}/audit` branch. 

| project | addrees |
|-------|------|
| Aigang | 0x1063ce524265d5a3A624f4914acd573dD89ce988 |
| ANT | 0x960b236A07cf122663c4303350609A66A7B288C0 | 
| Aston X | 0x1a0f2ab46ec630f9fd638029027b552afa64b94c | 
| BlankDAO | 0x18df60ddaeba4393e5cc6ecfc1e5bb1d20dd6239 | 
| bloom | 0x107c4504cd79c5d2696ea0030a8dd4e92601b82e | 
| BrightID Voting | 0x8a071DC5BA9d2eE0e825179E236D8751F057b21B | 
| Cindicator | 0xd4c435f5b09f855c3317c8524cb1f586e42795fa |
| Citizen Game | 0xafc13f758c02b38caa0e69a9734b0e3b5957dbe8 | 
| DaoCON | 0x2a39edf5f4a3e32272a3189e8f19acc3e370b4a1 | 
| DataBroker DAO | 0x1b5f21ee98eed48d292e8e2d3ed82b40a9728a22 | 
| Data eXchange Token | 0x765f0c16d1ddc279295c1a7c24b0883f62d33f75 | 
| district0x | 0x0abdace70d3790235af448c88547603b945604ea | 
| Donut | 0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9 | 
| ESCB token(ESCB) | 0x5e365a320779acc2c72f5dcd2ba8a81e4a34569f | 
| ETHbits | 0x1b9743f556d65e757c4c650b4555baf354cb8bd3 | 
| Ethfinex Nectar Token | 0xcc80c051057b774cd75067dc48f8987c4eb97a5e | 
| Fiinu | 0x0e73754a21442d1bd8f945669ac4aae0cd2b0934 | 
| FundRequest | 0x4df47b4969b2911c966506e3592c41389493953b | 
| fuze x | 0x1829aa045e21e0d59580024a951db48096e01782 | 
| giveth | 0xb94c53b0e67fabac3d97173482663ef597d4174a | 
| kleros | 0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d | 
| Lightwave | 0x6bfB46B3fE39Aa6762a925277e846Ab8422F469C | 
| Mothership | 0x68AA3F232dA9bdC2343465545794ef3eEa5209BD | 
| Oroshi | 0xc9c0ff6344b4bfdee7ace21c4deddd6e43ecb454 | 
| REAL | 0x9214ec02cb71cba0ada6896b8da260736a67ab10 | 
| Realisto | 0x767ba2915ec344015a7938e3eedfec2785195d05 | 
| Sharpe Platform Token | 0xef2463099360a085f1f10b076ed72ef625497a06 | 
| SNT | 0x744d70fdbe2ba4cf95131626614a1763df805b9e | 
| sphi(Delphi) | 0x3dff304e4e290787572cb15960ca160e85f2292b | 
| SWT | 0xb9e7f8568e08d5659f5d29c4997173d84cdf2607 |
| SWM | 0x9e88613418cf03dca54d6a2cf6ad934a78c7a17a | 
| Unartig | 0x2cbf3b1872dd351f01dd009eb3e813f5be649a5f |
| Genaro X (not yet tested) | 0x6ec8a24cabdc339a06a172f8223ea557055adaa5 |
| PATO (not yet tested) | 0x4a128BeB9892142F131A6b3De4B31067C357A6d7|
