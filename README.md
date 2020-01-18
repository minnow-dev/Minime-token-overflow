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
